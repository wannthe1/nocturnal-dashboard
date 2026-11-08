import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Panel } from "@/components/panel";
import { FormSkeleton } from "@/components/skeletons";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getBranches } from "@/lib/sales";
import { ExpenseForm } from "../expense-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("expenses.add") };
}

export default function NewExpensePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<FormSkeleton fields={5} />}>
        <NewExpenseForm />
      </Suspense>
    </div>
  );
}

async function NewExpenseForm() {
  await connection(); // uses today's date
  const [{ t }, branches] = await Promise.all([getI18n(), getBranches(), getCurrentUser()]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rise space-y-5">
      <Breadcrumbs label={t("common.breadcrumb")} items={[{ label: t("nav.expenses"), href: "/expenses" }, { label: t("expenses.add") }]} />
      <Panel title={t("expenses.details")}>
        <ExpenseForm branches={branches} today={today} />
      </Panel>
    </div>
  );
}
