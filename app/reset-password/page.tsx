import type { Metadata } from "next";
import Link from "next/link";

import { NewPasswordForm } from "@/components/AccountForms";
import { AuthCard } from "@/components/AuthCard";

export const metadata: Metadata = {
  title: "סיסמה חדשה | שיתוף קהילתי",
};

// Reached from the link in the password-reset e-mail, which signs the user in.
// The proxy only lets signed-in users through.
export default function ResetPasswordPage() {
  return (
    <AuthCard title="בחירת סיסמה חדשה">
      <NewPasswordForm />
      <Link href="/" className="mt-4 block text-sm font-medium text-secondary hover:underline">
        המשך לאתר
      </Link>
    </AuthCard>
  );
}
