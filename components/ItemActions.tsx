"use client";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { adminItemAction, adminUserAction } from "@/lib/actions/admin";
import { handleBorrowRequestAction, handleLoanAction } from "@/lib/actions/borrow";
import { deleteItemAction } from "@/lib/actions/items";

const PRIMARY = "rounded-lg bg-brand-mint px-4 py-2 text-sm font-bold text-brand-deep disabled:opacity-60";
const OUTLINE =
  "rounded-lg border border-secondary/40 px-4 py-2 text-sm font-medium text-secondary hover:bg-secondary/5 disabled:opacity-60";
const DANGER =
  "rounded-lg bg-error/10 px-4 py-2 text-sm font-medium text-error hover:bg-error/15 disabled:opacity-60";

/** Owner's answer to a pending borrow request. */
export function IncomingRequestActions({ requestId }: { requestId: string }) {
  const [state, action, pending] = useFormAction(handleBorrowRequestAction);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <button name="action" value="approve" disabled={pending} className={PRIMARY}>
        אשר
      </button>
      <button name="action" value="reject" disabled={pending} className={DANGER}>
        דחה
      </button>
      <FormMessage state={state} />
    </form>
  );
}

/** Lets a borrower withdraw a request the owner has not answered yet. */
export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [state, action, pending] = useFormAction(handleBorrowRequestAction);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <button name="action" value="cancel" disabled={pending} className={DANGER}>
        ביטול בקשה
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function LoanActions({
  loanId,
  role,
  status,
  depositAmount = 0,
  depositReceived = false,
}: {
  loanId: string;
  role: "requester" | "owner";
  status: string;
  depositAmount?: number;
  depositReceived?: boolean;
}) {
  const [state, action, pending] = useFormAction(handleLoanAction);

  const open = status !== "completed";
  const canMarkReturned = role === "requester" && (status === "active" || status === "late");
  const canConfirmReturn = role === "owner" && open;
  const canMarkDeposit = role === "owner" && open && depositAmount > 0 && !depositReceived;

  if (!canMarkReturned && !canConfirmReturn && !canMarkDeposit) return null;

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="loanId" value={loanId} />
      {canMarkReturned && (
        <button name="action" value="mark_returned" disabled={pending} className={OUTLINE}>
          סימנתי שהחזרתי
        </button>
      )}
      {canConfirmReturn && (
        <button name="action" value="confirm_return" disabled={pending} className={PRIMARY}>
          {status === "returned_pending_confirmation" ? "אשר החזרה" : "הפריט הוחזר אליי"}
        </button>
      )}
      {canMarkDeposit && (
        <button name="action" value="mark_deposit_received" disabled={pending} className={OUTLINE}>
          פיקדון התקבל
        </button>
      )}
      <FormMessage state={state} />
    </form>
  );
}

export function AdminUserActions({
  userId,
  status,
}: {
  userId: string;
  status: "pending" | "approved" | "blocked";
}) {
  const [state, action, pending] = useFormAction(adminUserAction);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      {status === "pending" && (
        <button name="action" value="approve" disabled={pending} className={PRIMARY}>
          אשר
        </button>
      )}
      {status === "blocked" ? (
        <button name="action" value="unblock" disabled={pending} className={OUTLINE}>
          שחרר חסימה
        </button>
      ) : (
        <button name="action" value="block" disabled={pending} className={DANGER}>
          חסום
        </button>
      )}
      <FormMessage state={state} />
    </form>
  );
}

export function AdminItemActions({ itemId }: { itemId: string }) {
  const [state, action, pending] = useFormAction(adminItemAction);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <button name="action" value="approve" disabled={pending} className={PRIMARY}>
        אשר
      </button>
      <button name="action" value="reject" disabled={pending} className={DANGER}>
        דחה
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const [state, action, pending] = useFormAction(deleteItemAction);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("למחוק את הפריט? לא ניתן לבטל את הפעולה.")) event.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <button type="submit" disabled={pending} className={DANGER}>
        מחק
      </button>
      <FormMessage state={state} />
    </form>
  );
}
