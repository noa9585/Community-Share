import type { Metadata } from "next";

import { AuthCard } from "@/components/AuthCard";
import { logoutAction } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "החשבון חסום | שיתוף קהילתי",
};

export default function BlockedPage() {
  return (
    <AuthCard title="החשבון חסום">
      <p className="text-on-surface-variant">
        אין לך גישה לפלטפורמה. לפרטים נוספים ניתן לפנות לאדמין הקהילה.
      </p>
      <form action={logoutAction} className="mt-6">
        <button
          type="submit"
          className="rounded-xl border border-secondary/40 px-5 py-2.5 font-medium text-secondary hover:bg-secondary/5"
        >
          יציאה
        </button>
      </form>
    </AuthCard>
  );
}
