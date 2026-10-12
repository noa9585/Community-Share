import type { Metadata } from "next";

import { AuthCard } from "@/components/AuthCard";
import { logoutAction, refreshProfileAction } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "ממתין לאישור | שיתוף קהילתי",
};

export default function PendingApprovalPage() {
  return (
    <AuthCard title="ממתין לאישור אדמין">
      <p className="font-body-md text-on-surface-variant">
        החשבון שלך נרשם בהצלחה. אדמין הקהילה יאשר אותך בקרוב, ואז תוכל/י לגשת לקטלוג
        ולהשאיל פריטים.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <form action={refreshProfileAction}>
          <button
            type="submit"
            className="rounded-xl bg-brand-mint px-5 py-2.5 font-bold text-brand-deep transition-all hover:opacity-90 active:scale-95"
          >
            בדוק שוב
          </button>
        </form>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-xl border border-secondary/40 px-5 py-2.5 font-medium text-secondary hover:bg-secondary/5"
          >
            יציאה
          </button>
        </form>
      </div>
    </AuthCard>
  );
}
