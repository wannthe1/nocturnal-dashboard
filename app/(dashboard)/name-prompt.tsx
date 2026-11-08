"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field } from "@/components/form-field";
import { MAX_NAME_LENGTH } from "@/lib/display-name";
import { useI18n } from "@/lib/i18n/client";
import { savePreferredName, type NameState } from "./account-actions";

// The "Change name" dialog from the account menu.
export function NamePrompt({ current, onDone }: { current: string; onDone: () => void }) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<NameState, FormData>(savePreferredName, {});

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  useEffect(() => {
    if (state.saved) dialog.current?.close();
  }, [state.saved]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="name-prompt-title"
      onClose={onDone}
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current.close();
      }}
      className="popover fixed inset-0 m-auto w-[min(26rem,calc(100vw-2rem))] p-6 text-ink backdrop:bg-obsidian/60 backdrop:backdrop-blur-sm sm:p-8"
    >
      <h2 id="name-prompt-title" className="text-xl font-semibold text-ink">{t("name.change")}</h2>
      <p className="mt-1.5 text-sm text-muted">{t("name.editBody")}</p>
      <form action={action} className="mt-6 space-y-4">
        <Field label={t("name.label")} htmlFor="preferred-name">
          <input id="preferred-name" name="name" required maxLength={MAX_NAME_LENGTH} autoComplete="given-name" defaultValue={current} placeholder={t("name.placeholder")} className="field" />
        </Field>
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => dialog.current?.close()} className="btn btn-ghost flex-1 !py-2.5">{t("common.cancel")}</button>
          <button type="submit" disabled={pending} className="btn btn-primary flex-1 !py-2.5">{pending ? t("login.wait") : t("common.save")}</button>
        </div>
      </form>
    </dialog>
  );
}
