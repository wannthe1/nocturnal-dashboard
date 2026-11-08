import "server-only";
import { cacheLife } from "next/cache";
import { LIVE_DATA } from "@/lib/live-data";
import type { MessageKey } from "@/lib/i18n/config";

// A date range for a page: a preset (e.g. "last 30 days") or custom From–To dates,
// plus the same-length period just before it for "vs previous" comparisons.
// Dates are YYYY-MM-DD in UTC. Labels are translation keys.

export type Period = {
  key: string; // preset key, or "custom"
  today: string;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  compareKey: MessageKey; // e.g. "vs previous 30 days"
  errorKey?: MessageKey; // set when custom dates were invalid and a preset was used instead
};

export type Preset = { labelKey: MessageKey; compareKey: MessageKey; range: (today: Date) => { from: Date; to: Date } };

const daysBack = (today: Date, days: number) => {
  const from = new Date(today);
  from.setUTCDate(today.getUTCDate() - (days - 1));
  return from;
};
const monthStart = (today: Date, monthsBack: number) =>
  new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsBack, 1));
const dayBefore = (d: Date) => new Date(d.getTime() - 86_400_000);

// Overview, Sales and Expenses pages.
export const DASHBOARD_PRESETS: Record<string, Preset> = {
  "7d": { labelKey: "period.7d", compareKey: "compare.7d", range: (t) => ({ from: daysBack(t, 7), to: t }) },
  "30d": { labelKey: "period.30d", compareKey: "compare.30d", range: (t) => ({ from: daysBack(t, 30), to: t }) },
  "90d": { labelKey: "period.90d", compareKey: "compare.90d", range: (t) => ({ from: daysBack(t, 90), to: t }) },
  "12m": {
    labelKey: "period.12m",
    compareKey: "compare.12m",
    range: (t) => {
      // Shown by week, so start on a Monday to keep the first week complete.
      const from = daysBack(t, 365);
      from.setUTCDate(from.getUTCDate() + ((8 - from.getUTCDay()) % 7));
      return { from, to: t };
    },
  },
};

// Reports page: whole calendar months.
export const REPORT_PRESETS: Record<string, Preset> = {
  month: { labelKey: "period.month", compareKey: "compare.month", range: (t) => ({ from: monthStart(t, 0), to: t }) },
  "last-month": {
    labelKey: "period.lastMonth",
    compareKey: "compare.lastMonth",
    range: (t) => ({ from: monthStart(t, 1), to: dayBefore(monthStart(t, 0)) }),
  },
  // "Last N months" means complete months, so a half-finished month (with its
  // rent already paid but few sales yet) doesn't distort the picture.
  "3m": { labelKey: "period.3m", compareKey: "compare.3m", range: (t) => ({ from: monthStart(t, 3), to: dayBefore(monthStart(t, 0)) }) },
  ytd: { labelKey: "period.ytd", compareKey: "compare.custom", range: (t) => ({ from: new Date(Date.UTC(t.getUTCFullYear(), 0, 1)), to: t }) },
  "12m": { labelKey: "period.last12m", compareKey: "compare.12m", range: (t) => ({ from: monthStart(t, 12), to: dayBefore(monthStart(t, 0)) }) },
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 5 * 366;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const asDate = (s: string) => new Date(`${s}T00:00:00Z`);

function withPrevious(key: string, from: Date, to: Date, compareKey: MessageKey, now: Date): Period {
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const previousTo = dayBefore(from);
  const previousFrom = new Date(from.getTime() - days * 86_400_000);
  return { key, today: iso(now), from: iso(from), to: iso(to), previousFrom: iso(previousFrom), previousTo: iso(previousTo), compareKey };
}

function presetPeriod(presets: Record<string, Preset>, key: string, now: Date): Period {
  const preset = presets[key];
  const { from, to } = preset.range(now);
  return withPrevious(key, from, to, preset.compareKey, now);
}

// "Today" depends on the request time, never on build time.
async function requestTime() {
  "use cache: private";
  cacheLife(LIVE_DATA);
  return new Date().toISOString();
}

// Today's date (UTC), for pages that plan from now rather than from a chosen period.
export async function getToday() {
  return (await requestTime()).slice(0, 10);
}

// Reads ?range=…&from=…&to=… from the page URL.
export async function readPeriod(
  params: Record<string, string | string[] | undefined>,
  presets: Record<string, Preset>,
  defaultKey: string,
): Promise<Period> {
  const now = new Date(await requestTime());

  if (params.range === "custom") {
    const from = typeof params.from === "string" ? params.from : "";
    const to = typeof params.to === "string" ? params.to : "";
    let errorKey: MessageKey | undefined;
    if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || Number.isNaN(asDate(from).getTime()) || Number.isNaN(asDate(to).getTime())) {
      errorKey = "period.err.both";
    } else if (from > to) {
      errorKey = "period.err.order";
    } else if ((asDate(to).getTime() - asDate(from).getTime()) / 86_400_000 + 1 > MAX_DAYS) {
      errorKey = "period.err.long";
    }
    if (!errorKey) return withPrevious("custom", asDate(from), asDate(to), "compare.custom", now);
    return { ...presetPeriod(presets, defaultKey, now), errorKey };
  }

  const key = typeof params.range === "string" && params.range in presets ? params.range : defaultKey;
  return presetPeriod(presets, key, now);
}
