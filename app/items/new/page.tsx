import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
import { ItemForm } from "@/components/ItemForm";
import { requirePageUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "הוספת פריט | שיתוף קהילתי",
};

export default async function NewItemPage() {
  const user = await requirePageUser();
  const repo = await getRepository();
  const categories = await repo.getCategories();

  return (
    <AppNav user={user} activePath="/my-items" headerTitle="הוספת פריט">
      <div className="mx-auto max-w-3xl">
        <div className="mb-stack-lg">
          <h1 className="mb-2 font-headline-md text-headline-md-mobile text-brand-deep md:text-headline-md">
            שתפו פריט חדש עם הקהילה
          </h1>
          <p className="font-body-md text-on-surface-variant">
            הפריט יופיע בקטלוג לאחר אישור אדמין הקהילה.
          </p>
        </div>
        <ItemForm categories={categories} />
      </div>
    </AppNav>
  );
}
