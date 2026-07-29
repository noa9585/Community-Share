import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
import { MyItemsList } from "@/components/ItemActions";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "הפריטים שלי | שיתוף קהילתי",
};

export default async function MyItemsPage() {
  const user = await getCurrentUser();
  const repo = await getRepository();

  const [items, incomingRequests] = await Promise.all([
    repo.getMyItems(user!.id),
    repo.getIncomingRequests(user!.id),
  ]);

  return (
    <AppNav user={user} activePath="/my-items" title="הפריטים שלי" showSearch>
      <div className="mb-stack-lg">
        <h2 className="font-headline mb-2 text-3xl text-brand-deep">הפריטים שלי</h2>
        <p className="text-on-surface-variant">
          נהלו את הפריטים שלכם ואשרו בקשות השאלה מהשכנים
        </p>
      </div>
      <MyItemsList items={items} incomingRequests={incomingRequests} />
    </AppNav>
  );
}
