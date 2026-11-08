"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EXPENSE_CATEGORIES } from "@/lib/expenses-shared";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/roles";

// `values` sends back what was typed so the form can refill itself after an error.
export type ExpenseFormState = { error?: string; values?: Record<string, string> };

const FIELDS = ["spent_on", "description", "category", "branch_id", "amount"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function saveExpense(_prev: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  const typed = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));
  const result = await validateAndSave(formData);
  return { ...result, values: typed };
}

// Creates a new expense, or updates one when the form includes an id.
async function validateAndSave(formData: FormData): Promise<ExpenseFormState> {
  const [{ restaurant, role }, { t }] = await Promise.all([getVerifiedUser(), getI18n()]);
  if (!restaurant) return { error: t("action.noRestaurant") };
  if (!can(role, "editExpenses")) return { error: t("action.noPermission") };

  const id = String(formData.get("id") ?? "") || null;
  const spentOn = String(formData.get("spent_on") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const branchId = String(formData.get("branch_id") ?? "") || null; // empty = shared
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);

  if (!DATE_PATTERN.test(spentOn) || Number.isNaN(Date.parse(spentOn))) return { error: t("expenses.err.date") };
  if (!description || description.length > 200) return { error: t("expenses.err.description") };
  if (!(category in EXPENSE_CATEGORIES)) return { error: t("expenses.err.category") };
  if (amountRaw === "" || !Number.isFinite(amount) || amount <= 0) return { error: t("expenses.err.amount") };

  const values = { spent_on: spentOn, description, category, branch_id: branchId, amount };

  // Row Level Security makes sure this can only touch the user's own rows.
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("expenses").update(values).eq("id", id)
    : await supabase.from("expenses").insert({ ...values, restaurant_id: restaurant.id });

  if (error) return { error: t("expenses.err.save") };

  revalidatePath("/", "layout");

  redirect("/expenses");
}

export async function deleteExpense(id: string) {
  const { role } = await getVerifiedUser();
  if (!can(role, "editExpenses")) return;
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/expenses");
}
