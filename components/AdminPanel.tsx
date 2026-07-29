"use client";

import { FormMessage, useFormAction } from "@/components/FormHelpers";
import { MaterialIcon } from "@/components/MaterialIcon";
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
    <form action={action} className="flex gap-2">
      <input type="hidden" name="userId" value={userId} />
      <FormMessage state={state} />
      <button
        name="action"
        value="approve"
        disabled={pending}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-mint/20 text-brand-deep transition-colors hover:bg-brand-mint"
      >
        <MaterialIcon name="check" className="text-lg" />
      </button>
      <button
        name="action"
        value="block"
        disabled={pending}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-error/10 text-error transition-colors hover:bg-error hover:text-white"
      >
        <MaterialIcon name="close" className="text-lg" />
      </button>
    </form>
  );
}

function ItemActionForm({ itemId }: { itemId: string }) {
  const [state, action, pending] = useFormAction(adminItemAction);
  return (
    <form action={action} className="mt-2 flex gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <FormMessage state={state} />
      <button
        name="action"
        value="approve"
        disabled={pending}
        className="flex-1 rounded-lg bg-brand-deep px-3 py-1 text-xs font-bold text-primary-container transition-all hover:opacity-90 active:scale-95"
      >
        אשר
      </button>
      <button
        name="action"
        value="reject"
        disabled={pending}
        className="flex-1 rounded-lg border border-secondary/30 px-3 py-1 text-xs font-medium text-secondary transition-all hover:bg-secondary/5 active:scale-95"
      >
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
    <div className="space-y-stack-lg">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="relative flex flex-col gap-2 overflow-hidden rounded-xl border border-secondary/10 bg-white p-6">
          <MaterialIcon name="person_add" className="text-secondary opacity-60" />
          <h3 className="text-sm text-secondary/70">משתמשים ממתינים לאישור</h3>
          <div className="flex items-end justify-between">
            <span className="font-headline text-3xl text-brand-deep">{pendingUsers.length}</span>
          </div>
        </div>
        <div className="relative flex flex-col gap-2 overflow-hidden rounded-xl border border-secondary/10 bg-white p-6">
          <MaterialIcon name="inventory" className="text-primary opacity-60" />
          <h3 className="text-sm text-secondary/70">פריטים חדשים לבדיקה</h3>
          <div className="flex items-end justify-between">
            <span className="font-headline text-3xl text-brand-deep">{pendingItems.length}</span>
          </div>
        </div>
        <div className="relative flex flex-col gap-2 overflow-hidden rounded-xl border border-secondary/10 bg-white p-6">
          <MaterialIcon name="history" className="text-error opacity-60" />
          <h3 className="text-sm text-secondary/70">השאלות בפיגור</h3>
          <div className="flex items-end justify-between">
            <span className="font-headline text-3xl text-error">{lateLoans.length}</span>
            <form action={lateAction}>
              <FormMessage state={lateState} />
              <button
                type="submit"
                disabled={latePending}
                className="text-xs font-bold text-error/70"
              >
                סמן איחורים
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-stack-lg lg:grid-cols-5">
        <section className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-2xl font-semibold text-brand-deep">
              משתמשים חדשים לאישור
            </h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-secondary/10 bg-white">
            <table className="w-full border-collapse text-right">
              <thead className="bg-secondary-container/20">
                <tr>
                  <th className="border-b border-secondary/10 px-6 py-4 text-sm font-medium text-secondary">
                    משתמש
                  </th>
                  <th className="border-b border-secondary/10 px-6 py-4 text-sm font-medium text-secondary">
                    אימייל
                  </th>
                  <th className="border-b border-secondary/10 px-6 py-4 text-sm font-medium text-secondary">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/5">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-primary-container/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-high">
                          <MaterialIcon name="person" className="text-secondary" />
                        </div>
                        <div className="font-bold">{user.full_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{user.email}</td>
                    <td className="px-6 py-4">
                      <UserActionForm userId={user.id} />
                    </td>
                  </tr>
                ))}
                {pendingUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-on-surface-variant">
                      אין משתמשים ממתינים
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-2xl font-semibold text-brand-deep">פריטים לאישור</h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-secondary/10 bg-white">
            <div className="divide-y divide-secondary/5">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-primary-container/20"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container">
                    <MaterialIcon name="inventory_2" className="text-secondary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{item.name}</div>
                    <ItemActionForm itemId={item.id} />
                  </div>
                </div>
              ))}
              {pendingItems.length === 0 && (
                <p className="p-6 text-center text-sm text-on-surface-variant">אין פריטים ממתינים</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { value: activeLoans.length, label: "השאלות פעילות" },
          { value: lateLoans.length, label: "באיחור" },
          { value: pendingUsers.length, label: "משתמשים ממתינים" },
          { value: pendingItems.length, label: "פריטים ממתינים" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center justify-center rounded-xl border border-secondary/5 bg-secondary/10 p-4 text-center"
          >
            <span className="font-headline text-2xl font-bold text-secondary">{stat.value}</span>
            <span className="text-sm text-secondary/60">{stat.label}</span>
          </div>
        ))}
      </section>

      {(activeLoans.length > 0 || lateLoans.length > 0) && (
        <section className="space-y-3">
          <h2 className="font-headline text-xl font-semibold text-brand-deep">מעקב השאלות</h2>
          {[...lateLoans, ...activeLoans].map((loan) => (
            <div
              key={loan.id}
              className="flex items-center justify-between rounded-xl border border-secondary/10 bg-white p-4 text-sm"
            >
              <span>{loan.borrow_request?.item?.name}</span>
              <StatusBadge status={loan.status} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
