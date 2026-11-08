"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getVerifiedUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { ROLES, can, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type InviteState = { error?: string; link?: string };

const isRole = (value: unknown): value is Role => ROLES.includes(value as Role);

// Creates a single-use invite link. The link is shown once; only its hash is kept.
export async function createInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const [{ restaurant, role }, { t }] = await Promise.all([getVerifiedUser(), getI18n()]);
  if (!restaurant || !can(role, "manageTeam")) return { error: t("action.noPermission") };

  const inviteRole = formData.get("role");
  if (!isRole(inviteRole)) return { error: t("team.err.save") };

  const token = randomBytes(24).toString("base64url");
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_invitations")
    .insert({ restaurant_id: restaurant.id, role: inviteRole, token_hash: createHash("sha256").update(token).digest("hex") });
  if (error) return { error: t("team.err.save") };

  revalidatePath("/", "layout");
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return { link: `${origin}/invite/${token}` };
}

export async function cancelInvite(id: string) {
  const { role } = await getVerifiedUser();
  if (!can(role, "manageTeam")) return;
  const supabase = await createClient();
  await supabase.from("team_invitations").delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function changeRole(userId: string, newRole: string) {
  const { id, role } = await getVerifiedUser();
  if (!can(role, "manageTeam") || userId === id || !isRole(newRole)) return;
  const supabase = await createClient();
  await supabase.from("team_members").update({ role: newRole }).eq("user_id", userId);
  revalidatePath("/", "layout");
}

export async function removeMember(userId: string) {
  const { id, role } = await getVerifiedUser();
  if (!can(role, "manageTeam") || userId === id) return;
  const supabase = await createClient();
  await supabase.rpc("remove_team_member", { p_user: userId });
  revalidatePath("/", "layout");
}
