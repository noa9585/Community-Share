"use client";

import { demoLoginAction } from "@/lib/actions/auth";
import { DEMO_USERS } from "@/lib/mock/users";

export function DemoLoginButtons() {
  return (
    <div className="space-y-2 border-t border-zinc-200 pt-4">
      <p className="text-sm font-medium text-zinc-700">התחברות מהירה (דמו)</p>
      {DEMO_USERS.map((user) => (
        <form key={user.id} action={demoLoginAction.bind(null, user.id)}>
          <button
            type="submit"
            className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
          >
            {user.label} – {user.full_name}
          </button>
        </form>
      ))}
    </div>
  );
}
