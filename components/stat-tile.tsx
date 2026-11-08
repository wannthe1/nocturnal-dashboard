import Link from "next/link";
import { ArrowUpRightIcon, TrendDownIcon, TrendUpIcon } from "@/components/icons";
import { Sparkline } from "@/components/sparkline";
import { formatNumber, percentChange } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

type Props = {
  label: string;
  value: string; // "—" when there's no data
  window: string; // the time the figure covers, e.g. "10 Oct – 8 Nov 2026" or "Right now"
  exact?: string; // the unrounded value, shown on hover
  // Optional comparison with the previous period.
  current?: number;
  previous?: number;
  compareLabel?: string;
  format?: (value: number) => string; // how to write current / previous
  // For costs, going up is bad: the change is shown in red instead of green.
  upIsGood?: boolean;
  note?: string; // shown instead of a comparison
  spark?: number[] | null;
  sparkColor?: string;
  hero?: boolean; // the one headline tile in a row
  href?: string; // adds a "View details" link
};

export async function StatTile({ label, value, window, exact, current, previous, compareLabel, format = formatNumber, upIsGood = true, note, spark, sparkColor, hero, href }: Props) {
  const { t } = await getI18n();
  const change = current !== undefined && previous !== undefined ? percentChange(current, previous) : null;
  const good = change !== null && (change >= 0) === upIsGood;
  // Tiles with a trend line share one height; so do tiles without one.
  const height = spark === undefined ? "min-h-[8.8rem]" : "min-h-48";
  // On phones the three cards beside the main one show just the label and figure.
  const compactHidden = hero ? "" : "max-sm:hidden";

  return (
    <div className={`card relative flex min-w-0 flex-col transition-transform duration-300 hover:-translate-y-0.5 ${height} ${hero ? "night hero-tile p-5 max-sm:p-4" : "p-5 max-sm:min-h-0 max-sm:justify-center max-sm:p-3"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className={`text-xs text-faint ${compactHidden}`}>{window}</p>
        </div>
        {href && (
          <Link href={href} className={`group inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-accent-text ${hero ? "" : "max-sm:after:absolute max-sm:after:inset-0"}`}>
            <span className="max-sm:sr-only">{t("common.viewDetails")}</span>
            <ArrowUpRightIcon className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
          </Link>
        )}
      </div>

      <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${hero ? "mt-2.5" : "mt-2.5 max-sm:mt-1"}`}>
        <p title={exact} className={`min-w-0 break-words text-[1.75rem] font-semibold leading-tight tabular-nums text-ink ${hero ? "max-sm:text-2xl" : "max-sm:text-lg"}`}>{value}</p>
        {change !== null && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${good ? "bg-success/12 text-success" : "bg-danger/12 text-danger"}`}>
            {change >= 0 ? <TrendUpIcon className="h-3.5 w-3.5" /> : <TrendDownIcon className="h-3.5 w-3.5" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      <p className={`mt-1 text-xs tabular-nums text-faint ${compactHidden}`}>
        {change !== null ? <>{format(current!)} / {format(previous!)} · {compareLabel}</> : (note ?? t("common.noEarlier"))}
      </p>
      {spark && spark.some(Boolean) && <Sparkline values={spark} color={sparkColor} className={`mt-auto pt-3 ${compactHidden}`} />}
    </div>
  );
}
