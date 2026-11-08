"use client";

import { useEffect, useRef } from "react";

// Pill-shaped choices with a thumb that slides to the selected one. The thumb is
// positioned by measuring the buttons, so it fits any language's text width.
export type SegmentedItem = { key: string; label: string; href?: string };

export function Segmented({
  items,
  value,
  onSelect,
  label,
  disabled,
  renderItem,
}: {
  items: SegmentedItem[];
  value: string;
  onSelect?: (key: string) => void;
  label: string;
  disabled?: boolean;
  // Lets callers render links instead of buttons.
  renderItem?: (item: SegmentedItem, props: { className: string; "aria-current"?: "true"; "data-key": string }) => React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const place = () => {
      const target = root.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(value)}"]`);
      if (!thumb.current) return;
      // Nothing selected (e.g. custom dates are in use): no thumb.
      if (!target) {
        thumb.current.style.opacity = "0";
        return;
      }
      thumb.current.style.width = `${target.offsetWidth}px`;
      thumb.current.style.height = `${target.offsetHeight}px`;
      thumb.current.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px)`;
      thumb.current.style.opacity = "1";
    };
    place();
    const watcher = new ResizeObserver(place);
    if (root.current) watcher.observe(root.current);
    return () => watcher.disconnect();
  }, [value, items.length]);

  return (
    <div ref={root} role="group" aria-label={label} className="relative inline-flex max-w-full flex-wrap rounded-3xl bg-surface p-1">
      <span
        ref={thumb}
        aria-hidden="true"
        className="absolute start-0 top-0 rounded-full bg-ink opacity-0 transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      />
      {items.map((item) => {
        const selected = item.key === value;
        const className = `relative z-10 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
          selected ? "text-canvas" : "text-muted hover:text-ink"
        }`;
        if (renderItem) {
          return renderItem(item, { className, "aria-current": selected ? "true" : undefined, "data-key": item.key });
        }
        return (
          <button key={item.key} type="button" data-key={item.key} aria-pressed={selected} disabled={disabled} onClick={() => onSelect?.(item.key)} className={className}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
