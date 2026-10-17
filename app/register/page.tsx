import type { Metadata } from "next";

import { AuthCard } from "@/components/AuthCard";
import { RegisterFormInner } from "@/components/RegisterFormInner";
import { isMockMode } from "@/lib/config";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "הרשמה | שיתוף קהילתי",
};

export default async function RegisterPage() {
  const mockMode = isMockMode();
  const areas = await (await getRepository()).getAreas();

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
      <RegisterFormInner mockMode={mockMode} areas={areas.map((area) => area.name)} />
    </AuthCard>
  );
}
