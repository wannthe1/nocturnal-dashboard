"use server";

import { revalidatePath } from "next/cache";
import { cleanName } from "@/lib/display-name";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export type NameState = { error?: string; saved?: boolean };

export async function savePreferredName(_prev: NameState, formData: FormData): Promise<NameState> {
  const { t } = await getI18n();
  const name = cleanName(formData.get("name"));
  if (!name) return { error: t("name.err") };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
  if (error) return { error: t("team.err.save") };

  // The name travels in the login token, so get a new token that includes it.
  await supabase.auth.refreshSession();
  revalidatePath("/", "layout");
  return { saved: true };
}
