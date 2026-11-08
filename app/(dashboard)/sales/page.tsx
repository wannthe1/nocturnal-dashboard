import type { Metadata } from "next";
import { Suspense } from "react";
import { BreakdownList } from "@/components/breakdown-list";
import { OrdersByHourChart, TrendCard } from "@/components/charts-lazy";
import { Panel } from "@/components/panel";
import { PeriodFilter } from "@/components/period-filter";
import { SalesSkeleton } from "@/components/skeletons";
import { StatTile } from "@/components/stat-tile";
import { getCurrentUser } from "@/lib/auth";
import { METRIC_COLORS, channelColor, nameColor } from "@/lib/chart-colors";
import { binSeries, formatHour, formatMoney, formatMoneyExact, formatNumber, formatRange, NO_DATA } from "@/lib/format";
import { labelFor } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { DASHBOARD_PRESETS, readPeriod } from "@/lib/period";
import { getBranches, getSalesDashboard, readBranchId } from "@/lib/sales";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.sales") };
}

export default function SalesPage({ searchParams }: PageProps<"/sales">) {
  return (
    <Suspense fallback={<SalesSkeleton />}>
      <SalesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SalesContent({ searchParams }: { searchParams: PageProps<"/sales">["searchParams"] }) {
  const params = await searchParams;
  const period = await readPeriod(params, DASHBOARD_PRESETS, "30d");
  const branchId = readBranchId(params.branch);
  const [{ t, locale }, { restaurant }, branches, data] = await Promise.all([getI18n(), getCurrentUser(), getBranches(), getSalesDashboard(period, branchId)]);
  const branch = branches.find((b) => b.id === branchId) ?? null;

  const currency = restaurant?.currency ?? "USD";
  const money = (v: number) => formatMoney(v, currency);
  const exact = (v: number) => formatMoneyExact(v, currency);
  const window = formatRange(period.from, period.to, locale);
  const { current, previous } = data;
  const avgOrder = current.orders ? current.revenue / current.orders : 0;
  const prevAvgOrder = previous.orders ? previous.revenue / previous.orders : 0;
  // Without a full previous period of sales, the tiles say there's nothing to compare.
  const hasSales = current.orders > 0;
  const prev = data.canCompare ? { ...previous, avg: prevAvgOrder } : undefined;
  const compareLabel = t(period.compareKey);

  const byDay = data.bucket === "day";
  const bins = (pick: (p: (typeof data.trend)[number]) => number) =>
    byDay ? binSeries(data.trend.map((p) => ({ date: p.period, value: pick(p) })), period.from, period.to) : data.trend.map(pick);
  const revenueBins = bins((p) => p.revenue);
  const orderBins = bins((p) => p.orders);
  const avgBins = revenueBins.map((v, i) => (orderBins[i] ? v / orderBins[i] : 0));
  const channelRows = data.by_channel.map((r) => ({ name: labelFor(t, "channel", r.name), value: r.revenue, color: channelColor(r.name) }));
  const empty = { channels: t("chart.empty.channels"), branches: t("chart.empty.branches"), categories: t("chart.empty.categories") };
  const busiest = data.by_hour.reduce<{ hour: number; orders: number } | null>((best, h) => (!best || h.orders > best.orders ? h : best), null);

  return (
    <div className="space-y-8">
      <PeriodFilter basePath="/sales" presets={DASHBOARD_PRESETS} period={period} branch={branch} branches={branches} />

      {branches.length === 0 ? (
        <Panel title={t("sales.emptyTitle")}>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">{t("sales.emptyBody")}</p>
        </Panel>
      ) : (
        <>
          <section aria-label={t("common.keyFigures")} className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile hero label={t("common.revenue")} window={window} value={hasSales ? money(current.revenue) : NO_DATA} exact={exact(current.revenue)} current={current.revenue} previous={prev?.revenue} compareLabel={compareLabel} format={money} spark={revenueBins} sparkColor={METRIC_COLORS.revenue} />
            <StatTile label={t("common.orders")} window={window} value={hasSales ? formatNumber(current.orders) : NO_DATA} current={current.orders} previous={prev?.orders} compareLabel={compareLabel} spark={orderBins} sparkColor={METRIC_COLORS.orders} />
            <StatTile label={t("sales.avgOrder")} window={window} value={hasSales ? formatMoneyExact(avgOrder, currency) : NO_DATA} current={avgOrder} previous={prev?.avg} compareLabel={compareLabel} format={exact} spark={avgBins} sparkColor={METRIC_COLORS.revenue} />
            <StatTile label={t("sales.itemsSold")} window={window} value={hasSales ? formatNumber(current.items) : NO_DATA} current={current.items} previous={prev?.items} compareLabel={compareLabel} spark={null} />
          </section>

          <TrendCard title={t("sales.overTime")} subtitle={`${t(`chart.bucket.${data.bucket}`)} · ${window}`} data={data.trend} bucket={data.bucket} currency={currency} lastDay={data.to} today={period.today} empty={t("chart.empty.trend")} />

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={t("sales.byCategory")} subtitle={window}>
              <BreakdownList rows={data.by_category.map((r) => ({ name: r.name, value: r.revenue, color: nameColor(r.name) }))} format={money} exact={exact} empty={empty.categories} />
            </Panel>
            <Panel title={branch ? t("sales.byChannel") : t("sales.byBranch")} subtitle={window}>
              <BreakdownList rows={branch ? channelRows : data.by_branch.map((r) => ({ name: r.name, value: r.revenue, color: nameColor(r.name) }))} format={money} exact={exact} empty={branch ? empty.channels : empty.branches} />
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={t("sales.busiestHours")} subtitle={`${busiest && busiest.orders > 0 ? t("sales.peak", { hour: formatHour(busiest.hour) }) : t("sales.ordersByTime")} · ${window}`}>
              <OrdersByHourChart data={data.by_hour} empty={t("chart.empty.hours")} />
            </Panel>
            {branch ? (
              <TopItems items={data.top_items} money={money} t={t} window={window} />
            ) : (
              <Panel title={t("sales.byChannel")} subtitle={window}>
                <BreakdownList rows={channelRows} format={money} exact={exact} empty={empty.channels} />
              </Panel>
            )}
          </div>

          {!branch && <TopItems items={data.top_items} money={money} t={t} window={window} />}
        </>
      )}
    </div>
  );
}

function TopItems({
  items,
  money,
  t,
  window,
}: {
  window: string;
  items: { name: string; category: string; quantity: number; revenue: number }[];
  money: (v: number) => string;
  t: Awaited<ReturnType<typeof getI18n>>["t"];
}) {
  return (
    <Panel title={t("sales.topItems")} subtitle={`${t("sales.byRevenue")} · ${window}`}>
      {items.length === 0 ? (
        <p className="text-sm text-faint">{t("common.noSales")}</p>
      ) : (
        <div className="relative -mx-2 overflow-x-auto">
          <table className="data-table min-w-[420px]">
            <thead>
              <tr>
                <th>{t("common.item")}</th>
                <th>{t("common.category")}</th>
                <th className="num">{t("common.sold")}</th>
                <th className="num">{t("common.revenue")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.name}>
                  <td className="strong">{item.name}</td>
                  <td>{item.category}</td>
                  <td className="num">{formatNumber(item.quantity)}</td>
                  <td className="num strong">{money(item.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
