"use client";

import { useActionState, useEffect, useState } from "react";
import { Field } from "@/components/form-field";
import { PasswordInput } from "@/components/password-input";
import { useI18n } from "@/lib/i18n/client";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const isSignUp = mode === "signup";

  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, {});
  const state = isSignUp ? signUpState : signInState;
  const pending = isSignUp ? signingUp : signingIn;

  // Counts down while sign-in is locked after too many wrong passwords.
  const lockedUntil = state.lockedUntil ?? 0;
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 250);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [lockedUntil]);
  const secondsLeft = lockedUntil && now ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  const locked = secondsLeft > 0;

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold text-ink">{isSignUp ? t("login.createTitle") : t("login.welcome")}</h1>
      <p className="mt-1.5 text-sm text-muted">{isSignUp ? t("login.createSub") : t("login.signInSub")}</p>

      <form action={isSignUp ? signUpAction : signInAction} className="mt-8 space-y-4">
        {isSignUp && (
          <Field label={t("login.restaurantName")} htmlFor="restaurantName">
            <input id="restaurantName" name="restaurantName" required autoComplete="organization" defaultValue={state.values?.restaurantName} placeholder={t("login.restaurantPlaceholder")} className="field" />
          </Field>
        )}
        <Field label={t("login.email")} htmlFor="email">
          <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state.values?.email} placeholder="you@restaurant.com" className="field" />
        </Field>
        <Field label={t("login.password")} htmlFor="password">
          <PasswordInput id="password" name="password" minLength={isSignUp ? 8 : undefined} autoComplete={isSignUp ? "new-password" : "current-password"} />
        </Field>

        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        {locked && <p role="alert" className="text-sm tabular-nums text-danger">{t("login.err.locked", { seconds: secondsLeft })}</p>}
        {state.message && <p role="status" className="text-sm text-accent-text">{state.message}</p>}

        <button type="submit" disabled={pending || locked} className="btn btn-primary w-full !py-2.5 tabular-nums">
          {pending ? t("login.wait") : locked ? `${secondsLeft}s` : isSignUp ? t("login.create") : t("login.signIn")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {isSignUp ? t("login.haveAccount") : t("login.newHere")}{" "}
        <button type="button" onClick={() => setMode(isSignUp ? "signin" : "signup")} className="font-semibold text-accent-text hover:underline">
          {isSignUp ? t("login.signIn") : t("login.createLink")}
        </button>
      </p>
    </div>
  );
}
