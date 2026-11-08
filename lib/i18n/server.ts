import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { en } from "./en";
import { my } from "./my";
import { th } from "./th";
import { zh } from "./zh";
import { DEFAULT_LOCALE, LOCALE_COOKIE, createTranslator, isLocale, type Locale, type Messages } from "./config";

const DICTIONARIES: Record<Locale, Messages> = { en, my, th, zh };

// The chosen language, or the closest match to the browser's language on a first visit.
async function readLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const accepted = (await headers()).get("accept-language") ?? "";
  for (const part of accepted.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

// `cache` means one lookup per request, however many components ask.
export const getI18n = cache(async () => {
  const locale = await readLocale();
  const messages = DICTIONARIES[locale];
  return { locale, messages, t: createTranslator(messages) };
});
