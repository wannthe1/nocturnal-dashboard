import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/app/login/login-screen";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "Welcome", robots: { index: false, follow: false } };

// The step between signing in and the dashboard, for anyone who hasn't given a
// name yet. proxy.ts sends people here and keeps everyone else away.
export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { locale, messages } = await getI18n();
  return (
    <I18nProvider locale={locale} messages={messages}>
      <AuthLayout>
        <WelcomeForm />
      </AuthLayout>
    </I18nProvider>
  );
}
