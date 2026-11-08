import "server-only";
import { cache } from "react";
import { cacheLife } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LIVE_DATA } from "@/lib/live-data";

export type Restaurant = {
  id: string;
  name: string;
  currency: string;
};

// Checks the signature of the login token right here, without a trip to Supabase.
async function readClaims() {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ? { email: (data.claims.email as string | undefined) ?? "" } : null;
}

async function readRestaurant() {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  // Row Level Security means this only ever returns the user's own restaurant.
  const { data } = await supabase.from("restaurants").select("id, name, currency").maybeSingle<Restaurant>();
  return data;
}

// The signed-in user, or a redirect to /login. No database trip.
export const requireUser = cache(async () => {
  const claims = await readClaims();
  if (!claims) redirect("/login");
  return claims;
});

// The signed-in user and their restaurant, for pages. `cache` makes repeat calls
// during the same request reuse the first result.
export const getCurrentUser = cache(async () => {
  const [{ email }, restaurant] = await Promise.all([requireUser(), readRestaurant()]);
  return { email, restaurant };
});

// For anything that changes data: asks Supabase directly, so a session that was
// just revoked can't save anything.
export async function getVerifiedUser() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const { data: restaurant } = await supabase.from("restaurants").select("id, name, currency").maybeSingle<Restaurant>();
  return { email: userData.user.email ?? "", restaurant };
}
