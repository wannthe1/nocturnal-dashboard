import "server-only";
import { createClient } from "@/lib/supabase/server";
import { cacheLife } from "next/cache";
import { LIVE_DATA } from "@/lib/live-data";
import { UUID_PATTERN } from "@/lib/sales";
import type { Period } from "@/lib/period";

// The shape returned by the monthly_report() database function (see supabase/schema.sql).
export type MonthlyReport = {
  months: {
    month: string; // YYYY-MM-01
    revenue: number;
    orders: number;
    expenses: number;
    by_category: Record<string, number>;
  }[];
  branches: { name: string; revenue: number; orders: number; expenses: number }[];
  shared_expenses: number;
  top_items: { name: string; category: string; quantity: number; revenue: number }[];
};

export async function getMonthlyReport(period: Period, branchId?: string | null): Promise<MonthlyReport> {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("monthly_report", {
    p_from: period.from,
    p_to: period.to,
    p_branch: branchId && UUID_PATTERN.test(branchId) ? branchId : null,
  });
  if (error) throw new Error(`Couldn't load the report: ${error.message}`);
  return data as MonthlyReport;
}
