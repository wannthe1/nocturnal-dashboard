"use client";

import { usePathname } from "next/navigation";
import { LinkSegmented } from "@/components/link-segmented";
import { useI18n } from "@/lib/i18n/client";

export function TeamTabs({ showActivity }: { showActivity: boolean }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = [
    { key: "/team", label: t("team.tab.accounts"), href: "/team" },
    { key: "/team/shifts", label: t("team.tab.shifts"), href: "/team/shifts" },
    { key: "/team/attendance", label: t("team.tab.attendance"), href: "/team/attendance" },
    { key: "/team/performance", label: t("team.tab.performance"), href: "/team/performance" },
    ...(showActivity ? [{ key: "/team/activity", label: t("team.tab.activity"), href: "/team/activity" }] : []),
  ];
  return <LinkSegmented label={t("team.tabs")} value={pathname} items={items} />;
}
