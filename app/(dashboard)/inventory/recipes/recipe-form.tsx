"use client";

import { useActionState } from "react";
import { Field } from "@/components/form-field";
import { Select } from "@/components/select";
import { useI18n } from "@/lib/i18n/client";
import { saveRecipeLine, type RecipeFormState } from "./actions";

export function RecipeForm({ menuItems, stockItems }: { menuItems: string[]; stockItems: { name: string; unit: string }[] }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<RecipeFormState, FormData>(saveRecipeLine, {});

  return (
    // The key clears the quantity after each successful save, ready for the next line.
    <form key={state.savedAt ?? 0} action={action} className="space-y-4">
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label={t("recipes.menuItem")} htmlFor="menu_item">
          <Select id="menu_item" name="menu_item" options={menuItems.map((m) => ({ value: m, label: m }))} />
        </Field>
        <Field label={t("recipes.stockItem")} htmlFor="stock_item">
          <Select id="stock_item" name="stock_item" options={stockItems.map((s) => ({ value: s.name, label: `${s.name} (${s.unit})` }))} />
        </Field>
        <Field label={t("recipes.quantity")} htmlFor="quantity" hint={t("recipes.quantityHint")}>
          <input id="quantity" name="quantity" type="number" required min={0.001} step="0.001" placeholder="0.25" className="field" />
        </Field>
      </div>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary">{pending ? t("common.saving") : t("recipes.add")}</button>
    </form>
  );
}
