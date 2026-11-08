"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import {
  MAX_CHUNK,
  isValidExpenseRow,
  isValidSaleRow,
  type ExpenseRow,
  type ImportKind,
  type SaleRow,
} from "@/lib/import-shared";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

// Step 1: record the file. Rows saved afterwards point back to this import.
export async function startImport(kind: ImportKind, fileName: string): Promise<Result<{ id: string }>> {
  const [{ restaurant }, { t }] = await Promise.all([getVerifiedUser(), getI18n()]);
  if (!restaurant) return { ok: false, error: t("action.noRestaurant") };
  if (kind !== "sales" && kind !== "expenses") return { ok: false, error: t("import.err.kind") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imports")
    .insert({ restaurant_id: restaurant.id, kind, file_name: fileName.slice(0, 255) || "upload.csv" })
    .select("id")
    .single();
  if (error) return { ok: false, error: t("import.err.start") };
  return { ok: true, id: data.id };
}

// Step 2 (repeated): save one chunk of rows. Every row is checked again here.
export async function importRows(
  importId: string,
  kind: ImportKind,
  rows: SaleRow[] | ExpenseRow[],
): Promise<Result<{ saved: number }>> {
  const [{ restaurant }, { t }] = await Promise.all([getVerifiedUser(), getI18n()]);
  if (!restaurant) return { ok: false, error: t("action.noRestaurant") };
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_CHUNK) {
    return { ok: false, error: t("import.err.batch") };
  }

  const valid =
    kind === "sales"
      ? (rows as SaleRow[]).every(isValidSaleRow)
      : (rows as ExpenseRow[]).every(isValidExpenseRow);
  if (!valid) return { ok: false, error: t("import.err.format") };

  // Only the expected fields are copied, so nothing extra can sneak in.
  // Row Level Security and the database's own checks apply to these inserts too.
  const supabase = await createClient();
  const { error } =
    kind === "sales"
      ? await supabase.from("sales").insert(
          (rows as SaleRow[]).map((r) => ({
            branch_id: r.branch_id, order_ref: r.order_ref, sold_at: r.sold_at, item_name: r.item_name,
            category: r.category, quantity: r.quantity, unit_price: r.unit_price, channel: r.channel,
            payment_method: r.payment_method, restaurant_id: restaurant.id, import_id: importId,
          })),
        )
      : await supabase.from("expenses").insert(
          (rows as ExpenseRow[]).map((r) => ({
            branch_id: r.branch_id, spent_on: r.spent_on, description: r.description, category: r.category,
            amount: r.amount, restaurant_id: restaurant.id, import_id: importId,
          })),
        );
  if (error) return { ok: false, error: t("import.err.refused", { detail: error.message }) };
  return { ok: true, saved: rows.length };
}

// Step 3: store the final row count and refresh the page.
export async function finishImport(importId: string, rowCount: number): Promise<Result> {
  const [, { t }] = await Promise.all([getVerifiedUser(), getI18n()]);
  const supabase = await createClient();
  const { error } = await supabase.from("imports").update({ row_count: rowCount }).eq("id", importId);
  if (error) return { ok: false, error: t("import.err.finish") };
  revalidatePath("/", "layout");
  return { ok: true };
}

// Undo: deleting the import also deletes every row it added (see schema.sql).
export async function deleteImport(importId: string): Promise<void> {
  await getVerifiedUser();
  const supabase = await createClient();
  await supabase.from("imports").delete().eq("id", importId);
  revalidatePath("/", "layout");
}
