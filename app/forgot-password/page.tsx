import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/AccountForms";
import { AuthCard } from "@/components/AuthCard";

export const metadata: Metadata = {
  title: "שחזור סיסמה | שיתוף קהילתי",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="שחזור סיסמה">
      <p className="mb-4 text-sm text-on-surface-variant">
        הזן/י את כתובת האימייל שלך ונשלח אליה קישור לבחירת סיסמה חדשה.
      </p>
      <ForgotPasswordForm />
      <Link href="/login" className="mt-4 block text-sm font-medium text-secondary hover:underline">
        חזרה להתחברות
      </Link>
    </AuthCard>
  );
}
