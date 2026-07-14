import Link from "next/link";

import { logoutAction } from "@/lib/actions/auth";
import type { User } from "@/types/database";

export function AppNav({ user }: { user: User | null }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-emerald-700">
          Community Share
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          {user?.status === "approved" && (
            <>
              <Link href="/catalog" className="hover:text-emerald-700">
                קטלוג
              </Link>
              <Link href="/my-loans" className="hover:text-emerald-700">
                ההשאלות שלי
              </Link>
              <Link href="/my-items" className="hover:text-emerald-700">
                הפריטים שלי
              </Link>
              <Link href="/items/new" className="hover:text-emerald-700">
                הוסף פריט
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="font-medium text-amber-700">
                  אדמין
                </Link>
              )}
            </>
          )}
          {user ? (
            <form action={logoutAction}>
              <button type="submit" className="text-zinc-600 hover:text-red-600">
                יציאה
              </button>
            </form>
          ) : (
            <Link href="/login" className="hover:text-emerald-700">
              התחברות
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
