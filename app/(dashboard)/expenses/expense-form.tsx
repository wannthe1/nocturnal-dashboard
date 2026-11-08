"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import { DateField } from "@/components/date-picker";
import { Field } from "@/components/form-field";
import { Select } from "@/components/select";
import { EXPENSE_CATEGORIES } from "@/lib/expenses-shared";
import { useI18n } from "@/lib/i18n/client";
import { labelFor } from "@/lib/i18n/config";
import { saveExpense, type ExpenseFormState } from "./actions";

type Expense = {
  id: string;
  branch_id: string | null;
  spent_on: string;
  category: string;
  description: string;
  amount: number;
};

const noSubscribe = () => () => {};
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Used for both "Add expense" and "Edit expense".
export function ExpenseForm({
  expense,
  branches,
  today,
}: {
  expense?: Expense;
  branches: { id: string; name: string }[];
  today: string; // YYYY-MM-DD from the server (UTC), used until the browser takes over
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ExpenseFormState, FormData>(saveExpense, {});
  const typed = (field: string, saved?: string | number | null) => state.values?.[field] ?? saved ?? "";

  // A new expense defaults to today *where the user is*; the server only knows UTC.
  const browserToday = useSyncExternalStore(noSubscribe, localToday, () => today);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const date = pickedDate ?? state.values?.spent_on ?? expense?.spent_on ?? browserToday;

  return (
    // The key rebuilds the form after an error so dropdowns keep what was chosen.
    <form key={JSON.stringify(state.values ?? {})} action={action} className="space-y-5">
      {expense && <input type="hidden" name="id" value={expense.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("common.description")} htmlFor="description" wide>
          <input id="description" name="description" required maxLength={200} defaultValue={typed("description", expense?.description)} placeholder={t("expenses.descPlaceholder")} className="field" />
        </Field>
        <Field label={t("common.date")} htmlFor="spent_on">
          <DateField id="spent_on" name="spent_on" value={date} onChange={setPickedDate} />
        </Field>
        <Field label={t("common.amount")} htmlFor="amount">
          <input id="amount" name="amount" type="number" required min={0.01} step="0.01" defaultValue={typed("amount", expense?.amount)} placeholder="0.00" className="field" />
        </Field>
        <Field label={t("common.category")} htmlFor="category">
          <Select id="category" name="category" defaultValue={String(typed("category", expense?.category ?? "ingredients"))} options={Object.keys(EXPENSE_CATEGORIES).map((value) => ({ value, label: labelFor(t, "expenseCat", value) }))} />
        </Field>
        <Field label={t("common.branch")} htmlFor="branch_id" hint={t("expenses.sharedHint")}>
          <Select
            id="branch_id"
            name="branch_id"
            defaultValue={String(state.values?.branch_id ?? (expense ? (expense.branch_id ?? "") : (branches[0]?.id ?? "")))}
            options={[...branches.map((b) => ({ value: b.id, label: b.name })), { value: "", label: t("common.sharedAll") }]}
          />
        </Field>
      </div>

      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? t("common.saving") : expense ? t("common.save") : t("expenses.add")}
        </button>
        <Link href="/expenses" className="btn btn-ghost">{t("common.cancel")}</Link>
      </div>
    </form>
  );
}
