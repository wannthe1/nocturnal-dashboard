"use client";

import { Panel } from "@/components/panel";
import { useI18n } from "@/lib/i18n/client";
import { labelFor, type MessageKey } from "@/lib/i18n/config";
import { ROLES, can, importKinds, type Role } from "@/lib/roles";

// Each cell comes from the same rules that control access, so this table can't
// drift from what people can really do. `null` means no access.
const ROWS: { page: MessageKey; access: (role: Role) => MessageKey | null }[] = [
  { page: "nav.overview", access: (r) => (can(r, "overview") ? "perm.view" : null) },
  { page: "nav.sales", access: (r) => (can(r, "sales") ? "perm.view" : null) },
  { page: "nav.forecast", access: (r) => (!can(r, "forecast") ? null : can(r, "forecastMoney") ? "perm.full" : "perm.salesDemand") },
  { page: "nav.inventory", access: (r) => (can(r, "editInventory") ? "perm.edit" : can(r, "inventory") ? "perm.view" : null) },
  { page: "nav.expenses", access: (r) => (can(r, "editExpenses") ? "perm.edit" : can(r, "expenses") ? "perm.wages" : null) },
  {
    page: "nav.import",
    access: (r) => {
      const kinds = importKinds(r);
      if (kinds.length === 0) return null;
      if (kinds.length === 2) return "perm.salesExpenses";
      return kinds[0] === "sales" ? "perm.salesOnly" : "perm.expensesOnly";
    },
  },
  { page: "nav.reports", access: (r) => (can(r, "reports") ? "perm.view" : null) },
  { page: "nav.team", access: (r) => (can(r, "manageTeam") ? "perm.manage" : can(r, "team") ? "perm.view" : null) },
];

export function RolePermissions() {
  const { t } = useI18n();
  return (
    <Panel title={t("team.permissions")} subtitle={t("team.permissionsNote")}>
      <div className="relative -mx-2 overflow-x-auto">
        <table className="data-table min-w-[720px]">
          <thead>
            <tr>
              <th scope="col" className="text-start">{t("team.page")}</th>
              {ROLES.map((role) => <th key={role} scope="col" className="text-start">{labelFor(t, "role", role)}</th>)}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ page, access }) => (
              <tr key={page}>
                <th scope="row" className="px-2 text-start font-medium text-ink">{t(page)}</th>
                {ROLES.map((role) => {
                  const level = access(role);
                  return (
                    <td key={role}>
                      {level ? t(level) : <span className="text-faint"><span aria-hidden="true">—</span><span className="sr-only">{t("perm.none")}</span></span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
