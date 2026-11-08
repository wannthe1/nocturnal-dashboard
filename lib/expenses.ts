import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { cacheLife } from "next/cache";
import { LIVE_DATA } from "@/lib/live-data";
import { UUID_PATTERN } from "@/lib/sales";
import type { Period } from "@/lib/period";

export type Expense = {
  id: string;
  branch_id: string | null; // null = shared by all branches
  spent_on: string;
  category: string;
  description: string;
  amount: number;
  branches: { name: string } | null;
};

const COLUMNS = "id, branch_id, spent_on, category, description, amount, branches(name)";

// The newest expenses in a period (for the list). Totals come from
// getExpenseSummary, which adds everything up in the database.
export async function getRecentExpenses(period: Period, branchId: string | null, limit: number) {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  let query = supabase
    .from("expenses")
    .select(COLUMNS)
    .gte("spent_on", period.from)
    .lte("spent_on", period.to)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  // With a branch, shared expenses are left out: they don't belong to one branch.
  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query.returns<Expense[]>();
  if (error) throw new Error(`Couldn't load expenses: ${error.message}`);
  return data;
}

export async function getExpense(id: string): Promise<Expense | null> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle<Expense>();
  if (error) return null; // e.g. an id that isn't a valid uuid
  return data;
}

// Dated amounts for the small trend line on the stat tiles. Returns null if there
// are too many rows to fetch in one go, rather than drawing an incomplete line.
export async function getExpenseSeries(period: Period, branchId?: string | null) {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  let query = supabase.from("expenses").select("spent_on, amount").gte("spent_on", period.from).lte("spent_on", period.to).limit(1000);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query.returns<{ spent_on: string; amount: number }[]>();
  if (error || data.length >= 1000) return null;
  return data.map((row) => ({ date: row.spent_on, value: Number(row.amount) }));
}

type SummaryData = {
  total: number;
  count: number;
  first_expense: string | null;
  by_category: { name: string; amount: number }[];
  by_branch: { name: string; amount: number }[];
};

// Totals for a period and for the period just before it, from the
// expense_summary() database function (see supabase/schema.sql).
export async function getExpenseSummary(period: Period, branchId?: string | null) {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const p_branch = branchId && UUID_PATTERN.test(branchId) ? branchId : null;

  const [current, previous] = await Promise.all([
    supabase.rpc("expense_summary", { p_from: period.from, p_to: period.to, p_branch }),
    supabase.rpc("expense_summary", { p_from: period.previousFrom, p_to: period.previousTo, p_branch }),
  ]);
  if (current.error || previous.error) {
    throw new Error(`Couldn't load expenses: ${(current.error ?? previous.error)!.message}`);
  }

  const now = current.data as SummaryData;
  const before = previous.data as SummaryData;
  return {
    ...now,
    previousTotal: before.total,
    // Only compare when expenses go back to the start of the previous period.
    canCompare: now.first_expense !== null && now.first_expense <= period.previousFrom,
  };
}
