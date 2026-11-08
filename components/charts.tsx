"use client";

// All the app's charts. Colours are theme variables (see lib/chart-colors.ts), so
// charts follow light and dark mode and a thing keeps its colour everywhere.
// Each chart type does one job:
//   area = change over time · sorted bars = comparing categories
//   doughnut = share of a total (only when there are few slices)
//   waterfall = how revenue becomes profit · columns + line = revenue against profit

import { useState, useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BreakdownList } from "@/components/breakdown-list";
import { ChartEmpty } from "@/components/chart-empty";
import { Panel } from "@/components/panel";
import { Segmented } from "@/components/segmented";
import { METRIC_COLORS, sharedColor } from "@/lib/chart-colors";
import { formatDate, formatHour, formatMoney, formatMoneyExact, formatMonth, formatNumber, sharePercent } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

const GRID = "var(--line)";
const AXIS = { fill: "var(--faint)", fontSize: 12 };
const HOVER_BAND = { fill: "var(--bone)" };

// Entrance animations are switched off for people who ask for reduced motion.
const noSubscribe = () => () => {};
function useAnimate() {
  return useSyncExternalStore(
    noSubscribe,
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
const motion = (animate: boolean) => ({ isAnimationActive: animate, animationDuration: 450, animationEasing: "ease-out" as const });

function TooltipBox({ title, rows }: { title: string; rows: { label?: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-xl bg-raised px-3 py-2 shadow-[var(--pop-shadow)]">
      <p className="text-xs text-faint">{title}</p>
      {rows.map((r, i) => (
        <p key={i} className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold tabular-nums text-ink">
          {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
          {r.label && <span className="font-normal text-muted">{r.label}</span>}
          {r.value}
        </p>
      ))}
    </div>
  );
}

function LegendRow({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className={item.line ? "h-0.5 w-3.5 rounded-full" : "h-2.5 w-2.5 rounded-[3px]"} style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

type TrendPoint = { period: string; revenue: number; orders: number };

// Revenue or orders over time, with a switch between the two.
export function TrendCard({
  title,
  subtitle,
  data,
  bucket,
  currency,
  lastDay,
  today,
  empty,
}: {
  title: string;
  subtitle?: string;
  data: TrendPoint[];
  bucket: "day" | "week" | "month";
  currency: string;
  lastDay: string; // last date in the range, to flag a period cut short
  today: string;
  empty: string;
}) {
  const { t, locale } = useI18n();
  const animate = useAnimate();
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const money = metric === "revenue";
  const color = METRIC_COLORS[metric];
  const fmtShort = (v: number) => (money ? formatMoney(v, currency, true) : formatNumber(v, true));
  const peak = data.reduce<TrendPoint | null>((best, p) => (!best || p[metric] > best[metric] ? p : best), null);

  // A day, week or month that hasn't finished, or that the chosen dates cut short.
  const incomplete = (start: string) => {
    if (bucket === "day") return start >= today;
    const end = new Date(`${start}T00:00:00Z`);
    if (bucket === "week") end.setUTCDate(end.getUTCDate() + 6);
    else end.setUTCMonth(end.getUTCMonth() + 1, 0);
    const last = end.toISOString().slice(0, 10);
    return last > lastDay || last >= today;
  };
  const last = data.at(-1);
  const lastIncomplete = last ? incomplete(last.period) : false;
  const hasData = data.some((p) => p[metric] > 0);

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      action={
        <Segmented
          label={t("chart.metric")}
          value={metric}
          onSelect={(k) => setMetric(k as "revenue" | "orders")}
          items={[{ key: "revenue", label: t("common.revenue") }, { key: "orders", label: t("common.orders") }]}
        />
      }
    >
      {!hasData ? (
        <ChartEmpty text={empty} height="h-72" />
      ) : (
        <>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ top: 22, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`trend-wash-${metric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={color} stopOpacity={0.28} />
                    <stop offset="1" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="period"
                  tickFormatter={(d: string) => (bucket === "month" ? formatMonth(d, true, locale) : formatDate(d, false, locale))}
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  tickMargin={8}
                />
                <YAxis tickFormatter={fmtShort} tick={AXIS} tickLine={false} axisLine={false} width={52} />
                <Tooltip
                  cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as TrendPoint | undefined;
                    if (!active || !point) return null;
                    const date = formatDate(point.period, true, locale);
                    const heading = bucket === "month" ? formatMonth(point.period, false, locale) : bucket === "week" ? t("chart.weekOf", { date }) : date;
                    return (
                      <TooltipBox
                        title={`${heading}${incomplete(point.period) ? ` ${t("chart.soFar")}` : ""}`}
                        rows={[{ value: money ? formatMoneyExact(point.revenue, currency) : t("chart.orders", { count: formatNumber(point.orders) }) }]}
                      />
                    );
                  }}
                />
                <Area
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#trend-wash-${metric})`}
                  dot={false}
                  activeDot={{ r: 5, fill: color, stroke: "var(--surface)", strokeWidth: 2 }}
                  {...motion(animate)}
                />
                {/* The one value worth labelling directly: the highest point. */}
                {peak && data.length > 2 && (
                  <ReferenceDot x={peak.period} y={peak[metric]} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} label={{ value: fmtShort(peak[metric]), position: "top", fill: "var(--muted)", fontSize: 12, fontWeight: 600 }} />
                )}
                {/* A hollow dot marks a period that isn't finished. */}
                {last && lastIncomplete && <ReferenceDot x={last.period} y={last[metric]} r={5} fill="var(--surface)" stroke={color} strokeWidth={2} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {lastIncomplete && <p className="mt-2 text-xs text-faint">{t("chart.incomplete")}</p>}
        </>
      )}
    </Panel>
  );
}

type ForecastLine = { dates: string[]; values: number[]; low: number[]; high: number[] };
type ForecastRow = { date: string; actual?: number; forecast?: number; band?: [number, number] };

// Past days as a solid line, the forecast as a dashed line, and the likely range
// shaded around it. Always one scale; revenue and orders are switched, not stacked.
export function ForecastChart({
  title,
  subtitle,
  history,
  revenue,
  orders,
  currency,
  empty,
}: {
  title: string;
  subtitle?: string;
  history: { date: string; revenue: number; orders: number }[];
  revenue: ForecastLine | null;
  orders: ForecastLine | null;
  currency: string;
  empty: string;
}) {
  const { t, locale } = useI18n();
  const animate = useAnimate();
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const line = metric === "revenue" ? revenue : orders;
  const color = METRIC_COLORS[metric];
  const money = metric === "revenue";
  const short = (v: number) => (money ? formatMoney(v, currency, true) : formatNumber(v, true));

  const rows: ForecastRow[] = line
    ? [
        ...history.map((p) => ({ date: p.date, actual: p[metric] })),
        ...line.dates.map((date, i) => ({ date, forecast: line.values[i], band: [line.low[i], line.high[i]] as [number, number] })),
      ]
    : [];

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      action={<Segmented label={t("chart.metric")} value={metric} onSelect={(k) => setMetric(k as "revenue" | "orders")} items={[{ key: "revenue", label: t("common.revenue") }, { key: "orders", label: t("common.orders") }]} />}
    >
      {!line ? (
        <ChartEmpty text={empty} height="h-72" />
      ) : (
        <>
          <LegendRow items={[{ label: t("chart.actual"), color, line: true }, { label: t("chart.forecast"), color, line: true }, { label: t("chart.range"), color: "var(--line-strong)" }]} />
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d, false, locale)} tick={AXIS} tickLine={false} axisLine={false} minTickGap={40} tickMargin={8} />
                <YAxis tickFormatter={short} tick={AXIS} tickLine={false} axisLine={false} width={52} />
                <Tooltip
                  cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    const p = payload?.[0]?.payload as ForecastRow | undefined;
                    if (!active || !p) return null;
                    const fmt = (v: number) => (money ? formatMoney(v, currency) : formatNumber(v));
                    return (
                      <TooltipBox
                        title={formatDate(p.date, true, locale)}
                        rows={
                          p.actual !== undefined
                            ? [{ label: t("chart.actual"), value: money ? formatMoneyExact(p.actual, currency) : formatNumber(p.actual), color }]
                            : [
                                { label: t("chart.forecast"), value: `≈ ${fmt(p.forecast ?? 0)}`, color },
                                { label: t("chart.range"), value: `${fmt(p.band?.[0] ?? 0)} – ${fmt(p.band?.[1] ?? 0)}` },
                              ]
                        }
                      />
                    );
                  }}
                />
                <Area type="monotone" dataKey="band" stroke="none" fill={color} fillOpacity={0.14} connectNulls={false} {...motion(animate)} />
                <Line type="monotone" dataKey="actual" stroke={color} strokeWidth={2} dot={false} connectNulls={false} {...motion(animate)} />
                <Line type="monotone" dataKey="forecast" stroke={color} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} {...motion(animate)} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Panel>
  );
}

