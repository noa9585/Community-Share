import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
import { AdminPanel } from "@/components/AdminPanel";
import { NewItemForm } from "@/components/NewItemForm";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "הוספת פריט | Community Share",
};

export default async function NewItemPage() {
  const user = await getCurrentUser();
  const repo = await getRepository();
  const categories = await repo.getCategories();

  return (
    <div>
      <AppNav user={user} />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">הוספת פריט</h1>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <NewItemForm categories={categories} />
        </div>
      </main>
    </div>
  );
}
