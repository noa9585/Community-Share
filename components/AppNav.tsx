import Link from "next/link";

import { MaterialIcon } from "@/components/MaterialIcon";
import { MobileNavBar, SideNavBar } from "@/components/SideNavBar";
import { TopAppBar } from "@/components/TopAppBar";
import type { User } from "@/types/database";

/** Page shell for approved members: sidebar on desktop, bottom tabs on phones. */
export function AppNav({
  user,
  activePath = "/",
  headerTitle,
  children,
  mainClassName = "",
  showAddButton = false,
}: {
  user: User | null;
  activePath?: string;
  headerTitle?: string;
  children: React.ReactNode;
  mainClassName?: string;
  showAddButton?: boolean;
}) {
  if (user?.status !== "approved") {
    return <div className="min-h-screen bg-primary-container font-body-md">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-primary-container font-body-md text-brand-deep">
      <SideNavBar user={user} activePath={activePath} />
      <div className="flex min-h-screen flex-col md:mr-sidebar-width">
        <TopAppBar title={headerTitle} />
        <main
          className={`flex-1 px-margin-mobile pb-28 pt-6 md:px-gutter md:pb-12 md:pt-8 ${mainClassName}`}
        >
          <div className="mx-auto max-w-container-max">{children}</div>
        </main>
      </div>
      {showAddButton && (
        <Link
          href="/items/new"
          aria-label="הוסף פריט לשיתוף"
          className="fixed bottom-20 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-mint text-brand-deep shadow-lg transition-transform hover:scale-105 active:scale-90 md:bottom-8 md:left-8"
        >
          <MaterialIcon name="add" size={30} />
        </Link>
      )}
      <MobileNavBar user={user} activePath={activePath} />
    </div>
  );
}
