"use client";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { handleBorrowRequestAction, handleLoanAction } from "@/lib/actions/borrow";
import { deleteItemAction } from "@/lib/actions/items";
import { StatusBadge } from "@/components/StatusBadge";
import type { BorrowRequestWithRelations, ItemWithRelations } from "@/types/database";

export function IncomingRequestActions({ requestId }: { requestId: string }) {
  const [state, action, pending] = useFormAction(handleBorrowRequestAction);

  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <FormMessage state={state} />
      <button
        name="action"
        value="approve"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white"
      >
        אשר
      </button>
      <button
        name="action"
        value="reject"
        disabled={pending}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white"
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
}: {
  loanId: string;
  role: "requester" | "owner";
  status: string;
}) {
  const [state, action, pending] = useFormAction(handleLoanAction);

  return (
    <form action={action} className="flex flex-wrap gap-2">
      <input type="hidden" name="loanId" value={loanId} />
      <FormMessage state={state} />
      {role === "requester" && (status === "active" || status === "late") && (
        <button
          name="action"
          value="mark_returned"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white"
        >
          סימנתי שהחזרתי
        </button>
      )}
      {role === "owner" && status === "returned_pending_confirmation" && (
        <button
          name="action"
          value="confirm_return"
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white"
        >
          אשר החזרה
        </button>
      )}
      {role === "owner" && (
        <button
          name="action"
          value="mark_deposit_received"
          disabled={pending}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs text-white"
        >
          פיקדון התקבל
        </button>
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
      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700"
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
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">בקשות נכנסות</h2>
        {incomingRequests.length === 0 && (
          <p className="text-sm text-zinc-500">אין בקשות ממתינות</p>
        )}
        {incomingRequests.map((request) => (
          <div
            key={request.id}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{request.item?.name}</p>
                <p className="text-sm text-zinc-500">
                  {request.start_date} – {request.end_date} · {request.requested_quantity}{" "}
                  יחידות
                </p>
                <p className="text-sm text-zinc-500">{request.requester?.full_name}</p>
              </div>
              <IncomingRequestActions requestId={request.id} />
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">הפריטים שלי</h2>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <StatusBadge status={item.approval_status} />
            </div>
            <DeleteItemButton itemId={item.id} />
          </div>
        ))}
      </section>
    </div>
  );
}
