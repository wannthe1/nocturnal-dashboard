import type { Metadata } from "next";
import { Suspense } from "react";
import { Panel } from "@/components/panel";
import { PeriodFilter } from "@/components/period-filter";
import { FormSkeleton } from "@/components/skeletons";
import { requireAccess } from "@/lib/auth";
import { clockTime, hoursWorked } from "@/lib/employee-stats";
import { getAttendance, getEmployees } from "@/lib/employees";
import { NO_DATA, formatDate, formatRange } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { DASHBOARD_PRESETS, readPeriod } from "@/lib/period";
import { deleteAttendance } from "../staff-actions";
import { AttendanceForm, DeleteRowButton } from "../staff-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("team.tab.attendance") };
}

export default function AttendancePage({ searchParams }: PageProps<"/team/attendance">) {
  return (
    <Suspense fallback={<FormSkeleton fields={4} />}>
      <AttendanceContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AttendanceContent({ searchParams }: { searchParams: PageProps<"/team/attendance">["searchParams"] }) {
  const period = await readPeriod(await searchParams, DASHBOARD_PRESETS, "30d");
  const [, { t, locale }, employees, records] = await Promise.all([requireAccess("team"), getI18n(), getEmployees(), getAttendance(period.from, period.to)]);
  const active = employees.filter((e) => e.active);
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? NO_DATA;

  return (
    <div className="rise space-y-6">
      <PeriodFilter basePath="/team/attendance" presets={DASHBOARD_PRESETS} period={period} branch={null} branches={[]} />
      <Panel title={t("attendance.add")} subtitle={t("attendance.addNote")}>
        {active.length ? <AttendanceForm employees={active} today={period.today} /> : <p className="text-sm text-muted">{t("staff.noEmployees")}</p>}
      </Panel>
      <Panel title={t("attendance.title")} subtitle={formatRange(period.from, period.to, locale)}>
        {records.length ? (
          <div className="relative -mx-2 overflow-x-auto">
            <table className="data-table min-w-[620px]">
              <thead>
                <tr>
                  <th scope="col">{t("staff.employee")}</th>
                  <th scope="col">{t("common.date")}</th>
                  <th scope="col">{t("attendance.in")}</th>
                  <th scope="col">{t("attendance.out")}</th>
                  <th scope="col" className="num">{t("attendance.hours")}</th>
                  <th scope="col"><span className="sr-only">{t("common.delete")}</span></th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="strong">{nameOf(record.employee_id)}</td>
                    <td>{formatDate(record.clock_in.slice(0, 10), false, locale)}</td>
                    <td className="tabular-nums">{clockTime(record.clock_in)}</td>
                    <td className="tabular-nums">{record.clock_out ? clockTime(record.clock_out) : t("attendance.open")}</td>
                    <td className="num">{record.clock_out ? hoursWorked(record).toFixed(1) : NO_DATA}</td>
                    <td className="text-end"><DeleteRowButton action={deleteAttendance.bind(null, record.id)} question={t("attendance.deleteQuestion")} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">{t("common.noData")}</p>
        )}
      </Panel>
    </div>
  );
}
