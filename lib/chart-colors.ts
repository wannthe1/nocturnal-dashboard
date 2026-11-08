// One colour per thing, on every chart. A metric, expense category or channel
// always has the same colour, wherever it's drawn and however the list is sorted.
// The colours are theme variables, in greys. Every chart also names what it shows,
// so nothing depends on telling two shades apart.

export const METRIC_COLORS = {
  revenue: "var(--cat-1)",
  orders: "var(--cat-4)",
  profit: "var(--cat-2)",
  expenses: "var(--cat-6)",
};

const OTHER = "var(--cat-other)";

const EXPENSE_COLORS: Record<string, string> = {
  ingredients: "var(--cat-3)",
  wages: "var(--cat-5)",
  rent: "var(--cat-7)",
  utilities: "var(--cat-4)",
  delivery_fees: "var(--cat-2)",
  marketing: "var(--cat-6)",
  maintenance: "var(--cat-1)",
  other: OTHER,
};

const CHANNEL_COLORS: Record<string, string> = {
  dine_in: "var(--cat-1)",
  takeaway: "var(--cat-3)",
  delivery: "var(--cat-2)",
};

export const expenseColor = (category: string) => EXPENSE_COLORS[category] ?? OTHER;
export const channelColor = (channel: string) => CHANNEL_COLORS[channel] ?? OTHER;

// Names you type yourself (menu categories, branches): the name decides the
// colour, so it stays the same on every page and in every period.
export function nameColor(name: string) {
  let hash = 0;
  for (const ch of name.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `var(--cat-${(hash % 7) + 1})`;
}

export const sharedColor = OTHER;
