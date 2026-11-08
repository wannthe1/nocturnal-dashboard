import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeletons";
import { requireAccess } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { getMembers, getPendingInvites } from "@/lib/team";
import { TeamManager } from "./team-manager";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.team") };
}

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <Team />
      </Suspense>
    </div>
  );
}

async function Team() {
  const user = await requireAccess("team");
  const canManage = can(user.role, "manageTeam");
  const [members, invites] = await Promise.all([getMembers(), canManage ? getPendingInvites() : []]);
  return <TeamManager members={members} invites={invites} canManage={canManage} currentUserId={user.id} ownerEmail={user.isOwner ? user.email : null} />;
}
