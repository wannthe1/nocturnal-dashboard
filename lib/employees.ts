import "server-only";
import { cacheLife } from "next/cache";
import { LIVE_DATA } from "@/lib/live-data";
import { createClient } from "@/lib/supabase/server";
import type { Attendance, Employee, Review, Shift } from "@/lib/employee-stats";

export type ActivityEntry = { id: number; actor_name: string | null; action: string; entity: string; detail: string | null; created_at: string };

const nextDay = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

export async function getEmployees(): Promise<Employee[]> {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").select("id, name, active").order("name").returns<Employee[]>();
  if (error) throw new Error(`Couldn't load employees: ${error.message}`);
  return data;
}

export async function getShifts(from: string, to: string): Promise<Shift[]> {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("id, employee_id, shift_date, start_time, end_time, note")
    .gte("shift_date", from)
    .lte("shift_date", to)
    .order("shift_date")
    .order("start_time")
    .returns<Shift[]>();
  if (error) throw new Error(`Couldn't load shifts: ${error.message}`);
  return data;
}

export async function getAttendance(from: string, to: string): Promise<Attendance[]> {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("id, employee_id, clock_in, clock_out")
    .gte("clock_in", from)
    .lt("clock_in", nextDay(to))
    .order("clock_in", { ascending: false })
    .limit(1000)
    .returns<Attendance[]>();
  if (error) throw new Error(`Couldn't load attendance: ${error.message}`);
  return data;
}

export async function getReviews(from: string, to: string): Promise<Review[]> {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("performance_reviews")
    .select("id, employee_id, review_date, rating, notes")
    .gte("review_date", from)
    .lte("review_date", to)
    .order("review_date", { ascending: false })
    .returns<Review[]>();
  if (error) throw new Error(`Couldn't load reviews: ${error.message}`);
  return data;
}

export async function getActivity(): Promise<ActivityEntry[]> {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, actor_name, action, entity, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<ActivityEntry[]>();
  if (error) throw new Error(`Couldn't load the activity log: ${error.message}`);
  return data;
}

// The signed-in person's own record, shifts and recent attendance.
export async function getMySchedule(userId: string, today: string) {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data: me, error } = await supabase.from("employees").select("id, name, active").eq("user_id", userId).maybeSingle<Employee>();
  if (error) throw new Error(`Couldn't load your schedule: ${error.message}`);
  if (!me) return null;

  const until = new Date(Date.parse(`${today}T00:00:00Z`) + 14 * 86_400_000).toISOString().slice(0, 10);
  const [shifts, attendance] = await Promise.all([
    supabase.from("shifts").select("id, employee_id, shift_date, start_time, end_time, note").eq("employee_id", me.id).gte("shift_date", today).lte("shift_date", until).order("shift_date").order("start_time").returns<Shift[]>(),
    supabase.from("attendance").select("id, employee_id, clock_in, clock_out").eq("employee_id", me.id).order("clock_in", { ascending: false }).limit(10).returns<Attendance[]>(),
  ]);
  if (shifts.error) throw new Error(`Couldn't load your shifts: ${shifts.error.message}`);
  if (attendance.error) throw new Error(`Couldn't load your attendance: ${attendance.error.message}`);
  return { me, shifts: shifts.data, attendance: attendance.data, open: attendance.data.find((a) => a.clock_out === null) ?? null };
}
