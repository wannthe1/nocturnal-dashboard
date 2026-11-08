import { Suspense } from "react";
import { requireAccess } from "@/lib/auth";
import { can } from "@/lib/roles";
import { TeamTabs } from "./tabs";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Suspense fallback={<div className="skeleton h-11 w-full max-w-xl rounded-3xl" />}>
        <Tabs />
      </Suspense>
      {children}
    </div>
  );
}

async function Tabs() {
  const { role } = await requireAccess("team");
  return <TeamTabs showActivity={can(role, "activity")} />;
}
