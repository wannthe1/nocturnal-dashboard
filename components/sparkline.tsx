import { useId } from "react";

// A small trend line for stat tiles. Plain SVG drawn on the server, so it costs no
// JavaScript; the line reveals left-to-right with CSS.
function smoothPath(points: [number, number][]) {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[Math.max(0, i - 1)];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] = points[Math.min(points.length - 1, i + 2)];
    const c1 = [x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6];
    const c2 = [x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}

export function Sparkline({ values, color = "var(--accent)", className = "" }: { values: number[]; color?: string; className?: string }) {
  const fade = useId();
  if (values.length < 2) return null;
  const W = 240;
  const H = 44;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values.map((v, i): [number, number] => [(i / (values.length - 1)) * W, 4 + (1 - (v - min) / span) * (H - 8)]);
  const line = smoothPath(points);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`spark-draw block h-11 w-full ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${W} ${H}L0 ${H}Z`} fill={`url(#${fade})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// A progress ring, e.g. profit margin.
export function Ring({ percent, label }: { percent: number; label: string }) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 36 36" className="-rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--line-strong)" strokeWidth="3" />
        <circle className="ring-draw" cx="18" cy="18" r="15.9155" fill="none" stroke="var(--cat-2)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${value} 100`} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-base font-semibold tabular-nums text-ink">{label}</span>
    </div>
  );
}
