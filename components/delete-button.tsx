"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useI18n } from "@/lib/i18n/client";

// A delete button that asks first, since deleting can't be undone.
// `action` is a server action with the record's id already bound to it.
export function DeleteButton({
  action,
  name,
  label,
}: {
  action: () => Promise<void>;
  name: string;
  label: string;
}) {
  return (
    <form action={action}>
      <Inner name={name} label={label} />
    </form>
  );
}

function Inner({ name, label }: { name: string; label: string }) {
  const { t } = useI18n();
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" disabled={pending} onClick={() => setOpen(true)} className="btn btn-danger">
        {pending ? t("common.deleting") : label}
      </button>
      <ConfirmDialog
        open={open}
        submit
        title={label}
        body={t("common.deleteQuestion", { name })}
        confirmLabel={t("common.delete")}
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}
