"use client";

import { useActionState } from "react";
import { Field } from "@/components/form-field";
import { PasswordInput } from "@/components/password-input";
import { useI18n } from "@/lib/i18n/client";
import { joinWithInvite, signUpWithInvite, type InviteFormState } from "./actions";

export function InviteSignUpForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<InviteFormState, FormData>(signUpWithInvite.bind(null, token), {});
  return (
    <form action={action} className="mt-8 space-y-4">
      <Field label={t("login.email")} htmlFor="email">
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state.email} placeholder="you@restaurant.com" className="field" />
      </Field>
      <Field label={t("login.password")} htmlFor="password">
        <PasswordInput id="password" name="password" minLength={8} autoComplete="new-password" />
      </Field>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-accent-text">{state.message}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full !py-2.5">{pending ? t("login.wait") : t("invite.create")}</button>
    </form>
  );
}

export function InviteJoinForm({ token, label }: { token: string; label: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<InviteFormState, FormData>(joinWithInvite.bind(null, token), {});
  return (
    <form action={action} className="mt-8 space-y-4">
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full !py-2.5">{pending ? t("login.wait") : label}</button>
    </form>
  );
}
