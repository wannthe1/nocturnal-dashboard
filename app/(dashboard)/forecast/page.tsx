import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BreakdownList } from "@/components/breakdown-list";
import { ChartEmpty } from "@/components/chart-empty";
import { ForecastChart, OrdersByHourChart } from "@/components/charts-lazy";
import { LinkSegmented } from "@/components/link-segmented";
import { Panel } from "@/components/panel";
import { ForecastSkeleton } from "@/components/skeletons";
import { StatTile } from "@/components/stat-tile";
import { requireAccess } from "@/lib/auth";
import { can } from "@/lib/roles";
import { METRIC_COLORS, nameColor } from "@/lib/chart-colors";
import { getExpenseSeries } from "@/lib/expenses";
import { addDays, project, stockOutlook, weekdayOf, type Projection } from "@/lib/forecast";
import { getDemandHistory, getRecipeLines, type DemandRow } from "@/lib/forecast-data";
import { formatDate, formatHour, formatMoney, formatMoneyExact, formatNumber, formatRange, NO_DATA, weekdayNames } from "@/lib/format";
import type { Locale, Translate } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { getInventory } from "@/lib/inventory";
import { getToday, type Period } from "@/lib/period";
import { getBranches, getSalesDashboard, readBranchId, type SalesDashboard } from "@/lib/sales";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.forecast") };
}

const VIEWS = ["sales", "demand", "inventory"] as const;
type View = (typeof VIEWS)[number];
const HORIZONS = [7, 14, 30];
const HISTORY_DAYS = 91; // long enough for a weekly pattern; daily data from the database
const CHART_DAYS = 42;

export default function ForecastPage({ searchParams }: PageProps<"/forecast">) {
  return (
    <Suspense fallback={<ForecastSkeleton />}>
      <ForecastContent searchParams={searchParams} />
    </Suspense>
  );
}

type Shared = {
  t: Translate;
  locale: Locale;
  today: string;
  horizon: number;
  window: string;
  currency: string;
  money: (v: number) => string;
  exact: (v: number) => string;
};

async function ForecastContent({ searchParams }: { searchParams: PageProps<"/forecast">["searchParams"] }) {
  const params = await searchParams;
  const horizon = HORIZONS.includes(Number(params.days)) ? Number(params.days) : 30;
  const branchId = readBranchId(params.branch);

  const today = await getToday();
  const from = addDays(today, -HISTORY_DAYS);
  const to = addDays(today, -1);
  const history: Period = { key: "forecast", today, from, to, previousFrom: from, previousTo: to, compareKey: "compare.custom" };

  const [{ t, locale }, { restaurant, role }, branches, sales] = await Promise.all([getI18n(), requireAccess("forecast"), getBranches(), getSalesDashboard(history, branchId)]);
  const views = VIEWS.filter((v) => v !== "inventory" || can(role, "forecastStock"));
  const view: View = views.includes(params.view as View) ? (params.view as View) : "sales";
  const canSeeMoney = can(role, "forecastMoney");
  const branch = branches.find((b) => b.id === branchId) ?? null;
  const currency = restaurant?.currency ?? "USD";
  const shared: Shared = {
    t,
    locale,
    today,
    horizon,
    window: formatRange(addDays(today, 1), addDays(today, horizon), locale),
    currency,
    money: (v) => formatMoney(v, currency),
    exact: (v) => formatMoneyExact(v, currency),
  };

  const href = (next: { view?: View; days?: number; branch?: string | null }) => {
    const p = new URLSearchParams({ view: next.view ?? view, days: String(next.days ?? horizon) });
    const b = next.branch === undefined ? branch?.id : next.branch;
    if (b) p.set("branch", b);
    return `/forecast?${p}`;
  };

  return (
    <div className="space-y-8">
      <div data-filters className="relative z-20 space-y-2.5">
        <div className="flex flex-wrap gap-2.5">
          <LinkSegmented label={t("forecast.view.label")} value={view} items={views.map((key) => ({ key, label: t(`forecast.view.${key}`), href: href({ view: key }) }))} />
          <LinkSegmented label={t("forecast.horizon")} value={String(horizon)} items={HORIZONS.map((d) => ({ key: String(d), label: t("forecast.days", { count: d }), href: href({ days: d }) }))} />
          {branches.length > 1 && (
            <LinkSegmented
              label={t("common.branch")}
              value={branch?.id ?? "all"}
              items={[{ key: "all", label: t("common.allBranches"), href: href({ branch: null }) }, ...branches.map((b) => ({ key: b.id, label: b.name, href: href({ branch: b.id }) }))]}
            />
          )}
        </div>
        <p className="text-xs text-faint">{t("forecast.basis", { window: shared.window, days: HISTORY_DAYS - 1 })}</p>
      </div>

      {view === "sales" && <SalesForecast shared={shared} sales={sales} history={history} branchId={branchId} canSeeMoney={canSeeMoney} />}
      {view === "demand" && <DemandForecast shared={shared} sales={sales} from={from} to={to} branchId={branchId} />}
      {view === "inventory" && <InventoryForecast shared={shared} from={from} to={to} branchId={branchId} branches={branches} />}
    </div>
  );
}

