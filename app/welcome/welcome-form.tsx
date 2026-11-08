"use client";

import { useActionState } from "react";
import { signOut } from "@/app/login/actions";
import { Field } from "@/components/form-field";
import { MAX_NAME_LENGTH } from "@/lib/display-name";
import { useI18n } from "@/lib/i18n/client";
import { completeWelcome, type WelcomeState } from "./actions";

export function WelcomeForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<WelcomeState, FormData>(completeWelcome, {});
  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold text-ink">{t("name.promptTitle")}</h1>
      <p className="mt-1.5 text-sm text-muted">{t("name.promptBody")}</p>

      <form action={action} className="mt-8 space-y-4">
        <Field label={t("name.label")} htmlFor="name">
          <input id="name" name="name" required autoFocus maxLength={MAX_NAME_LENGTH} autoComplete="given-name" placeholder={t("name.placeholder")} className="field" />
        </Field>
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn btn-primary w-full !py-2.5">{pending ? t("login.wait") : t("name.continue")}</button>
      </form>

      <form action={signOut} className="mt-6 text-center">
        <button type="submit" className="text-sm font-semibold text-accent-text hover:underline">{t("account.signOut")}</button>
      </form>
    </div>
  );
}
