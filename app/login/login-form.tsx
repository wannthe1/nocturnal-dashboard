"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/form-field";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/client";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const isSignUp = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);

  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, {});
  const state = isSignUp ? signUpState : signInState;
  const pending = isSignUp ? signingUp : signingIn;

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
          <div className="relative">
            <input id="password" name="password" type={showPassword ? "text" : "password"} required minLength={isSignUp ? 8 : undefined} autoComplete={isSignUp ? "new-password" : "current-password"} className="field pe-11" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-pressed={showPassword}
              aria-label={t(showPassword ? "login.hidePassword" : "login.showPassword")}
              title={t(showPassword ? "login.hidePassword" : "login.showPassword")}
              className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-e-xl text-faint transition-colors hover:text-ink"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>

        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        {state.message && <p role="status" className="text-sm text-accent-text">{state.message}</p>}

        <button type="submit" disabled={pending} className="btn btn-primary w-full !py-2.5">
          {pending ? t("login.wait") : isSignUp ? t("login.create") : t("login.signIn")}
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
