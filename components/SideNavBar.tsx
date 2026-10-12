import Link from "next/link";

import { MaterialIcon } from "@/components/MaterialIcon";
import { logoutAction } from "@/lib/actions/auth";
import type { User } from "@/types/database";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: string;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "בית", shortLabel: "בית", icon: "home" },
  { href: "/catalog", label: "קטלוג", shortLabel: "קטלוג", icon: "category" },
  { href: "/my-loans", label: "ההשאלות שלי", shortLabel: "השאלות", icon: "shopping_basket" },
  { href: "/my-items", label: "הפריטים שלי", shortLabel: "פריטים", icon: "inventory_2" },
  {
    href: "/admin",
    label: "פאנל ניהול",
    shortLabel: "ניהול",
    icon: "admin_panel_settings",
    adminOnly: true,
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function visibleItems(user: User | null): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin");
}

/** Desktop navigation. On phones the same links live in MobileNavBar. */
export function SideNavBar({
  user,
  activePath,
}: {
  user: User | null;
  activePath: string;
}) {
  return (
    <aside className="fixed right-0 top-0 z-50 hidden h-screen w-sidebar-width flex-col border-l border-outline-variant/15 bg-secondary text-on-secondary md:flex">
      <div className="flex flex-col items-center border-b border-white/10 p-gutter">
        <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-brand-mint bg-primary-container">
          <MaterialIcon name="groups" className="text-secondary" size={36} />
        </div>
        <p className="font-headline-sm text-headline-sm font-bold text-on-secondary">
          מרכז הקהילה
        </p>
        <p className="font-label-md text-label-md opacity-80">בניית אמון מקומי</p>
      </div>

      <nav className="mt-stack-md flex-1 space-y-1 overflow-y-auto px-4" aria-label="ניווט ראשי">
        {visibleItems(user).map((item) => {
          const active = isActive(activePath, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center justify-start gap-3 px-4 py-3 transition-colors duration-200 ${
                active
                  ? "font-bold text-primary-fixed-dim after:absolute after:right-0 after:h-8 after:w-1 after:rounded-full after:bg-brand-mint hover:bg-on-secondary-fixed-variant/20"
                  : "text-on-secondary opacity-80 hover:bg-on-secondary-fixed-variant/20 hover:opacity-100"
              }`}
            >
              <MaterialIcon name={item.icon} />
              <span className="font-label-md text-label-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 p-gutter">
        <Link
          href="/items/new"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-mint px-4 py-3 font-bold text-brand-deep transition-transform active:scale-95"
        >
          <MaterialIcon name="add" />
          <span className="font-label-md text-label-md">הוספת פריט חדש</span>
        </Link>
        <div className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-4">
          <Link
            href="/profile"
            aria-current={isActive(activePath, "/profile") ? "page" : undefined}
            className="flex items-center gap-3 px-4 py-2 text-on-secondary opacity-80 transition-colors hover:bg-on-secondary-fixed-variant/20 hover:opacity-100"
          >
            <MaterialIcon name="person" />
            <span className="font-label-md text-label-md">
              {user?.full_name ?? "הפרופיל שלי"}
            </span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-2 text-on-secondary opacity-80 transition-colors hover:bg-on-secondary-fixed-variant/20 hover:opacity-100"
            >
              <MaterialIcon name="logout" />
              <span className="font-label-md text-label-md">יציאה</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

/** Bottom tab bar shown on phones. */
export function MobileNavBar({
  user,
  activePath,
}: {
  user: User | null;
  activePath: string;
}) {
  return (
    <nav
      aria-label="ניווט ראשי"
      className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around border-t border-secondary/15 bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {visibleItems(user).map((item) => {
        const active = isActive(activePath, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium ${
              active ? "text-secondary" : "text-on-surface-variant"
            }`}
          >
            <MaterialIcon name={item.icon} filled={active} size={24} />
            <span className="truncate">{item.shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
