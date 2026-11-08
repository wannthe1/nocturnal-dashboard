// Number and date formatting shared by pages and charts (server and browser).
// Numbers keep Western digits in every language; dates follow the chosen language.

import { INTL_TAGS, type Locale } from "@/lib/i18n/config";

// Many browsers ship without Burmese date data and silently fall back to English,
// so Burmese month and weekday names are spelled out here.
const MY_MONTHS = ["ဇန်နဝါရီ", "ဖေဖော်ဝါရီ", "မတ်", "ဧပြီ", "မေ", "ဇွန်", "ဇူလိုင်", "ဩဂုတ်", "စက်တင်ဘာ", "အောက်တိုဘာ", "နိုဝင်ဘာ", "ဒီဇင်ဘာ"];
const MY_MONTHS_SHORT = ["ဇန်", "ဖေ", "မတ်", "ဧပြီ", "မေ", "ဇွန်", "ဇူ", "ဩ", "စက်", "အောက်", "နို", "ဒီ"];
const MY_WEEKDAYS = ["တနင်္လာ", "အင်္ဂါ", "ဗုဒ္ဓဟူး", "ကြာသပတေး", "သောကြာ", "စနေ", "တနင်္ဂနွေ"];
const MY_WEEKDAYS_SHORT = ["လာ", "ဂါ", "ဟူး", "တေး", "ကြာ", "နေ", "နွေ"];

// A month's name, for the calendar and date formats (month is 0–11).
export function monthName(locale: Locale, year: number, month: number, style: "long" | "short", withYear: boolean) {
  if (locale === "my") return `${(style === "long" ? MY_MONTHS : MY_MONTHS_SHORT)[month]}${withYear ? ` ${year}` : ""}`;
  return new Intl.DateTimeFormat(INTL_TAGS[locale], { month: style, year: withYear ? "numeric" : undefined, timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1)));
}

// Monday-first weekday names for the calendar.
export function weekdayNames(locale: Locale) {
  if (locale === "my") return MY_WEEKDAYS.map((long, i) => ({ long, short: MY_WEEKDAYS_SHORT[i] }));
  const short = new Intl.DateTimeFormat(INTL_TAGS[locale], { weekday: "narrow", timeZone: "UTC" });
  const long = new Intl.DateTimeFormat(INTL_TAGS[locale], { weekday: "long", timeZone: "UTC" });
  return [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i)); // 1 Jan 2024 was a Monday
    return { short: short.format(d), long: long.format(d) };
  });
}

// Headline figures drop the cents from $100 up ($97,352); compact suits chart
// axes ($4.5K). Use formatMoneyExact in tables, so a column always shows cents.
export function formatMoney(value: number, currency = "USD", compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : Math.abs(value) >= 100 ? 0 : 2,
  }).format(value);
}

export function formatMoneyExact(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

// Shown instead of 0 when there's simply no data for a figure.
export const NO_DATA = "—";

// A whole-number share, without rounding small amounts down to "0%".
export function sharePercent(value: number, total: number) {
  const percent = (value / total) * 100;
  return percent > 0 && percent < 1 ? "<1%" : `${percent.toFixed(0)}%`;
}

// Percentage change from `previous` to `current`, or null if there's nothing to compare with.
export function percentChange(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function formatDate(isoDate: string, withYear = false, locale: Locale = "en") {
  if (locale === "my") {
    const [y, m, d] = isoDate.split("-").map(Number);
    return `${d} ${MY_MONTHS_SHORT[m - 1]}${withYear ? ` ${y}` : ""}`;
  }
  return new Intl.DateTimeFormat(INTL_TAGS[locale], {
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

// "10 Oct – 8 Nov 2026"; the first year is only written when the two differ.
export function formatRange(from: string, to: string, locale: Locale = "en") {
  return `${formatDate(from, from.slice(0, 4) !== to.slice(0, 4), locale)} – ${formatDate(to, true, locale)}`;
}

export function formatDateTime(timestamp: string, locale: Locale = "en") {
  if (locale === "my") return `${formatDate(timestamp.slice(0, 10), true, locale)} ${new Date(timestamp).toISOString().slice(11, 16)}`;
  return new Intl.DateTimeFormat(INTL_TAGS[locale], { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(timestamp));
}

export function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

// "2026-11-01" → "November 2026" (or "Nov 2026" when short).
export function formatMonth(isoDate: string, short = false, locale: Locale = "en") {
  return monthName(locale, Number(isoDate.slice(0, 4)), Number(isoDate.slice(5, 7)) - 1, short ? "short" : "long", true);
}

// Adds dated values into equal-sized bins counting back from the end of a period,
// giving the small trend lines on the stat tiles the same shape for any range.
export function binSeries(points: { date: string; value: number }[], from: string, to: string, bins = 14) {
  const end = Date.parse(`${to}T00:00:00Z`);
  const days = Math.round((end - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  const size = Math.max(1, Math.ceil(days / bins));
  const count = Math.floor(days / size);
  const out = new Array<number>(count).fill(0);
  for (const p of points) {
    const age = Math.floor((end - Date.parse(`${p.date}T00:00:00Z`)) / 86_400_000 / size);
    const i = count - 1 - age;
    if (i >= 0 && i < count) out[i] += p.value;
  }
  return out;
}
