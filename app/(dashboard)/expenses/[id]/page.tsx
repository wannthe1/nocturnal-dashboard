import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DeleteButton } from "@/components/delete-button";
import { Panel } from "@/components/panel";
import { FormSkeleton } from "@/components/skeletons";
import { getExpense } from "@/lib/expenses";
import { formatDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { getBranches } from "@/lib/sales";
import { deleteExpense } from "../actions";
import { ExpenseForm } from "../expense-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("expenses.edit") };
}

export default function EditExpensePage({ params }: PageProps<"/expenses/[id]">) {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<FormSkeleton fields={5} />}>
        <EditExpense params={params} />
      </Suspense>
    </div>
  );
}

async function EditExpense({ params }: { params: PageProps<"/expenses/[id]">["params"] }) {
  const { id } = await params;
  await connection(); // uses today's date
  const [{ t, locale }, expense, branches] = await Promise.all([getI18n(), getExpense(id), getBranches()]);
  if (!expense) notFound();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rise space-y-5">
      <Breadcrumbs label={t("common.breadcrumb")} items={[{ label: t("nav.expenses"), href: "/expenses" }, { label: t("expenses.edit") }]} />
      <div>
        <h2 className="text-xl font-semibold text-ink">{expense.description}</h2>
        <p className="mt-0.5 text-sm text-muted">{formatDate(expense.spent_on, true, locale)} · {expense.branches?.name ?? t("common.shared")}</p>
      </div>
      <Panel title={t("expenses.details")}>
        <ExpenseForm expense={expense} branches={branches} today={today} />
      </Panel>
      <Panel title={t("expenses.delete")}>
        <DeleteButton action={deleteExpense.bind(null, expense.id)} name={expense.description} label={t("expenses.delete")} />
      </Panel>
    </div>
  );
}
