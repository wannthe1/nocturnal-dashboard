"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { clockIn, clockOut } from "./actions";

export function ClockCard({ clockedInAt }: { clockedInAt: string | null }) {
  const { t } = useI18n();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const press = () =>
    start(async () => {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await (clockedInAt ? clockOut(zone) : clockIn(zone));
      setError(result.error);
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-xl font-semibold tabular-nums text-ink">{clockedInAt ? t("schedule.clockedIn", { time: clockedInAt }) : t("schedule.notClocked")}</p>
      <button type="button" onClick={press} disabled={pending} className="btn btn-primary !px-6 !py-2.5">
        {pending ? t("login.wait") : t(clockedInAt ? "schedule.clockOut" : "schedule.clockIn")}
      </button>
      {error && <p role="alert" className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
