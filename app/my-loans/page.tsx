import type { Metadata } from "next";
import Link from "next/link";

import { AppNav } from "@/components/AppNav";
import { CancelRequestButton, LoanActions } from "@/components/ItemActions";
import { ItemThumbnail } from "@/components/ItemCard";
import { StatusBadge } from "@/components/StatusBadge";
import { requirePageUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import type { BorrowRequestWithRelations } from "@/types/database";

export const metadata: Metadata = {
  title: "ההשאלות שלי | שיתוף קהילתי",
};

const TABS = [
  { key: "all", label: "הכל" },
  { key: "pending", label: "ממתינות" },
  { key: "active", label: "פעילות" },
  { key: "late", label: "באיחור" },
  { key: "completed", label: "הסתיימו" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function inTab(request: BorrowRequestWithRelations, tab: TabKey): boolean {
  const loanStatus = request.loan?.status;
  switch (tab) {
    case "pending":
      return request.status === "pending";
    case "active":
      return loanStatus === "active" || loanStatus === "returned_pending_confirmation";
    case "late":
      return loanStatus === "late";
    case "completed":
      return loanStatus === "completed";
    default:
      return true;
  }
}

export default async function MyLoansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const user = await requirePageUser();
  const params = await searchParams;
  const tab: TabKey = TABS.find((entry) => entry.key === params.tab)?.key ?? "all";

  const repo = await getRepository();
  const requests = await repo.getMyLoans(user.id);
  const filtered = requests.filter((request) => inTab(request, tab));

  return (
    <AppNav user={user} activePath="/my-loans" headerTitle="ההשאלות שלי">
      <h1 className="mb-stack-md font-headline-md text-headline-md-mobile text-brand-deep md:text-headline-md">
        ההשאלות שלי
      </h1>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-outline-variant/30 bg-surface-container p-1">
        {TABS.map((entry) => {
          const count = requests.filter((request) => inTab(request, entry.key)).length;
          return (
            <Link
              key={entry.key}
              href={`/my-loans?tab=${entry.key}`}
              aria-current={tab === entry.key ? "page" : undefined}
              className={`shrink-0 rounded-md px-4 py-2 font-label-md text-label-md transition-all ${
                tab === entry.key
                  ? "bg-white text-secondary shadow-sm"
                  : "text-on-surface-variant hover:bg-white/50"
              }`}
            >
              {entry.label} ({count})
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-secondary/10 bg-white/70 p-10 text-center">
          <p className="text-on-surface-variant">אין השאלות להצגה</p>
          <Link href="/catalog" className="mt-3 inline-block font-bold text-secondary underline">
            לקטלוג הפריטים
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((request) => {
            const status = request.loan?.status ?? request.status;
            return (
              <li
                key={request.id}
                className="space-y-3 rounded-2xl border border-secondary/10 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={`/items/${request.item_id}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <ItemThumbnail item={request.item} className="h-14 w-14 rounded-lg" />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-brand-deep">
                        {request.item?.name ?? "פריט"}
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        {request.start_date} – {request.end_date} · {request.requested_quantity} יח׳
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        בעלים: {request.item?.owner?.full_name ?? "חבר/ת קהילה"}
                        {request.contact_email && (
                          <>
                            {" · "}
                            <span dir="ltr">{request.contact_email}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </Link>
                  <StatusBadge status={status} />
                </div>

                {status === "late" && (
                  <p className="text-sm font-bold text-error">
                    מועד ההחזרה עבר. יש להחזיר את הפריט בהקדם.
                  </p>
                )}
                {(request.item?.deposit_amount ?? 0) > 0 && request.loan && (
                  <p className="text-sm text-on-surface-variant">
                    פיקדון ₪{request.item?.deposit_amount}:{" "}
                    {request.loan.deposit_received ? "התקבל אצל הבעלים" : "טרם סומן כהתקבל"}
                  </p>
                )}

                {request.loan ? (
                  <LoanActions
                    loanId={request.loan.id}
                    role="requester"
                    status={request.loan.status}
                  />
                ) : (
                  request.status === "pending" && <CancelRequestButton requestId={request.id} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AppNav>
  );
}
