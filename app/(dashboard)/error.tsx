"use client";

import { useI18n } from "@/lib/i18n/client";

// Shown inside the dashboard frame when a page fails to load (e.g. the database
// is unreachable). The sidebar stays usable.
export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="card rise mx-auto mt-16 max-w-md p-7 text-center">
      <h2 className="text-base font-semibold text-ink">{t("error.title")}</h2>
      <p className="mt-2 text-sm text-muted">{t("error.body")}</p>
      {process.env.NODE_ENV === "development" && <p className="mt-3 break-words text-xs text-faint">{error.message}</p>}
      <button type="button" onClick={() => retry()} className="btn btn-primary mt-5">{t("common.tryAgain")}</button>
    </div>
  );
}
