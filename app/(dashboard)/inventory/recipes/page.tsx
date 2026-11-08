import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CloseIcon } from "@/components/icons";
import { Panel } from "@/components/panel";
import { FormSkeleton } from "@/components/skeletons";
import { getCurrentUser } from "@/lib/auth";
import { addDays } from "@/lib/forecast";
import { getDemandHistory, getRecipeLines } from "@/lib/forecast-data";
import { getI18n } from "@/lib/i18n/server";
import { getInventory } from "@/lib/inventory";
import { getToday } from "@/lib/period";
import { deleteRecipeLine } from "./actions";
import { RecipeForm } from "./recipe-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("recipes.title") };
}

export default function RecipesPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <Recipes />
      </Suspense>
    </div>
  );
}

async function Recipes() {
  const today = await getToday();
  const [{ t }, , lines, stock, sold] = await Promise.all([getI18n(), getCurrentUser(), getRecipeLines(), getInventory(), getDemandHistory(addDays(today, -91), addDays(today, -1))]);

  const menuItems = [...new Set([...sold.map((r) => r.item), ...lines.map((l) => l.menu_item)])].sort();
  const stockItems = [...new Map(stock.map((s) => [s.name, { name: s.name, unit: s.unit }])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const unitOf = new Map(stockItems.map((s) => [s.name, s.unit]));
  const grouped = menuItems.map((item) => ({ item, lines: lines.filter((l) => l.menu_item === item) })).filter((g) => g.lines.length);

  return (
    <div className="rise space-y-8">
      <Breadcrumbs label={t("common.breadcrumb")} items={[{ label: t("nav.inventory"), href: "/inventory" }, { label: t("recipes.title") }]} />

      <Panel title={t("recipes.q")} subtitle={t("recipes.note")}>
        <RecipeForm menuItems={menuItems} stockItems={stockItems} />
      </Panel>

      <Panel title={t("recipes.title")} subtitle={t("recipes.count", { count: grouped.length, total: menuItems.length })}>
        {grouped.length === 0 ? (
          <p className="text-sm text-faint">{t("recipes.empty")}</p>
        ) : (
          <div className="space-y-6">
            {grouped.map((g) => (
              <section key={g.item}>
                <h3 className="text-sm font-semibold text-ink">{g.item}</h3>
                <ul className="mt-2 divide-y divide-line">
                  {g.lines.map((line) => (
                    <li key={line.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                      <span className="min-w-0 truncate text-muted">{line.stock_item}</span>
                      <span className="flex shrink-0 items-center gap-2 tabular-nums text-ink">
                        {line.quantity} {unitOf.get(line.stock_item) ?? ""}
                        <form action={deleteRecipeLine.bind(null, line.id)}>
                          <button type="submit" aria-label={`${t("recipes.remove")}: ${line.stock_item}`} title={t("recipes.remove")} className="grid h-7 w-7 place-items-center rounded-full text-faint transition-colors hover:bg-danger/12 hover:text-danger">
                            <CloseIcon className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
