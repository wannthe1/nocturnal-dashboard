"use client";

// A search box that suggests matches as you type (and "Did you mean …?" for
// typos). Arrow keys move through the list, Enter picks, Escape closes.
// It's a normal GET form underneath, so searching still works without JavaScript.

import { useId, useMemo, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/client";
import { closestMatch, rankSuggestions, type Suggestion } from "@/lib/search";

export function SearchBox({
  action,
  defaultValue,
  hidden,
  suggestions,
  placeholder,
  label,
}: {
  action: string;
  defaultValue: string;
  hidden: Record<string, string>; // other filters to keep, e.g. { branch: "…" }
  suggestions: Suggestion[];
  placeholder: string;
  label: string;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const matches = useMemo(() => rankSuggestions(text, suggestions), [text, suggestions]);
  const typoFix = useMemo(
    () => (matches.length === 0 ? closestMatch(text, suggestions.map((s) => s.label)) : null),
    [matches, text, suggestions],
  );
  const options: (Suggestion & { didYouMean?: boolean })[] = typoFix ? [{ value: typoFix, label: typoFix, didYouMean: true }] : matches;
  const showList = open && text.trim().length > 0 && options.length > 0;

  function choose(option: Suggestion) {
    setText(option.value);
    setOpen(false);
    setActive(-1);
    if (inputRef.current) inputRef.current.value = option.value;
    formRef.current?.requestSubmit();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!options.length) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
    } else if (e.key === "Enter" && showList && active >= 0) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <form ref={formRef} action={action} role="search" className="relative w-full sm:w-72">
      {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <label htmlFor={`${listId}-input`} className="sr-only">{label}</label>
      <SearchIcon className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        ref={inputRef}
        id={`${listId}-input`}
        name="q"
        type="search"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        className="h-10 w-full rounded-full bg-surface pe-4 ps-10 text-sm text-ink transition-shadow placeholder:text-faint focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none"
      />

      {showList && (
        <ul id={listId} role="listbox" aria-label={t("search.suggestions")} className="popover absolute inset-x-0 z-40 mt-1.5 max-h-96 overflow-y-auto p-1.5">
          {options.map((option, i) => (
            <li
              key={`${option.label}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the choice happens before the input loses focus
              onMouseDown={(e) => {
                e.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-lg px-2.5 py-2 text-sm transition-colors ${i === active ? "bg-accent-soft" : ""}`}
            >
              <span className="block text-ink">
                {option.didYouMean ? (
                  <>
                    <span className="text-muted">{t("search.didYouMean")} </span>
                    <span className="font-medium text-accent-text">{option.label}</span>
                  </>
                ) : (
                  <Highlight text={option.label} query={text} />
                )}
              </span>
              {option.detail && <span className="mt-0.5 block text-xs text-faint">{option.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

// Shows the part of the name that matches what was typed in the accent colour.
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  const start = q ? text.toLowerCase().indexOf(q) : -1;
  if (start < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <span className="font-medium text-accent-text">{text.slice(start, start + q.length)}</span>
      {text.slice(start + q.length)}
    </>
  );
}
