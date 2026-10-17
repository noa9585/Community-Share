"use client";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { MaterialIcon } from "@/components/MaterialIcon";
import {
  adminItemAction,
  adminLoanAction,
  adminReportAction,
  adminUserAction,
} from "@/lib/actions/admin";
import { handleBorrowRequestAction, handleLoanAction } from "@/lib/actions/borrow";
import { startConversationAction } from "@/lib/actions/chat";
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

export function AdminItemActions({
  itemId,
  status = "pending",
}: {
  itemId: string;
  status?: "pending" | "approved" | "rejected";
}) {
  const [state, action, pending] = useFormAction(adminItemAction);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      {status !== "approved" && (
        <button name="action" value="approve" disabled={pending} className={PRIMARY}>
          {status === "rejected" ? "החזר לקטלוג" : "אשר"}
        </button>
      )}
      {status !== "rejected" && (
        <button name="action" value="reject" disabled={pending} className={DANGER}>
          {status === "approved" ? "הסר מהקטלוג" : "דחה"}
        </button>
      )}
      <FormMessage state={state} />
    </form>
  );
}

/** Lets an admin close a loan that its owner has left open. */
export function AdminLoanActions({ loanId }: { loanId: string }) {
  const [state, action, pending] = useFormAction(adminLoanAction);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("לסגור את ההשאלה במקום בעל הפריט? הפעולה תירשם ביומן.")) {
          event.preventDefault();
        }
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="loanId" value={loanId} />
      <button type="submit" disabled={pending} className={OUTLINE}>
        סגירת השאלה
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function AdminReportActions({
  reportId,
  status,
  note,
}: {
  reportId: string;
  status: "open" | "in_progress" | "resolved" | "dismissed";
  note: string | null;
}) {
  const [state, action, pending] = useFormAction(adminReportAction);
  const closed = status === "resolved" || status === "dismissed";

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="reportId" value={reportId} />
      <label className="block text-sm font-bold text-secondary">
        הערת טיפול (פנימית, לא נשלחת למדווח/ת)
        <textarea
          name="note"
          rows={2}
          maxLength={1000}
          defaultValue={note ?? ""}
          className="mt-1 w-full rounded-lg border-none bg-surface-container-low px-3 py-2 text-sm font-normal text-on-surface focus:ring-2 focus:ring-trust-mint"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {status !== "in_progress" && (
          <button name="status" value="in_progress" disabled={pending} className={OUTLINE}>
            {closed ? "פתיחה מחדש" : "העבר לטיפול"}
          </button>
        )}
        {status !== "resolved" && (
          <button name="status" value="resolved" disabled={pending} className={PRIMARY}>
            סמן כטופל
          </button>
        )}
        {status !== "dismissed" && (
          <button name="status" value="dismissed" disabled={pending} className={DANGER}>
            סגור ללא פעולה
          </button>
        )}
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/**
 * Opens the chat about an item. A member talks to the item's owner; the owner
 * passes `memberId` to talk to the member who asked for the item.
 */
export function OpenChatButton({
  itemId,
  memberId,
  label = "צ'אט",
  variant = "outline",
}: {
  itemId: string;
  memberId?: string;
  label?: string;
  variant?: "outline" | "block";
}) {
  const [state, action, pending] = useFormAction(startConversationAction);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      {memberId && <input type="hidden" name="memberId" value={memberId} />}
      <button
        type="submit"
        disabled={pending}
        className={
          variant === "block"
            ? "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-secondary/30 bg-white px-8 py-3 font-bold text-secondary transition-all hover:bg-secondary/5 active:scale-95 disabled:opacity-60"
            : `${OUTLINE} flex items-center gap-1.5`
        }
      >
        <MaterialIcon name="chat" size={variant === "block" ? 22 : 18} />
        {label}
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
