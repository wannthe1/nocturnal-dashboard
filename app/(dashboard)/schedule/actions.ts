"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export type ClockResult = { error?: string };

// The time itself comes from the database's clock. `timeZone` only says which
// local time to record it in.
async function clock(fn: "clock_in" | "clock_out", timeZone: string): Promise<ClockResult> {
  const [{ t }, supabase] = await Promise.all([getI18n(), createClient()]);
  const { error } = await supabase.rpc(fn, { p_tz: String(timeZone).slice(0, 64) });
  if (error) return { error: t("schedule.err") };
  revalidatePath("/", "layout");
  return {};
}

export async function clockIn(timeZone: string) {
  return clock("clock_in", timeZone);
}

export async function clockOut(timeZone: string) {
  return clock("clock_out", timeZone);
}
