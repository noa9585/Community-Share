import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
import { AdminPanel } from "@/components/AdminPanel";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "פאנל אדמין | Community Share",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  const repo = await getRepository();
  const dashboard = await repo.getAdminDashboard();

  return (
    <div>
      <AppNav user={user} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">פאנל אדמין</h1>
        <AdminPanel
          pendingUsers={dashboard.pendingUsers}
          pendingItems={dashboard.pendingItems}
          activeLoans={dashboard.activeLoans}
          lateLoans={dashboard.lateLoans}
        />
      </main>
    </div>
  );
}
