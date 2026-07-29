import type { Metadata } from "next";
import Link from "next/link";

import { AppNav } from "@/components/AppNav";
import { ItemImagePlaceholder } from "@/components/MaterialIcon";
import { MaterialIcon } from "@/components/MaterialIcon";
import { LoanActions } from "@/components/ItemActions";
import { StatusBadge } from "@/components/StatusBadge";
import { TrustRing } from "@/components/TrustRing";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { isValidStorageUrl } from "@/lib/utils/url";

export const metadata: Metadata = {
  title: "ההשאלות שלי | שיתוף קהילתי",
};

const TABS = [
  { key: "all", label: "הכל" },
  { key: "pending", label: "ממתין" },
  { key: "active", label: "פעיל" },
  { key: "completed", label: "הושלם" },
  { key: "late", label: "באיחור" },
] as const;

export default async function MyLoansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const tab = TABS.some((t) => t.key === params.tab) ? params.tab! : "all";
  const repo = await getRepository();
  const requests = await repo.getMyLoans(user!.id);

  const filtered = requests.filter((request) => {
    const loanStatus = request.loan?.status;
    if (tab === "all") return true;
    if (tab === "pending") return request.status === "pending";
    if (tab === "active") return loanStatus === "active";
    if (tab === "completed") return loanStatus === "completed";
    if (tab === "late") return loanStatus === "late";
    return true;
  });

  const activeCount = requests.filter((r) => r.loan?.status === "active").length;
  const stats = {
    total: requests.length,
    trust: 9.2,
    savings: requests.length * 59,
    active: activeCount,
  };

  return (
    <AppNav user={user} activePath="/my-loans" title="ההשאלות שלי" showSearch>
      <section className="mb-stack-lg grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-xl border border-secondary/10 bg-primary-container p-6">
          <span className="text-sm text-primary">סה&quot;כ השאלות</span>
          <span className="font-headline text-3xl text-primary">{stats.total}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-secondary/10 bg-secondary-container p-6">
          <span className="text-sm text-secondary">מדד אמון קהילתי</span>
          <div className="flex items-center gap-4">
            <TrustRing score={stats.trust} size="sm" innerBg="#fff" />
            <span className="text-sm text-secondary/80">מעולה!</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-secondary/10 bg-surface-container p-6">
          <span className="text-sm text-on-surface-variant">חיסכון קהילתי</span>
          <span className="font-headline text-3xl text-on-surface">₪{stats.savings}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-secondary/10 bg-surface-container p-6">
          <span className="text-sm text-on-surface-variant">פריטים פעילים</span>
          <span className="font-headline text-3xl text-on-surface">{stats.active}</span>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 rounded-lg border border-outline-variant/30 bg-surface-container p-1">
            {TABS.map((item) => (
              <Link
                key={item.key}
                href={`/my-loans?tab=${item.key}`}
                className={`rounded-md px-6 py-2 text-sm transition-all ${
                  tab === item.key
                    ? "bg-white text-secondary shadow-sm"
                    : "text-on-surface-variant hover:bg-white/50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-secondary/10 bg-white">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="border-b border-secondary/10 bg-surface-container-low">
                <th className="px-6 py-4 text-sm font-medium text-secondary">פריט</th>
                <th className="hidden px-6 py-4 text-sm font-medium text-secondary md:table-cell">
                  תאריכים
                </th>
                <th className="px-6 py-4 text-sm font-medium text-secondary">סטטוס</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-secondary">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/5">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-on-surface-variant">
                    אין השאלות בקטגוריה זו
                  </td>
                </tr>
              )}
              {filtered.map((request) => {
                const item = request.item;
                const imageUrl =
                  item && "item_images" in item ? item.item_images?.[0]?.url : undefined;
                const safeImage =
                  imageUrl && isValidStorageUrl(imageUrl) ? imageUrl : null;
                const status = request.loan?.status ?? request.status;
                const isLate = status === "late";

                return (
                  <tr
                    key={request.id}
                    className="group transition-colors hover:bg-primary-container/20"
                  >
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-primary-container">
                          {safeImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={safeImage} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ItemImagePlaceholder
                              categoryName={
                                item && "category" in item ? item.category?.name : undefined
                              }
                              className="h-full w-full"
                            />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-primary">{item?.name}</div>
                          {item && "category" in item && item.category?.name && (
                            <div className="text-sm text-on-surface-variant/70">
                              {item.category.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-6 py-6 md:table-cell">
                      <div className="flex flex-col text-sm">
                        <span className="font-medium text-on-surface">
                          {request.start_date} – {request.end_date}
                        </span>
                        {isLate && (
                          <span className="text-xs font-bold text-error">באיחור</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-6 py-6 text-left">
                      {request.loan ? (
                        <LoanActions
                          loanId={request.loan.id}
                          role="requester"
                          status={request.loan.status}
                        />
                      ) : request.status === "pending" ? (
                        <span className="text-xs text-on-surface-variant">ממתין לאישור</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppNav>
  );
}
