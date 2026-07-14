import type { Metadata } from "next";

import { RegisterFormInner } from "@/components/RegisterFormInner";
import { isMockMode } from "@/lib/config";

export const metadata: Metadata = {
  title: "הרשמה | Community Share",
};

export default function RegisterPage() {
  const mockMode = isMockMode();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-2xl font-bold">הרשמה</h1>
        {mockMode && (
          <p className="mt-2 text-sm text-amber-700">
            מצב דמו – השתמש/י בדף ההתחברות לבחירת משתמש demo
          </p>
        )}
        <RegisterFormInner mockMode={mockMode} />
      </div>
    </div>
  );
}
