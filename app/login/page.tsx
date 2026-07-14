import type { Metadata } from "next";
import Link from "next/link";

import { DemoLoginButtons } from "@/components/DemoLoginButtons";
import { LoginFormInner } from "@/components/LoginFormInner";
import { isMockMode } from "@/lib/config";

export const metadata: Metadata = {
  title: "התחברות | Community Share",
};

export default function LoginPage() {
  const mockMode = isMockMode();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-2xl font-bold">התחברות</h1>
        {mockMode ? (
          <>
            <p className="mt-2 text-sm text-zinc-600">מצב דמו – בחר/י משתמש להתחברות</p>
            <div className="mt-6">
              <DemoLoginButtons />
            </div>
            <div className="mt-4 text-sm">
              <Link href="/register" className="block text-emerald-700">
                הרשמה
              </Link>
            </div>
          </>
        ) : (
          <LoginFormInner />
        )}
      </div>
    </div>
  );
}
