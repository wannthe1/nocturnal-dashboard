import { createBrowserClient } from "@supabase/ssr";

// Supabase in the browser, used for live updates. Saving and loading data stays on the server.
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
