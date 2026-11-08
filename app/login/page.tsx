import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogoMark, Wordmark } from "@/components/logo";
import { LanguageMenu, ThemeToggle } from "@/components/preferences";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

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
  const { t, locale, messages } = await getI18n();
  const privacy = (
    <p className="text-xs text-faint">
      © 2026 Nocturnal Tech · <Link href="/privacy" className="transition-colors hover:text-ink">{t("login.privacy")}</Link>
    </p>
  );

  return (
    <I18nProvider locale={locale} messages={messages}>
      <main className="grid min-h-screen lg:grid-cols-2">
        {/* Brand banner (hidden on small screens) */}
        <section
          className="night relative hidden flex-col items-center justify-center overflow-hidden p-12 lg:flex"
          style={{ background: "radial-gradient(40rem 26rem at 50% 38%, rgb(101 126 255 / 0.3), transparent 70%), linear-gradient(160deg, #0b0d12, #141a33)" }}
        >
          <div className="rise flex flex-col items-center text-center">
            <LogoMark twinkle className="h-52 w-auto drop-shadow-[0_0_34px_rgb(101_126_255/0.45)]" />
            <Wordmark className="mt-8 text-2xl" />
            <p className="mt-10 text-3xl font-semibold leading-tight">
              {t("login.headline1")}
              <br />
              <span className="text-accent-text">{t("login.headline2")}</span>
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">{t("login.pitch")}</p>
          </div>
        </section>

        {/* Form */}
        <section className="relative flex flex-col items-center justify-center px-4 py-20 sm:px-8">
          <div className="absolute end-4 top-4 flex items-center gap-2">
            <LanguageMenu />
            <ThemeToggle />
          </div>
          <div className="rise w-full max-w-sm">
            <div className="mb-10 flex flex-col items-center text-ink lg:hidden">
              <LogoMark className="h-20 w-auto" />
              <Wordmark className="mt-4 text-sm" />
            </div>
            <LoginForm />
            <div className="mt-10 text-center">{privacy}</div>
          </div>
        </section>
      </main>
    </I18nProvider>
  );
}