const sumRecent = (map: Record<string, number>, today: string, days: number) => {
  const start = addDays(today, -days);
  return Object.entries(map).reduce((sum, [d, v]) => (d >= start && d < today ? sum + v : sum), 0);
};

function toMap(rows: { date: string; value: number }[]) {
  const map: Record<string, number> = {};
  for (const r of rows) map[r.date] = (map[r.date] ?? 0) + r.value;
  return map;
}

async function SalesForecast({ shared, sales, history, branchId, canSeeMoney }: { shared: Shared; sales: SalesDashboard; history: Period; branchId: string | null; canSeeMoney: boolean }) {
  const { t, locale, today, horizon, window, money, exact, currency } = shared;
  const series = canSeeMoney ? await getExpenseSeries(history, branchId) : null;

  const revenueMap = toMap(sales.trend.map((p) => ({ date: p.period, value: p.revenue })));
  const ordersMap = toMap(sales.trend.map((p) => ({ date: p.period, value: p.orders })));
  const revenue = project(revenueMap, today, horizon);
  const orders = project(ordersMap, today, horizon);

  // Bills arrive in lumps, so costs use the recent daily average rather than a daily pattern.
  const expenseMap = series ? toMap(series) : null;
  const dailyCost = expenseMap ? sumRecent(expenseMap, today, 84) / 84 : null;
  const costs = dailyCost === null ? null : dailyCost * horizon;
  const profit = revenue && costs !== null ? revenue.total - costs : null;

  const recentRevenue = sumRecent(revenueMap, today, horizon);
  const recentCosts = expenseMap ? sumRecent(expenseMap, today, horizon) : null;
  const recentProfit = recentCosts === null ? null : recentRevenue - recentCosts;
  const compare = t("forecast.compare", { days: horizon });
  const range = (low: number, high: number, fmt: (v: number) => string) => t("forecast.range", { low: fmt(low), high: fmt(high) });

  const weekdays = weekdayNames(locale);
  const byWeekday = new Array<number>(7).fill(0);
  revenue?.dates.forEach((d, i) => (byWeekday[weekdayOf(d)] += revenue.values[i]));
  const busiestDay = byWeekday.indexOf(Math.max(...byWeekday));
  const averageOrder = revenue && orders?.total ? revenue.total / orders.total : null;

  return (
    <>
      <section aria-label={t("common.keyFigures")} className="stagger kpi-grid">
        {!canSeeMoney && <StatTile hero label={t("forecast.expectedRevenue")} window={window} value={revenue ? `≈ ${money(revenue.total)}` : NO_DATA} exact={revenue ? exact(revenue.total) : undefined} current={revenue?.total} previous={recentRevenue || undefined} format={money} compareLabel={compare} note={t("forecast.notEnough")} />}
        {canSeeMoney && <StatTile hero label={t("forecast.expectedProfit")} window={window} value={profit === null ? NO_DATA : `≈ ${money(profit)}`} exact={profit === null ? undefined : exact(profit)} current={profit ?? undefined} previous={recentProfit !== null && recentProfit > 0 ? recentProfit : undefined} format={money} compareLabel={compare} note={t("overview.profitNote")} />}
        {canSeeMoney && <StatTile label={t("forecast.expectedRevenue")} window={window} value={revenue ? `≈ ${money(revenue.total)}` : NO_DATA} exact={revenue ? exact(revenue.total) : undefined} current={revenue?.total} previous={recentRevenue || undefined} format={money} compareLabel={revenue ? `${compare} · ${range(revenue.totalLow, revenue.totalHigh, money)}` : compare} note={t("forecast.notEnough")} />}
        {canSeeMoney && <StatTile label={t("forecast.expectedCosts")} window={window} value={costs === null ? NO_DATA : `≈ ${money(costs)}`} exact={costs === null ? undefined : exact(costs)} current={costs ?? undefined} previous={recentCosts || undefined} format={money} upIsGood={false} compareLabel={compare} note={t("forecast.costNote")} />}
        <StatTile label={t("forecast.expectedOrders")} window={window} value={orders ? `≈ ${formatNumber(orders.total)}` : NO_DATA} current={orders?.total} previous={sumRecent(ordersMap, today, horizon) || undefined} compareLabel={orders ? `${compare} · ${range(orders.totalLow, orders.totalHigh, formatNumber)}` : compare} note={t("forecast.notEnough")} />
        {!canSeeMoney && <StatTile label={t("sales.avgOrder")} window={window} value={averageOrder === null ? NO_DATA : `≈ ${exact(averageOrder)}`} note={t("forecast.notEnough")} />}
        {!canSeeMoney && <StatTile label={t("forecast.busiestDay")} window={window} value={revenue ? weekdays[busiestDay].long : NO_DATA} note={t("forecast.notEnough")} />}
      </section>

      <ForecastChart
        title={t("forecast.q.trend")}
        subtitle={window}
        currency={currency}
        history={sales.trend.slice(-CHART_DAYS).map((p) => ({ date: p.period, revenue: p.revenue, orders: p.orders }))}
        revenue={revenue && { dates: revenue.dates, values: revenue.values, low: revenue.low, high: revenue.high }}
        orders={orders && { dates: orders.dates, values: orders.values, low: orders.low, high: orders.high }}
        empty={t("forecast.empty.trend")}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("forecast.q.weekdays")} subtitle={window}>
          <BreakdownList rows={weekdays.map((d, i) => ({ name: d.long, value: byWeekday[i], color: METRIC_COLORS.revenue }))} format={money} exact={exact} empty={t("forecast.empty.weekdays")} />
        </Panel>
        <Panel title={t("forecast.q.accuracy")} subtitle={t("forecast.accuracy.window")}>
          <Accuracy projection={revenue} money={money} t={t} />
        </Panel>
      </div>
    </>
  );
}

