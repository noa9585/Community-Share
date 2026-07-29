import { notFound, redirect } from "next/navigation";

import { AppNav } from "@/components/AppNav";
import { BorrowRequestForm } from "@/components/BorrowRequestForm";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export default async function BorrowRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    redirect(user ? "/pending-approval" : "/login");
  }

  const repo = await getRepository();
  const item = await repo.getItemById(id);
  if (!item) notFound();

  return (
    <AppNav user={user} activePath="/catalog" title="שיתוף קהילתי">
      <div className="flex min-h-[70vh] items-center justify-center">
        <BorrowRequestForm item={item} />
      </div>
    </AppNav>
  );
}
