import { PeriodBar } from "@/components/period-bar";
import type { Period, Preset } from "@/lib/period";

// Hands the page's period to the interactive filter bar (presets hold functions,
// which can't be sent to the browser, so only their keys go across).
export function PeriodFilter({
  basePath,
  presets,
  period,
  branch,
  branches,
}: {
  basePath: string;
  presets: Record<string, Preset>;
  period: Period;
  branch: { id: string; name: string } | null;
  branches: { id: string; name: string }[];
}) {
  return (
    <PeriodBar
      basePath={basePath}
      presets={Object.entries(presets).map(([key, p]) => ({ key, labelKey: p.labelKey }))}
      periodKey={period.key}
      from={period.from}
      to={period.to}
      previousFrom={period.previousFrom}
      previousTo={period.previousTo}
      today={period.today}
      errorKey={period.errorKey}
      branchId={branch?.id ?? null}
      branches={branches}
    />
  );
}
