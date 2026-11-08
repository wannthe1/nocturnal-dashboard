import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Panel } from "@/components/panel";
import { FormSkeleton } from "@/components/skeletons";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getInventory } from "@/lib/inventory";
import { getBranches } from "@/lib/sales";
import { ItemForm } from "../item-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("inventory.add") };
}

export default function NewItemPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<FormSkeleton fields={7} />}>
        <NewItemForm />
      </Suspense>
    </div>
  );
}

async function NewItemForm() {
  const [{ t }, branches, items] = await Promise.all([getI18n(), getBranches(), getInventory(), getCurrentUser()]);
  const categories = [...new Set(items.map((i) => i.category))].sort();

  return (
    <div className="rise space-y-5">
      <Breadcrumbs label={t("common.breadcrumb")} items={[{ label: t("nav.inventory"), href: "/inventory" }, { label: t("inventory.add") }]} />
      <Panel title={t("inventory.details")}>
        {branches.length === 0 ? <p className="text-sm text-muted">{t("inventory.noBranch")}</p> : <ItemForm branches={branches} categories={categories} />}
      </Panel>
    </div>
  );
}
