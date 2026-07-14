import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
import { MyItemsList } from "@/components/ItemActions";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "הפריטים שלי | Community Share",
};

export default async function MyItemsPage() {
  const user = await getCurrentUser();
  const repo = await getRepository();

  const [items, incomingRequests] = await Promise.all([
    repo.getMyItems(user!.id),
    repo.getIncomingRequests(user!.id),
  ]);

  return (
    <div>
      <AppNav user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">הפריטים שלי</h1>
        <MyItemsList items={items} incomingRequests={incomingRequests} />
      </main>
    </div>
  );
}
