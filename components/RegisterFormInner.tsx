"use client";

import Link from "next/link";

import { AUTH_BUTTON, AUTH_INPUT, AUTH_LABEL } from "@/components/AuthCard";
import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { registerAction } from "@/lib/actions/auth";
import { RESIDENCE_AREAS } from "@/lib/validation/schemas";

export function RegisterFormInner({ mockMode }: { mockMode: boolean }) {
  const [state, action, pending] = useFormAction(registerAction);

  if (mockMode) {
    return (
      <Link href="/login" className="block text-sm font-medium text-secondary hover:underline">
        חזרה להתחברות במצב דמו
      </Link>
    );
  }

  if (state.success) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Link href="/login" className="block text-sm font-medium text-secondary hover:underline">
          לדף ההתחברות
        </Link>
      </div>
    );
  }

  return (
    <>
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="register-name" className={AUTH_LABEL}>
            שם מלא
          </label>
          <input
            id="register-name"
            name="fullName"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            className={AUTH_INPUT}
          />
        </div>
        <div>
          <label htmlFor="register-email" className={AUTH_LABEL}>
            אימייל
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            dir="ltr"
            className={AUTH_INPUT}
          />
        </div>
        <div>
          <label htmlFor="register-password" className={AUTH_LABEL}>
            סיסמה
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={72}
            autoComplete="new-password"
            dir="ltr"
            aria-describedby="register-password-hint"
            className={AUTH_INPUT}
          />
          <p id="register-password-hint" className="mt-1 text-xs text-on-surface-variant">
            לפחות 10 תווים, כולל אות וספרה
          </p>
        </div>
        <div>
          <label htmlFor="register-area" className={AUTH_LABEL}>
            אזור מגורים
          </label>
          <select
            id="register-area"
            name="residenceArea"
            required
            defaultValue=""
            className={AUTH_INPUT}
          >
            <option value="" disabled>
              בחר/י אזור
            </option>
            {RESIDENCE_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>
        <FormMessage state={state} />
        <button type="submit" disabled={pending} className={AUTH_BUTTON}>
          {pending ? "נרשם..." : "הרשמה"}
        </button>
      </form>
      <Link href="/login" className="mt-4 block text-sm font-medium text-secondary hover:underline">
        כבר יש לך חשבון? התחברות
      </Link>
    </>
  );
}
