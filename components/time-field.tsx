"use client";

import { useEffect, useRef, useState } from "react";
import { ClockIcon } from "@/components/icons";
import { usePopover } from "@/components/use-popover";
import { useI18n } from "@/lib/i18n/client";

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const pad = (n: number) => String(n).padStart(2, "0");

// "17:05" becomes { hour: 5, minute: 5, pm: true }.
function parts(value: string) {
  const [h, m] = (value || "09:00").split(":").map(Number);
  return { hour: h % 12 || 12, minute: m, pm: h >= 12 };
}

function toValue(hour: number, minute: number, pm: boolean) {
  return `${pad((hour % 12) + (pm ? 12 : 0))}:${pad(minute)}`;
}

function label(value: string) {
  const { hour, minute, pm } = parts(value);
  return `${hour}:${pad(minute)} ${pm ? "PM" : "AM"}`;
}

function Option({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-8 w-full shrink-0 rounded-lg text-sm tabular-nums transition-colors ${selected ? "bg-ink font-semibold text-canvas" : "text-muted hover:bg-bone hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

// A time box in the dashboard's own style. The browser's built-in picker can't be
// themed. The form receives 24-hour "HH:MM", or nothing when left empty.
export function TimeField({ id, name, defaultValue = "", optional = false }: { id: string; name: string; defaultValue?: string; optional?: boolean }) {
  const { t } = useI18n();
  const { open, setOpen, ref } = usePopover();
  const [value, setValue] = useState(defaultValue);
  const columns = useRef<HTMLDivElement>(null);
  const { hour, minute, pm } = parts(value);

  // Opening shows the chosen hour and minute in the middle of their lists.
  useEffect(() => {
    if (!open) return;
    columns.current?.querySelectorAll<HTMLElement>("[data-column]").forEach((column) => {
      const selected = column.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (selected) column.scrollTop = selected.offsetTop - column.clientHeight / 2 + selected.offsetHeight / 2;
    });
  }, [open]);

  const columnClass = "relative flex h-48 flex-col gap-0.5 overflow-y-auto [scrollbar-width:none]";

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button id={id} type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)} className="field flex items-center justify-between gap-2">
        <span className={`tabular-nums ${value ? "" : "text-faint"}`}>{value ? label(value) : "--:--"}</span>
        <ClockIcon className="h-4 w-4 text-faint" />
      </button>

      {open && (
        <div role="dialog" aria-label={t("time.choose")} className="popover absolute start-0 z-50 mt-2 w-56 p-2">
          <div ref={columns} className="grid grid-cols-3 gap-1">
            <div data-column role="group" aria-label={t("time.hour")} className={columnClass}>
              {HOURS.map((h) => <Option key={h} selected={Boolean(value) && h === hour} onClick={() => setValue(toValue(h, minute, pm))}>{h}</Option>)}
            </div>
            <div data-column role="group" aria-label={t("time.minute")} className={columnClass}>
              {MINUTES.map((m) => <Option key={m} selected={Boolean(value) && m === minute} onClick={() => setValue(toValue(hour, m, pm))}>{pad(m)}</Option>)}
            </div>
            <div role="group" aria-label="AM / PM" className="flex flex-col gap-0.5">
              <Option selected={Boolean(value) && !pm} onClick={() => setValue(toValue(hour, minute, false))}>AM</Option>
              <Option selected={Boolean(value) && pm} onClick={() => setValue(toValue(hour, minute, true))}>PM</Option>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-end gap-1 border-t border-line pt-2">
            {optional && value && (
              <button type="button" onClick={() => { setValue(""); setOpen(false); }} className="btn btn-ghost !px-3 !py-1.5">{t("time.clear")}</button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="btn btn-outline !px-3 !py-1.5">{t("time.done")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
