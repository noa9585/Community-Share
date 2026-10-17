"use client";

import Link from "next/link";

import { AUTH_BUTTON, AUTH_INPUT, AUTH_LABEL } from "@/components/AuthCard";
import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { loginAction } from "@/lib/actions/auth";

export function LoginFormInner({ next }: { next?: string }) {
  const [state, action, pending] = useFormAction(loginAction);

  return (
    <>
      <form action={action} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="login-email" className={AUTH_LABEL}>
            אימייל
          </label>
          <input
            id="login-email"
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
          <label htmlFor="login-password" className={AUTH_LABEL}>
            סיסמה
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            required
            maxLength={72}
            autoComplete="current-password"
            dir="ltr"
            className={AUTH_INPUT}
          />
        </div>
        <FormMessage state={state} />
        <button type="submit" disabled={pending} className={AUTH_BUTTON}>
          {pending ? "מתחבר..." : "התחבר"}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/register" className="font-medium text-secondary hover:underline">
          הרשמה
        </Link>
        <Link href="/forgot-password" className="text-on-surface-variant hover:underline">
          שכחתי סיסמה
        </Link>
      </div>
    </>
  );
}
