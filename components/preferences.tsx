"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useSyncExternalStore, useTransition } from "react";
import { CheckIcon, GlobeIcon, MoonIcon, SunIcon } from "@/components/icons";
import { usePopover } from "@/components/use-popover";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, THEME_KEY, type Locale } from "@/lib/i18n/config";

// ---- Light / dark -----------------------------------------------------------

const themeListeners = new Set<() => void>();
const subscribeTheme = (cb: () => void) => {
  themeListeners.add(cb);
  return () => themeListeners.delete(cb);
};

function applyTheme(next: string) {
  const apply = () => {
    document.documentElement.dataset.theme = next;
    themeListeners.forEach((cb) => cb());
  };
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Private browsing: the theme still changes, it just isn't remembered.
  }
  // A soft cross-fade where the browser supports it.
  if (document.startViewTransition) document.startViewTransition(apply);
  else apply();
}

export function ThemeToggle() {
  const { t } = useI18n();
  const theme = useSyncExternalStore(subscribeTheme, () => document.documentElement.dataset.theme ?? "dark", () => "dark");
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button type="button" onClick={() => applyTheme(next)} className="icon-btn" aria-label={t(next === "light" ? "theme.toLight" : "theme.toDark")} title={t(next === "light" ? "theme.toLight" : "theme.toDark")}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

// ---- Language ---------------------------------------------------------------

function saveLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = next;
}

export function LanguageMenu({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { open, setOpen, ref } = usePopover();
  const [shown, setShown] = useOptimistic(locale);
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    setOpen(false);
    saveLocale(next);
    startTransition(() => {
      setShown(next);
      router.refresh(); // the server re-renders the page in the new language
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("lang.label")}
        title={t("lang.label")}
        className={`flex h-10 items-center gap-2 rounded-full bg-surface px-3 text-sm font-medium text-muted transition-colors hover:text-ink ${pending ? "motion-safe:animate-pulse" : ""}`}
      >
        <GlobeIcon />
        {!compact && <span className="max-sm:hidden">{LOCALE_NAMES[shown]}</span>}
      </button>
      {open && (
        <ul role="menu" className="popover absolute end-0 z-50 mt-2 w-40 p-1.5">
          {LOCALES.map((code) => (
            <li key={code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={code === shown}
                lang={code}
                onClick={() => choose(code)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent-soft ${code === shown ? "text-ink" : "text-muted"}`}
              >
                {LOCALE_NAMES[code]}
                {code === shown && <CheckIcon className="h-4 w-4 text-accent-text" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
