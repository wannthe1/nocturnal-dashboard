import "server-only";
import { cleanName } from "@/lib/display-name";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

// Saves the signed-in person's name. Returns an error message, or null if it worked.
export async function storeName(formData: FormData) {
  const { t } = await getI18n();
  const name = cleanName(formData.get("name"));
  if (!name) return t("name.err");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
  if (error) return t("team.err.save");

  // The name travels in the login token, so get a new token that includes it.
  await supabase.auth.refreshSession();
  return null;
}
