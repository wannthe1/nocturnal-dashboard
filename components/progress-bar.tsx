"use client";

// A progress bar with a percentage and, for anything that will take more than
// about 10 seconds, an estimate of the time left (worked out from how fast it's
// gone so far).

import { useI18n } from "@/lib/i18n/client";
import type { Translate } from "@/lib/i18n/config";

const SHOW_TIME_LEFT_AFTER = 10; // seconds of total expected duration

function timeLeft(t: Translate, startedAt: number, progress: number, now = Date.now()): string | null {
  const elapsed = (now - startedAt) / 1000;
  // Too early to guess reliably.
  if (progress <= 0.02 || elapsed < 1) return null;
  const total = elapsed / progress;
  if (total < SHOW_TIME_LEFT_AFTER) return null;
  const left = Math.max(0, total - elapsed);
  if (left < 5) return t("progress.almost");
  if (left < 60) return t("progress.seconds", { count: Math.ceil(left / 5) * 5 });
  return t("progress.minutes", { count: Math.round(left / 60) });
}

export function ProgressBar({
  label,
  progress,
  startedAt,
  detail,
}: {
  label: string;
  progress: number; // 0 to 1
  startedAt: number; // Date.now() when the work started
  detail?: string; // e.g. "1,500 of 12,000 rows"
}) {
  const { t } = useI18n();
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  // eslint-disable-next-line react-hooks/purity -- the estimate is meant to change on every update
  const remaining = timeLeft(t, startedAt, progress, Date.now());

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="text-ink">{label}</span>
        <span className="tabular-nums text-muted">
          {percent}%{remaining && <> · {remaining}</>}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${percent}%${remaining ? `, ${remaining}` : ""}`}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent-soft"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${percent}%` }} />
      </div>
      {detail && <p className="mt-1.5 text-xs tabular-nums text-faint">{detail}</p>}
    </div>
  );
}
