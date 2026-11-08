"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type StaffFormState = { error?: string; done?: number };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function managerContext() {
  const [{ restaurant, role }, { t }] = await Promise.all([getVerifiedUser(), getI18n()]);
  return { restaurant: can(role, "team") ? restaurant : null, t };
}

const saved = (): StaffFormState => {
  revalidatePath("/", "layout");
  return { done: Date.now() };
};

export async function addShift(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const { restaurant, t } = await managerContext();
  if (!restaurant) return { error: t("action.noPermission") };
  const [employee_id, shift_date, start_time, end_time] = ["employee", "date", "start", "end"].map((n) => text(formData, n));
  if (!UUID.test(employee_id) || !DATE.test(shift_date) || !TIME.test(start_time) || !TIME.test(end_time) || start_time === end_time) return { error: t("team.err.save") };

  const supabase = await createClient();
  const { error } = await supabase.from("shifts").insert({ restaurant_id: restaurant.id, employee_id, shift_date, start_time, end_time, note: text(formData, "note").slice(0, 200) || null });
  return error ? { error: t("team.err.save") } : saved();
}

export async function addAttendance(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const { restaurant, t } = await managerContext();
  if (!restaurant) return { error: t("action.noPermission") };
  const [employee_id, date, clockIn, clockOut] = ["employee", "date", "in", "out"].map((n) => text(formData, n));
  if (!UUID.test(employee_id) || !DATE.test(date) || !TIME.test(clockIn) || (clockOut && !TIME.test(clockOut)) || clockIn === clockOut) return { error: t("team.err.save") };

  // An end time earlier than the start means they finished the next day.
  const outDate = clockOut && clockOut < clockIn ? new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : date;
  const supabase = await createClient();
  const { error } = await supabase.from("attendance").insert({
    restaurant_id: restaurant.id,
    employee_id,
    clock_in: `${date}T${clockIn}:00`,
    clock_out: clockOut ? `${outDate}T${clockOut}:00` : null,
  });
  return error ? { error: t("team.err.save") } : saved();
}

export async function addReview(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const { restaurant, t } = await managerContext();
  if (!restaurant) return { error: t("action.noPermission") };
  const employee_id = text(formData, "employee");
  const review_date = text(formData, "date");
  const rating = Number(text(formData, "rating"));
  if (!UUID.test(employee_id) || !DATE.test(review_date) || !Number.isInteger(rating) || rating < 1 || rating > 5) return { error: t("team.err.save") };

  const supabase = await createClient();
  const { error } = await supabase.from("performance_reviews").insert({ restaurant_id: restaurant.id, employee_id, review_date, rating, notes: text(formData, "notes").slice(0, 1000) || null });
  return error ? { error: t("team.err.save") } : saved();
}

async function removeRow(table: "shifts" | "attendance" | "performance_reviews", id: string) {
  const { restaurant } = await managerContext();
  if (!restaurant || !UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from(table).delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteShift(id: string) {
  await removeRow("shifts", id);
}
export async function deleteAttendance(id: string) {
  await removeRow("attendance", id);
}
export async function deleteReview(id: string) {
  await removeRow("performance_reviews", id);
}
