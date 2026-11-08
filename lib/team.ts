import "server-only";
import { cacheLife } from "next/cache";
import { LIVE_DATA } from "@/lib/live-data";
import type { Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type Member = { user_id: string; email: string; role: Role; created_at: string };
export type Invite = { id: string; role: Role; expires_at: string };

export async function getMembers(): Promise<Member[]> {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_members").select("user_id, email, role, created_at").order("created_at").returns<Member[]>();
  if (error) throw new Error(`Couldn't load the team: ${error.message}`);
  return data;
}

// Invite links that are still waiting to be used.
export async function getPendingInvites(): Promise<Invite[]> {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_invitations")
    .select("id, role, expires_at")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .returns<Invite[]>();
  if (error) throw new Error(`Couldn't load invites: ${error.message}`);
  return data;
}
