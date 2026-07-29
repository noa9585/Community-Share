import Link from "next/link";

import { MaterialIcon } from "@/components/MaterialIcon";
import { logoutAction } from "@/lib/actions/auth";
import type { User } from "@/types/database";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "בית", icon: "home" },
  { href: "/catalog", label: "קטלוג", icon: "category" },
  { href: "/my-loans", label: "ההשאלות שלי", icon: "shopping_basket" },
  { href: "/my-items", label: "הפריטים שלי", icon: "inventory_2" },
  { href: "/admin", label: "פאנל ניהול", icon: "admin_panel_settings", adminOnly: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  user,
  activePath,
}: {
  user: User | null;
  activePath: string;
}) {
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {items.map((item) => {
        const active = isActive(activePath, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center justify-start gap-3 px-4 py-3 transition-colors duration-200 ${
              active
                ? "font-bold text-primary-fixed-dim after:absolute after:right-0 after:h-8 after:w-1 after:rounded-full after:bg-brand-mint"
                : "text-on-secondary opacity-80 hover:bg-white/10 hover:opacity-100"
            }`}
          >
            <MaterialIcon name={item.icon} filled={active} />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppNav({
  user,
  activePath = "/",
  title = "שיתוף קהילתי",
  showSearch = false,
  children,
}: {
  user: User | null;
  activePath?: string;
  title?: string;
  showSearch?: boolean;
  children: React.ReactNode;
}) {
  const approved = user?.status === "approved";

  return (
    <div className="min-h-screen bg-primary-container">
      {approved && (
        <aside className="fixed right-0 top-0 z-50 flex h-screen w-sidebar-width flex-col border-l border-outline-variant/15 bg-secondary text-on-secondary">
          <div className="flex flex-col items-center border-b border-white/10 p-gutter">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand-mint bg-primary-container">
              <MaterialIcon name="groups" className="text-secondary" size={32} />
            </div>
            <h1 className="font-headline text-xl font-bold text-on-secondary">מרכז הקהילה</h1>
            <p className="text-sm opacity-80">בניית אמון מקומי</p>
          </div>

          <SidebarNav user={user} activePath={activePath} />

          <div className="mt-auto flex flex-col gap-2 p-gutter">
            <Link
              href="/items/new"
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-mint px-4 py-3 font-bold text-brand-deep transition-transform active:scale-95"
            >
              <MaterialIcon name="add" />
              <span className="text-sm">הוספת פריט חדש</span>
            </Link>
            <div className="mt-2 flex flex-col gap-1 border-t border-white/10 pt-4">
              {user ? (
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm opacity-80 transition-colors hover:bg-white/10 hover:opacity-100"
                  >
                    <MaterialIcon name="logout" />
                    יציאה
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-3 px-4 py-2 text-sm opacity-80 hover:opacity-100"
                >
                  <MaterialIcon name="login" />
                  התחברות
                </Link>
              )}
            </div>
          </div>
        </aside>
      )}

      <header
        className={`fixed top-0 z-40 flex h-16 items-center justify-between border-b border-secondary/15 bg-surface/80 px-gutter backdrop-blur-md ${
          approved ? "left-0 right-sidebar-width" : "inset-x-0"
        }`}
      >
        <span className="font-headline text-2xl font-semibold text-secondary">{title}</span>
        <div className="flex items-center gap-4">
          {showSearch && approved && (
            <form action="/catalog" className="hidden items-center md:flex">
              <div className="flex items-center rounded-full border border-outline-variant/30 bg-surface-container px-4 py-1.5">
                <MaterialIcon name="search" className="ml-2 text-secondary" />
                <input
                  name="q"
                  placeholder="חיפוש מהיר..."
                  className="w-48 border-none bg-transparent text-sm text-brand-deep placeholder:text-outline focus:ring-0"
                />
              </div>
            </form>
          )}
          {approved && (
            <>
              <button type="button" className="relative text-secondary active:opacity-70">
                <MaterialIcon name="notifications" />
              </button>
              <button type="button" className="text-secondary active:opacity-70">
                <MaterialIcon name="chat_bubble" />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-secondary/30 bg-primary-container">
                <MaterialIcon name="person" className="text-lg text-secondary" />
              </div>
            </>
          )}
        </div>
      </header>

      <main
        className={`min-h-screen pb-12 pt-24 ${
          approved ? "mr-sidebar-width px-gutter" : "mx-auto max-w-lg px-margin-mobile"
        }`}
      >
        {approved ? (
          <div className="mx-auto max-w-container-max">{children}</div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
