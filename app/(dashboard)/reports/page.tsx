import type { Metadata } from "next";
import { Suspense } from "react";
import { RevenueProfitChart, WaterfallChart } from "@/components/charts-lazy";
import { Panel } from "@/components/panel";
import { PeriodFilter } from "@/components/period-filter";
import { ReportSkeleton } from "@/components/skeletons";
import { StatTile } from "@/components/stat-tile";
import { getCurrentUser } from "@/lib/auth";
import { METRIC_COLORS, expenseColor } from "@/lib/chart-colors";
import { formatMoney, formatMoneyExact, formatMonth, formatNumber, formatRange, NO_DATA } from "@/lib/format";
import { labelFor, type Locale, type Translate } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { REPORT_PRESETS, readPeriod, type Period } from "@/lib/period";
import { getMonthlyReport, type MonthlyReport } from "@/lib/reports";
import { getBranches, readBranchId } from "@/lib/sales";
import { DownloadCsvButton } from "./download-csv";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.reports") };
}

// The P&L table shows the three biggest cost categories; the rest are grouped.
const MAIN_COSTS = ["ingredients", "wages", "rent"] as const;

export default function ReportsPage({ searchParams }: PageProps<"/reports">) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ReportContent({ searchParams }: { searchParams: PageProps<"/reports">["searchParams"] }) {
  const params = await searchParams;
  const period = await readPeriod(params, REPORT_PRESETS, "12m");
  const branchId = readBranchId(params.branch);
  const [{ t, locale }, { restaurant }, branches, report, earlier] = await Promise.all([
    getI18n(),
    getCurrentUser(),
    getBranches(),
    getMonthlyReport(period, branchId),
    getMonthlyReport({ ...period, from: period.previousFrom, to: period.previousTo }, branchId),
  ]);
  const branch = branches.find((b) => b.id === branchId) ?? null;

  const currency = restaurant?.currency ?? "USD";
  const money = (v: number) => formatMoney(v, currency);
  const exact = (v: number) => formatMoneyExact(v, currency);
  // In tables, a month or branch with nothing recorded shows a dash, not $0.00.
  const exactOrDash = (v: number) => (v ? exact(v) : NO_DATA);
  const moneyOrDash = (v: number) => (v ? money(v) : NO_DATA);
  const window = formatRange(period.from, period.to, locale);
  const compareLabel = t(period.compareKey);

  // Only compare when every earlier month has sales, so a half-empty start doesn't mislead.
  const canCompare = earlier.months.length > 0 && earlier.months.every((m) => m.revenue > 0);
  const previous = earlier.months.reduce((sum, m) => ({ revenue: sum.revenue + m.revenue, expenses: sum.expenses + m.expenses }), { revenue: 0, expenses: 0 });
  const previousProfit = previous.revenue - previous.expenses;

  const rows = report.months.map((m) => {
    const main = MAIN_COSTS.map((c) => m.by_category[c] ?? 0);
    const other = m.expenses - main.reduce((a, b) => a + b, 0);
    const profit = m.revenue - m.expenses;
    return {
      month: m.month,
      partial: isPartialMonth(m.month, period),
      revenue: m.revenue,
      orders: m.orders,
      main,
      other,
      expenses: m.expenses,
      profit,
      margin: m.revenue ? (profit / m.revenue) * 100 : null,
    };
  });
  const totals = rows.reduce(
    (sum, r) => ({
      revenue: sum.revenue + r.revenue,
      main: sum.main.map((v, i) => v + r.main[i]),
      other: sum.other + r.other,
      expenses: sum.expenses + r.expenses,
      orders: sum.orders + r.orders,
    }),
    { revenue: 0, main: MAIN_COSTS.map(() => 0), other: 0, expenses: 0, orders: 0 },
  );
  const totalProfit = totals.revenue - totals.expenses;
  const totalMargin = totals.revenue ? (totalProfit / totals.revenue) * 100 : null;
  const hasData = totals.revenue > 0 || totals.expenses > 0;
  const costName = (c: string) => labelFor(t, "expenseCat", c);

  const csvHeader = [t("common.month"), t("common.revenue"), t("common.orders"), ...MAIN_COSTS.map(costName), t("reports.otherCosts"), t("reports.totalCosts"), t("common.profit"), `${t("common.margin")} %`];
  const csvRows = [
    ...rows.map((r) => [
      formatMonth(r.month, false, locale) + (r.partial ? " *" : ""),
      r.revenue.toFixed(2), r.orders, ...r.main.map((v) => v.toFixed(2)), r.other.toFixed(2),
      r.expenses.toFixed(2), r.profit.toFixed(2), r.margin === null ? "" : r.margin.toFixed(1),
    ]),
    [
      t("common.total"), totals.revenue.toFixed(2), totals.orders, ...totals.main.map((v) => v.toFixed(2)), totals.other.toFixed(2),
      totals.expenses.toFixed(2), totalProfit.toFixed(2), totalMargin === null ? "" : totalMargin.toFixed(1),
    ],
  ];

  return (
    <div className="space-y-8">
      <PeriodFilter basePath="/reports" presets={REPORT_PRESETS} period={period} branch={branch} branches={branches} />

      <section aria-label={t("common.keyFigures")} className="stagger kpi-grid">
        <StatTile hero label={t("common.profit")} window={window} value={hasData ? money(totalProfit) : NO_DATA} exact={exact(totalProfit)} current={totalProfit} previous={canCompare && previousProfit > 0 ? previousProfit : undefined} compareLabel={compareLabel} format={money} note={totalProfit < 0 ? t("reports.loss") : t("overview.profitNote")} spark={rows.map((r) => r.profit)} sparkColor={METRIC_COLORS.profit} />
        <StatTile label={t("common.margin")} window={window} value={totalMargin === null ? NO_DATA : `${totalMargin.toFixed(1)}%`} note={totalMargin === null ? t("expenses.marginNote") : `${money(totalProfit)} / ${money(totals.revenue)}`} spark={rows.map((r) => r.margin ?? 0)} sparkColor={METRIC_COLORS.profit} />
        <StatTile label={t("common.revenue")} window={window} value={totals.revenue ? money(totals.revenue) : NO_DATA} exact={exact(totals.revenue)} current={totals.revenue} previous={canCompare ? previous.revenue : undefined} compareLabel={compareLabel} format={money} note={t("chart.orders", { count: formatNumber(totals.orders) })} spark={rows.map((r) => r.revenue)} sparkColor={METRIC_COLORS.revenue} />
        <StatTile label={t("common.costs")} window={window} value={totals.expenses ? money(totals.expenses) : NO_DATA} exact={exact(totals.expenses)} current={totals.expenses} previous={canCompare ? previous.expenses : undefined} compareLabel={compareLabel} format={money} upIsGood={false} note={branch ? t("reports.branchOnly") : t("reports.withShared")} spark={rows.map((r) => r.expenses)} sparkColor={METRIC_COLORS.expenses} />
      </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={t("reports.revenueProfit")} subtitle={`${t("reports.revenueProfitNote")} · ${window}`}>
              <RevenueProfitChart data={rows.map((r) => ({ month: r.month, revenue: r.revenue, profit: r.profit, partial: r.partial }))} currency={currency} empty={t("chart.empty.profit")} />
            </Panel>
            <Panel title={t("reports.waterfall")} subtitle={`${t("reports.waterfallNote")} · ${window}`}>
              <WaterfallChart
                currency={currency}
                empty={t("chart.empty.waterfall")}
                steps={[
                  { label: t("common.revenue"), value: totals.revenue, kind: "total", color: METRIC_COLORS.revenue },
                  { label: t("reports.short.ingredients"), value: totals.main[0], kind: "cost", color: expenseColor("ingredients") },
                  { label: t("reports.short.wages"), value: totals.main[1], kind: "cost", color: expenseColor("wages") },
                  { label: t("expenseCat.rent"), value: totals.main[2], kind: "cost", color: expenseColor("rent") },
                  { label: t("expenseCat.other"), value: totals.other, kind: "cost", color: expenseColor("other") },
                  { label: t("common.profit"), value: totalProfit, kind: "result", color: METRIC_COLORS.profit },
                ]}
              />
            </Panel>
          </div>

          <Panel
            title={t("reports.monthly")}
            subtitle={window}
            action={hasData && <DownloadCsvButton fileName={`nocturnal-tech-report_${period.from}_to_${period.to}${branch ? `_${branch.name}` : ""}.csv`} header={csvHeader} rows={csvRows} />}
          >
            {hasData ? <PnlTable rows={rows} totals={{ ...totals, profit: totalProfit, margin: totalMargin }} exact={exactOrDash} t={t} locale={locale} /> : <p className="text-sm text-muted">{t("reports.emptyBody")}</p>}
            {rows.some((r) => r.partial) && <p className="mt-3 text-xs text-faint">* {t("reports.partialNote")}</p>}
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={branch ? t("reports.branchSummary") : t("reports.branchCompare")} subtitle={`${t("reports.excludesShared")} · ${window}`}>
              <BranchTable report={report} money={moneyOrDash} showShared={!branch} t={t} />
            </Panel>
            <Panel title={t("sales.topItems")} subtitle={`${t("reports.topItemsNote")} · ${window}`}>
              <TopItems items={report.top_items} money={money} t={t} />
            </Panel>
          </div>
    </div>
  );
}

