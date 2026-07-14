"use client";

import Link from "next/link";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { registerAction } from "@/lib/actions/auth";
import { RESIDENCE_AREAS } from "@/lib/validation/schemas";

export function RegisterFormInner({ mockMode }: { mockMode: boolean }) {
  const [state, action, pending] = useFormAction(registerAction);

  if (mockMode) {
    return (
      <Link href="/login" className="mt-4 block text-sm text-emerald-700">
        חזרה להתחברות demo
      </Link>
    );
  }

  return (
    <>
      <form action={action} className="mt-6 space-y-4">
        <FormMessage state={state} />
        <input
          name="fullName"
          required
          placeholder="שם מלא"
          className="w-full rounded-xl border border-zinc-300 px-4 py-3"
        />
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
          minLength={8}
          placeholder="סיסמה (לפחות 8 תווים)"
          className="w-full rounded-xl border border-zinc-300 px-4 py-3"
        />
        <select
          name="residenceArea"
          required
          className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          defaultValue=""
        >
          <option value="" disabled>
            אזור מגורים
          </option>
          {RESIDENCE_AREAS.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white disabled:opacity-60"
        >
          {pending ? "נרשם..." : "הירשם"}
        </button>
      </form>
      <Link href="/login" className="mt-4 block text-sm text-emerald-700">
        כבר יש לך חשבון? התחבר
      </Link>
    </>
  );
}
