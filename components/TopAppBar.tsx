import Link from "next/link";

import { MaterialIcon } from "@/components/MaterialIcon";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { logoutAction } from "@/lib/actions/auth";

export function TopAppBar({ title = "שיתוף קהילתי" }: { title?: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-secondary/15 bg-surface/90 px-margin-mobile backdrop-blur-md md:px-gutter">
      <span className="hidden shrink-0 font-headline-sm text-headline-sm font-semibold text-secondary sm:block">
        {title}
      </span>
      <div className="min-w-0 flex-1 sm:mr-auto sm:max-w-md">
        <SearchAutocomplete variant="compact" />
      </div>
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
