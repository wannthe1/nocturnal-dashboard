"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export type InviteFormState = { error?: string; message?: string; email?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Creates the invited person's own login. The database uses up the invite and adds
// them to the team; a bad or used invite cancels the sign-up.
export async function signUpWithInvite(token: string, _prev: InviteFormState, formData: FormData): Promise<InviteFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const { t } = await getI18n();
  if (!EMAIL_PATTERN.test(email)) return { error: t("login.err.email"), email };
  if (password.length < 8) return { error: t("login.err.password"), email };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { invite_token: token }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: t("invite.err.failed"), email };
  if (!data.session) return { message: t("login.checkInbox") };

  revalidatePath("/", "layout");
  redirect("/welcome");
}

// For someone already signed in with no restaurant, e.g. removed and invited back.
export async function joinWithInvite(token: string): Promise<InviteFormState> {
  const { t } = await getI18n();
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) return { error: t("invite.err.failed") };
  revalidatePath("/", "layout");
  redirect("/");
}
