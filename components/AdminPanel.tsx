"use client";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import {
  adminItemAction,
  adminUserAction,
  markLateLoansAction,
} from "@/lib/actions/admin";
import { StatusBadge } from "@/components/StatusBadge";
import type { LoanWithRelations } from "@/types/database";

function UserActionForm({ userId }: { userId: string }) {
  const [state, action, pending] = useFormAction(adminUserAction);
  return (
    <form action={action} className="flex flex-wrap gap-2">
      <input type="hidden" name="userId" value={userId} />
      <FormMessage state={state} />
      <button name="action" value="approve" disabled={pending} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white">
        אשר
      </button>
      <button name="action" value="block" disabled={pending} className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white">
        חסום
      </button>
      <button name="action" value="unblock" disabled={pending} className="rounded-lg bg-zinc-700 px-3 py-1 text-xs text-white">
        שחרר
      </button>
    </form>
  );
}

function ItemActionForm({ itemId }: { itemId: string }) {
  const [state, action, pending] = useFormAction(adminItemAction);
  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <FormMessage state={state} />
      <button name="action" value="approve" disabled={pending} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white">
        אשר
      </button>
      <button name="action" value="reject" disabled={pending} className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white">
        דחה
      </button>
    </form>
  );
}

export function AdminPanel({
  pendingUsers,
  pendingItems,
  activeLoans,
  lateLoans,
}: {
  pendingUsers: { id: string; full_name: string; email: string }[];
  pendingItems: { id: string; name: string }[];
  activeLoans: LoanWithRelations[];
  lateLoans: LoanWithRelations[];
}) {
  const [lateState, lateAction, latePending] = useFormAction(markLateLoansAction);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">משתמשים ממתינים</h2>
        <div className="space-y-3">
          {pendingUsers.map((user) => (
            <div key={user.id} className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
              <p className="font-medium">{user.full_name}</p>
              <p className="text-sm text-zinc-500">{user.email}</p>
              <div className="mt-3">
                <UserActionForm userId={user.id} />
              </div>
            </div>
          ))}
          {pendingUsers.length === 0 && <p className="text-sm text-zinc-500">אין משתמשים ממתינים</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">פריטים ממתינים</h2>
        <div className="space-y-3">
          {pendingItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
              <span>{item.name}</span>
              <ItemActionForm itemId={item.id} />
            </div>
          ))}
          {pendingItems.length === 0 && <p className="text-sm text-zinc-500">אין פריטים ממתינים</p>}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">השאלות פעילות</h2>
          <form action={lateAction}>
            <FormMessage state={lateState} />
            <button
              type="submit"
              disabled={latePending}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs text-white"
            >
              סמן איחורים
            </button>
          </form>
        </div>
        <div className="space-y-2">
          {activeLoans.map((loan) => (
            <div key={loan.id} className="rounded-xl bg-white p-3 text-sm ring-1 ring-zinc-200">
              {loan.borrow_request?.item?.name} · עד {loan.borrow_request?.end_date}
              <StatusBadge status="active" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">השאלות באיחור</h2>
        <div className="space-y-2">
          {lateLoans.map((loan) => (
            <div key={loan.id} className="rounded-xl bg-red-50 p-3 text-sm">
              {loan.borrow_request?.item?.name} · היה להיחזר עד {loan.borrow_request?.end_date}
              <StatusBadge status="late" />
            </div>
          ))}
          {lateLoans.length === 0 && <p className="text-sm text-zinc-500">אין השאלות באיחור</p>}
        </div>
      </section>
    </div>
  );
}
