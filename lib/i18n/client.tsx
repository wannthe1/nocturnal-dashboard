"use client";

import { createContext, useContext, useMemo } from "react";
import { createTranslator, type Locale, type Messages, type Translate } from "./config";

type I18n = { locale: Locale; t: Translate };

const I18nContext = createContext<I18n>({ locale: "en", t: (key) => key });

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: createTranslator(messages) }), [locale, messages]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export const useI18n = () => useContext(I18nContext);
