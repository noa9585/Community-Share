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
          className="w-full rounded-xl border border-zinc-300 px-4 py-3"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="סיסמה"
          className="w-full rounded-xl border border-zinc-300 px-4 py-3"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white disabled:opacity-60"
        >
          {pending ? "מתחבר..." : "התחבר"}
        </button>
      </form>
      <div className="mt-4 space-y-2 text-sm">
        <Link href="/register" className="block text-emerald-700">
          הרשמה
        </Link>
        <Link href="/forgot-password" className="block text-zinc-600">
          שחזור סיסמה
        </Link>
      </div>
    </>
  );
}
