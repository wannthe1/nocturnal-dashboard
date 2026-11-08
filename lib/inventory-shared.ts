// Inventory helpers that both the server and the browser (the item form) use.

export const UNITS = ["kg", "g", "L", "ml", "pcs", "pack"] as const;

export type StockStatus = "out" | "low" | "ok";

// "Low" means at or below the reorder level; "out" means none left.
export function stockStatus(item: { quantity: number; reorder_level: number }): StockStatus {
  if (item.quantity <= 0) return "out";
  if (item.quantity <= item.reorder_level) return "low";
  return "ok";
}
