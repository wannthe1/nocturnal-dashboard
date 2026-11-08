import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { Panel } from "@/components/panel";
import { FormSkeleton } from "@/components/skeletons";
import { requireAccess } from "@/lib/auth";
import { getEmployees, getShifts } from "@/lib/employees";
import { shiftTime } from "@/lib/employee-stats";
import { formatDate, formatRange } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { getToday } from "@/lib/period";
import { deleteShift } from "../staff-actions";
import { DeleteRowButton, ShiftForm } from "../staff-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("team.tab.shifts") };
}

export default function ShiftsPage({ searchParams }: PageProps<"/team/shifts">) {
  return (
    <Suspense fallback={<FormSkeleton fields={4} />}>
      <Shifts searchParams={searchParams} />
    </Suspense>
  );
}

const DAY = 86_400_000;
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
function mondayOf(date: string) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

async function Shifts({ searchParams }: { searchParams: PageProps<"/team/shifts">["searchParams"] }) {
  const params = await searchParams;
  const today = await getToday();
  const requested = typeof params.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.week) && !Number.isNaN(Date.parse(params.week)) ? params.week : today;
  const monday = mondayOf(requested);
  const sunday = addDays(monday, 6);
  const [, { t, locale }, employees, shifts] = await Promise.all([requireAccess("team"), getI18n(), getEmployees(), getShifts(monday, sunday)]);
  const active = employees.filter((e) => e.active);
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div className="rise space-y-6">
      <Panel title={t("shifts.add")}>
        {active.length ? <ShiftForm employees={active} today={today} /> : <p className="text-sm text-muted">{t("staff.noEmployees")}</p>}
      </Panel>

      <Panel
        title={t("shifts.title")}
        subtitle={formatRange(monday, sunday, locale)}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/team/shifts?week=${addDays(monday, -7)}`} aria-label={t("shifts.prev")} title={t("shifts.prev")} className="icon-btn"><ChevronLeftIcon /></Link>
            <Link href="/team/shifts" className="btn btn-ghost">{t("shifts.thisWeek")}</Link>
            <Link href={`/team/shifts?week=${addDays(monday, 7)}`} aria-label={t("shifts.next")} title={t("shifts.next")} className="icon-btn"><ChevronRightIcon /></Link>
          </div>
        }
      >
        <ul className="divide-y divide-line">
          {days.map((day) => {
            const today_ = shifts.filter((s) => s.shift_date === day);
            return (
              <li key={day} className="grid gap-2 py-3 sm:grid-cols-[8rem_1fr]">
                <p className={`text-sm font-medium ${day === today ? "text-ink" : "text-faint"}`}>{formatDate(day, false, locale)}</p>
                {today_.length ? (
                  <ul className="space-y-1">
                    {today_.map((shift) => (
                      <li key={shift.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-ink">{nameOf(shift.employee_id)}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="tabular-nums text-muted">{shiftTime(shift.start_time)} – {shiftTime(shift.end_time)}</span>
                          <DeleteRowButton action={deleteShift.bind(null, shift.id)} question={t("shifts.deleteQuestion")} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-faint">{t("shifts.none")}</p>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
