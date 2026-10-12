import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/AuthCard";
import { DemoLoginButtons } from "@/components/DemoLoginButtons";
import { LoginFormInner } from "@/components/LoginFormInner";
import { isMockMode } from "@/lib/config";
import { safeRedirectPath } from "@/lib/utils/url";

export const metadata: Metadata = {
  title: "התחברות | שיתוף קהילתי",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; notice?: string | string[] }>;
}) {
  const params = await searchParams;
  const mockMode = isMockMode();
  const next = safeRedirectPath(params.next, "");

  return (
    <AuthCard title="התחברות">
      {params.notice === "link" && (
        <p role="status" className="mb-4 rounded-lg bg-tertiary-container px-3 py-2 text-sm text-on-tertiary-fixed-variant">
          הקישור כבר נוצל או שפג תוקפו. אם אימתת את כתובת האימייל, אפשר פשוט להתחבר.
        </p>
      )}
      {mockMode ? (
        <>
          <p className="text-sm text-on-surface-variant">מצב דמו – בחר/י משתמש להתחברות</p>
          <div className="mt-6">
            <DemoLoginButtons />
          </div>
          <Link href="/register" className="mt-4 block text-sm font-medium text-secondary hover:underline">
            הרשמה
          </Link>
        </>
      ) : (
        <LoginFormInner next={next || undefined} />
      )}
    </AuthCard>
  );
}
