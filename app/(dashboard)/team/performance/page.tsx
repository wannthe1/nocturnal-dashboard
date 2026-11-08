import type { Metadata } from "next";
import { Suspense } from "react";
import { Panel } from "@/components/panel";
import { PeriodFilter } from "@/components/period-filter";
import { FormSkeleton } from "@/components/skeletons";
import { requireAccess } from "@/lib/auth";
import { LATE_GRACE_MINUTES, summarise } from "@/lib/employee-stats";
import { getAttendance, getEmployees, getReviews, getShifts } from "@/lib/employees";
import { NO_DATA, formatDate, formatRange, sharePercent } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { DASHBOARD_PRESETS, readPeriod } from "@/lib/period";
import { deleteReview } from "../staff-actions";
import { DeleteRowButton, ReviewForm } from "../staff-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("team.tab.performance") };
}

export default function PerformancePage({ searchParams }: PageProps<"/team/performance">) {
  return (
    <Suspense fallback={<FormSkeleton fields={4} />}>
      <Performance searchParams={searchParams} />
    </Suspense>
  );
}

async function Performance({ searchParams }: { searchParams: PageProps<"/team/performance">["searchParams"] }) {
  const period = await readPeriod(await searchParams, DASHBOARD_PRESETS, "30d");
  const [, { t, locale }, employees, shifts, attendance, reviews] = await Promise.all([
    requireAccess("team"),
    getI18n(),
    getEmployees(),
    getShifts(period.from, period.to),
    getAttendance(period.from, period.to),
    getReviews(period.from, period.to),
  ]);
  const active = employees.filter((e) => e.active);
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? NO_DATA;
  // People who've left only appear if they have records in this period.
  const rows = summarise(employees, shifts, attendance, reviews, period.today)
    .filter((r) => r.employee.active || r.scheduled || r.hours || r.reviews)
    .sort((a, b) => b.attended - a.attended || a.employee.name.localeCompare(b.employee.name));
  const window = formatRange(period.from, period.to, locale);

  return (
    <div className="rise space-y-6">
      <PeriodFilter basePath="/team/performance" presets={DASHBOARD_PRESETS} period={period} branch={null} branches={[]} />

      <Panel title={t("perf.title")} subtitle={`${t("perf.note", { minutes: LATE_GRACE_MINUTES })} · ${window}`}>
        {rows.length ? (
          <div className="relative -mx-2 overflow-x-auto">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th scope="col">{t("staff.employee")}</th>
                  <th scope="col" className="num">{t("perf.attended")}</th>
                  <th scope="col" className="num">{t("perf.late")}</th>
                  <th scope="col" className="num">{t("perf.missed")}</th>
                  <th scope="col" className="num">{t("attendance.hours")}</th>
                  <th scope="col" className="num">{t("perf.rating")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.employee.id}>
                    <td className="strong">{row.employee.name}</td>
                    <td className="num">{row.scheduled ? `${row.attended}/${row.scheduled} · ${sharePercent(row.attended, row.scheduled)}%` : NO_DATA}</td>
                    <td className="num">{row.attended ? row.late : NO_DATA}</td>
                    <td className="num">{row.scheduled ? row.missed : NO_DATA}</td>
                    <td className="num">{row.hours ? row.hours.toFixed(1) : NO_DATA}</td>
                    <td className="num">{row.rating === null ? NO_DATA : `${row.rating.toFixed(1)} / 5`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">{t("staff.noEmployees")}</p>
        )}
      </Panel>

      <Panel title={t("review.add")}>
        {active.length ? <ReviewForm employees={active} today={period.today} /> : <p className="text-sm text-muted">{t("staff.noEmployees")}</p>}
      </Panel>

      <Panel title={t("review.title")} subtitle={window}>
        {reviews.length ? (
          <ul className="divide-y divide-line">
            {reviews.map((review) => (
              <li key={review.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{nameOf(review.employee_id)} <span className="ms-1 tabular-nums text-muted">{review.rating} / 5</span></p>
                  <p className="text-xs text-faint">{formatDate(review.review_date, true, locale)}</p>
                  {review.notes && <p className="mt-1 text-muted">{review.notes}</p>}
                </div>
                <DeleteRowButton action={deleteReview.bind(null, review.id)} question={t("review.deleteQuestion")} />
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
