import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Locks sign-in for a minute after every 5 wrong passwords for the same email.
// Counters live in a table only this server can reach, using the secret key, so
// nobody can reset them from a browser. Emails are stored hashed.
function guardClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    console.error("Login lock is off: set SUPABASE_SECRET_KEY on the server.");
    return null;
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const loginKey = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

// Calls one of the guard functions. If it fails, sign-in carries on: an outage
// here shouldn't lock every owner out, and Supabase's own rate limits still apply.
async function call(fn: string, key: string) {
  const client = guardClient();
  if (!client) return 0;
  const { data, error } = await client.rpc(fn, { p_key: key });
  if (error) {
    console.error(`Login lock failed: ${error.message}`);
    return 0;
  }
  return Number(data ?? 0);
}

// Seconds until this email may try again (0 = allowed now).
export const lockSeconds = (key: string) => call("login_lock_seconds", key);
// Records a wrong password; returns the lock length if this was the fifth.
export const recordFailure = (key: string) => call("record_login_failure", key);
export const clearFailures = (key: string) => call("clear_login_failures", key);
