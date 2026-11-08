"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type RecipeFormState = { error?: string; savedAt?: number };

// Adds a stock item to a menu item's recipe, or updates its quantity.
export async function saveRecipeLine(_prev: RecipeFormState, formData: FormData): Promise<RecipeFormState> {
  const [{ restaurant, role }, { t }] = await Promise.all([getVerifiedUser(), getI18n()]);
  if (!restaurant) return { error: t("action.noRestaurant") };
  if (!can(role, "editInventory")) return { error: t("action.noPermission") };

  const menuItem = String(formData.get("menu_item") ?? "").trim();
  const stockItem = String(formData.get("stock_item") ?? "").trim();
  const quantity = Number(String(formData.get("quantity") ?? "").trim());
  if (!menuItem || !stockItem || menuItem.length > 120 || stockItem.length > 120 || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: t("recipes.err.fields") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("recipe_lines")
    .upsert({ restaurant_id: restaurant.id, menu_item: menuItem, stock_item: stockItem, quantity }, { onConflict: "restaurant_id,menu_item,stock_item" });
  if (error) return { error: t("recipes.err.save") };

  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}

export async function deleteRecipeLine(id: string) {
  const { role } = await getVerifiedUser();
  if (!can(role, "editInventory")) return;
  const supabase = await createClient();
  await supabase.from("recipe_lines").delete().eq("id", id);
  revalidatePath("/", "layout");
}
