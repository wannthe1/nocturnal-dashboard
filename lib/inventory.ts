import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { cacheLife } from "next/cache";
import { LIVE_DATA } from "@/lib/live-data";

import { stockStatus } from "@/lib/inventory-shared";

export { UNITS, stockStatus, type StockStatus } from "@/lib/inventory-shared";

export type InventoryItem = {
  id: string;
  branch_id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorder_level: number;
  unit_cost: number;
  updated_at: string;
  branches: { name: string } | null;
};

const COLUMNS = "id, branch_id, name, category, unit, quantity, reorder_level, unit_cost, updated_at, branches(name)";

// All stock items (optionally for one branch), sorted by name.
export async function getInventory(branchId?: string | null): Promise<InventoryItem[]> {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  let query = supabase.from("inventory_items").select(COLUMNS).order("name").order("branch_id");
  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query.returns<InventoryItem[]>();
  if (error) throw new Error(`Couldn't load inventory: ${error.message}`);
  return data;
}

// How many items (across all branches) are low or out of stock, out of the total.
export async function getStockCounts() {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_items").select("quantity, reorder_level").returns<{ quantity: number; reorder_level: number }[]>();
  if (error) throw new Error(`Couldn't load inventory: ${error.message}`);
  return { total: data.length, low: data.filter((item) => stockStatus(item) !== "ok").length };
}

// One item, or null if it doesn't exist (or belongs to someone else: RLS hides it).
export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle<InventoryItem>();
  if (error) return null; // e.g. an id that isn't a valid uuid
  return data;
}
