import { ChartEmpty } from "@/components/chart-empty";
import { sharePercent } from "@/lib/format";

// A sorted bar chart: the biggest first, each bar scaled against the biggest, so
// categories are easy to compare. Each row shows amount / total and its share.
type Row = { name: string; value: number; color?: string };

export function BreakdownList({
  rows,
  format,
  exact,
  empty,
}: {
  rows: Row[];
  format: (value: number) => string;
  exact?: (value: number) => string; // full value, shown on hover
  empty: string; // explains what will appear here
}) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, row) => sum + row.value, 0);
  if (!total) return <ChartEmpty text={empty} />;
  const largest = sorted[0].value;

  return (
    <ul className="space-y-4">
      {sorted.map((row, i) => (
        <li key={row.name} title={exact ? exact(row.value) : undefined}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span className="min-w-0 truncate text-ink">{row.name}</span>
            <span className="tabular-nums text-muted">
              {format(row.value)}<span className="text-faint"> / {format(total)}</span>
              <span className="ms-2 inline-block w-9 text-end font-medium text-ink">{sharePercent(row.value, total)}</span>
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-sunken" aria-hidden="true">
            <div className="bar-grow h-2 rounded-full" style={{ width: `${(row.value / largest) * 100}%`, background: row.color ?? "var(--accent)", animationDelay: `${i * 15}ms` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
