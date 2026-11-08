import "server-only";
import { cacheLife } from "next/cache";
import { LIVE_DATA } from "@/lib/live-data";
import { createClient } from "@/lib/supabase/server";
import { UUID_PATTERN } from "@/lib/sales";

export type DemandRow = { branch_id: string; item: string; category: string; days: Record<string, number> };
export type RecipeLine = { id: string; menu_item: string; stock_item: string; quantity: number };

// Units sold per menu item, branch and day (see demand_history in supabase/schema.sql).
export async function getDemandHistory(from: string, to: string, branchId?: string | null): Promise<DemandRow[]> {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("demand_history", {
    p_from: from,
    p_to: to,
    p_branch: branchId && UUID_PATTERN.test(branchId) ? branchId : null,
  });
  if (error) throw new Error(`Couldn't load demand history: ${error.message}`);
  return data as DemandRow[];
}

export async function getRecipeLines(): Promise<RecipeLine[]> {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipe_lines").select("id, menu_item, stock_item, quantity").order("menu_item").order("stock_item").returns<RecipeLine[]>();
  if (error) throw new Error(`Couldn't load recipes: ${error.message}`);
  return data.map((line) => ({ ...line, quantity: Number(line.quantity) }));
}
