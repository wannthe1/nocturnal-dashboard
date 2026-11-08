import { BoxIcon, ForecastIcon, GridIcon, ReportIcon, SalesIcon, UploadIcon, WalletIcon } from "@/components/icons";
import type { MessageKey } from "@/lib/i18n/config";

export const NAV_ITEMS: { key: MessageKey; href: string; icon: (p: { className?: string }) => React.ReactNode }[] = [
  { key: "nav.overview", href: "/", icon: GridIcon },
  { key: "nav.sales", href: "/sales", icon: SalesIcon },
  { key: "nav.forecast", href: "/forecast", icon: ForecastIcon },
  { key: "nav.inventory", href: "/inventory", icon: BoxIcon },
  { key: "nav.expenses", href: "/expenses", icon: WalletIcon },
  { key: "nav.import", href: "/import", icon: UploadIcon },
  { key: "nav.reports", href: "/reports", icon: ReportIcon },
];

// "/inventory/new" still counts as Inventory.
export const isActive = (href: string, pathname: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
