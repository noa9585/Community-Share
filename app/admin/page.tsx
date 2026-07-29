import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
import { AdminPanel } from "@/components/AdminPanel";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "פאנל ניהול | שיתוף קהילתי",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  const repo = await getRepository();
  const dashboard = await repo.getAdminDashboard();

  return (
    <AppNav user={user} activePath="/admin" title="שיתוף קהילתי" showSearch>
      <div className="mb-6 flex items-center gap-4">
        <h1 className="font-headline text-2xl font-semibold text-brand-deep">פאנל אדמין</h1>
      </div>
      <AdminPanel
        pendingUsers={dashboard.pendingUsers}
        pendingItems={dashboard.pendingItems}
        activeLoans={dashboard.activeLoans}
        lateLoans={dashboard.lateLoans}
      />
    </AppNav>
  );
}
