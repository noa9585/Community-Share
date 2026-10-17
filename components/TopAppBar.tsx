import Link from "next/link";

import { MaterialIcon } from "@/components/MaterialIcon";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { logoutAction } from "@/lib/actions/auth";

/** Small count bubble for navigation icons. Renders nothing for zero. */
export function CountBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[11px] font-bold leading-none text-on-error ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function TopAppBar({
  title = "שיתוף קהילתי",
  unreadNotifications = 0,
}: {
  title?: string;
  unreadNotifications?: number;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-secondary/15 bg-surface/90 px-margin-mobile backdrop-blur-md sm:gap-3 md:px-gutter">
      <span className="hidden shrink-0 font-headline-sm text-headline-sm font-semibold text-secondary sm:block">
        {title}
      </span>
      <div className="min-w-0 flex-1 sm:mr-auto sm:max-w-md">
        <SearchAutocomplete variant="compact" />
      </div>
      <Link
        href="/notifications"
        aria-label={
          unreadNotifications > 0 ? `התראות, ${unreadNotifications} שלא נקראו` : "התראות"
        }
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-secondary/10"
      >
        <MaterialIcon name="notifications" filled={unreadNotifications > 0} />
        <CountBadge count={unreadNotifications} className="absolute -left-0.5 -top-0.5" />
      </Link>
      <Link
        href="/profile"
        aria-label="הפרופיל שלי"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-secondary/20 bg-primary-container text-secondary transition-colors hover:bg-secondary/10"
      >
        <MaterialIcon name="person" />
      </Link>
      <form action={logoutAction} className="md:hidden">
        <button
          type="submit"
          aria-label="יציאה"
          className="flex h-10 w-10 items-center justify-center rounded-full text-secondary transition-colors hover:bg-secondary/10"
        >
          <MaterialIcon name="logout" />
        </button>
      </form>
    </header>
  );
}