function isPartialMonth(month: string, period: Period) {
  const start = new Date(`${month}T00:00:00Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return month < period.from || end.toISOString().slice(0, 10) > period.to;
}

type PnlRow = { month: string; partial: boolean; revenue: number; main: number[]; other: number; expenses: number; profit: number; margin: number | null };

function PnlTable({
  rows,
  totals,
  exact,
  t,
  locale,
}: {
  rows: PnlRow[];
  totals: { revenue: number; main: number[]; other: number; expenses: number; profit: number; margin: number | null };
  exact: (v: number) => string;
  t: Translate;
  locale: Locale;
}) {
  const signed = (v: number) => (v ? `${v < 0 ? "−" : ""}${exact(Math.abs(v))}` : NO_DATA);
  const profitClass = (v: number) => (v < 0 ? "text-danger" : "strong");
  return (
    <div className="relative -mx-2 overflow-x-auto">
      <table className="data-table min-w-[860px]">
        <thead>
          <tr>
            <th>{t("common.month")}</th>
            <th className="num">{t("common.revenue")}</th>
            {MAIN_COSTS.map((c) => <th key={c} className="num">{labelFor(t, "expenseCat", c)}</th>)}
            <th className="num">{t("reports.otherCosts")}</th>
            <th className="num">{t("reports.totalCosts")}</th>
            <th className="num">{t("common.profit")}</th>
            <th className="num">{t("common.margin")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <td className="strong whitespace-nowrap">{formatMonth(r.month, false, locale)}{r.partial && "*"}</td>
              <td className="num strong">{exact(r.revenue)}</td>
              {r.main.map((v, i) => <td key={i} className="num">{exact(v)}</td>)}
              <td className="num">{exact(r.other)}</td>
              <td className="num">{exact(r.expenses)}</td>
              <td className={`num ${profitClass(r.profit)}`}>{signed(r.profit)}</td>
              <td className="num">{r.margin === null ? NO_DATA : `${r.margin.toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line-strong font-semibold text-ink [&>td]:px-2 [&>td]:py-3">
            <td>{t("common.total")}</td>
            <td className="text-end tabular-nums">{exact(totals.revenue)}</td>
            {totals.main.map((v, i) => <td key={i} className="text-end tabular-nums">{exact(v)}</td>)}
            <td className="text-end tabular-nums">{exact(totals.other)}</td>
            <td className="text-end tabular-nums">{exact(totals.expenses)}</td>
            <td className={`text-end tabular-nums ${totals.profit < 0 ? "text-danger" : ""}`}>{signed(totals.profit)}</td>
            <td className="text-end tabular-nums">{totals.margin === null ? NO_DATA : `${totals.margin.toFixed(1)}%`}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BranchTable({ report, money, showShared, t }: { report: MonthlyReport; money: (v: number) => string; showShared: boolean; t: Translate }) {
  return (
    <>
      <div className="relative -mx-2 overflow-x-auto">
        <table className="data-table min-w-[460px]">
          <thead>
            <tr>
              <th>{t("common.branch")}</th>
              <th className="num">{t("common.revenue")}</th>
              <th className="num">{t("common.costs")}</th>
              <th className="num">{t("common.profit")}</th>
              <th className="num">{t("common.margin")}</th>
            </tr>
          </thead>
          <tbody>
            {report.branches.map((b) => {
              const profit = b.revenue - b.expenses;
              return (
                <tr key={b.name}>
                  <td className="strong">{b.name}</td>
                  <td className="num strong">{money(b.revenue)}</td>
                  <td className="num">{money(b.expenses)}</td>
                  <td className={`num ${profit < 0 ? "text-danger" : "strong"}`}>{money(profit)}</td>
                  <td className="num">{b.revenue ? `${((profit / b.revenue) * 100).toFixed(1)}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showShared && report.shared_expenses > 0 && <p className="mt-3 text-xs text-faint">{t("reports.plusShared", { amount: money(report.shared_expenses) })}</p>}
    </>
  );
}

function TopItems({ items, money, t }: { items: MonthlyReport["top_items"]; money: (v: number) => string; t: Translate }) {
  if (items.length === 0) return <p className="text-sm text-faint">{t("common.noSales")}</p>;
  return (
    <ol className="divide-y divide-line text-sm">
      {items.map((item, i) => (
        <li key={`${item.name}-${item.category}`} className="flex items-center justify-between gap-3 py-2.5">
          <span className="flex min-w-0 items-baseline gap-3">
            <span className="w-5 shrink-0 text-end tabular-nums text-faint">{i + 1}</span>
            <span className="truncate text-ink">{item.name}</span>
          </span>
          <span className="shrink-0 tabular-nums text-muted">
            {t("reports.soldCount", { count: formatNumber(item.quantity) })} · <span className="text-ink">{money(item.revenue)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
