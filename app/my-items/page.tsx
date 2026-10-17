import type { Metadata } from "next";
import Link from "next/link";

import { AppNav } from "@/components/AppNav";
import {
  DeleteItemButton,
  IncomingRequestActions,
  LoanActions,
  OpenChatButton,
} from "@/components/ItemActions";
import { ItemThumbnail } from "@/components/ItemCard";
import { StatusBadge } from "@/components/StatusBadge";
import { requirePageUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import type { BorrowRequestWithRelations } from "@/types/database";

export const metadata: Metadata = {
  title: "הפריטים שלי | שיתוף קהילתי",
};

const CARD = "rounded-2xl border border-secondary/10 bg-white p-4";
const HEADING = "font-headline-sm text-headline-sm font-semibold text-brand-deep";
const EMPTY = "rounded-2xl border border-secondary/10 bg-white/70 p-4 text-sm text-on-surface-variant";

function RequestSummary({ request }: { request: BorrowRequestWithRelations }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ItemThumbnail item={request.item} className="h-14 w-14 rounded-lg" />
      <div className="min-w-0">
        <p className="truncate font-bold text-brand-deep">{request.item?.name}</p>
        <p className="text-sm text-secondary/80">
          {request.start_date} – {request.end_date} · {request.requested_quantity} יח׳
        </p>
        <p className="text-sm text-secondary/80">
          {request.requester?.full_name ?? "חבר/ת קהילה"}
          {request.contact_email && (
            <>
              {" · "}
              <a href={`mailto:${request.contact_email}`} className="underline" dir="ltr">
                {request.contact_email}
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default async function MyItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const user = await requirePageUser();
  const notice = await searchParams;
  const repo = await getRepository();

  const [items, incomingRequests, ownerLoans] = await Promise.all([
    repo.getMyItems(user.id),
    repo.getIncomingRequests(user.id),
    repo.getOwnerLoans(user.id),
  ]);

  const openLoans = ownerLoans.filter((request) => request.loan?.status !== "completed");

  return (
    <AppNav user={user} activePath="/my-items" headerTitle="הפריטים שלי" showAddButton>
      <div className="mb-stack-lg flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-headline-md text-headline-md-mobile text-brand-deep md:text-headline-md">
            הפריטים שלי
          </h1>
          <p className="font-body-md text-on-surface-variant">
            ניהול הפריטים, אישור בקשות וסימון החזרות
          </p>
        </div>
        <Link
          href="/items/new"
          className="rounded-xl bg-brand-mint px-5 py-2.5 font-bold text-brand-deep"
        >
          הוספת פריט
        </Link>
      </div>

      {(notice.created || notice.updated) && (
        <p role="status" className="mb-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice.created
            ? "הפריט נשלח לאישור אדמין ויופיע בקטלוג לאחר האישור."
            : "הפריט עודכן."}
        </p>
      )}

      <div className="space-y-stack-lg">
        <section className="space-y-3">
          <h2 className={HEADING}>בקשות שממתינות לאישור שלי</h2>
          {incomingRequests.length === 0 && <p className={EMPTY}>אין בקשות ממתינות</p>}
          {incomingRequests.map((request) => (
            <div key={request.id} className={`${CARD} flex flex-wrap items-center justify-between gap-4`}>
              <RequestSummary request={request} />
              <div className="flex flex-wrap items-center gap-2">
                <IncomingRequestActions requestId={request.id} />
                <OpenChatButton itemId={request.item_id} memberId={request.requester_id} />
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className={HEADING}>פריטים שלי שמושאלים כרגע</h2>
          {openLoans.length === 0 && <p className={EMPTY}>אין השאלות פתוחות</p>}
          {openLoans.map((request) => (
            <div key={request.id} className={`${CARD} space-y-3`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <RequestSummary request={request} />
                <div className="flex flex-wrap items-center gap-2">
                  {request.loan && <StatusBadge status={request.loan.status} />}
                  {(request.item?.deposit_amount ?? 0) > 0 && (
                    <span className="rounded-full border border-secondary/20 px-3 py-1 text-xs font-bold text-secondary">
                      פיקדון ₪{request.item?.deposit_amount}:{" "}
                      {request.loan?.deposit_received ? "התקבל" : "טרם התקבל"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {request.loan && (
                  <LoanActions
                    loanId={request.loan.id}
                    role="owner"
                    status={request.loan.status}
                    depositAmount={request.item?.deposit_amount ?? 0}
                    depositReceived={request.loan.deposit_received}
                  />
                )}
                <OpenChatButton itemId={request.item_id} memberId={request.requester_id} />
                <Link
                  href={`/report?user=${request.requester_id}`}
                  className="text-sm text-on-surface-variant underline hover:text-error"
                >
                  דיווח
                </Link>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className={HEADING}>כל הפריטים שלי</h2>
          {items.length === 0 && <p className={EMPTY}>עדיין לא הוספת פריטים</p>}
          {items.map((item) => (
            <div key={item.id} className={`${CARD} flex flex-wrap items-center justify-between gap-4`}>
              <Link href={`/items/${item.id}`} className="flex min-w-0 items-center gap-3">
                <ItemThumbnail item={item} className="h-14 w-14 rounded-lg" />
                <div className="min-w-0">
                  <p className="truncate font-bold text-brand-deep">{item.name}</p>
                  <p className="text-sm text-on-surface-variant">
                    {item.available_quantity} פנויים מתוך {item.total_quantity}
                  </p>
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.approval_status} />
                <Link
                  href={`/items/${item.id}/edit`}
                  className="rounded-lg border border-secondary/40 px-4 py-2 text-sm font-medium text-secondary hover:bg-secondary/5"
                >
                  עריכה
                </Link>
                <DeleteItemButton itemId={item.id} />
              </div>
            </div>
          ))}
        </section>
      </div>
    </AppNav>
  );
}
