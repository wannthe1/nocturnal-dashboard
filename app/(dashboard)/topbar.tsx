"use client";

import { usePathname } from "next/navigation";
import { LanguageMenu, ThemeToggle } from "@/components/preferences";
import { useI18n } from "@/lib/i18n/client";
import { NAV_ITEMS, isActive } from "./nav-items";
import { MenuButton } from "./sidebar";

// Page title on the left; language, theme and profile on the right.
export function Topbar({ account }: { account: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => isActive(item.href, pathname));

  return (
    <header className="sticky top-0 z-30 bg-[var(--chrome)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8 lg:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <MenuButton />
          <h1 className="truncate text-xl font-semibold text-ink sm:text-2xl">{current ? t(current.key) : ""}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageMenu />
          <ThemeToggle />
          {account}
        </div>
      </div>
    </header>
  );
}
