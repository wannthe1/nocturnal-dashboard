"use client";

import { createPortal, useFormStatus } from "react-dom";
import { LoginScreen } from "@/app/login/login-screen";
import { LogOutIcon } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { usePopover } from "@/components/use-popover";
import { useI18n } from "@/lib/i18n/client";
import { labelFor } from "@/lib/i18n/config";
import type { Role } from "@/lib/roles";

// The profile button (the company logo) and its menu.
export function AccountMenu({
  name,
  email,
  role,
  signOut,
}: {
  name: string | null;
  email: string;
  role: Role | null;
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
              {role && <p className="truncate text-xs font-medium text-accent-text">{labelFor(t, "role", role)}</p>}
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <form action={signOut}>
            <SignOutButton label={t("account.signOut")} />
          </form>
        </div>
      )}
    </div>
  );
}

// Shows the sign-in screen the moment it's pressed, while the sign-out finishes
// behind it. If the sign-out fails, the screen goes away and they stay signed in.
function SignOutButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" role="menuitem" className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-accent-soft hover:text-ink">
        <LogOutIcon />
        {label}
      </button>
      {pending && createPortal(<div inert className="page-backdrop fixed inset-0 z-[100] overflow-y-auto"><LoginScreen /></div>, document.body)}
    </>
  );
}
