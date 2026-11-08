import type { Metadata } from "next";
import { Suspense } from "react";
import { Panel } from "@/components/panel";
import { FormSkeleton } from "@/components/skeletons";
import { requireAccess } from "@/lib/auth";
import { clockTime, hoursWorked, shiftTime } from "@/lib/employee-stats";
import { getMySchedule } from "@/lib/employees";
import { NO_DATA, formatDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { getToday } from "@/lib/period";
import { ClockCard } from "./clock-card";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.schedule") };
}

export default function SchedulePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <Schedule />
      </Suspense>
    </div>
  );
}

async function Schedule() {
  const [{ id }, today, { t, locale }] = await Promise.all([requireAccess("schedule"), getToday(), getI18n()]);
  const schedule = await getMySchedule(id, today);

  if (!schedule) {
    return (
      <Panel title={t("schedule.clockTitle")}>
        <p className="text-sm text-muted">{t("schedule.noRecord")}</p>
      </Panel>
    );
  }

  return (
    <div className="rise space-y-6">
      <Panel title={t("schedule.clockTitle")}>
        <ClockCard clockedInAt={schedule.open ? clockTime(schedule.open.clock_in) : null} />
      </Panel>

      <Panel title={t("schedule.upcoming")}>
        {schedule.shifts.length ? (
          <ul className="divide-y divide-line">
            {schedule.shifts.map((shift) => (
              <li key={shift.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="text-ink">{formatDate(shift.shift_date, false, locale)}</span>
                <span className="tabular-nums text-muted">{shiftTime(shift.start_time)} – {shiftTime(shift.end_time)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("schedule.noShifts")}</p>
        )}
      </Panel>

      <Panel title={t("schedule.history")}>
        {schedule.attendance.length ? (
          <ul className="divide-y divide-line">
            {schedule.attendance.map((record) => (
              <li key={record.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="text-ink">{formatDate(record.clock_in.slice(0, 10), false, locale)}</span>
                <span className="tabular-nums text-muted">
                  {clockTime(record.clock_in)} – {record.clock_out ? clockTime(record.clock_out) : t("attendance.open")}
                  {record.clock_out && <span className="ms-3 text-faint">{hoursWorked(record).toFixed(1)} {t("attendance.hours")}</span>}
                  {!record.clock_out && <span className="sr-only">{NO_DATA}</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("common.noData")}</p>
        )}
      </Panel>
    </div>
  );
}
