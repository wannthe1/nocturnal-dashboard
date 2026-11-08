"use client";

import { useActionState, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateField } from "@/components/date-picker";
import { Field } from "@/components/form-field";
import { Select } from "@/components/select";
import { useI18n } from "@/lib/i18n/client";
import type { Employee } from "@/lib/employee-stats";
import { addAttendance, addReview, addShift, type StaffFormState } from "./staff-actions";

type Action = (prev: StaffFormState, formData: FormData) => Promise<StaffFormState>;

function FormShell({ action, label, children }: { action: Action; label: string; children: React.ReactNode }) {
  const [state, run, pending] = useActionState<StaffFormState, FormData>(action, {});
  return (
    <form action={run}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      {state.error && <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary mt-4">{label}</button>
    </form>
  );
}

function EmployeeField({ employees }: { employees: Employee[] }) {
  const { t } = useI18n();
  return (
    <Field label={t("staff.employee")} htmlFor="staff-employee">
      <Select id="staff-employee" name="employee" defaultValue={employees[0]?.id} options={employees.map((e) => ({ value: e.id, label: e.name }))} />
    </Field>
  );
}

function DateInput({ today }: { today: string }) {
  const { t } = useI18n();
  const [date, setDate] = useState(today);
  return (
    <Field label={t("common.date")} htmlFor="staff-date">
      <DateField id="staff-date" name="date" value={date} onChange={setDate} />
    </Field>
  );
}

function TimeInput({ label, name, required = true }: { label: string; name: string; required?: boolean }) {
  return (
    <Field label={label} htmlFor={`staff-${name}`}>
      <input id={`staff-${name}`} name={name} type="time" required={required} className="field tabular-nums" />
    </Field>
  );
}

export function ShiftForm({ employees, today }: { employees: Employee[]; today: string }) {
  const { t } = useI18n();
  return (
    <FormShell action={addShift} label={t("shifts.add")}>
      <EmployeeField employees={employees} />
      <DateInput today={today} />
      <TimeInput label={t("staff.start")} name="start" />
      <TimeInput label={t("staff.end")} name="end" />
    </FormShell>
  );
}

export function AttendanceForm({ employees, today }: { employees: Employee[]; today: string }) {
  const { t } = useI18n();
  return (
    <FormShell action={addAttendance} label={t("attendance.add")}>
      <EmployeeField employees={employees} />
      <DateInput today={today} />
      <TimeInput label={t("attendance.in")} name="in" />
      <TimeInput label={t("attendance.out")} name="out" required={false} />
    </FormShell>
  );
}

export function ReviewForm({ employees, today }: { employees: Employee[]; today: string }) {
  const { t } = useI18n();
  return (
    <FormShell action={addReview} label={t("review.add")}>
      <EmployeeField employees={employees} />
      <DateInput today={today} />
      <Field label={t("review.rating")} htmlFor="staff-rating">
        <Select id="staff-rating" name="rating" defaultValue="3" options={["1", "2", "3", "4", "5"].map((v) => ({ value: v, label: v }))} />
      </Field>
      <Field label={t("review.notes")} htmlFor="staff-notes">
        <input id="staff-notes" name="notes" maxLength={1000} className="field" />
      </Field>
    </FormShell>
  );
}

export function DeleteRowButton({ action, question }: { action: () => Promise<void>; question: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" disabled={pending} onClick={() => setOpen(true)} className="rounded-md px-2 py-1 text-sm font-medium text-danger hover:underline">{t("common.delete")}</button>
      <ConfirmDialog
        open={open}
        title={t("common.delete")}
        body={question}
        confirmLabel={t("common.delete")}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          start(() => action());
        }}
      />
    </>
  );
}
