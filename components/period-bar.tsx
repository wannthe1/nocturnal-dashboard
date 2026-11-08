"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { DateRangeButton } from "@/components/date-picker";
import { ChevronLeftIcon, ChevronRightIcon, RefreshIcon } from "@/components/icons";
import { Segmented } from "@/components/segmented";
import { Select } from "@/components/select";
import { formatRange } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/config";

type Branch = { id: string; name: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, days: number) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000) + 1;

// The controls above every chart: period pills, a date range with step-back and
// step-forward arrows, a branch menu and refresh. Everything lives in the URL.
export function PeriodBar({
  basePath,
  presets,
  periodKey,
  from,
  to,
  previousFrom,
  previousTo,
  today,
  errorKey,
  branchId,
  branches,
}: {
  basePath: string;
  presets: { key: string; labelKey: MessageKey }[];
  periodKey: string;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  today: string;
  errorKey?: MessageKey;
  branchId: string | null;
  branches: Branch[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shownKey, setShownKey] = useOptimistic(periodKey);
  const [shownBranch, setShownBranch] = useOptimistic(branchId ?? "");

  function hrefFor(params: { range?: string; from?: string; to?: string; branch?: string }) {
    const range = params.range ?? periodKey;
    const p = new URLSearchParams({ range });
    if (range === "custom") {
      p.set("from", params.from ?? from);
      p.set("to", params.to ?? to);
    }
    const branch = params.branch ?? branchId ?? "";
    if (branch) p.set("branch", branch);
    return `${basePath}?${p}`;
  }

  function go(params: { range?: string; from?: string; to?: string; branch?: string }) {
    startTransition(() => {
      setShownKey(params.range ?? periodKey);
      setShownBranch(params.branch ?? branchId ?? "");
      router.push(hrefFor(params), { scroll: false });
    });
  }

  const length = daysBetween(from, to);
  const stepBack = () => go({ range: "custom", from: addDays(from, -length), to: addDays(from, -1) });
  const stepForward = () => {
    const end = addDays(to, length);
    go({ range: "custom", from: addDays(to, 1), to: end > today ? today : end });
  };

  return (
    <div data-pending={pending} className="relative z-20">
      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          label={t("period.label")}
          value={shownKey}
          items={presets.map((p) => ({ key: p.key, label: t(p.labelKey) }))}
          renderItem={(item, props) => (
            <Link
              key={item.key}
              href={hrefFor({ range: item.key })}
              scroll={false}
              prefetch={true}
              {...props}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                go({ range: item.key });
              }}
            >
              {item.label}
            </Link>
          )}
        />

        <div className="flex items-center gap-1.5">
          <button type="button" className="icon-btn" aria-label={t("period.earlier")} onClick={stepBack}>
            <ChevronLeftIcon />
          </button>
          {/* key: reopening shows the period currently applied */}
          <DateRangeButton
            key={`${from}_${to}`}
            from={from}
            to={to}
            today={today}
            active={shownKey === "custom"}
            onApply={(f, e) => go({ range: "custom", from: f, to: e })}
          />
          <button type="button" className="icon-btn" aria-label={t("period.later")} disabled={to >= today} onClick={stepForward}>
            <ChevronRightIcon />
          </button>
        </div>

        {branches.length > 1 && (
          <Select
            label={t("common.branch")}
            className="w-44"
            triggerClassName="flex h-10 w-full rounded-full bg-surface px-4 text-sm font-medium text-muted transition-colors hover:text-ink"
            value={shownBranch}
            options={[{ value: "", label: t("common.allBranches") }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
            onChange={(branch) => go({ branch })}
          />
        )}

        <button
          type="button"
          className="icon-btn"
          aria-label={t("period.refresh")}
          title={t("period.refresh")}
          onClick={() => startTransition(() => router.refresh())}
        >
          <RefreshIcon className={`h-[18px] w-[18px] ${pending ? "motion-safe:animate-spin" : ""}`} />
        </button>
      </div>

      <p className="mt-2.5 text-xs tabular-nums text-faint">
        {t("period.showing", { range: formatRange(from, to, locale) })} · {t("period.comparedWith", { range: formatRange(previousFrom, previousTo, locale) })}
        {to >= today && <> · {t("period.incomplete")}</>}
      </p>
      {errorKey && <p role="alert" className="mt-2 text-sm text-danger">{t(errorKey)}</p>}
    </div>
  );
}