function Accuracy({ projection, money, t }: { projection: Projection | null; money: (v: number) => string; t: Translate }) {
  const accuracy = projection?.accuracy;
  if (!accuracy) return <ChartEmpty text={t("forecast.accuracy.none")} />;
  return (
    <div>
      <p className="text-[1.75rem] font-semibold leading-tight tabular-nums text-ink">{accuracy.percent.toFixed(1)}%</p>
      <p className="mt-1 text-sm tabular-nums text-muted">{money(accuracy.missed)} / {money(accuracy.actual)}</p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{t("forecast.accuracy.body")}</p>
    </div>
  );
}

// Adds a list of per-branch rows up to one daily map per menu item.
function byItem(rows: DemandRow[]) {
  const items = new Map<string, { category: string; days: Record<string, number> }>();
  for (const row of rows) {
    const entry = items.get(row.item) ?? { category: row.category, days: {} };
    for (const [d, q] of Object.entries(row.days)) entry.days[d] = (entry.days[d] ?? 0) + Number(q);
    items.set(row.item, entry);
  }
  return items;
}

async function DemandForecast({ shared, sales, from, to, branchId }: { shared: Shared; sales: SalesDashboard; from: string; to: string; branchId: string | null }) {
  const { t, today, horizon, window } = shared;
  const rows = await getDemandHistory(from, to, branchId);

  const forecasts = [...byItem(rows)].map(([item, { category, days }]) => ({ item, category, recent: sumRecent(days, today, horizon), projection: project(days, today, horizon) }));
  const known = forecasts.filter((f) => f.projection).sort((a, b) => b.projection!.total - a.projection!.total);
  const skipped = forecasts.length - known.length;
  const totalItems = known.reduce((sum, f) => sum + f.projection!.total, 0);
  const recentItems = known.reduce((sum, f) => sum + f.recent, 0);

  const orders = project(toMap(sales.trend.map((p) => ({ date: p.period, value: p.orders }))), today, horizon);
  const hourTotal = sales.by_hour.reduce((sum, h) => sum + h.orders, 0);
  const hours = orders && hourTotal ? sales.by_hour.map((h) => ({ hour: h.hour, orders: Math.round((h.orders / hourTotal) * orders.total) })) : [];
  const peak = hours.reduce<{ hour: number; orders: number } | null>((best, h) => (!best || h.orders > best.orders ? h : best), null);

  const categories = new Map<string, number>();
  for (const f of known) categories.set(f.category, (categories.get(f.category) ?? 0) + f.projection!.total);
  const units = (v: number) => formatNumber(v);

  return (
    <>
      <section aria-label={t("common.keyFigures")} className="stagger kpi-grid">
        <StatTile hero label={t("forecast.itemsExpected")} window={window} value={known.length ? `≈ ${formatNumber(totalItems)}` : NO_DATA} current={known.length ? totalItems : undefined} previous={recentItems || undefined} compareLabel={t("forecast.compare", { days: horizon })} note={t("forecast.notEnough")} />
        <StatTile label={t("forecast.topItem")} window={window} value={known[0]?.item ?? NO_DATA} note={known[0] ? `≈ ${formatNumber(known[0].projection!.total)} / ${formatNumber(totalItems)}` : t("forecast.notEnough")} />
        <StatTile label={t("forecast.expectedOrders")} window={window} value={orders ? `≈ ${formatNumber(orders.total)}` : NO_DATA} note={orders ? t("forecast.range", { low: formatNumber(orders.totalLow), high: formatNumber(orders.totalHigh) }) : t("forecast.notEnough")} />
        <StatTile label={t("forecast.peakHour")} window={window} value={peak ? formatHour(peak.hour) : NO_DATA} note={peak ? `≈ ${formatNumber(peak.orders)} / ${formatNumber(orders!.total)}` : t("forecast.notEnough")} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("forecast.q.categories")} subtitle={window}>
          <BreakdownList rows={[...categories].map(([name, value]) => ({ name, value, color: nameColor(name) }))} format={units} empty={t("forecast.empty.demand")} />
        </Panel>
        <Panel title={t("forecast.q.hours")} subtitle={window}>
          <OrdersByHourChart data={hours} empty={t("forecast.empty.hours")} />
        </Panel>
      </div>

      <Panel title={t("forecast.q.items")} subtitle={window}>
        {known.length === 0 ? (
          <ChartEmpty text={t("forecast.empty.demand")} />
        ) : (
          <>
            <div className="relative -mx-2 overflow-x-auto">
              <table className="data-table min-w-[560px]">
                <thead>
                  <tr>
                    <th>{t("common.item")}</th>
                    <th>{t("common.category")}</th>
                    <th className="num">{t("forecast.col.expected")}</th>
                    <th className="num">{t("forecast.col.last", { days: horizon })}</th>
                    <th className="num">{t("forecast.col.likely")}</th>
                  </tr>
                </thead>
                <tbody>
                  {known.map((f) => (
                    <tr key={f.item}>
                      <td className="strong">{f.item}</td>
                      <td>{f.category}</td>
                      <td className="num strong">≈ {formatNumber(f.projection!.total)}</td>
                      <td className="num">{f.recent ? formatNumber(f.recent) : NO_DATA}</td>
                      <td className="num">{formatNumber(f.projection!.totalLow)} – {formatNumber(f.projection!.totalHigh)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {skipped > 0 && <p className="mt-3 text-xs text-faint">{t("forecast.tooNew", { count: skipped, total: forecasts.length })}</p>}
          </>
        )}
      </Panel>
    </>
  );
}

const isWhole = (unit: string) => unit === "pcs" || unit === "pack";
const formatQty = (value: number, unit: string) => new Intl.NumberFormat("en-US", { maximumFractionDigits: isWhole(unit) ? 0 : 2 }).format(value);

const OUTLOOK_STYLES = { out: "bg-danger/12 text-danger", low: "bg-warning/12 text-warning", ok: "bg-accent-soft text-accent-text" };

async function InventoryForecast({ shared, from, to, branchId, branches }: { shared: Shared; from: string; to: string; branchId: string | null; branches: { id: string; name: string }[] }) {
  const { t, locale, today, horizon, window, money, exact } = shared;
  const [rows, recipes, stock] = await Promise.all([getDemandHistory(from, to, branchId), getRecipeLines(), getInventory(branchId)]);

  const dates = Array.from({ length: horizon }, (_, i) => addDays(today, i + 1));
  // Each branch's own demand drives that branch's own stock.
  const demand = new Map(rows.map((r) => [`${r.branch_id}|${r.item}`, project(Object.fromEntries(Object.entries(r.days).map(([d, q]) => [d, Number(q)])), today, horizon)]));
  const linesByStock = new Map<string, typeof recipes>();
  for (const line of recipes) linesByStock.set(line.stock_item, [...(linesByStock.get(line.stock_item) ?? []), line]);

  const linked = stock.filter((s) => linesByStock.has(s.name));
  const outlooks = linked
    .map((item) => {
      const dailyUse = dates.map((_, day) => (linesByStock.get(item.name) ?? []).reduce((sum, line) => sum + (demand.get(`${item.branch_id}|${line.menu_item}`)?.values[day] ?? 0) * line.quantity, 0));
      const outlook = stockOutlook(Number(item.quantity), Number(item.reorder_level), dates, dailyUse, isWhole(item.unit));
      const status: keyof typeof OUTLOOK_STYLES = outlook.runsOutOn ? "out" : outlook.suggestedOrder > 0 ? "low" : "ok";
      return { item, outlook, status, cost: outlook.suggestedOrder * Number(item.unit_cost) };
    })
    .sort((a, b) => (a.outlook.runsOutOn ?? "9999").localeCompare(b.outlook.runsOutOn ?? "9999") || b.cost - a.cost);

  const running = outlooks.filter((o) => o.status === "out").length;
  const toOrder = outlooks.filter((o) => o.outlook.suggestedOrder > 0).length;
  const orderCost = outlooks.reduce((sum, o) => sum + o.cost, 0);
  const spend = new Map<string, number>();
  for (const o of outlooks) spend.set(o.item.category, (spend.get(o.item.category) ?? 0) + o.cost);
  const menuItems = new Set(rows.map((r) => r.item));
  const noRecipe = [...menuItems].filter((m) => !recipes.some((r) => r.menu_item === m)).length;
  const showBranch = !branchId && branches.length > 1;
  const has = linked.length > 0;
  const rightWindow = window;

  return (
    <>
      <section aria-label={t("common.keyFigures")} className="stagger kpi-grid">
        <StatTile hero label={t("forecast.runningOut")} window={rightWindow} value={has ? formatNumber(running) : NO_DATA} note={has ? t("inventory.ratio", { count: running, total: linked.length }) : t("forecast.empty.inventoryShort")} />
        <StatTile label={t("forecast.toReorder")} window={rightWindow} value={has ? formatNumber(toOrder) : NO_DATA} note={has ? t("inventory.ratio", { count: toOrder, total: linked.length }) : t("forecast.empty.inventoryShort")} />
        <StatTile label={t("forecast.orderCost")} window={rightWindow} value={has ? money(orderCost) : NO_DATA} exact={exact(orderCost)} note={t("forecast.orderCostNote")} />
        <StatTile label={t("forecast.linked")} window={t("common.rightNow")} value={stock.length ? `${formatNumber(linked.length)}/${formatNumber(stock.length)}` : NO_DATA} note={t("forecast.linkedNote", { count: noRecipe, total: menuItems.size })} />
      </section>

      <Panel title={t("forecast.q.runout")} subtitle={`${window} · ${t("forecast.noDeliveries")}`} action={<Link href="/inventory/recipes" className="btn btn-outline">{t("recipes.title")}</Link>}>
        {!has ? (
          <ChartEmpty text={t("forecast.empty.inventory")} height="h-64" />
        ) : (
          <div className="relative -mx-2 overflow-x-auto">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>{t("common.item")}</th>
                  {showBranch && <th>{t("common.branch")}</th>}
                  <th className="num">{t("inventory.onHand")}</th>
                  <th className="num">{t("forecast.col.use")}</th>
                  <th>{t("forecast.col.runsOut")}</th>
                  <th className="num">{t("forecast.col.order")}</th>
                  <th>{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {outlooks.map(({ item, outlook, status }) => (
                  <tr key={item.id}>
                    <td>
                      <p className="text-ink">{item.name}</p>
                      <p className="text-xs text-faint">{item.category}</p>
                    </td>
                    {showBranch && <td>{item.branches?.name}</td>}
                    <td className="num strong">{formatQty(Number(item.quantity), item.unit)} <span className="text-faint">{item.unit}</span></td>
                    <td className="num">≈ {formatQty(outlook.used, item.unit)}</td>
                    <td className="whitespace-nowrap tabular-nums">{Number(item.quantity) <= 0 ? t("forecast.outNow") : outlook.runsOutOn ? formatDate(outlook.runsOutOn, false, locale) : t("forecast.beyond")}</td>
                    <td className="num strong">{outlook.suggestedOrder ? `${formatQty(outlook.suggestedOrder, item.unit)} ${item.unit}` : NO_DATA}</td>
                    <td><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${OUTLOOK_STYLES[status]}`}>{t(`forecast.status.${status}`)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title={t("forecast.q.spend")} subtitle={window}>
        <BreakdownList rows={[...spend].map(([name, value]) => ({ name, value, color: nameColor(name) }))} format={money} exact={exact} empty={t("forecast.empty.spend")} />
      </Panel>
    </>
  );
}
