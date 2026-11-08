import { BoxIcon, ForecastIcon, GridIcon, ReportIcon, SalesIcon, ClockIcon, TeamIcon, UploadIcon, WalletIcon } from "@/components/icons";
import type { MessageKey } from "@/lib/i18n/config";
import type { Area } from "@/lib/roles";

export const NAV_ITEMS: { key: MessageKey; href: string; area: Area; icon: (p: { className?: string }) => React.ReactNode }[] = [
  { key: "nav.overview", href: "/", area: "overview", icon: GridIcon },
  { key: "nav.sales", href: "/sales", area: "sales", icon: SalesIcon },
  { key: "nav.forecast", href: "/forecast", area: "forecast", icon: ForecastIcon },
  { key: "nav.inventory", href: "/inventory", area: "inventory", icon: BoxIcon },
  { key: "nav.expenses", href: "/expenses", area: "expenses", icon: WalletIcon },
  { key: "nav.import", href: "/import", area: "import", icon: UploadIcon },
  { key: "nav.reports", href: "/reports", area: "reports", icon: ReportIcon },
  { key: "nav.schedule", href: "/schedule", area: "schedule", icon: ClockIcon },
  { key: "nav.team", href: "/team", area: "team", icon: TeamIcon },
];

// "/inventory/new" still counts as Inventory.
export const isActive = (href: string, pathname: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
