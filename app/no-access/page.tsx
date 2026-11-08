import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "No access", robots: { index: false, follow: false } };

// Shown to someone signed in who isn't on a team, e.g. after being removed.
export default function NoAccessPage() {
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
      <h1 className="mt-12 text-2xl font-semibold text-ink">{t("noAccess.title")}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">{t("noAccess.body")}</p>
      <form action={signOut} className="mt-8">
        <button type="submit" className="btn btn-primary">{t("account.signOut")}</button>
      </form>
    </div>
  );
}
