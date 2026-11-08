import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlusIcon } from "@/components/icons";
import { LinkSegmented } from "@/components/link-segmented";
import { Panel } from "@/components/panel";
import { SearchBox } from "@/components/search-box";
import { InventorySkeleton } from "@/components/skeletons";
import { StatTile } from "@/components/stat-tile";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, formatMoneyExact, formatNumber, NO_DATA } from "@/lib/format";
import type { Translate } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { getInventory, stockStatus, type InventoryItem, type StockStatus } from "@/lib/inventory";
import { getBranches, readBranchId } from "@/lib/sales";
import { closestMatch, type Suggestion } from "@/lib/search";
import { StockBadge } from "./stock-badge";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.inventory") };
}

const STATUS_KEYS = ["all", "low", "out"] as const;
type StatusFilter = (typeof STATUS_KEYS)[number];

export default function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  return (
    <Suspense fallback={<InventorySkeleton />}>
      <InventoryContent searchParams={searchParams} />
    </Suspense>
  );
}

async function InventoryContent({ searchParams }: { searchParams: PageProps<"/inventory">["searchParams"] }) {
  const params = await searchParams;
  const status: StatusFilter = STATUS_KEYS.includes(params.status as StatusFilter) ? (params.status as StatusFilter) : "all";
  const search = typeof params.q === "string" ? params.q.trim() : "";

  const branchId = readBranchId(params.branch);
  const [{ t }, { restaurant }, branches, items] = await Promise.all([getI18n(), getCurrentUser(), getBranches(), getInventory(branchId)]);
  const branch = branches.find((b) => b.id === branchId) ?? null;
  const currency = restaurant?.currency ?? "USD";

  // Figures for the selected branch (or all), before the status/search filters.
  const counts = { low: 0, out: 0 };
  let stockValue = 0;
  for (const item of items) {
    const s = stockStatus(item);
    if (s === "out") counts.out++;
    if (s !== "ok") counts.low++;
    stockValue += item.quantity * item.unit_cost;
  }

  const visible = items.filter((item) => {
    const s = stockStatus(item);
    if (status === "low" && s === "ok") return false;
    if (status === "out" && s !== "out") return false;
    if (search && !`${item.name} ${item.category}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  // What needs action comes first: out of stock, then low, then the rest.
  const urgency = { out: 0, low: 1, ok: 2 };
  visible.sort((a, b) => urgency[stockStatus(a)] - urgency[stockStatus(b)]);

  // Suggestions for the search box: each item name and each category.
  const byName = new Map<string, { category: string; count: number }>();
  const byCategory = new Map<string, number>();
  for (const item of items) {
    const entry = byName.get(item.name);
    byName.set(item.name, { category: item.category, count: (entry?.count ?? 0) + 1 });
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + 1);
  }
  const showBranchCount = !branch && branches.length > 1;
  const suggestions: Suggestion[] = [
    ...[...byName].map(([name, { category, count }]) => ({
      value: name,
      label: name,
      detail: showBranchCount ? `${category} · ${t("inventory.branches", { count })}` : category,
    })),
    ...[...byCategory].map(([category, count]) => ({
      value: category,
      label: category,
      detail: `${t("common.category")} · ${t("inventory.items", { count })}`,
    })),
  ];
  // For a search with no results, suggest the closest name in case of a typo.
  const didYouMean = search && visible.length === 0 ? closestMatch(search, suggestions.map((s) => s.label)) : null;

  const rightNow = t("common.rightNow");

  const href = (next: { status?: StatusFilter; branch?: string | null; q?: string }) => {
    const p = new URLSearchParams();
    const s = next.status ?? status;
    if (s !== "all") p.set("status", s);
    const b = next.branch === undefined ? branch?.id : next.branch;
    if (b) p.set("branch", b);
    const q = next.q ?? search;
    if (q) p.set("q", q);
    const qs = p.toString();
    return qs ? `/inventory?${qs}` : "/inventory";
  };

  return (
    <div className="space-y-8">
      <section aria-label={t("common.keyFigures")} className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile hero label={t("inventory.lowStock")} window={rightNow} value={items.length ? formatNumber(counts.low) : NO_DATA} note={items.length ? `${t("inventory.ratio", { count: counts.low, total: items.length })} · ${t("inventory.lowNote")}` : t("inventory.lowNote")} />
        <StatTile label={t("inventory.outOfStock")} window={rightNow} value={items.length ? formatNumber(counts.out) : NO_DATA} note={items.length ? t("inventory.ratio", { count: counts.out, total: items.length }) : t("inventory.outNote")} />
        <StatTile label={t("inventory.value")} window={rightNow} value={items.length ? formatMoney(stockValue, currency) : NO_DATA} exact={formatMoneyExact(stockValue, currency)} note={t("inventory.valueNote")} />
        <StatTile label={t("inventory.tracked")} window={rightNow} value={items.length ? formatNumber(items.length) : NO_DATA} note={branch ? branch.name : t("common.allBranches")} />
      </section>

      <div data-filters className="relative z-20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2.5">
          <LinkSegmented
            label={t("common.status")}
            value={status}
            items={STATUS_KEYS.map((key) => ({ key, label: t(`inventory.filter.${key}`), href: href({ status: key }) }))}
          />
          {branches.length > 1 && (
            <LinkSegmented
              label={t("common.branch")}
              value={branch?.id ?? "all"}
              items={[
                { key: "all", label: t("common.allBranches"), href: href({ branch: null }) },
                ...branches.map((b) => ({ key: b.id, label: b.name, href: href({ branch: b.id }) })),
              ]}
            />
          )}
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          {/* key resets the box when the search changes from a link (e.g. "Did you mean"). */}
          <SearchBox
            key={search}
            action="/inventory"
            defaultValue={search}
            hidden={{ ...(status !== "all" && { status }), ...(branch && { branch: branch.id }) }}
            suggestions={suggestions}
            placeholder={t("inventory.searchPlaceholder")}
            label={t("inventory.searchLabel")}
          />
          <Link href="/inventory/recipes" className="btn btn-ghost h-10">{t("recipes.title")}</Link>
          <Link href="/inventory/new" className="btn btn-primary h-10"><PlusIcon className="h-4 w-4" />{t("inventory.add")}</Link>
        </div>
      </div>

      <Panel title={t("inventory.items", { count: formatNumber(visible.length) })} subtitle={search ? `${t("inventory.matching", { search })} · ${rightNow}` : rightNow}>
        {branches.length === 0 ? (
          <p className="text-sm text-muted">{t("inventory.noBranch")}</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-faint">
            {t("inventory.noMatch")}
            {didYouMean && (
              <>
                {" "}{t("search.didYouMean")}{" "}
                <Link href={href({ q: didYouMean })} className="font-medium text-accent-text hover:underline">{didYouMean}</Link>
              </>
            )}
          </p>
        ) : (
          <InventoryTable items={visible} showBranch={!branch && branches.length > 1} currency={currency} t={t} />
        )}
      </Panel>
    </div>
  );
}

const formatQty = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

async function InventoryTable({ items, showBranch, currency, t }: { items: InventoryItem[]; showBranch: boolean; currency: string; t: Translate }) {
  return (
    // `relative` keeps the screen-reader-only header inside the scroll area.
    <div className="relative -mx-2 overflow-x-auto">
      <table className="data-table min-w-[640px]">
        <thead>
          <tr>
            <th>{t("common.item")}</th>
            {showBranch && <th>{t("common.branch")}</th>}
            <th className="num">{t("inventory.onHand")}</th>
            <th className="num">{t("inventory.reorderAt")}</th>
            <th className="num">{t("inventory.valueCol")}</th>
            <th>{t("common.status")}</th>
            <th><span className="sr-only">{t("common.actions")}</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <p className="text-ink">{item.name}</p>
                <p className="text-xs text-faint">{item.category}</p>
              </td>
              {showBranch && <td>{item.branches?.name}</td>}
              <td className="num strong">{formatQty(item.quantity)} <span className="text-faint">{item.unit}</span></td>
              <td className="num">{formatQty(item.reorder_level)}</td>
              <td className="num">{formatMoneyExact(item.quantity * item.unit_cost, currency)}</td>
              <td><StockBadge status={stockStatus(item) as StockStatus} /></td>
              <td className="text-end">
                <Link href={`/inventory/${item.id}`} className="rounded-md px-2 py-1 text-sm font-medium text-accent-text hover:underline" aria-label={`${t("common.edit")}: ${item.name}${showBranch ? ` (${item.branches?.name})` : ""}`}>
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
