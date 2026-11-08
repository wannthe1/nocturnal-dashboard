"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/client";

// A password box with a button to show or hide what's been typed.
export function PasswordInput({ id, name, minLength, autoComplete }: { id: string; name: string; minLength?: number; autoComplete: string }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const label = t(show ? "login.hidePassword" : "login.showPassword");
  return (
    <div className="relative">
      <input id={id} name={name} type={show ? "text" : "password"} required minLength={minLength} autoComplete={autoComplete} className="field pe-11" />
      <button type="button" onClick={() => setShow(!show)} aria-pressed={show} aria-label={label} title={label} className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-e-xl text-faint transition-colors hover:text-ink">
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
