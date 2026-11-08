import type { Metadata } from "next";
import { Suspense } from "react";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { LoginScreen } from "./login-screen";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Nocturnal Tech: sales, stock, expenses and profit for your restaurant, in one clear dashboard.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginContent />
    </Suspense>
  );
}

async function LoginContent() {
  const { locale, messages } = await getI18n();
  return (
    <I18nProvider locale={locale} messages={messages}>
      <LoginScreen />
    </I18nProvider>
  );
}
