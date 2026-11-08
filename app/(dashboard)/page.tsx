import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BrandBanner } from "@/components/brand-banner";
import { BreakdownList } from "@/components/breakdown-list";
import { ChartEmpty } from "@/components/chart-empty";
import { TrendCard } from "@/components/charts-lazy";
import { Panel } from "@/components/panel";
import { PeriodFilter } from "@/components/period-filter";
import { OverviewSkeleton } from "@/components/skeletons";
import { Ring } from "@/components/sparkline";
import { StatTile } from "@/components/stat-tile";
import { requireAccess } from "@/lib/auth";
import { METRIC_COLORS, channelColor } from "@/lib/chart-colors";
import { getExpenseSeries, getExpenseSummary } from "@/lib/expenses";
import { binSeries, formatMoney, formatMoneyExact, formatNumber, formatRange, NO_DATA } from "@/lib/format";
import { labelFor } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { getStockCounts } from "@/lib/inventory";
import { DASHBOARD_PRESETS, readPeriod } from "@/lib/period";
import { getBranches, getSalesDashboard, readBranchId } from "@/lib/sales";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.overview") };
}

export default function OverviewPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const period = await readPeriod(params, DASHBOARD_PRESETS, "30d");
  const branchId = readBranchId(params.branch);
  const [{ t, locale }, { restaurant }, branches, sales, expenses, series, stock] = await Promise.all([
    getI18n(),
    requireAccess("overview"),
    getBranches(),
    getSalesDashboard(period, branchId),
    getExpenseSummary(period, branchId),
    getExpenseSeries(period, branchId),
    getStockCounts(),
  ]);
  const branch = branches.find((b) => b.id === branchId) ?? null;

  const currency = restaurant?.currency ?? "USD";
  const money = (v: number) => formatMoney(v, currency);
  const exact = (v: number) => formatMoneyExact(v, currency);
  const window = formatRange(period.from, period.to, locale);
  const compareLabel = t(period.compareKey);

  const revenue = sales.current.revenue;
  const hasSales = sales.current.orders > 0;
  const hasExpenses = expenses.count > 0;
  const profit = revenue - expenses.total;
  const margin = revenue ? (profit / revenue) * 100 : null;
  const canCompare = sales.canCompare && expenses.canCompare;
  const previousProfit = sales.previous.revenue - expenses.previousTotal;

  // Small trend lines. Daily data is grouped so every tile has the same shape.
  const byDay = sales.bucket === "day";
  const revenueBins = binSeries(sales.trend.map((p) => ({ date: p.period, value: p.revenue })), period.from, period.to);
  const orderBins = binSeries(sales.trend.map((p) => ({ date: p.period, value: p.orders })), period.from, period.to);
  const expenseBins = series ? binSeries(series, period.from, period.to) : null;
  const profitBins = byDay && expenseBins ? revenueBins.map((v, i) => v - expenseBins[i]) : null;

  return (
    <div className="space-y-8">
      <BrandBanner
        eyebrow={t("overview.welcome")}
        title={restaurant?.name ?? t("account.myRestaurant")}
        line={hasSales ? t("overview.bannerLine", { revenue: money(revenue), orders: formatNumber(sales.current.orders) }) : t("common.noSales")}
      />

      <PeriodFilter basePath="/" presets={DASHBOARD_PRESETS} period={period} branch={branch} branches={branches} />

      {/* The main decision first: are we making money? */}
      <section aria-label={t("common.keyFigures")} className="stagger kpi-grid">
        <StatTile
          hero
          label={t("common.profit")}
          window={window}
          value={hasSales || hasExpenses ? money(profit) : NO_DATA}
          exact={exact(profit)}
          current={profit}
          previous={canCompare && previousProfit > 0 ? previousProfit : undefined}
          compareLabel={compareLabel}
          format={money}
          note={t("overview.profitNote")}
          spark={profitBins}
          sparkColor={METRIC_COLORS.profit}
          href="/reports"
        />
        <StatTile label={t("overview.totalRevenue")} window={window} value={hasSales ? money(revenue) : NO_DATA} exact={exact(revenue)} current={revenue} previous={sales.canCompare ? sales.previous.revenue : undefined} compareLabel={compareLabel} format={money} spark={byDay ? revenueBins : sales.trend.map((p) => p.revenue)} sparkColor={METRIC_COLORS.revenue} href="/sales" />
        <StatTile label={t("overview.totalExpenses")} window={window} value={hasExpenses ? money(expenses.total) : NO_DATA} exact={exact(expenses.total)} current={expenses.total} previous={expenses.canCompare ? expenses.previousTotal : undefined} compareLabel={compareLabel} format={money} upIsGood={false} spark={expenseBins} sparkColor={METRIC_COLORS.expenses} href="/expenses" />
        <StatTile label={t("common.orders")} window={window} value={hasSales ? formatNumber(sales.current.orders) : NO_DATA} current={sales.current.orders} previous={sales.canCompare ? sales.previous.orders : undefined} compareLabel={compareLabel} spark={byDay ? orderBins : sales.trend.map((p) => p.orders)} sparkColor={METRIC_COLORS.orders} href="/sales" />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <TrendCard title={t("overview.revenueTrend")} subtitle={`${t(`chart.bucket.${sales.bucket}`)} · ${window}`} data={sales.trend} bucket={sales.bucket} currency={currency} lastDay={sales.to} today={period.today} empty={t("chart.empty.trend")} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title={t("overview.healthTitle")} subtitle={window}>
            {margin === null ? (
              <ChartEmpty text={t("chart.empty.margin")} height="h-24" />
            ) : (
              <div className="flex items-center gap-5">
                <Ring percent={margin} label={`${margin.toFixed(1)}%`} />
                <p className="min-w-0 text-sm tabular-nums text-muted">
                  <span className="font-semibold text-ink">{money(profit)}</span> / {money(revenue)}
                </p>
              </div>
            )}
          </Panel>

          <Link href="/inventory?status=low" className="card group flex min-h-36 items-center justify-between gap-4 p-5 transition-transform duration-300 hover:-translate-y-0.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted">{t("overview.lowStock")}</p>
              <p className="text-xs text-faint">{t("common.rightNow")}</p>
              <p className="mt-1 text-[1.75rem] font-semibold leading-tight tabular-nums text-ink">{stock.total ? `${formatNumber(stock.low)}/${formatNumber(stock.total)}` : NO_DATA}</p>
              <p className="mt-0.5 text-xs text-faint">{stock.low ? t("overview.needsReorder") : t("overview.allStocked")}</p>
            </div>
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stock.low ? "bg-warning" : "bg-success"}`} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title={t("sales.topItems")} subtitle={`${t("sales.byRevenue")} · ${window}`} className="lg:col-span-2">
          {sales.top_items.length === 0 ? (
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
                  {sales.top_items.slice(0, 6).map((item) => (
                    <tr key={item.name}>
                      <td className="strong">{item.name}</td>
                      <td>{item.category}</td>
                      <td className="num">{formatNumber(item.quantity)}</td>
                      <td className="num strong" title={exact(item.revenue)}>{money(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title={t("sales.byChannel")} subtitle={window}>
          <BreakdownList rows={sales.by_channel.map((r) => ({ name: labelFor(t, "channel", r.name), value: r.revenue, color: channelColor(r.name) }))} format={money} exact={exact} empty={t("chart.empty.channels")} />
        </Panel>
      </div>
    </div>
  );
}
