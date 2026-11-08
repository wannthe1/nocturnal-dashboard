import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogoMark, Wordmark } from "@/components/logo";
import { LanguageMenu, ThemeToggle } from "@/components/preferences";
import { I18nProvider } from "@/lib/i18n/client";
import { labelFor } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { InviteJoinForm, InviteSignUpForm } from "../invite-forms";

export const metadata: Metadata = { title: "Invite", robots: { index: false, follow: false } };

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Invite params={params} />
    </Suspense>
  );
}

async function Invite({ params }: { params: PageProps<"/invite/[token]">["params"] }) {
  const { token } = await params;
  const [{ t, locale, messages }, supabase] = await Promise.all([getI18n(), createClient()]);
  const { data: details } = await supabase.rpc("invite_details", { p_token: token });
  const invite = details as { restaurant: string; role: string } | null;
  // Asks Supabase directly: a deleted account may still have an old login in this browser.
  const { data: session } = await supabase.auth.getUser();
  const signedIn = Boolean(session.user);
  // Each person belongs to one restaurant, so an account that has one can't join another.
  const { data: existing } = signedIn ? await supabase.from("restaurants").select("id").maybeSingle() : { data: null };

  let body: React.ReactNode;
  if (!invite) {
    body = <Message title={t("invite.invalidTitle")} text={t("invite.invalidBody")} link={<Link href="/login" className="btn btn-primary mt-6">{t("login.signIn")}</Link>} />;
  } else if (existing) {
    body = <Message title={t("invite.alreadyTitle")} text={t("invite.alreadyBody")} link={<Link href="/" className="btn btn-primary mt-6">{t("notFound.home")}</Link>} />;
  } else {
    const heading = t("invite.title", { restaurant: invite.restaurant });
    const sub = t("invite.sub", { role: labelFor(t, "role", invite.role) });
    body = (
      <>
        <h1 className="text-2xl font-semibold text-ink">{heading}</h1>
        <p className="mt-1.5 text-sm text-muted">{sub}</p>
        {signedIn ? <InviteJoinForm token={token} label={heading} /> : <InviteSignUpForm token={token} />}
      </>
    );
  }

  return (
    <I18nProvider locale={locale} messages={messages}>
      <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-20">
        <div className="absolute end-4 top-4 flex items-center gap-2">
          <LanguageMenu />
          <ThemeToggle />
        </div>
        <div className="card rise w-full max-w-sm p-6 sm:p-8">
          <div className="mb-10 flex flex-col items-center text-ink">
            <LogoMark className="h-20 w-auto" />
            <Wordmark className="mt-4 text-sm" />
          </div>
          {body}
        </div>
      </main>
    </I18nProvider>
  );
}

function Message({ title, text, link }: { title: string; text: string; link: React.ReactNode }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
      {link}
    </div>
  );
}
