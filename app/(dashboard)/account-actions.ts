"use server";

import { revalidatePath } from "next/cache";
import { storeName } from "@/lib/save-name";

export type NameState = { error?: string; saved?: boolean };

export async function savePreferredName(_prev: NameState, formData: FormData): Promise<NameState> {
  const error = await storeName(formData);
  if (error) return { error };
  revalidatePath("/", "layout");
  return { saved: true };
}
