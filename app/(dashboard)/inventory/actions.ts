"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UNITS } from "@/lib/inventory-shared";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/roles";

// `values` sends back what was typed so the form can refill itself after an error.
export type ItemFormState = { error?: string; values?: Record<string, string> };

const FIELDS = ["name", "category", "unit", "branch_id", "quantity", "reorder_level", "unit_cost"];

function readNumber(formData: FormData, field: string) {
  const raw = String(formData.get(field) ?? "").trim();
  const value = Number(raw);
  return raw !== "" && Number.isFinite(value) && value >= 0 ? value : null;
}

// Creates a new item, or updates one when the form includes an id.
export async function saveItem(_prev: ItemFormState, formData: FormData): Promise<ItemFormState> {
  const typed = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));
  const result = await validateAndSave(formData);
  return { ...result, values: typed };
}

async function validateAndSave(formData: FormData): Promise<ItemFormState> {
  const [{ restaurant, role }, { t }] = await Promise.all([getVerifiedUser(), getI18n()]);
  if (!restaurant) return { error: t("action.noRestaurant") };
  if (!can(role, "editInventory")) return { error: t("action.noPermission") };

  const id = String(formData.get("id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const unit = String(formData.get("unit") ?? "");
  const branchId = String(formData.get("branch_id") ?? "");
  const quantity = readNumber(formData, "quantity");
  const reorderLevel = readNumber(formData, "reorder_level");
  const unitCost = readNumber(formData, "unit_cost");

  if (!name || name.length > 120) return { error: t("inventory.err.name") };
  if (!category || category.length > 60) return { error: t("inventory.err.category") };
  if (!UNITS.includes(unit as (typeof UNITS)[number])) return { error: t("inventory.err.unit") };
  if (!branchId) return { error: t("inventory.err.branch") };
  if (quantity === null) return { error: t("inventory.err.quantity") };
  if (reorderLevel === null) return { error: t("inventory.err.reorder") };
  if (unitCost === null) return { error: t("inventory.err.cost") };

  const values = {
    name,
    category,
    unit,
    branch_id: branchId,
    quantity,
    reorder_level: reorderLevel,
    unit_cost: unitCost,
  };

  // Row Level Security makes sure this can only touch the user's own rows.
  const supabase = await createClient();
  const { error } = id
    ? await supabase
        .from("inventory_items")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id)
    : await supabase.from("inventory_items").insert({ ...values, restaurant_id: restaurant.id });

  if (error) {
    if (error.code === "23505") return { error: t("inventory.err.duplicate") };
    return { error: t("inventory.err.save") };
  }

  revalidatePath("/", "layout");

  redirect("/inventory");
}

export async function deleteItem(id: string) {
  const { role } = await getVerifiedUser();
  if (!can(role, "editInventory")) return;
  const supabase = await createClient();
  await supabase.from("inventory_items").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/inventory");
}
