import { useId } from "react";

// The Nocturnal Tech logo, redrawn as a sharp vector: a shaded crescent with a
// four-point star on a long, thin vertical line. It uses the text colour, so it
// is dark on light backgrounds and white on dark ones.
export const CRESCENT = "M50 21.6A44.6 44.6 0 1 0 82.5 96.7A41.74 41.74 0 1 1 50 21.6Z";
export const STAR = "M50 42Q51.3 57.7 61 59Q51.3 60.3 50 76Q48.7 60.3 39 59Q48.7 57.7 50 42Z";
export const LINE = "M50 0L50.55 59L50 110L49.45 59Z";

export function LogoMark({ className = "h-9 w-auto", twinkle = false }: { className?: string; twinkle?: boolean }) {
  const shade = useId();
  return (
    <svg viewBox="0 0 100 112" className={className} fill="currentColor" aria-hidden="true">
      <defs>
        <linearGradient id={shade} x1="0.05" y1="0.3" x2="0.75" y2="0.85">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.32" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Soft shading on the inside of the crescent. */}
      <path d="M50 21.6A41.74 41.74 0 0 0 82.5 96.7A52 52 0 0 1 50 21.6Z" fill={`url(#${shade})`} />
      <path d={CRESCENT} />
      <path d={LINE} />
      <path d={STAR} className={twinkle ? "twinkle" : undefined} />
    </svg>
  );
}

// NOCTURNΛL / TECH, with the logo's wide letter spacing and crossbar-less A.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`} aria-label="Nocturnal Tech" role="img">
      <span aria-hidden="true" className="pl-[0.34em] font-normal tracking-[0.34em]">NOCTURNΛL</span>
      <span aria-hidden="true" className="mt-[0.5em] pl-[0.34em] text-[0.62em] font-normal tracking-[0.34em]">TECH</span>
    </span>
  );
}

// `collapsible`: only the moon stays when the sidebar is shrunk to icons.
export function Logo({ className = "", collapsible = false }: { className?: string; collapsible?: boolean }) {
  const hide = collapsible ? "lg:collapsed:hidden" : "";
  return (
    <span className={`inline-flex items-center gap-3 text-ink ${className}`}>
      <LogoMark className="h-10 w-auto" />
      <span aria-hidden="true" className={`h-8 w-px bg-line-strong ${hide}`} />
      <Wordmark className={`text-[0.8rem] ${hide}`} />
    </span>
  );
}
