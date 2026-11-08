import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "404" };

// Shown for addresses that don't exist, and when a record (e.g. a deleted stock
// item) can't be found.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
      <Logo />
      <Suspense fallback={<div className="skeleton mt-12 h-24 w-72" />}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const { t } = await getI18n();
  return (
    <div className="rise">
      <p className="mt-12 text-sm font-semibold text-accent-text">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">{t("notFound.title")}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">{t("notFound.body")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">{t("notFound.home")}</Link>
        <Link href="/inventory" className="btn btn-outline">{t("nav.inventory")}</Link>
        <Link href="/reports" className="btn btn-outline">{t("nav.reports")}</Link>
      </div>
    </div>
  );
}
