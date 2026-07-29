import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/AppNav";
import { IncomingRequestActions, LoanActions } from "@/components/ItemActions";
import { CategoryButton, ItemCard } from "@/components/ItemCard";
import { ItemImagePlaceholder, MaterialIcon, getCategoryIcon } from "@/components/MaterialIcon";
import { isValidStorageUrl } from "@/lib/utils/url";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    redirect(user ? "/pending-approval" : "/login");
  }

  const repo = await getRepository();
  const { categories, recentItems, myLoans, pendingRequests } =
    await repo.getHomeDashboard(user.id);

  const activeLoans = myLoans.filter((r) => r.loan?.status === "active" || r.loan?.status === "late");
  const stats = {
    totalLoans: myLoans.length,
    itemsBorrowed: new Set(myLoans.map((l) => l.item_id)).size,
    savings: myLoans.length * 37,
    trust: 9.8,
  };

  return (
    <AppNav user={user} activePath="/" showSearch>
      <div className="space-y-stack-lg">
        <section className="relative flex flex-col items-center overflow-hidden rounded-3xl py-stack-lg">
          <div className="relative z-10 mb-10 text-center">
            <h2 className="font-headline mb-4 text-3xl font-semibold text-brand-deep">
              מה אתם צריכים היום?
            </h2>
            <p className="text-lg text-secondary opacity-80">
              הקהילה כאן בשבילכם. פשוט חפשו פריט להשאלה.
            </p>
          </div>
          <form
            action="/catalog"
            className="relative z-10 flex w-full max-w-2xl items-center rounded-2xl border border-secondary/10 bg-white p-2 shadow-xl shadow-secondary/5"
          >
            <div className="flex flex-1 items-center px-4">
              <MaterialIcon name="search" className="text-2xl text-secondary/60" />
              <input
                name="q"
                placeholder="מקדחה, סולם, פלטת שבת..."
                className="w-full border-none py-3 text-lg text-brand-deep placeholder:opacity-50 focus:ring-0"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-brand-deep px-8 py-3 font-bold text-primary-container transition-all hover:brightness-110 active:scale-95"
            >
              חפש
            </button>
          </form>
          <div className="relative z-10 mt-stack-md flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <CategoryButton
                key={category.id}
                name={category.name}
                icon={getCategoryIcon(category.name)}
                href={`/catalog?category=${category.id}`}
              />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-headline text-2xl font-semibold text-brand-deep">
                ממתין לאישורך
              </h3>
              {pendingRequests.length > 0 && (
                <span className="rounded bg-error/10 px-2 py-1 text-xs font-bold text-error">
                  {pendingRequests.length} חדשים
                </span>
              )}
            </div>
            {pendingRequests.length === 0 && (
              <p className="rounded-2xl border border-brand-deep/10 bg-white/80 p-4 text-sm text-on-surface-variant">
                אין בקשות ממתינות
              </p>
            )}
            {pendingRequests.map((request) => {
              const imageUrl = request.item?.item_images?.[0]?.url;
              const safeImage =
                imageUrl && isValidStorageUrl(imageUrl) ? imageUrl : null;
              return (
                <div
                  key={request.id}
                  className="flex items-center gap-4 rounded-2xl border border-brand-deep/10 bg-white/80 p-4 transition-all hover:bg-white"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                    {safeImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={safeImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ItemImagePlaceholder
                        categoryName={
                          "category" in (request.item ?? {})
                            ? (request.item as { category?: { name: string } }).category?.name
                            : undefined
                        }
                        className="h-full w-full"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-brand-deep">{request.item?.name}</h4>
                    <p className="text-xs text-secondary opacity-70">
                      בקשה מ: {request.requester?.full_name}
                    </p>
                  </div>
                  <IncomingRequestActions requestId={request.id} variant="compact" />
                </div>
              );
            })}
          </div>

          <div className="space-y-4 lg:col-span-8">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-headline text-2xl font-semibold text-brand-deep">
                ההשאלות הפעילות שלי
              </h3>
              <Link
                href="/my-loans"
                className="text-sm font-bold text-secondary underline decoration-brand-mint underline-offset-4"
              >
                צפה בכל ההיסטוריה
              </Link>
            </div>
            {activeLoans.length === 0 && (
              <p className="rounded-2xl border border-brand-deep/10 bg-primary-container p-5 text-sm text-on-surface-variant">
                אין השאלות פעילות כרגע
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {activeLoans.map((request) => {
                const item = request.item;
                const imageUrl =
                  item && "item_images" in item ? item.item_images?.[0]?.url : undefined;
                const safeImage =
                  imageUrl && isValidStorageUrl(imageUrl) ? imageUrl : null;
                const isLate = request.loan?.status === "late";
                return (
                  <div
                    key={request.id}
                    className="group relative overflow-hidden rounded-2xl border border-brand-deep/10 bg-primary-container p-5"
                  >
                    <div className="flex gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container">
                        {safeImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={safeImage}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <ItemImagePlaceholder
                            categoryName={
                              item && "category" in item ? item.category?.name : undefined
                            }
                            className="h-full w-full"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        {item && "category" in item && item.category?.name && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                            {item.category.name}
                          </span>
                        )}
                        <h4 className="font-headline mb-1 text-lg text-brand-deep">
                          {item?.name}
                        </h4>
                        <p className="mb-3 text-sm text-secondary opacity-70">
                          {request.start_date} – {request.end_date}
                        </p>
                        <div
                          className={`flex items-center gap-2 text-xs font-bold ${isLate ? "text-error" : "text-primary"}`}
                        >
                          <MaterialIcon name={isLate ? "warning" : "schedule"} className="text-sm" />
                          <span>{isLate ? "מאחר" : "פעיל"}</span>
                        </div>
                      </div>
                    </div>
                    {request.loan && (
                      <div className="mt-4 flex items-center justify-between border-t border-brand-deep/5 pt-4">
                        <LoanActions
                          loanId={request.loan.id}
                          role="requester"
                          status={request.loan.status}
                          variant="compact"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { value: stats.totalLoans, label: "השאלות שביצעתי" },
                { value: stats.itemsBorrowed, label: "חפצים שהשאלתי" },
                { value: `₪${stats.savings}`, label: "חיסכון קהילתי", accent: true },
                { value: stats.trust, label: "דירוג אמון", accent: true },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center rounded-2xl border border-secondary/10 bg-white/40 p-4"
                >
                  <span
                    className={`font-headline mb-1 text-3xl ${stat.accent ? "text-primary" : "text-secondary"}`}
                  >
                    {stat.value}
                  </span>
                  <span className="text-xs font-bold text-secondary/60">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {recentItems.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-headline text-2xl font-semibold text-brand-deep">
                פריטים בקהילה
              </h3>
              <Link href="/catalog" className="text-sm font-bold text-secondary">
                לכל הקטלוג
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppNav>
  );
}
