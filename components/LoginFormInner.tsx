"use client";

import Link from "next/link";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { loginAction } from "@/lib/actions/auth";

export function LoginFormInner() {
  const [state, action, pending] = useFormAction(loginAction);

  return (
    <>
      <form action={action} className="mt-6 space-y-4">
        <FormMessage state={state} />
        <input
          name="email"
          type="email"
          required
          placeholder="אימייל"
          className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-4 py-3 focus:ring-2 focus:ring-brand-mint"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="סיסמה"
          className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-4 py-3 focus:ring-2 focus:ring-brand-mint"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand-mint py-3 font-bold text-brand-deep disabled:opacity-60"
        >
          {pending ? "מתחבר..." : "התחבר"}
        </button>
      </form>
      <div className="mt-4 space-y-2 text-sm">
        <Link href="/register" className="block font-medium text-secondary">
          הרשמה
        </Link>
        <Link href="/forgot-password" className="block text-on-surface-variant">
          שחזור סיסמה
        </Link>
      </div>
    </>
  );
}
