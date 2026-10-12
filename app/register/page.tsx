import type { Metadata } from "next";

import { AuthCard } from "@/components/AuthCard";
import { RegisterFormInner } from "@/components/RegisterFormInner";
import { isMockMode } from "@/lib/config";

export const metadata: Metadata = {
  title: "הרשמה | שיתוף קהילתי",
};

export default function RegisterPage() {
  const mockMode = isMockMode();

  return (
    <AuthCard title="הרשמה">
      {mockMode ? (
        <p className="mb-4 text-sm text-on-surface-variant">
          מצב דמו – ההרשמה אינה פעילה. השתמש/י בדף ההתחברות לבחירת משתמש.
        </p>
      ) : (
        <p className="mb-4 text-sm text-on-surface-variant">
          הקהילה סגורה: לאחר ההרשמה ואימות האימייל, אדמין יאשר את החשבון.
        </p>
      )}
      <RegisterFormInner mockMode={mockMode} />
    </AuthCard>
  );
}
