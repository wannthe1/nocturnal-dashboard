"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { storeName } from "@/lib/save-name";

export type WelcomeState = { error?: string };

export async function completeWelcome(_prev: WelcomeState, formData: FormData): Promise<WelcomeState> {
  const error = await storeName(formData);
  if (error) return { error };
  revalidatePath("/", "layout");
  redirect("/");
}
