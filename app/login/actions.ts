"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clearFailures, lockSeconds, loginKey, recordFailure } from "@/lib/login-guard";
import { getI18n } from "@/lib/i18n/server";

// `values` sends back what was typed (never the password) so the form
// can refill itself after an error.
export type AuthState = {
  error?: string;
  message?: string;
  lockedUntil?: number; // when sign-in reopens after too many wrong passwords (ms)
  values?: { email: string; restaurantName: string };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readFields(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    restaurantName: String(formData.get("restaurantName") ?? "").trim(),
  };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, restaurantName } = readFields(formData);
  const values = { email, restaurantName };
  const { t } = await getI18n();
  if (!EMAIL_PATTERN.test(email) || !password) {
    return { error: t("login.err.missing"), values };
  }

  // Checked before the password, so a locked account gets no answer either way.
  const key = loginKey(email);
  const waiting = await lockSeconds(key);
  if (waiting > 0) return { lockedUntil: Date.now() + waiting * 1000, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") {
      const lock = await recordFailure(key);
      if (lock > 0) return { lockedUntil: Date.now() + lock * 1000, values };
    }
    const message =
      error.code === "email_not_confirmed"
        ? t("login.err.confirm")
        : t("login.err.wrong");
    return { error: message, values };
  }

  await clearFailures(key);
  revalidatePath("/", "layout");
  redirect(data.user.user_metadata?.display_name ? "/" : "/welcome");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, restaurantName } = readFields(formData);
  const values = { email, restaurantName };
  const { t } = await getI18n();
  if (restaurantName.length < 2) return { error: t("login.err.restaurant"), values };
  if (!EMAIL_PATTERN.test(email)) return { error: t("login.err.email"), values };
  if (password.length < 8) {
    return { error: t("login.err.password"), values };
  }

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Stored on the user; the database trigger uses it to create the restaurant.
      data: { restaurant_name: restaurantName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) return { error: error.message, values };

  // If email confirmation is on in Supabase, there is no session yet.
  if (!data.session) {
    return { message: t("login.checkInbox") };
  }
  redirect("/welcome");
}

export async function signOut() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();

  // The browser is signed out as soon as these are gone, so nobody waits for
  // Supabase. It's told to end the session once the response has been sent.
  const cookieStore = await cookies();
  cookieStore.getAll().filter((c) => c.name.startsWith("sb-")).forEach((c) => cookieStore.delete(c.name));
  const token = data.session?.access_token;
  if (token) after(() => supabase.auth.admin.signOut(token));

  revalidatePath("/", "layout"); // forget this account's pages in the browser
  redirect("/login");
}
