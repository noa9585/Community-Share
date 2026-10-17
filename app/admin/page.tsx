import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
import { ADMIN_TABS, AdminPanel, type AdminTab } from "@/components/AdminPanel";
import { requirePageAdmin } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "פאנל ניהול | שיתוף קהילתי",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const user = await requirePageAdmin();
  const params = await searchParams;
  const tab: AdminTab = ADMIN_TABS.find((entry) => entry.key === params.tab)?.key ?? "overview";

  const repo = await getRepository();
  const [dashboard, emailLog, taxonomy] = await Promise.all([
    repo.getAdminDashboard(),
    repo.getEmailLog(20),
    tab === "settings"
      ? Promise.all([repo.getCategories(), repo.getAreas(), repo.getTaxonomyUsage()]).then(
          ([categories, areas, usage]) => ({ categories, areas, usage }),
        )
      : Promise.resolve(undefined),
  ]);

  return (
    <AppNav user={user} activePath="/admin" headerTitle="פאנל ניהול">
      <h1 className="mb-stack-md font-headline-md text-headline-md text-brand-deep">פאנל ניהול</h1>
      <AdminPanel
        dashboard={dashboard}
        emailLog={emailLog}
        currentAdminId={user.id}
        tab={tab}
        taxonomy={taxonomy}
      />
    </AppNav>
  );
}
