import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
import { NewItemForm } from "@/components/NewItemForm";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "הוספת פריט | שיתוף קהילתי",
};

export default async function NewItemPage() {
  const user = await getCurrentUser();
  const repo = await getRepository();
  const categories = await repo.getCategories();

  return (
    <AppNav user={user} activePath="/my-items" title="הוספת פריט">
      <div className="mx-auto max-w-3xl">
        <div className="mb-stack-lg">
          <h2 className="font-headline mb-2 text-3xl text-brand-deep">
            שתפו פריט חדש עם השכנים
          </h2>
          <p className="text-on-surface-variant">
            עזרו לבנות קהילה חזקה יותר על ידי השאלת חפצים שאינכם משתמשים בהם ביום-יום.
          </p>
        </div>
        <NewItemForm categories={categories} />
      </div>
    </AppNav>
  );
}
