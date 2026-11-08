// CSV import rules, shared by the browser (preview and validation) and the
// server (which checks every row again before saving: never trust the browser).

import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expenses-shared";
import type { Translate } from "@/lib/i18n/config";

export type ImportKind = "sales" | "expenses";

// Rows are sent to the server in batches of this size.
export const MAX_CHUNK = 500;

export type FieldDef = {
  key: string;
  label: string;
  required: boolean;
  // Column names this field is matched with automatically (compared without
  // spaces, punctuation or capitals).
  synonyms: string[];
  hint?: string;
};

export const FIELDS: Record<ImportKind, FieldDef[]> = {
  sales: [
    { key: "date", label: "Date", required: true, synonyms: ["date", "saledate", "orderdate", "day", "soldat", "datetime", "timestamp", "createdat"] },
    { key: "time", label: "Time", required: false, synonyms: ["time", "ordertime", "saletime"], hint: "Without a time, sales are recorded at 12:00." },
    { key: "item_name", label: "Item", required: true, synonyms: ["item", "itemname", "product", "productname", "menuitem", "name"] },
    { key: "quantity", label: "Quantity", required: true, synonyms: ["quantity", "qty", "units", "count"] },
    { key: "unit_price", label: "Unit price", required: true, synonyms: ["unitprice", "price", "itemprice", "priceeach"] },
    { key: "order_ref", label: "Order ID", required: false, synonyms: ["orderid", "order", "orderref", "ordernumber", "orderno", "receipt", "ticket", "transactionid", "invoice"], hint: "Without it, each row counts as its own order." },
    { key: "category", label: "Category", required: false, synonyms: ["category", "productcategory", "itemcategory", "group"] },
    { key: "channel", label: "Channel", required: false, synonyms: ["channel", "purchasetype", "ordertype", "servicetype", "diningoption"], hint: "Dine-in, takeaway or delivery. Empty means dine-in." },
    { key: "payment_method", label: "Payment", required: false, synonyms: ["paymentmethod", "payment", "paymenttype", "tender", "paidby"], hint: "Card, cash, mobile or gift card. Empty means card." },
    { key: "branch", label: "Branch", required: false, synonyms: ["branch", "location", "store", "outlet", "site", "branchname"], hint: "Must match a branch name exactly." },
  ],
  expenses: [
    { key: "date", label: "Date", required: true, synonyms: ["date", "spenton", "paidon", "expensedate", "day"] },
    { key: "description", label: "Description", required: true, synonyms: ["description", "details", "memo", "item", "name", "payee", "vendor", "supplier"] },
    { key: "amount", label: "Amount", required: true, synonyms: ["amount", "total", "cost", "value", "price", "net"] },
    { key: "category", label: "Category", required: false, synonyms: ["category", "type", "account", "expensetype"], hint: "Unrecognised categories become “Other”." },
    { key: "branch", label: "Branch", required: false, synonyms: ["branch", "location", "store", "outlet", "site", "branchname"], hint: "Must match a branch name exactly. Empty means the default below." },
  ],
};

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Pairs each field with the first CSV column whose name matches one of its synonyms.
export function autoMatch(kind: ImportKind, headers: string[]): Record<string, string> {
  const used = new Set<string>();
  const mapping: Record<string, string> = {};
  for (const field of FIELDS[kind]) {
    const header = headers.find((h) => !used.has(h) && field.synonyms.includes(squash(h)));
    mapping[field.key] = header ?? "";
    if (header) used.add(header);
  }
  return mapping;
}

// ---- Dates, times and numbers -------------------------------------------

export type DateFormat = "ymd" | "dmy" | "mdy";

export const DATE_FORMATS: Record<DateFormat, string> = {
  ymd: "Year-month-day (2026-11-30)",
  dmy: "Day-month-year (30-11-2026)",
  mdy: "Month-day-year (11-30-2026)",
};

const DATE_PARTS = /^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/;

// Guesses the date format from sample values: a first part above 12 can only be
// a day; a second part above 12 means month-first.
export function detectDateFormat(samples: string[]): DateFormat {
  let dayFirst = false;
  let monthFirst = false;
  for (const s of samples) {
    const m = DATE_PARTS.exec(s.trim());
    if (!m) continue;
    if (m[1].length === 4) return "ymd";
    if (Number(m[1]) > 12) dayFirst = true;
    if (Number(m[2]) > 12) monthFirst = true;
  }
  return monthFirst && !dayFirst ? "mdy" : "dmy";
}

