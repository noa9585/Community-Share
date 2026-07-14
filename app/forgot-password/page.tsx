"use client";

import Link from "next/link";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { resetPasswordAction } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useFormAction(resetPasswordAction);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-2xl font-bold">שחזור סיסמה</h1>
        <form action={action} className="mt-6 space-y-4">
          <FormMessage state={state} />
          <input
            name="email"
            type="email"
            required
            placeholder="אימייל"
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white disabled:opacity-60"
          >
            {pending ? "שולח..." : "שלח קישור"}
          </button>
        </form>
        <Link href="/login" className="mt-4 block text-sm text-emerald-700">
          חזרה להתחברות
        </Link>
      </div>
    </div>
  );
}
