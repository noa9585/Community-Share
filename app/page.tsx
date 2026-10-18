import Link from "next/link";

import { AppNav } from "@/components/AppNav";
import { IncomingRequestActions, LoanActions } from "@/components/ItemActions";
import { CatalogItemCard, CategoryButton, ItemThumbnail } from "@/components/ItemCard";
import { MaterialIcon, getCategoryIcon } from "@/components/MaterialIcon";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { requirePageUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export default async function HomePage() {
  const user = await requirePageUser();
  const repo = await getRepository();
  const { categories, recentItems, myLoans, pendingRequests } = await repo.getHomeDashboard(
    user.id,
  );

  const activeLoans = myLoans.filter(
    (request) => request.loan && request.loan.status !== "completed",
  );
  const waitingForOwner = myLoans.filter((request) => request.status === "pending").length;

  return (
    <AppNav user={user} activePath="/" showAddButton>
      <div className="space-y-stack-lg">
        <section className="flex flex-col items-center py-4 md:py-stack-lg">
          <div className="mb-6 text-center md:mb-10">
            <h1 className="mb-3 font-headline-md text-headline-md-mobile text-brand-deep md:text-headline-md">
              מה אתם צריכים היום?
            </h1>
            <p className="font-body-lg text-secondary opacity-80 md:text-lg">
              הקהילה כאן בשבילכם. פשוט חפשו פריט להשאלה.
            </p>
          </div>
          <div className="w-full max-w-2xl">
            <SearchAutocomplete variant="hero" placeholder="מקדחה, סולם, פלטת שבת..." />
          </div>
          <div className="mt-stack-md flex w-full gap-3 overflow-x-auto pb-2 md:flex-wrap md:justify-center md:gap-4 md:overflow-visible">
            {categories.map((category) => (
              <CategoryButton
                key={category.id}
                name={category.name}
                icon={category.icon ?? getCategoryIcon(category.name)}
                href={`/catalog?category=${category.id}`}
              />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
          <section className="space-y-4 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-brand-deep">
                בקשות שממתינות לאישור שלי
              </h2>
              {pendingRequests.length > 0 && (
                <span className="rounded bg-error/10 px-2 py-1 text-xs font-bold text-error">
                  {pendingRequests.length}
                </span>
              )}
            </div>
            {pendingRequests.length === 0 && (
              <p className="rounded-2xl border border-brand-deep/10 bg-white/80 p-4 text-sm text-on-surface-variant">
                אין בקשות ממתינות
              </p>
            )}
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="space-y-3 rounded-2xl border border-brand-deep/10 bg-white/80 p-4"
              >
                <div className="flex items-center gap-3">
                  <ItemThumbnail item={request.item} className="h-14 w-14 rounded-lg" />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-brand-deep">{request.item?.name}</p>
                    <p className="text-sm text-secondary opacity-80">
                      {request.requester?.full_name ?? "חבר/ת קהילה"} · {request.start_date} –{" "}
                      {request.end_date}
                    </p>
                  </div>
                </div>
                <IncomingRequestActions requestId={request.id} />
              </div>
            ))}
            {pendingRequests.length > 0 && (
              <Link href="/my-items" className="block text-sm font-bold text-secondary underline">
                לכל הבקשות והפריטים שלי
              </Link>
            )}
          </section>

          <section className="space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-brand-deep">ההשאלות שלי</h2>
              <Link
                href="/my-loans"
                className="text-sm font-bold text-secondary underline decoration-brand-mint underline-offset-4"
              >
                לכל ההשאלות
              </Link>
            </div>
            {activeLoans.length === 0 && (
              <p className="rounded-2xl border border-brand-deep/10 bg-white/80 p-4 text-sm text-on-surface-variant">
                אין השאלות פעילות כרגע
                {waitingForOwner > 0 && ` · ${waitingForOwner} בקשות ממתינות לאישור הבעלים`}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {activeLoans.map((request) => {
                const isLate = request.loan?.status === "late";
                return (
                  <div
                    key={request.id}
                    className="space-y-3 rounded-2xl border border-brand-deep/10 bg-white/80 p-4"
                  >
                    <div className="flex gap-3">
                      <ItemThumbnail item={request.item} className="h-16 w-16 rounded-xl" />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-brand-deep">{request.item?.name}</p>
                        <p className="text-sm text-secondary opacity-80">
                          {request.start_date} – {request.end_date}
                        </p>
                        <p
                          className={`mt-1 flex items-center gap-1 text-xs font-bold ${
                            isLate ? "text-error" : "text-primary"
                          }`}
                        >
                          <MaterialIcon name={isLate ? "warning" : "schedule"} size={16} />
                          {isLate
                            ? "באיחור – יש להחזיר"
                            : request.loan?.status === "returned_pending_confirmation"
                              ? "ממתין לאישור החזרה"
                              : "פעיל"}
                        </p>
                      </div>
                    </div>
                    {request.loan && (
                      <LoanActions
                        loanId={request.loan.id}
                        role="requester"
                        status={request.loan.status}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {recentItems.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-brand-deep">נוספו לאחרונה</h2>
              <Link href="/catalog" className="text-sm font-bold text-secondary underline">
                לכל הקטלוג
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {recentItems.map((item) => (
                <CatalogItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppNav>
  );
}
