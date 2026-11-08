import "server-only";
import { cache } from "react";
import { cacheLife } from "next/cache";
import { redirect } from "next/navigation";
import { LIVE_DATA } from "@/lib/live-data";
import { can, homeFor, type Area, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type Restaurant = {
  id: string;
  name: string;
  currency: string;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Checks the signature of the login token right here, without a trip to Supabase.
async function readClaims() {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;
  const { sub, email, user_metadata: metadata } = data.claims;
  return { id: sub as string, email: (email as string | undefined) ?? "", name: (metadata?.display_name as string | undefined) ?? "" };
}

// The person's restaurant and role. Row Level Security only ever returns their own.
async function lookUpAccess(supabase: Supabase, userId: string) {
  const { data } = await supabase.from("restaurants").select("id, name, currency, owner_id").maybeSingle<Restaurant & { owner_id: string }>();
  if (!data) return { restaurant: null, role: null as Role | null, isOwner: false };
  const restaurant: Restaurant = { id: data.id, name: data.name, currency: data.currency };
  if (data.owner_id === userId) return { restaurant, role: "admin" as Role | null, isOwner: true };
  const { data: member } = await supabase.from("team_members").select("role").eq("user_id", userId).maybeSingle<{ role: Role }>();
  return { restaurant, role: (member?.role ?? null) as Role | null, isOwner: false };
}

async function readAccess(userId: string) {
  "use cache: private";
  cacheLife(LIVE_DATA);
  return lookUpAccess(await createClient(), userId);
}

// The signed-in user, or a redirect to /login. No database trip.
export const requireUser = cache(async () => {
  const claims = await readClaims();
  if (!claims) redirect("/login");
  return claims;
});

// The signed-in user with their restaurant and role, for pages. `cache` makes
// repeat calls during the same request reuse the first result.
export const getCurrentUser = cache(async () => {
  const { id, email, name } = await requireUser();
  return { id, email, name, ...(await readAccess(id)) };
});

// For pages: sends anyone whose role doesn't include this area to their own home page.
export async function requireAccess(area: Area) {
  const user = await getCurrentUser();
  if (!user.role) redirect("/no-access");
  if (!can(user.role, area)) redirect(homeFor(user.role));
  return user;
}

// For anything that changes data: asks Supabase directly, so a session that was
// just revoked can't save anything.
export async function getVerifiedUser() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  return { id: userData.user.id, email: userData.user.email ?? "", ...(await lookUpAccess(supabase, userData.user.id)) };
}
