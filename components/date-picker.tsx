"use client";

// Themed calendars that replace the browser's built-in date popup: one date
// (forms) or a From–To range (filters). Tap the month title to jump to any month
// or year, which matters for old imported data. Dates are YYYY-MM-DD strings.

import { useEffect, useId, useRef, useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { usePopover } from "@/components/use-popover";
import { useI18n } from "@/lib/i18n/client";
import { formatDate, monthName, weekdayNames } from "@/lib/format";

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parts = (iso: string) => ({ y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) - 1 });

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function shiftMonth(y: number, m: number, by: number) {
  const d = new Date(Date.UTC(y, m + by, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
}

type Marks = { from: string | null; to: string | null; preview: string | null };

function MonthDays({
  y,
  m,
  marks,
  max,
  today,
  focusDate,
  onPick,
  onHover,
  onMove,
}: {
  y: number;
  m: number;
  marks: Marks;
  max?: string;
  today?: string;
  focusDate: string | null;
  onPick: (iso: string) => void;
  onHover: (iso: string | null) => void;
  onMove: (iso: string, days: number) => void;
}) {
  const { locale, t } = useI18n();
  const firstWeekday = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // Monday first
  const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const end = marks.to ?? marks.preview;
  const [low, high] = marks.from && end && end < marks.from ? [end, marks.from] : [marks.from, end];

  return (
    <div>
      <div className="grid grid-cols-7" aria-hidden="true">
        {weekdayNames(locale).map((d) => (
          <span key={d.long} title={d.long} className="py-1 text-center text-xs text-faint">{d.short}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5" role="group" aria-label={monthName(locale, y, m, "long", true)} onPointerLeave={() => onHover(null)}>
        {Array.from({ length: firstWeekday }, (_, i) => <span key={`gap-${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const iso = toIso(y, m, i + 1);
          const isEnd = iso === low || iso === high;
          const inside = low && high && iso > low && iso < high;
          const disabled = max ? iso > max : false;
          return (
            <div
              key={iso}
              className={`relative flex justify-center ${inside ? "bg-accent-soft" : ""} ${
                isEnd && low !== high ? (iso === low ? "rounded-s-full bg-accent-soft" : "rounded-e-full bg-accent-soft") : ""
              }`}
            >
              <button
                type="button"
                data-date={iso}
                disabled={disabled}
                tabIndex={iso === focusDate ? 0 : -1}
                aria-pressed={isEnd ? true : undefined}
                aria-label={formatDate(iso, true, locale)}
                aria-current={iso === today ? "date" : undefined}
                title={iso === today ? t("date.today") : undefined}
                onClick={() => onPick(iso)}
                onPointerEnter={() => !disabled && onHover(iso)}
                onKeyDown={(e) => {
                  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
                  if (step) {
                    e.preventDefault();
                    onMove(iso, step);
                  }
                }}
                className={`h-9 w-9 rounded-full text-sm tabular-nums transition-colors duration-150 disabled:text-faint/40 ${
                  isEnd
                    ? "bg-accent font-semibold text-obsidian"
                    : `${iso === today ? "font-semibold text-accent-text" : "text-ink"} enabled:hover:bg-accent-soft`
                }`}
              >
                {i + 1}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Calendar({
  marks,
  max,
  today,
  initial,
  months = 1,
  onPick,
  onHover,
}: {
  marks: Marks;
  max?: string;
  today?: string;
  initial: string;
  months?: 1 | 2;
  onPick: (iso: string) => void;
  onHover: (iso: string | null) => void;
}) {
  const { locale, t } = useI18n();
  const [shown, setShown] = useState(parts(initial));
  const [view, setView] = useState<"days" | "months" | "years">("days");
  const [focusDate, setFocusDate] = useState(initial);
  const [yearPage, setYearPage] = useState(parts(initial).y - 7);
  const root = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    root.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
  }, [focusDate, shown]);

  function move(iso: string, days: number) {
    const next = addDays(iso, days);
    if (max && next > max) return;
    const p = parts(next);
    moved.current = true;
    setFocusDate(next);
    // Keep the shown month(s) unless the date leaves them.
    const second = shiftMonth(shown.y, shown.m, months - 1);
    const visible = (p.y === shown.y && p.m === shown.m) || (months === 2 && p.y === second.y && p.m === second.m);
    if (!visible) setShown(p);
  }

  const second = shiftMonth(shown.y, shown.m, 1);
  const navClass = "icon-btn !h-8 !w-8 !border-transparent !bg-transparent";

  return (
    <div ref={root}>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label={t("date.previous")}
          className={navClass}
          onClick={() => (view === "days" ? setShown(shiftMonth(shown.y, shown.m, -1)) : view === "months" ? setShown({ ...shown, y: shown.y - 1 }) : setYearPage(yearPage - 16))}
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          onClick={() => setView(view === "days" ? "months" : view === "months" ? "years" : "days")}
          className="rounded-full px-3 py-1 text-sm font-semibold text-ink transition-colors hover:bg-accent-soft"
          aria-label={t("date.jump")}
        >
          {view === "days" ? monthName(locale, shown.y, shown.m, "long", true) : view === "months" ? shown.y : `${yearPage} – ${yearPage + 15}`}
        </button>
        <button
          type="button"
          aria-label={t("date.next")}
          className={navClass}
          onClick={() => (view === "days" ? setShown(shiftMonth(shown.y, shown.m, 1)) : view === "months" ? setShown({ ...shown, y: shown.y + 1 }) : setYearPage(yearPage + 16))}
        >
          <ChevronRightIcon />
        </button>
      </div>

      {view === "days" && (
        <div key={`${shown.y}-${shown.m}`} className={`rise mt-2 grid gap-6 ${months === 2 ? "sm:grid-cols-2" : ""}`} style={{ animationDuration: "0.25s" }}>
          <MonthDays y={shown.y} m={shown.m} marks={marks} max={max} today={today} focusDate={focusDate} onPick={onPick} onHover={onHover} onMove={move} />
          {months === 2 && (
            <div className="max-sm:hidden">
              <p className="mb-1 text-center text-xs font-medium text-faint">{monthName(locale, second.y, second.m, "long", true)}</p>
              <MonthDays y={second.y} m={second.m} marks={marks} max={max} today={today} focusDate={focusDate} onPick={onPick} onHover={onHover} onMove={move} />
            </div>
          )}
        </div>
      )}

      {view === "months" && (
        <div className="rise mt-3 grid grid-cols-3 gap-1.5" style={{ animationDuration: "0.25s" }}>
          {Array.from({ length: 12 }, (_, m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setShown({ ...shown, m });
                setView("days");
              }}
              className={`rounded-xl px-2 py-2.5 text-sm transition-colors ${m === shown.m ? "bg-accent font-semibold text-obsidian" : "text-ink hover:bg-accent-soft"}`}
            >
              {monthName(locale, shown.y, m, "short", false)}
            </button>
          ))}
        </div>
      )}

      {view === "years" && (
        <div className="rise mt-3 grid grid-cols-4 gap-1.5" style={{ animationDuration: "0.25s" }}>
          {Array.from({ length: 16 }, (_, i) => yearPage + i).map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                setShown({ ...shown, y });
                setView("months");
              }}
              className={`rounded-xl px-2 py-2.5 text-sm tabular-nums transition-colors ${y === shown.y ? "bg-accent font-semibold text-obsidian" : "text-ink hover:bg-accent-soft"}`}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// One date, used in forms. Submits through a hidden input.
export function DateField({
  id,
  name,
  value,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const { locale } = useI18n();
  const { open, setOpen, ref } = usePopover();
  const dialog = useId();

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-controls={dialog}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
        className="field flex items-center justify-between gap-2"
      >
        <span className="tabular-nums">{formatDate(value, true, locale)}</span>
        <CalendarIcon className="h-4 w-4 text-faint" />
      </button>
      {open && (
        <div id={dialog} role="dialog" className="popover absolute start-0 z-40 mt-1.5 w-[19rem] max-w-[calc(100vw-2rem)] p-3">
          <Calendar
            marks={{ from: value, to: value, preview: null }}
            initial={value}
            onPick={(iso) => {
              onChange(iso);
              setOpen(false);
            }}
            onHover={() => {}}
          />
        </div>
      )}
    </div>
  );
}

// A From–To range, used by the period filters. The first tap picks the start,
// the second the end (in either order).
export function DateRangeButton({
  from,
  to,
  today,
  active,
  onApply,
}: {
  from: string;
  to: string;
  today: string;
  active: boolean;
  onApply: (from: string, to: string) => void;
}) {
  const { t, locale } = useI18n();
  const { open, setOpen, ref } = usePopover();
  const [start, setStart] = useState<string | null>(from);
  const [end, setEnd] = useState<string | null>(to);
  const [hover, setHover] = useState<string | null>(null);

  function toggle() {
    if (!open) {
      setStart(from);
      setEnd(to);
    }
    setOpen(!open);
  }

  function pick(iso: string) {
    if (!start || end) {
      setStart(iso);
      setEnd(null);
    } else if (iso < start) {
      setEnd(start);
      setStart(iso);
    } else {
      setEnd(iso);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium tabular-nums transition-colors ${
          active ? "text-ink shadow-[0_0_0_2px_var(--accent)]" : "text-muted hover:text-ink"
        }`}
      >
        <CalendarIcon className="h-4 w-4 text-faint" />
        <span className="whitespace-nowrap">{formatDate(from, true, locale)} – {formatDate(to, true, locale)}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-obsidian/50 sm:hidden" />
          <div role="dialog" aria-label={t("date.custom")} className="popover z-50 p-4 max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 sm:absolute sm:start-0 sm:mt-2 sm:w-[37rem]">
            <Calendar marks={{ from: start, to: end, preview: end ? null : hover }} max={today} today={today} initial={from} months={2} onPick={pick} onHover={setHover} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-sm tabular-nums text-muted" aria-live="polite">
                {start ? formatDate(start, true, locale) : "…"} – {end ? formatDate(end, true, locale) : t("date.pickEnd")}
              </p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!start || !end}
                  onClick={() => {
                    setOpen(false);
                    onApply(start!, end!);
                  }}
                >
                  {t("date.apply")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
