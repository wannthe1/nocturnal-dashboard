import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BreakdownList } from "@/components/breakdown-list";
import { CategoryCard } from "@/components/charts-lazy";
import { PlusIcon } from "@/components/icons";
import { Panel } from "@/components/panel";
import { PeriodFilter } from "@/components/period-filter";
import { ExpensesSkeleton } from "@/components/skeletons";
import { StatTile } from "@/components/stat-tile";
import { getCurrentUser } from "@/lib/auth";
import { METRIC_COLORS, expenseColor, nameColor, sharedColor } from "@/lib/chart-colors";
import { getExpenseSeries, getExpenseSummary, getRecentExpenses, type Expense } from "@/lib/expenses";
import { binSeries, formatDate, formatMoney, formatMoneyExact, formatNumber, formatRange, NO_DATA } from "@/lib/format";
import { labelFor, type Locale, type Translate } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { DASHBOARD_PRESETS, readPeriod } from "@/lib/period";
import { getBranches, getSalesDashboard, readBranchId } from "@/lib/sales";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.expenses") };
}

const LIST_LIMIT = 50;

export default function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  return (
    <Suspense fallback={<ExpensesSkeleton />}>
      <ExpensesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ExpensesContent({ searchParams }: { searchParams: PageProps<"/expenses">["searchParams"] }) {
  const params = await searchParams;
  const period = await readPeriod(params, DASHBOARD_PRESETS, "30d");
  const branchId = readBranchId(params.branch);
  const [{ t, locale }, { restaurant }, branches, summary, sales, recent, series] = await Promise.all([
    getI18n(),
    getCurrentUser(),
    getBranches(),
    getExpenseSummary(period, branchId),
    getSalesDashboard(period, branchId),
    getRecentExpenses(period, branchId, LIST_LIMIT),
    getExpenseSeries(period, branchId),
  ]);
  const branch = branches.find((b) => b.id === branchId) ?? null;

  const currency = restaurant?.currency ?? "USD";
  const money = (v: number) => formatMoney(v, currency);
  const exact = (v: number) => formatMoneyExact(v, currency);
  const compareLabel = t(period.compareKey);
  const window = formatRange(period.from, period.to, locale);

  const revenue = sales.current.revenue;
  const hasSales = sales.current.orders > 0;
  const hasExpenses = summary.count > 0;
  const profit = revenue - summary.total;
  const margin = revenue ? (profit / revenue) * 100 : null;
  const prevRevenue = sales.previous.revenue;
  const prevProfit = prevRevenue - summary.previousTotal;
  const canCompare = summary.canCompare && sales.canCompare;

  const expenseBins = series ? binSeries(series, period.from, period.to) : null;
  const revenueBins = binSeries(sales.trend.map((p) => ({ date: p.period, value: p.revenue })), period.from, period.to);
  const profitBins = expenseBins && revenueBins.map((v, i) => v - expenseBins[i]);
  const marginBins = profitBins && profitBins.map((v, i) => (revenueBins[i] ? (v / revenueBins[i]) * 100 : 0));

  const categoryRows = summary.by_category.map((c) => ({ name: labelFor(t, "expenseCat", c.name), value: c.amount, color: expenseColor(c.name) }));
  const branchRows = summary.by_branch.map((b) => (b.name === "Shared" ? { name: t("common.shared"), value: b.amount, color: sharedColor } : { name: b.name, value: b.amount, color: nameColor(b.name) }));

  return (
    <div className="space-y-8">
      <div data-filters className="flex flex-wrap items-start justify-between gap-3">
        <PeriodFilter basePath="/expenses" presets={DASHBOARD_PRESETS} period={period} branch={branch} branches={branches} />
        <Link href="/expenses/new" className="btn btn-primary h-10"><PlusIcon className="h-4 w-4" />{t("expenses.add")}</Link>
      </div>

      <section aria-label={t("common.keyFigures")} className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile hero label={t("common.expenses")} window={window} value={hasExpenses ? money(summary.total) : NO_DATA} exact={exact(summary.total)} current={summary.total} previous={summary.canCompare ? summary.previousTotal : undefined} compareLabel={compareLabel} format={money} upIsGood={false} spark={expenseBins} sparkColor={METRIC_COLORS.expenses} />
        <StatTile
          label={t("common.profit")}
          window={window}
          value={hasSales || hasExpenses ? money(profit) : NO_DATA}
          exact={exact(profit)}
          current={profit}
          // A % change isn't meaningful when the earlier profit was zero or a loss.
          previous={canCompare && prevProfit > 0 ? prevProfit : undefined}
          compareLabel={compareLabel}
          format={money}
          note={canCompare ? t("expenses.noProfitBefore") : undefined}
          spark={profitBins}
          sparkColor={METRIC_COLORS.profit}
        />
        <StatTile label={t("common.margin")} window={window} value={margin === null ? NO_DATA : `${margin.toFixed(1)}%`} note={margin === null ? (branch ? t("expenses.marginBranch") : t("expenses.marginNote")) : `${money(profit)} / ${money(revenue)}`} spark={marginBins} sparkColor={METRIC_COLORS.profit} />
        <StatTile label={t("common.revenue")} window={window} value={hasSales ? money(revenue) : NO_DATA} exact={exact(revenue)} current={revenue} previous={sales.canCompare ? prevRevenue : undefined} compareLabel={compareLabel} format={money} spark={revenueBins} sparkColor={METRIC_COLORS.revenue} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <CategoryCard title={t("expenses.byCategory")} subtitle={window} rows={categoryRows} currency={currency} otherLabel={t("expenseCat.other")} centerLabel={t("common.total")} empty={t("chart.empty.expenses")} />
        {!branch && branches.length > 1 ? (
          <Panel title={t("expenses.byBranch")} subtitle={`${t("expenses.sharedNote")} · ${window}`}>
            <BreakdownList rows={branchRows} format={money} exact={exact} empty={t("chart.empty.expenseBranches")} />
          </Panel>
        ) : (
          <Panel title={t("expenses.where")} subtitle={`${profit > 0 ? t("expenses.shareRevenue") : t("expenses.shareExpenses")} · ${window}`}>
            <BreakdownList rows={[...categoryRows, ...(profit > 0 ? [{ name: t("common.profit"), value: profit, color: METRIC_COLORS.profit }] : [])]} format={money} exact={exact} empty={t("chart.empty.expenses")} />
          </Panel>
        )}
      </div>

      <Panel
        title={t("expenses.list")}
        subtitle={`${summary.count > LIST_LIMIT ? t("expenses.latestOf", { limit: LIST_LIMIT, total: formatNumber(summary.count) }) : t("expenses.count", { count: summary.count })} · ${window}`}
      >
        {hasExpenses ? (
          <ExpenseTable expenses={recent} showBranch={!branch && branches.length > 1} money={exact} t={t} locale={locale} />
        ) : (
          <p className="text-sm text-muted">{t("expenses.emptyBody")}</p>
        )}
      </Panel>
    </div>
  );
}

function ExpenseTable({
  expenses,
  showBranch,
  money,
  t,
  locale,
}: {
  expenses: Expense[];
  showBranch: boolean;
  money: (v: number) => string;
  t: Translate;
  locale: Locale;
}) {
  return (
    // `relative` keeps the screen-reader-only header inside the scroll area.
    <div className="relative -mx-2 overflow-x-auto">
      <table className="data-table min-w-[600px]">
        <thead>
          <tr>
            <th>{t("common.date")}</th>
            <th>{t("common.description")}</th>
            {showBranch && <th>{t("common.branch")}</th>}
            <th className="num">{t("common.amount")}</th>
            <th><span className="sr-only">{t("common.actions")}</span></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id}>
              <td className="whitespace-nowrap tabular-nums">{formatDate(e.spent_on, true, locale)}</td>
              <td>
                <p className="text-ink">{e.description}</p>
                <p className="text-xs text-faint">{labelFor(t, "expenseCat", e.category)}</p>
              </td>
              {showBranch && <td>{e.branches?.name ?? t("common.shared")}</td>}
              <td className="num strong">{money(e.amount)}</td>
              <td className="text-end">
                <Link href={`/expenses/${e.id}`} className="rounded-md px-2 py-1 text-sm font-medium text-accent-text hover:underline" aria-label={`${t("common.edit")}: ${e.description}`}>
                  {t("common.edit")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