// Returns { date: "YYYY-MM-DD", time?: "HH:MM" }, or null if it isn't a real date.
export function parseDate(raw: string, format: DateFormat): { date: string; time: string | null } | null {
  const value = raw.trim();
  const m = DATE_PARTS.exec(value);
  if (!m) return null;
  const [a, b, c] = [m[1], m[2], m[3]];
  const [y, mo, d] =
    a.length === 4 ? [a, b, c] : format === "mdy" ? [c, a, b] : format === "dmy" ? [c, b, a] : [a, b, c];
  const year = Number(y.length === 2 ? `20${y}` : y);
  const month = Number(mo);
  const day = Number(d);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (year < 1990 || year > 2100 || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // A time after the date, e.g. "2026-11-30 18:45" or "2026-11-30T18:45:00".
  const rest = value.slice(m[0].length).replace(/^[T\s]+/, "");
  return { date, time: rest ? parseTime(rest) : null };
}

// "18:45", "18:45:10" or "6:45 PM" → "18:45"; anything else → null.
export function parseTime(raw: string): string | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i.exec(raw.trim());
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const meridiem = m[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// "$1,234.50" → 1234.5. Assumes "." for decimals.
export function parseNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^\d.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ---- Words to fixed values ------------------------------------------------

export function toChannel(raw: string): "dine_in" | "takeaway" | "delivery" | null {
  const v = squash(raw);
  if (!v) return "dine_in";
  if (/deliver|online|ubereats|deliveroo|doordash/.test(v)) return "delivery";
  if (/take|drive|pickup|collect|togo/.test(v)) return "takeaway";
  if (/dine|instore|eatin|table|restaurant|counter/.test(v)) return "dine_in";
  return null;
}

export function toPaymentMethod(raw: string): "card" | "mobile" | "cash" | "gift_card" | null {
  const v = squash(raw);
  if (!v) return "card";
  if (/cash/.test(v)) return "cash";
  if (/gift|voucher/.test(v)) return "gift_card";
  if (/mobile|apple|google|wallet|paypal|qr/.test(v)) return "mobile";
  if (/card|credit|debit|visa|master|amex|contactless|eftpos/.test(v)) return "card";
  return null;
}

const CATEGORY_WORDS: [RegExp, ExpenseCategory][] = [
  [/wage|salar|payroll|staff|labou?r/, "wages"],
  [/rent|lease/, "rent"],
  [/utilit|electric|gas|water|energy|power/, "utilities"],
  [/deliver|commission|ubereats|deliveroo|doordash/, "delivery_fees"],
  [/market|advert|\bads?\b|promo|social/, "marketing"],
  [/repair|mainten|equipment|clean|service/, "maintenance"],
  [/ingredient|food|suppl|grocer|produce|stock|cogs|drink|beverage/, "ingredients"],
];

// Returns the category and whether it had to fall back to "Other".
export function toExpenseCategory(raw: string): { category: ExpenseCategory; guessed: boolean } {
  const v = raw.trim().toLowerCase();
  if (!v) return { category: "other", guessed: false };
  if (v in EXPENSE_CATEGORIES) return { category: v as ExpenseCategory, guessed: false };
  const byLabel = Object.entries(EXPENSE_CATEGORIES).find(([, label]) => label.toLowerCase() === v);
  if (byLabel) return { category: byLabel[0] as ExpenseCategory, guessed: false };
  const byWord = CATEGORY_WORDS.find(([pattern]) => pattern.test(v));
  return byWord ? { category: byWord[1], guessed: false } : { category: "other", guessed: true };
}

// ---- Rows ready to save -----------------------------------------------------

export type SaleRow = {
  branch_id: string;
  order_ref: string;
  sold_at: string; // ISO timestamp, UTC
  item_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  channel: "dine_in" | "takeaway" | "delivery";
  payment_method: "card" | "mobile" | "cash" | "gift_card";
};

export type ExpenseRow = {
  branch_id: string | null;
  spent_on: string; // YYYY-MM-DD
  description: string;
  category: ExpenseCategory;
  amount: number;
};

export type RowResult<T> = { row: T | null; errors: string[]; warnings: string[] };

export type ConvertOptions = {
  mapping: Record<string, string>;
  dateFormat: DateFormat;
  defaultBranchId: string | null; // null = shared (expenses only)
  branchIdsByName: Map<string, string>; // lower-case name → id
  t: Translate; // for messages about each row
};

function branchFor(raw: string, opts: ConvertOptions, errors: string[]) {
  const name = raw.trim();
  if (!name) return opts.defaultBranchId;
  const id = opts.branchIdsByName.get(name.toLowerCase());
  if (!id) errors.push(opts.t("import.err.branch", { value: name }));
  return id ?? null;
}

// Turns one CSV row into a sale, or explains what's wrong with it.
export function toSaleRow(raw: Record<string, string>, opts: ConvertOptions, orderRefFallback: string): RowResult<SaleRow> {
  const get = (key: string) => (opts.mapping[key] ? (raw[opts.mapping[key]] ?? "") : "");
  const errors: string[] = [];
  const warnings: string[] = [];

  const parsed = parseDate(get("date"), opts.dateFormat);
  if (!parsed) errors.push(opts.t("import.err.date", { value: get("date") }));
  let time = parsed?.time ?? null;
  if (get("time")) {
    time = parseTime(get("time"));
    if (!time) errors.push(opts.t("import.err.time", { value: get("time") }));
  }

  const itemName = get("item_name").trim();
  if (!itemName) errors.push(opts.t("import.err.item"));

  let quantity = parseNumber(get("quantity"));
  if (quantity === null || quantity <= 0) {
    errors.push(opts.t("import.err.quantity", { value: get("quantity") }));
  } else if (!Number.isInteger(quantity)) {
    const rounded = Math.max(1, Math.round(quantity));
    warnings.push(opts.t("import.warn.rounded", { from: quantity, to: rounded }));
    quantity = rounded;
  }

  const unitPrice = parseNumber(get("unit_price"));
  if (unitPrice === null || unitPrice < 0) errors.push(opts.t("import.err.price", { value: get("unit_price") }));

  const channel = toChannel(get("channel"));
  if (!channel) errors.push(opts.t("import.err.channel", { value: get("channel") }));
  const payment = toPaymentMethod(get("payment_method"));
  if (!payment) errors.push(opts.t("import.err.payment", { value: get("payment_method") }));

  const branchId = branchFor(get("branch"), opts, errors);
  if (!branchId && !get("branch").trim()) errors.push(opts.t("import.err.chooseBranch"));

  if (errors.length) return { row: null, errors, warnings };
  return {
    row: {
      branch_id: branchId!,
      order_ref: (get("order_ref").trim() || orderRefFallback).slice(0, 64),
      sold_at: `${parsed!.date}T${time ?? "12:00"}:00Z`,
      item_name: itemName.slice(0, 120),
      category: (get("category").trim() || "Uncategorised").slice(0, 60),
      quantity: quantity!,
      unit_price: Math.round(unitPrice! * 100) / 100,
      channel: channel!,
      payment_method: payment!,
    },
    errors,
    warnings,
  };
}

// Turns one CSV row into an expense, or explains what's wrong with it.
export function toExpenseRow(raw: Record<string, string>, opts: ConvertOptions): RowResult<ExpenseRow> {
  const get = (key: string) => (opts.mapping[key] ? (raw[opts.mapping[key]] ?? "") : "");
  const errors: string[] = [];
  const warnings: string[] = [];

  const parsed = parseDate(get("date"), opts.dateFormat);
  if (!parsed) errors.push(opts.t("import.err.date", { value: get("date") }));
  const description = get("description").trim();
  if (!description) errors.push(opts.t("import.err.description"));
  const amount = parseNumber(get("amount"));
  if (amount === null || amount <= 0) errors.push(opts.t("import.err.amount", { value: get("amount") }));
  const { category, guessed } = toExpenseCategory(get("category"));
  if (guessed) warnings.push(opts.t("import.warn.category", { value: get("category").trim() }));
  const branchId = branchFor(get("branch"), opts, errors);

  if (errors.length) return { row: null, errors, warnings };
  return {
    row: {
      branch_id: branchId,
      spent_on: parsed!.date,
      description: description.slice(0, 200),
      category,
      amount: Math.round(amount! * 100) / 100,
    },
    errors,
    warnings,
  };
}

// ---- Server-side checks on rows sent from the browser -----------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const isText = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const isAmount = (v: unknown, min: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v < 1e9;

export function isValidSaleRow(r: SaleRow): boolean {
  return (
    isText(r.branch_id, 36) &&
    isText(r.order_ref, 64) &&
    typeof r.sold_at === "string" && ISO_TIMESTAMP.test(r.sold_at) && !Number.isNaN(Date.parse(r.sold_at)) &&
    isText(r.item_name, 120) &&
    isText(r.category, 60) &&
    Number.isInteger(r.quantity) && r.quantity > 0 && r.quantity < 1e6 &&
    isAmount(r.unit_price, 0) &&
    ["dine_in", "takeaway", "delivery"].includes(r.channel) &&
    ["card", "mobile", "cash", "gift_card"].includes(r.payment_method)
  );
}

export function isValidExpenseRow(r: ExpenseRow): boolean {
  return (
    (r.branch_id === null || isText(r.branch_id, 36)) &&
    typeof r.spent_on === "string" && ISO_DATE.test(r.spent_on) && !Number.isNaN(Date.parse(r.spent_on)) &&
    isText(r.description, 200) &&
    r.category in EXPENSE_CATEGORIES &&
    isAmount(r.amount, 0.01)
  );
}
