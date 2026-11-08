import type { Metadata } from "next";
import { Suspense } from "react";
import { Panel } from "@/components/panel";
import { FormSkeleton } from "@/components/skeletons";
import { requireAccess } from "@/lib/auth";
import { getActivity } from "@/lib/employees";
import { NO_DATA, formatDateTime } from "@/lib/format";
import { labelFor } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("team.tab.activity") };
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={4} />}>
      <Activity />
    </Suspense>
  );
}

async function Activity() {
  const [, { t, locale }, entries] = await Promise.all([requireAccess("activity"), getI18n(), getActivity()]);
  return (
    <div className="rise">
      <Panel title={t("activity.title")} subtitle={t("activity.note")}>
        {entries.length ? (
          <div className="relative -mx-2 overflow-x-auto">
            <table className="data-table min-w-[680px]">
              <thead>
                <tr>
                  <th scope="col">{t("activity.when")}</th>
                  <th scope="col">{t("activity.who")}</th>
                  <th scope="col">{t("activity.what")}</th>
                  <th scope="col">{t("activity.detail")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap tabular-nums">{formatDateTime(entry.created_at, locale)}</td>
                    <td className="strong">{entry.actor_name ?? t("activity.system")}</td>
                    <td className="whitespace-nowrap">{labelFor(t, "activityEntity", entry.entity)} · {labelFor(t, "activityAction", entry.action)}</td>
                    <td>{entry.detail || NO_DATA}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">{t("activity.empty")}</p>
        )}
      </Panel>
    </div>
  );
}
