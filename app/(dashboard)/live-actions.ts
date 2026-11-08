"use server";

import { revalidatePath } from "next/cache";

// Throws away this browser's saved pages and redraws the current one, so it picks
// up the person's current role. Anyone no longer allowed on the page is sent away.
export async function refreshPages() {
  revalidatePath("/", "layout");
}
