"use client";

import { useId, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import { usePopover } from "@/components/use-popover";

export type SelectOption = { value: string; label: string };

// A themed dropdown that replaces the browser's own <select> list. Inside a form
// it submits through a hidden input, like a normal field.
export function Select({
  id,
  name,
  options,
  value,
  defaultValue,
  onChange,
  disabled,
  label,
  className = "",
  triggerClassName = "field",
}: {
  id?: string;
  name?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  label?: string; // for screen readers, when there's no visible <label>
  className?: string;
  triggerClassName?: string;
}) {
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value ?? inner;
  const { open, setOpen, ref } = usePopover();
  const [active, setActive] = useState(0);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();
  const selected = options.find((o) => o.value === current);

  function show() {
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  }

  function choose(option: SelectOption) {
    setInner(option.value);
    setOpen(false);
    onChange?.(option.value);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return show();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1 && open) {
      // Typing jumps to the matching option.
      const now = Date.now();
      typed.current = { text: now - typed.current.at < 700 ? typed.current.text + e.key : e.key, at: now };
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text.toLowerCase()));
      if (hit >= 0) setActive(hit);
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        id={id}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={`${triggerClassName} flex items-center justify-between gap-2`}
      >
        <span className="truncate">{selected?.label ?? " "}</span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul id={listId} role="listbox" aria-label={label} className="popover absolute inset-x-0 z-40 mt-1.5 max-h-64 min-w-44 overflow-y-auto p-1.5">
          {options.map((option, i) => (
            <li
              key={option.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={option.value === current}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(option)}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                i === active ? "bg-accent-soft text-ink" : "text-muted"
              }`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === current && <CheckIcon className="h-4 w-4 shrink-0 text-accent-text" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
