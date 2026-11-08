import type { en } from "./en";

// The app's languages. The choice is stored in a cookie so the server can render
// pages in the right language from the first byte.
export const LOCALES = ["en", "my", "th", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "nt-lang";
export const THEME_KEY = "nt-theme";
export const SIDEBAR_KEY = "nt-sidebar";

// Each language's name written in that language.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  my: "မြန်မာ",
  th: "ไทย",
  zh: "中文",
};

// Tags for date formatting. Western digits and the Gregorian calendar everywhere,
// so dates match the figures and the CSV files.
export const INTL_TAGS: Record<Locale, string> = {
  en: "en-GB",
  my: "my-MM-u-nu-latn",
  th: "th-TH-u-ca-gregory-nu-latn",
  zh: "zh-CN",
};

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

// `{name}` fills in values. English plurals are written "1 item|{count} items"
// and the first form is used when count is 1.
export function createTranslator(messages: Messages): Translate {
  return (key, vars) => {
    let text = messages[key] ?? key;
    if (text.includes("|") && vars && "count" in vars) {
      const [one, other] = text.split("|");
      text = Number(vars.count) === 1 ? one : other;
    }
    if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
    return text;
  };
}

// For values that come from a fixed list, e.g. "dine_in" → channel.dine_in.
export function labelFor(t: Translate, prefix: string, value: string) {
  return t(`${prefix}.${value}` as MessageKey);
}
