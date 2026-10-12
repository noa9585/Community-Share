import type { Metadata } from "next";

import { NewPasswordForm, ProfileForm } from "@/components/AccountForms";
import { AppNav } from "@/components/AppNav";
import { StatusBadge } from "@/components/StatusBadge";
import { requirePageUser } from "@/lib/auth/session";
import { isMockMode } from "@/lib/config";

export const metadata: Metadata = {
  title: "הפרופיל שלי | שיתוף קהילתי",
};

const CARD = "rounded-2xl border border-secondary/10 bg-white p-5 md:p-6";

export default async function ProfilePage() {
  const user = await requirePageUser();

  return (
    <AppNav user={user} activePath="/profile" headerTitle="הפרופיל שלי">
      <div className="mx-auto max-w-xl space-y-stack-lg">
        <h1 className="font-headline-md text-headline-md-mobile text-brand-deep md:text-headline-md">
          הפרופיל שלי
        </h1>

        <section className={`${CARD} space-y-2`}>
          <p className="text-sm text-on-surface-variant">אימייל</p>
          <p className="font-bold text-brand-deep" dir="ltr">
            {user.email}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <StatusBadge status={user.status} />
            {user.role === "admin" && (
              <span className="rounded-full border border-secondary/20 px-3 py-1 text-xs font-bold text-secondary">
                אדמין
              </span>
            )}
          </div>
        </section>

        <section className={CARD}>
          <h2 className="mb-4 font-headline-sm text-headline-sm text-secondary">פרטים אישיים</h2>
          <ProfileForm fullName={user.full_name} residenceArea={user.residence_area} />
        </section>

        {!isMockMode() && (
          <section className={CARD}>
            <h2 className="mb-4 font-headline-sm text-headline-sm text-secondary">שינוי סיסמה</h2>
            <NewPasswordForm />
          </section>
        )}
      </div>
    </AppNav>
  );
}