// Orders per hour, in opening-hours order (the day "starts" at 05:00, so 00:00–02:00
// appear after 23:00). The busiest hour stands out in full colour.
export function OrdersByHourChart({ data, empty }: { data: { hour: number; orders: number }[]; empty: string }) {
  const { t } = useI18n();
  const animate = useAnimate();
  const sorted = [...data].sort((a, b) => ((a.hour + 19) % 24) - ((b.hour + 19) % 24));
  const most = Math.max(0, ...sorted.map((d) => d.orders));
  if (!most) return <ChartEmpty text={empty} height="h-64" />;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={sorted} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="hour" tickFormatter={(h: number) => formatHour(h)} tick={AXIS} tickLine={false} axisLine={false} minTickGap={18} tickMargin={8} />
          <YAxis tickFormatter={(v: number) => formatNumber(v, true)} tick={AXIS} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            cursor={HOVER_BAND}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as { hour: number; orders: number } | undefined;
              if (!active || !point) return null;
              return <TooltipBox title={`${formatHour(point.hour)}–${formatHour((point.hour + 1) % 24)}`} rows={[{ value: t("chart.orders", { count: formatNumber(point.orders) }) }]} />;
            }}
          />
          <Bar dataKey="orders" radius={[6, 6, 0, 0]} maxBarSize={24} {...motion(animate)}>
            {sorted.map((d) => <Cell key={d.hour} fill={METRIC_COLORS.orders} fillOpacity={d.orders === most ? 1 : 0.45} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type Slice = { name: string; value: number; color: string };

function Doughnut({ rows, currency, otherLabel, centerLabel }: { rows: Slice[]; currency: string; otherLabel: string; centerLabel: string }) {
  const animate = useAnimate();
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const rest = sorted.slice(5).reduce((sum, r) => sum + r.value, 0);
  const slices = rest > 0 ? [...sorted.slice(0, 5), { name: otherLabel, value: rest, color: sharedColor }] : sorted;
  const total = slices.reduce((sum, r) => sum + r.value, 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                const s = payload?.[0]?.payload as Slice | undefined;
                if (!active || !s) return null;
                return <TooltipBox title={s.name} rows={[{ value: `${formatMoneyExact(s.value, currency)} · ${sharePercent(s.value, total)}` }]} />;
              }}
            />
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" paddingAngle={2} cornerRadius={4} stroke="none" startAngle={90} endAngle={-270} {...motion(animate)}>
              {slices.map((s) => <Cell key={s.name} fill={s.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-faint">{centerLabel}</span>
          <span className="text-lg font-semibold tabular-nums text-ink">{formatMoney(total, currency)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2.5 text-sm">
        {slices.map((s) => (
          <li key={s.name} className="flex flex-wrap items-center justify-between gap-x-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
              <span className="truncate text-ink">{s.name}</span>
            </span>
            <span className="tabular-nums text-muted">
              {formatMoney(s.value, currency)}<span className="text-faint"> / {formatMoney(total, currency)}</span>
              <span className="ms-2 inline-block w-9 text-end font-medium text-ink">{sharePercent(s.value, total)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Shares of a total. With many categories a doughnut is hard to read, so it
// starts as sorted bars; you can switch to the doughnut.
export function CategoryCard({
  title,
  subtitle,
  rows,
  currency,
  otherLabel,
  centerLabel,
  empty,
}: {
  title: string;
  subtitle?: string;
  rows: Slice[];
  currency: string;
  otherLabel: string;
  centerLabel: string;
  empty: string;
}) {
  const { t } = useI18n();
  const [view, setView] = useState(rows.length > 4 ? "bars" : "doughnut");
  const hasData = rows.some((r) => r.value > 0);

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      action={
        hasData && (
          <Segmented label={t("chart.view")} value={view} onSelect={setView} items={[{ key: "bars", label: t("chart.view.bars") }, { key: "doughnut", label: t("chart.view.doughnut") }]} />
        )
      }
    >
      {view === "bars" || !hasData ? (
        <BreakdownList rows={rows} format={(v) => formatMoney(v, currency)} exact={(v) => formatMoneyExact(v, currency)} empty={empty} />
      ) : (
        <Doughnut rows={rows} currency={currency} otherLabel={otherLabel} centerLabel={centerLabel} />
      )}
    </Panel>
  );
}

type MonthPoint = { month: string; revenue: number; profit: number; partial?: boolean };

// Revenue as columns and profit as a line, on one shared scale. Months only partly
// inside the chosen dates are drawn lighter.
export function RevenueProfitChart({ data, currency, empty }: { data: MonthPoint[]; currency: string; empty: string }) {
  const { t, locale } = useI18n();
  const animate = useAnimate();
  if (!data.some((d) => d.revenue > 0 || d.profit !== 0)) return <ChartEmpty text={empty} height="h-72" />;

  return (
    <>
      <LegendRow items={[{ label: t("common.revenue"), color: METRIC_COLORS.revenue }, { label: t("common.profit"), color: METRIC_COLORS.profit, line: true }]} />
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="month" tickFormatter={(m: string) => formatMonth(m, true, locale)} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} tickMargin={8} />
            <YAxis tickFormatter={(v: number) => formatMoney(v, currency, true)} tick={AXIS} tickLine={false} axisLine={false} width={56} />
            <ReferenceLine y={0} stroke="var(--line-strong)" />
            <Tooltip
              cursor={HOVER_BAND}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as MonthPoint | undefined;
                if (!active || !p) return null;
                return (
                  <TooltipBox
                    title={`${formatMonth(p.month, false, locale)}${p.partial ? ` ${t("reports.partOfMonth")}` : ""}`}
                    rows={[
                      { label: t("common.revenue"), value: formatMoneyExact(p.revenue, currency), color: METRIC_COLORS.revenue },
                      { label: p.profit < 0 ? t("common.loss") : t("common.profit"), value: formatMoneyExact(Math.abs(p.profit), currency), color: p.profit < 0 ? "var(--danger)" : METRIC_COLORS.profit },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={24} {...motion(animate)}>
              {data.map((d) => <Cell key={d.month} fill={METRIC_COLORS.revenue} fillOpacity={d.partial ? 0.35 : 0.75} />)}
            </Bar>
            <Line type="monotone" dataKey="profit" stroke={METRIC_COLORS.profit} strokeWidth={2} dot={{ r: 3, fill: METRIC_COLORS.profit, strokeWidth: 0 }} activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }} {...motion(animate)} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// How revenue turns into profit: each cost steps down from the one before.
// Uses invisible "spacer" bars, split above and below zero so a loss draws correctly.
export function WaterfallChart({
  steps,
  currency,
  empty,
}: {
  steps: { label: string; value: number; kind: "total" | "cost" | "result"; color: string }[];
  currency: string;
  empty: string;
}) {
  const animate = useAnimate();
  if (!steps.some((s) => s.value !== 0)) return <ChartEmpty text={empty} height="h-72" />;

  // Where each step ends: costs continue from the running total, totals from zero.
  const ends = steps.reduce<number[]>((list, s, i) => [...list, s.kind === "cost" ? (list[i - 1] ?? 0) - s.value : s.value], []);
  const data = steps.map((s, i) => {
    const start = s.kind === "cost" ? (ends[i - 1] ?? 0) : 0;
    const end = ends[i];
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    return {
      ...s,
      spacerUp: lo > 0 ? lo : 0,
      up: hi > 0 ? hi - Math.max(lo, 0) : 0,
      spacerDown: hi < 0 ? hi : 0,
      down: lo < 0 ? lo - Math.min(hi, 0) : 0,
    };
  });
  const colorFor = (d: (typeof data)[number]) => (d.kind === "result" && d.value < 0 ? "var(--danger)" : d.color);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} stackOffset="sign" margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ ...AXIS, fontSize: 11 }} tickLine={false} axisLine={false} interval={0} tickMargin={8} />
          <YAxis tickFormatter={(v: number) => formatMoney(v, currency, true)} tick={AXIS} tickLine={false} axisLine={false} width={56} />
          <ReferenceLine y={0} stroke="var(--line-strong)" />
          <Tooltip
            cursor={HOVER_BAND}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !d) return null;
              return <TooltipBox title={d.label} rows={[{ value: `${d.kind === "cost" ? "−" : ""}${formatMoneyExact(Math.abs(d.value), currency)}` }]} />;
            }}
          />
          <Bar dataKey="spacerUp" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="spacerDown" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="up" stackId="w" radius={[6, 6, 0, 0]} maxBarSize={36} {...motion(animate)}>
            {data.map((d) => <Cell key={d.label} fill={colorFor(d)} />)}
          </Bar>
          <Bar dataKey="down" stackId="w" radius={[0, 0, 6, 6]} maxBarSize={36} {...motion(animate)}>
            {data.map((d) => <Cell key={d.label} fill={colorFor(d)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
