"use client";

import { LogOutIcon } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { usePopover } from "@/components/use-popover";
import { useI18n } from "@/lib/i18n/client";

// The profile button (the company logo) and its menu.
export function AccountMenu({
  name,
  email,
  signOut,
}: {
  name: string | null;
  email: string;
  signOut: () => Promise<void>;
}) {
  const { t } = useI18n();
  const { open, setOpen, ref } = usePopover();
  const avatar = (size: string) => (
    <span className={`grid shrink-0 place-items-center rounded-full bg-obsidian text-moon ring-1 ring-line-strong ${size}`}>
      <LogoMark className="h-[72%] w-auto" />
    </span>
  );

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label={t("account.menu")} className="block rounded-full transition-transform active:scale-95">
        {avatar("h-10 w-10")}
      </button>
      {open && (
        <div role="menu" className="popover absolute end-0 z-50 mt-2 w-64 p-2">
          <div className="flex items-center gap-3 px-2 py-2">
            {avatar("h-9 w-9")}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{name ?? t("account.myRestaurant")}</p>
              <p className="truncate text-xs text-faint">{email}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <form action={signOut}>
            <button type="submit" role="menuitem" className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-accent-soft hover:text-ink">
              <LogOutIcon />
              {t("account.signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
