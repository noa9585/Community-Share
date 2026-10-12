import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
import { AdminPanel } from "@/components/AdminPanel";
import { requirePageAdmin } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "פאנל ניהול | שיתוף קהילתי",
};

export default async function AdminPage() {
  const user = await requirePageAdmin();
  const repo = await getRepository();
  const [dashboard, emailLog] = await Promise.all([
    repo.getAdminDashboard(),
    repo.getEmailLog(20),
  ]);

  return (
    <AppNav user={user} activePath="/admin" headerTitle="פאנל ניהול">
      <h1 className="mb-stack-lg font-headline-md text-headline-md text-brand-deep">פאנל ניהול</h1>
      <AdminPanel dashboard={dashboard} emailLog={emailLog} currentAdminId={user.id} />
    </AppNav>
  );
}
