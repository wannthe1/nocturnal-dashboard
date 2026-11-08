"use client";

import { useId, useState } from "react";
import { usePopover } from "@/components/use-popover";

// A free-text box that suggests existing values while typing (themed, instead of
// the browser's own suggestion list).
export function ComboInput({
  id,
  name,
  defaultValue,
  suggestions,
  placeholder,
  required,
  maxLength,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  const [text, setText] = useState(defaultValue ?? "");
  const [active, setActive] = useState(-1);
  const { open, setOpen, ref } = usePopover();
  const listId = useId();
  const query = text.trim().toLowerCase();
  const matches = suggestions.filter((s) => s.toLowerCase().includes(query) && s.toLowerCase() !== query).slice(0, 8);
  const showList = open && matches.length > 0;

  function choose(value: string) {
    setText(value);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div ref={ref} className="relative">
      <input
        id={id}
        name={name}
        value={text}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (i + step + matches.length) % matches.length);
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            choose(matches[active]);
          }
        }}
        className="field"
      />
      {showList && (
        <ul id={listId} role="listbox" className="popover absolute inset-x-0 z-40 mt-1.5 max-h-64 overflow-y-auto p-1.5">
          {matches.map((value, i) => (
            <li
              key={value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(value)}
              className={`cursor-pointer truncate rounded-lg px-2.5 py-2 text-sm transition-colors ${i === active ? "bg-accent-soft text-ink" : "text-muted"}`}
            >
              {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
