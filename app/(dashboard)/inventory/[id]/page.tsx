import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DeleteButton } from "@/components/delete-button";
import { Panel } from "@/components/panel";
import { FormSkeleton } from "@/components/skeletons";
import { getI18n } from "@/lib/i18n/server";
import { getInventory, getInventoryItem } from "@/lib/inventory";
import { getBranches } from "@/lib/sales";
import { deleteItem } from "../actions";
import { ItemForm } from "../item-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("inventory.edit") };
}

export default function EditItemPage({ params }: PageProps<"/inventory/[id]">) {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<FormSkeleton fields={7} />}>
        <EditItem params={params} />
      </Suspense>
    </div>
  );
}

async function EditItem({ params }: { params: PageProps<"/inventory/[id]">["params"] }) {
  const { id } = await params;
  const [{ t }, item, branches, items] = await Promise.all([getI18n(), getInventoryItem(id), getBranches(), getInventory()]);
  if (!item) notFound();
  const categories = [...new Set(items.map((i) => i.category))].sort();

  return (
    <div className="rise space-y-5">
      <Breadcrumbs label={t("common.breadcrumb")} items={[{ label: t("nav.inventory"), href: "/inventory" }, { label: t("inventory.edit") }]} />
      <div>
        <h2 className="text-xl font-semibold text-ink">{item.name}</h2>
        <p className="mt-0.5 text-sm text-muted">{item.branches?.name}</p>
      </div>
      <Panel title={t("inventory.details")}>
        <ItemForm item={item} branches={branches} categories={categories} />
      </Panel>
      <Panel title={t("inventory.delete")} subtitle={t("inventory.deleteNote")}>
        <DeleteButton action={deleteItem.bind(null, item.id)} name={item.name} label={t("inventory.delete")} />
      </Panel>
    </div>
  );
}
