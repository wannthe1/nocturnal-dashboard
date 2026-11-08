import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Nocturnal Tech stores and protects your restaurant's data.",
};

// DRAFT: a plain-language starting point describing what this app actually does.
// Have it reviewed for your country's rules (e.g. GDPR) before real customers sign up,
// and replace the contact address.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <Link href="/login" aria-label="Nocturnal Tech home">
        <Logo />
      </Link>
      <h1 className="mt-10 text-2xl font-semibold text-ink sm:text-3xl">Privacy policy</h1>
      <p className="mt-2 text-sm text-faint">Last updated November 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted">
        <Section title="What we store">
          <p>
            Your email address and password (stored securely by our login provider, never in plain
            text), your restaurant&apos;s name, and the business data you add or import: branches,
            sales, stock and expenses.
          </p>
        </Section>
        <Section title="Why we store it">
          <p>
            Only to run the dashboard for you: signing you in and showing your reports. We don&apos;t
            sell your data or use it for advertising.
          </p>
        </Section>
        <Section title="Who can see it">
          <p>
            Only you, when signed in. The database checks every request so one restaurant can never
            read another&apos;s data. Our hosting and database providers process data on our behalf
            under their own security commitments.
          </p>
        </Section>
        <Section title="Cookies">
          <p>
            We use only the cookies needed to keep you signed in. There are no advertising or
            tracking cookies.
          </p>
        </Section>
        <Section title="Your choices">
          <p>
            You can export your reports at any time, and delete individual records or whole imports
            in the app. To delete your account and all its data, contact us.
          </p>
        </Section>
        <Section title="Contact">
          <p>
            Questions about your data: <span className="text-ink">privacy@your-domain.com</span>
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
