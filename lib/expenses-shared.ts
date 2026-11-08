// Expense categories, used by the server (validation) and the browser (the form).
// The values match the check in supabase/schema.sql. The English names are also
// used to recognise categories in imported CSV files; on screen they're translated.
export const EXPENSE_CATEGORIES = {
  ingredients: "Ingredients & supplies",
  wages: "Staff wages",
  rent: "Rent",
  utilities: "Utilities",
  delivery_fees: "Delivery fees",
  marketing: "Marketing",
  maintenance: "Repairs & maintenance",
  other: "Other",
} as const;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;
