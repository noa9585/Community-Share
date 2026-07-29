import type { Metadata } from "next";
import Link from "next/link";

import { DemoLoginButtons } from "@/components/DemoLoginButtons";
import { LoginFormInner } from "@/components/LoginFormInner";
import { MaterialIcon } from "@/components/MaterialIcon";
import { isMockMode } from "@/lib/config";

export const metadata: Metadata = {
  title: "התחברות | שיתוף קהילתי",
};

export default function LoginPage() {
  const mockMode = isMockMode();

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-container p-gutter">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-secondary/15 bg-white shadow-sm">
        <div className="bg-secondary px-6 py-8 text-center text-on-secondary">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand-mint bg-primary-container">
            <MaterialIcon name="groups" className="text-secondary" size={32} />
          </div>
          <h1 className="font-headline text-2xl font-bold">שיתוף קהילתי</h1>
          <p className="mt-1 text-sm opacity-80">בניית אמון מקומי</p>
        </div>
        <div className="p-6">
          <h2 className="font-headline mb-4 text-xl font-semibold text-brand-deep">התחברות</h2>
          {mockMode ? (
            <>
              <p className="text-sm text-on-surface-variant">מצב דמו – בחר/י משתמש להתחברות</p>
              <div className="mt-6">
                <DemoLoginButtons />
              </div>
              <div className="mt-4 text-sm">
                <Link href="/register" className="font-medium text-secondary hover:text-brand-deep">
                  הרשמה
                </Link>
              </div>
            </>
          ) : (
            <LoginFormInner />
          )}
        </div>
      </div>
    </div>
  );
}
