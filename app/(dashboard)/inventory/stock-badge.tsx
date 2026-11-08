import { getI18n } from "@/lib/i18n/server";
import type { StockStatus } from "@/lib/inventory-shared";

// Status is shown as a word, with colour as a second cue (never colour alone).
const STYLES: Record<StockStatus, string> = {
  out: "bg-danger/12 text-danger",
  low: "bg-warning/12 text-warning",
  ok: "bg-accent-soft text-accent-text",
};

export async function StockBadge({ status }: { status: StockStatus }) {
  const { t } = await getI18n();
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {t(`inventory.badge.${status}`)}
    </span>
  );
}
