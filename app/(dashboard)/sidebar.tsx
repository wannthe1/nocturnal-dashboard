"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { MenuIcon, SidebarIcon } from "@/components/icons";
import { LinkLabel } from "@/components/link-label";
import { Logo } from "@/components/logo";
import { useI18n } from "@/lib/i18n/client";
import { SIDEBAR_KEY } from "@/lib/i18n/config";
import { can, type Role } from "@/lib/roles";
import { NAV_ITEMS, isActive } from "./nav-items";

export const OPEN_MENU_EVENT = "nt-open-menu";

export function MenuButton() {
  const { t } = useI18n();
  return (
    <button type="button" className="icon-btn lg:hidden" aria-label={t("nav.menu")} onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))}>
      <MenuIcon />
    </button>
  );
}

// Whether the sidebar is shrunk to icons. Stored on the page element so CSS can
// follow it with no flash on load, and remembered in this browser.
const collapseListeners = new Set<() => void>();
const subscribeCollapse = (cb: () => void) => {
  collapseListeners.add(cb);
  return () => collapseListeners.delete(cb);
};
const readCollapsed = () => document.documentElement.dataset.sidebar === "collapsed";

function setCollapsed(collapsed: boolean) {
  if (collapsed) document.documentElement.dataset.sidebar = "collapsed";
  else delete document.documentElement.dataset.sidebar;
  try {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "open");
  } catch {
    // Private browsing: it still collapses, it just isn't remembered.
  }
  collapseListeners.forEach((cb) => cb());
}

function CollapseButton() {
  const { t } = useI18n();
  const collapsed = useSyncExternalStore(subscribeCollapse, readCollapsed, () => false);
  const label = t(collapsed ? "nav.expand" : "nav.collapse");
  return (
    <button type="button" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-label={label} title={label} className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-accent-soft/50 hover:text-ink lg:grid">
      <SidebarIcon />
    </button>
  );
}

export function Sidebar({ role }: { role: Role }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener(OPEN_MENU_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_MENU_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      {/* Dimmed background behind the phone menu. Tapping it closes the menu. */}
      <button type="button" onClick={close} aria-label={t("nav.close")} tabIndex={open ? 0 : -1} className={`fixed inset-0 z-40 bg-obsidian/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />

      <aside
        className={`fixed inset-y-0 start-0 z-50 flex w-64 flex-col bg-[var(--chrome)] shadow-[inset_-1px_0_0_var(--line)] backdrop-blur-2xl transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:translate-x-0 lg:collapsed:w-[4.5rem] ${
          open ? "translate-x-0" : "max-lg:-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-6 pt-6 lg:collapsed:justify-center lg:collapsed:px-0">
          <Link href="/" onClick={close} aria-label={t("nav.overview")} className="rounded-lg">
            <Logo collapsible />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label={t("nav.main")}>
          {NAV_ITEMS.filter((item) => can(role, item.area)).map((item) => {
            const active = isActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} prefetch={true} onClick={close} title={t(item.key)} aria-label={t(item.key)} aria-current={active ? "page" : undefined} className="block rounded-xl">
                {/* Highlights as soon as it's tapped, before the page arrives. */}
                <LinkLabel
                  active={active}
                  base="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 lg:collapsed:justify-center lg:collapsed:px-0"
                  activeClass="bg-accent-soft text-accent-text"
                  idleClass="text-muted hover:bg-accent-soft/50 hover:text-ink"
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate lg:collapsed:hidden">{t(item.key)}</span>
                </LinkLabel>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-between gap-2 px-6 py-4 text-xs text-faint lg:px-4 lg:collapsed:justify-center lg:collapsed:px-0">
          <Link href="/privacy" className="truncate transition-colors hover:text-ink lg:collapsed:hidden">{t("login.privacy")}</Link>
          <CollapseButton />
        </div>
      </aside>
    </>
  );
}
