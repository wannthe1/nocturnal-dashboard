// Who can do what. The database enforces the same rules (see supabase/schema.sql);
// this list decides what each person is shown. To add a role, add it here and to
// the role checks in schema.sql.
export const ROLES = ["admin", "finance", "sales", "inventory", "hr"] as const;
export type Role = (typeof ROLES)[number];

const ACCESS = {
  overview: ["admin", "finance"],
  sales: ["admin", "finance", "sales"],
  forecast: ["admin", "finance", "sales"],
  forecastMoney: ["admin", "finance"], // expected profit and costs
  forecastStock: ["admin", "finance"],
  inventory: ["admin", "finance", "inventory"],
  editInventory: ["admin", "inventory"],
  expenses: ["admin", "finance", "hr"],
  editExpenses: ["admin", "finance"],
  import: ["admin", "finance", "sales"],
  reports: ["admin", "finance"],
  team: ["admin", "hr"],
  manageTeam: ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Area = keyof typeof ACCESS;

export const can = (role: Role | null, area: Area) => role !== null && (ACCESS[area] as readonly Role[]).includes(role);

// Where each role lands after signing in.
export function homeFor(role: Role) {
  if (role === "sales") return "/sales";
  if (role === "inventory") return "/inventory";
  if (role === "hr") return "/team";
  return "/";
}

export function importKinds(role: Role | null): ("sales" | "expenses")[] {
  if (role === "admin") return ["sales", "expenses"];
  if (role === "sales") return ["sales"];
  if (role === "finance") return ["expenses"];
  return [];
}
