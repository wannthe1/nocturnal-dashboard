"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/client";

// A themed "are you sure?" box that replaces the browser's own confirm popup.
// With `submit`, the confirm button submits the form the dialog sits inside.
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
  submit = false,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  submit?: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      onClick={(e) => e.target === ref.current && onCancel()}
      className="popover fixed inset-0 m-auto w-[min(26rem,calc(100vw-2rem))] p-6 text-ink backdrop:bg-obsidian/60 backdrop:backdrop-blur-sm"
    >
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost">{t("common.cancel")}</button>
        <button type={submit ? "submit" : "button"} onClick={onConfirm} className="btn btn-danger-solid">{confirmLabel}</button>
      </div>
    </dialog>
  );
}
