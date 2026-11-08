import "server-only";
import { createClient } from "@/lib/supabase/server";
import { cacheLife } from "next/cache";
import { LIVE_DATA } from "@/lib/live-data";
import type { Period } from "@/lib/period";

type Totals = { revenue: number; orders: number; items: number };
type Named = { name: string; revenue: number };

export type Bucket = "day" | "week" | "month";

// The shape returned by the sales_dashboard() database function (see supabase/schema.sql).
export type SalesDashboard = {
  bucket: Bucket;
  first_sale: string | null;
  current: Totals;
  previous: Totals;
  trend: { period: string; revenue: number; orders: number }[];
  by_category: Named[];
  by_branch: Named[];
  by_channel: (Named & { orders: number })[];
  by_hour: { hour: number; orders: number }[];
  top_items: { name: string; category: string; quantity: number; revenue: number }[];
};

export type Branch = { id: string; name: string };

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A branch id from the page address, if it's well formed.
export function readBranchId(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

export async function getSalesDashboard(period: Period, branchId?: string | null) {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();

  // The database works out the previous period itself: the same number of days before.
  const { data, error } = await supabase.rpc("sales_dashboard", {
    p_from: period.from,
    p_to: period.to,
    p_branch: branchId && UUID_PATTERN.test(branchId) ? branchId : null,
  });
  if (error) throw new Error(`Couldn't load sales data: ${error.message}`);

  const dashboard = data as SalesDashboard;
  // Comparing with the previous period is only fair if sales go back that far.
  const canCompare = dashboard.first_sale !== null && dashboard.first_sale <= period.previousFrom;
  return { ...dashboard, canCompare, to: period.to };
}

export async function getBranches(): Promise<Branch[]> {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data, error } = await supabase.from("branches").select("id, name").order("name");
  if (error) throw new Error(`Couldn't load branches: ${error.message}`);
  return data;
}
