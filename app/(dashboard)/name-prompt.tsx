"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field } from "@/components/form-field";
import { MAX_NAME_LENGTH } from "@/lib/display-name";
import { useI18n } from "@/lib/i18n/client";
import { savePreferredName, type NameState } from "./account-actions";

// Asks for the name the dashboard should use. Without `onDone` it's the required
// first-time pop-up, which can't be dismissed and goes away once a name is saved.
// With `onDone` it's the optional "change name" version.
export function NamePrompt({ current, onDone }: { current?: string; onDone?: () => void }) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<NameState, FormData>(savePreferredName, {});
  const editing = Boolean(onDone);

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  useEffect(() => {
    if (state.saved && editing) dialog.current?.close();
  }, [state.saved, editing]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="name-prompt-title"
      onCancel={(event) => {
        if (!editing) event.preventDefault();
      }}
      onClose={(event) => {
        if (onDone) onDone();
        else if (event.currentTarget.isConnected) event.currentTarget.showModal();
      }}
      onClick={(event) => {
        if (editing && event.target === dialog.current) dialog.current.close();
      }}
      className="popover fixed inset-0 m-auto w-[min(26rem,calc(100vw-2rem))] p-6 text-ink backdrop:bg-obsidian/60 backdrop:backdrop-blur-sm sm:p-8"
    >
      <h2 id="name-prompt-title" className="text-xl font-semibold text-ink">{t(editing ? "name.change" : "name.promptTitle")}</h2>
      <p className="mt-1.5 text-sm text-muted">{t(editing ? "name.editBody" : "name.promptBody")}</p>
      <form action={action} className="mt-6 space-y-4">
        <Field label={t("name.label")} htmlFor="preferred-name">
          <input id="preferred-name" name="name" required maxLength={MAX_NAME_LENGTH} autoComplete="given-name" defaultValue={current} placeholder={t("name.placeholder")} className="field" />
        </Field>
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        <div className="flex gap-2">
          {editing && <button type="button" onClick={() => dialog.current?.close()} className="btn btn-ghost flex-1 !py-2.5">{t("common.cancel")}</button>}
          <button type="submit" disabled={pending} className="btn btn-primary flex-1 !py-2.5">{pending ? t("login.wait") : t(editing ? "common.save" : "name.continue")}</button>
        </div>
      </form>
    </dialog>
  );
}
