"use client";

import { useLinkStatus } from "next/link";

// The inside of a navigation link. The moment the link is tapped it shows the
// "selected" style (with a soft pulse) instead of waiting for the next page to
// arrive, so taps feel instant. Must be placed inside a <Link>.
export function LinkLabel({
  active,
  base,
  activeClass,
  idleClass,
  children,
}: {
  active: boolean;
  base: string;
  activeClass: string;
  idleClass: string;
  children: React.ReactNode;
}) {
  const { pending } = useLinkStatus();
  const selected = active || pending;
  return (
    <span className={`${base} ${selected ? activeClass : idleClass} ${pending ? "motion-safe:animate-pulse" : ""}`}>
      {children}
    </span>
  );
}
