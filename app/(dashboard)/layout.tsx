import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { AccountMenu } from "./account-menu";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

// Shared frame for every signed-in page: sidebar, top bar, then the page.
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

// Reads the language first, so the menu is never shown in the wrong one.
async function Shell({ children }: { children: React.ReactNode }) {
  const { locale, messages } = await getI18n();
  return (
    <I18nProvider locale={locale} messages={messages}>
      <div className="min-h-screen lg:flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar
            account={
              <Suspense fallback={<div className="skeleton h-10 w-10 rounded-full" />}>
                <Account />
              </Suspense>
            }
          />
          <main className="mx-auto max-w-[1400px] px-4 pb-10 pt-2 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </I18nProvider>
  );
}

async function Account() {
  const { email, restaurant } = await getCurrentUser();
  return <AccountMenu name={restaurant?.name ?? null} email={email} signOut={signOut} />;
}

function ShellFallback() {
  return (
    <div className="min-h-screen lg:flex">
      <div className="hidden w-60 shrink-0 space-y-3 p-5 lg:block">
        <div className="skeleton h-10 w-40" />
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-10 w-full rounded-xl" />)}
      </div>
      <div className="flex-1 space-y-5 p-4 sm:p-8">
        <div className="skeleton h-10 w-40" />
        <div className="skeleton h-44 w-full rounded-[1.5rem]" />
      </div>
    </div>
  );
}
