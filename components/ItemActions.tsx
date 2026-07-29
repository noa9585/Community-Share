"use client";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { MaterialIcon } from "@/components/MaterialIcon";
import { ItemImagePlaceholder } from "@/components/MaterialIcon";
import { handleBorrowRequestAction, handleLoanAction } from "@/lib/actions/borrow";
import { deleteItemAction } from "@/lib/actions/items";
import { StatusBadge } from "@/components/StatusBadge";
import type { BorrowRequestWithRelations, ItemWithRelations } from "@/types/database";

export function IncomingRequestActions({
  requestId,
  variant = "default",
}: {
  requestId: string;
  variant?: "default" | "compact";
}) {
  const [state, action, pending] = useFormAction(handleBorrowRequestAction);

  if (variant === "compact") {
    return (
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="requestId" value={requestId} />
        <FormMessage state={state} />
        <button
          name="action"
          value="approve"
          disabled={pending}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-mint text-brand-deep transition-transform hover:scale-110"
        >
          <MaterialIcon name="check" className="text-xl" />
        </button>
        <button
          name="action"
          value="reject"
          disabled={pending}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-error/10 text-error transition-transform hover:scale-110"
        >
          <MaterialIcon name="close" className="text-xl" />
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <FormMessage state={state} />
      <button
        name="action"
        value="approve"
        disabled={pending}
        className="rounded-lg bg-brand-mint px-3 py-1.5 text-xs font-bold text-brand-deep"
      >
        אשר
      </button>
      <button
        name="action"
        value="reject"
        disabled={pending}
        className="rounded-lg bg-error/10 px-3 py-1.5 text-xs font-bold text-error"
      >
        דחה
      </button>
    </form>
  );
}

export function LoanActions({
  loanId,
  role,
  status,
  variant = "default",
}: {
  loanId: string;
  role: "requester" | "owner";
  status: string;
  variant?: "default" | "compact";
}) {
  const [state, action, pending] = useFormAction(handleLoanAction);

  const buttons = (
    <>
      {role === "requester" && (status === "active" || status === "late") && (
        <button
          name="action"
          value="mark_returned"
          disabled={pending}
          className={
            variant === "compact"
              ? "rounded-lg bg-brand-deep px-4 py-1.5 text-sm font-bold text-primary-container active:scale-95"
              : "rounded-lg border border-secondary px-4 py-1.5 text-sm font-medium text-secondary hover:bg-secondary hover:text-white"
          }
        >
          {variant === "compact" ? "החזרה" : "סימנתי שהחזרתי"}
        </button>
      )}
      {role === "owner" && status === "returned_pending_confirmation" && (
        <button
          name="action"
          value="confirm_return"
          disabled={pending}
          className="rounded-lg bg-brand-mint px-3 py-1.5 text-xs font-bold text-brand-deep"
        >
          אשר החזרה
        </button>
      )}
      {role === "owner" && variant === "default" && (
        <button
          name="action"
          value="mark_deposit_received"
          disabled={pending}
          className="rounded-lg border border-secondary/30 px-3 py-1.5 text-xs text-secondary"
        >
          פיקדון התקבל
        </button>
      )}
    </>
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="loanId" value={loanId} />
      <FormMessage state={state} />
      {variant === "compact" ? (
        <div className="flex w-full items-center justify-between">{buttons}</div>
      ) : (
        buttons
      )}
    </form>
  );
}

export function DeleteItemButton({ itemId }: { itemId: string }) {
  async function handleDelete() {
    if (!confirm("למחוק את הפריט?")) return;
    await deleteItemAction(itemId);
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="rounded-lg bg-error/10 px-3 py-1.5 text-xs font-medium text-error"
    >
      מחק
    </button>
  );
}

export function MyItemsList({
  items,
  incomingRequests,
}: {
  items: ItemWithRelations[];
  incomingRequests: BorrowRequestWithRelations[];
}) {
  return (
    <div className="space-y-stack-lg">
      <section className="space-y-4">
        <h2 className="font-headline text-2xl font-semibold text-brand-deep">בקשות נכנסות</h2>
        {incomingRequests.length === 0 && (
          <p className="rounded-2xl border border-secondary/10 bg-white p-4 text-sm text-on-surface-variant">
            אין בקשות ממתינות
          </p>
        )}
        {incomingRequests.map((request) => (
          <div
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-deep/10 bg-white/80 p-4"
          >
            <div>
              <p className="font-bold text-brand-deep">{request.item?.name}</p>
              <p className="text-sm text-secondary/70">
                {request.start_date} – {request.end_date} · {request.requested_quantity} יחידות
              </p>
              <p className="text-sm text-secondary/70">{request.requester?.full_name}</p>
            </div>
            <IncomingRequestActions requestId={request.id} />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="font-headline text-2xl font-semibold text-brand-deep">הפריטים שלי</h2>
        {items.length === 0 && (
          <p className="text-sm text-on-surface-variant">אין פריטים</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-secondary/10 bg-white p-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 overflow-hidden rounded-lg bg-surface-container">
                <ItemImagePlaceholder categoryName={item.category?.name} className="h-full w-full" />
              </div>
              <div>
                <p className="font-bold text-brand-deep">{item.name}</p>
                <StatusBadge status={item.approval_status} />
              </div>
            </div>
            <DeleteItemButton itemId={item.id} />
          </div>
        ))}
      </section>
    </div>
  );
}
