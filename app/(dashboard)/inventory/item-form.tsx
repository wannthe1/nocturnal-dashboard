"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ComboInput } from "@/components/combo-input";
import { Field } from "@/components/form-field";
import { Select } from "@/components/select";
import { useI18n } from "@/lib/i18n/client";
import { UNITS } from "@/lib/inventory-shared";
import { saveItem, type ItemFormState } from "./actions";

type Item = {
  id: string;
  branch_id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorder_level: number;
  unit_cost: number;
};

// Used for both "Add item" and "Edit item".
export function ItemForm({
  item,
  branches,
  categories,
}: {
  item?: Item;
  branches: { id: string; name: string }[];
  categories: string[];
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ItemFormState, FormData>(saveItem, {});
  // After an error, show what was typed; otherwise the saved value.
  const typed = (field: string, saved?: string | number) => state.values?.[field] ?? saved;

  return (
    // The key rebuilds the form after an error so every field shows what was typed.
    <form key={JSON.stringify(state.values ?? {})} action={action} className="space-y-5">
      {item && <input type="hidden" name="id" value={item.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("inventory.name")} htmlFor="name">
          <input id="name" name="name" required maxLength={120} defaultValue={typed("name", item?.name)} placeholder={t("inventory.namePlaceholder")} className="field" />
        </Field>
        <Field label={t("common.category")} htmlFor="category">
          <ComboInput id="category" name="category" required maxLength={60} defaultValue={String(typed("category", item?.category) ?? "")} suggestions={categories} placeholder={t("inventory.categoryPlaceholder")} />
        </Field>
        <Field label={t("common.branch")} htmlFor="branch_id">
          <Select id="branch_id" name="branch_id" defaultValue={String(typed("branch_id", item?.branch_id ?? branches[0]?.id))} options={branches.map((b) => ({ value: b.id, label: b.name }))} />
        </Field>
        <Field label={t("inventory.unit")} htmlFor="unit">
          <Select id="unit" name="unit" defaultValue={String(typed("unit", item?.unit ?? "kg"))} options={UNITS.map((u) => ({ value: u, label: u }))} />
        </Field>
        <Field label={t("inventory.quantity")} htmlFor="quantity">
          <input id="quantity" name="quantity" type="number" required min={0} step="0.01" defaultValue={typed("quantity", item?.quantity ?? 0)} className="field" />
        </Field>
        <Field label={t("inventory.reorderLevel")} htmlFor="reorder_level" hint={t("inventory.reorderHint")}>
          <input id="reorder_level" name="reorder_level" type="number" required min={0} step="0.01" defaultValue={typed("reorder_level", item?.reorder_level ?? 0)} className="field" />
        </Field>
        <Field label={t("inventory.unitCost")} htmlFor="unit_cost" hint={t("inventory.unitCostHint")}>
          <input id="unit_cost" name="unit_cost" type="number" required min={0} step="0.01" defaultValue={typed("unit_cost", item?.unit_cost ?? 0)} className="field" />
        </Field>
      </div>

      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? t("common.saving") : item ? t("common.save") : t("inventory.add")}
        </button>
        <Link href="/inventory" className="btn btn-ghost">{t("common.cancel")}</Link>
      </div>
    </form>
  );
}
