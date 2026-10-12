import Link from "next/link";

import { AdminItemActions, AdminUserActions } from "@/components/ItemActions";
import { ItemThumbnail } from "@/components/ItemCard";
import { MaterialIcon } from "@/components/MaterialIcon";
import { StatusBadge } from "@/components/StatusBadge";
import type {
  AdminDashboard,
  EmailLogEntry,
  EmailLogType,
  LoanWithRelations,
  User,
} from "@/types/database";

const CARD = "overflow-hidden rounded-xl border border-secondary/10 bg-white";
const HEADING = "font-headline-sm text-headline-sm text-brand-deep";
const EMPTY = "p-6 text-center font-body-md text-on-surface-variant";

const EMAIL_TYPE_LABELS: Record<EmailLogType, string> = {
  request_created: "בקשת השאלה חדשה",
  request_approved: "בקשה אושרה",
  request_rejected: "בקשה נדחתה",
  user_approved: "משתמש אושר",
  item_approved: "פריט אושר",
  return_reminder: "תזכורת החזרה",
  loan_overdue: "השאלה באיחור",
  return_marked: "סומנה החזרה",
};

const EMAIL_STATUS: Record<EmailLogEntry["status"], { label: string; className: string }> = {
  sent: { label: "נשלח", className: "bg-primary-container text-on-primary-container" },
  failed: { label: "נכשל", className: "bg-error-container text-on-error-container" },
  skipped: { label: "דולג (אין מפתח)", className: "bg-surface-variant text-on-surface-variant" },
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(new Date(value));
}

function StatCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: string;
  label: string;
  value: number;
  tone?: "default" | "error";
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-secondary/10 bg-white p-5">
      <MaterialIcon name={icon} className={tone === "error" ? "text-error" : "text-secondary"} />
      <p className="font-label-md text-label-md text-secondary/70">{label}</p>
      <p
        className={`font-headline-md text-headline-md ${
          tone === "error" && value > 0 ? "text-error" : "text-brand-deep"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function UserRow({ user, currentAdminId }: { user: User; currentAdminId: string }) {
  const editable = user.role !== "admin" && user.id !== currentAdminId;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="font-bold text-brand-deep">
          {user.full_name}
          {user.role === "admin" && (
            <span className="mr-2 rounded bg-secondary/10 px-2 py-0.5 text-xs text-secondary">
              אדמין
            </span>
          )}
        </p>
        <p className="truncate text-sm text-on-surface-variant" dir="ltr">
          {user.email}
        </p>
        <p className="text-sm text-on-surface-variant">{user.residence_area}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={user.status} />
        {editable && <AdminUserActions userId={user.id} status={user.status} />}
      </div>
    </li>
  );
}

function LoanList({ loans, empty }: { loans: LoanWithRelations[]; empty: string }) {
  if (loans.length === 0) return <p className={EMPTY}>{empty}</p>;

  return (
    <ul className="divide-y divide-secondary/5">
      {loans.map((loan) => {
        const request = loan.borrow_request;
        return (
          <li key={loan.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <ItemThumbnail item={request?.item} className="h-12 w-12 rounded-lg" />
              <div className="min-w-0">
                <p className="truncate font-bold text-brand-deep">
                  {request?.item?.name ?? "פריט"}
                </p>
                <p className="text-sm text-on-surface-variant">
                  שואל/ת: {request?.requester?.full_name ?? "—"} · בעלים:{" "}
                  {request?.item?.owner?.full_name ?? "—"}
                </p>
                <p className="text-sm text-on-surface-variant">
                  {request?.start_date} – {request?.end_date} · {request?.requested_quantity} יח׳
                </p>
              </div>
            </div>
            <StatusBadge status={loan.status} />
          </li>
        );
      })}
    </ul>
  );
}

export function AdminPanel({
  dashboard,
  emailLog,
  currentAdminId,
}: {
  dashboard: AdminDashboard;
  emailLog: EmailLogEntry[];
  currentAdminId: string;
}) {
  const { pendingUsers, users, pendingItems, activeLoans, lateLoans } = dashboard;
  const members = users.filter((user) => user.status !== "pending");

  return (
    <div className="space-y-stack-lg">
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon="person_add" label="משתמשים ממתינים" value={pendingUsers.length} />
        <StatCard icon="inventory" label="פריטים לבדיקה" value={pendingItems.length} />
        <StatCard icon="swap_horiz" label="השאלות פעילות" value={activeLoans.length} />
        <StatCard icon="history" label="השאלות באיחור" value={lateLoans.length} tone="error" />
      </section>

      <section className="space-y-4">
        <h2 className={HEADING}>משתמשים חדשים לאישור</h2>
        <div className={CARD}>
          {pendingUsers.length === 0 ? (
            <p className={EMPTY}>אין משתמשים ממתינים</p>
          ) : (
            <ul className="divide-y divide-secondary/5">
              {pendingUsers.map((user) => (
                <UserRow key={user.id} user={user} currentAdminId={currentAdminId} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={HEADING}>פריטים לאישור</h2>
        <div className={CARD}>
          {pendingItems.length === 0 ? (
            <p className={EMPTY}>אין פריטים ממתינים</p>
          ) : (
            <ul className="divide-y divide-secondary/5">
              {pendingItems.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <Link href={`/items/${item.id}`} className="flex min-w-0 items-center gap-3">
                    <ItemThumbnail item={item} className="h-16 w-16 rounded-lg" />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-brand-deep">{item.name}</p>
                      <p className="text-sm text-on-surface-variant">
                        {item.category?.name ?? "ללא קטגוריה"} · {item.area} ·{" "}
                        {item.owner?.full_name ?? "—"}
                      </p>
                      <p className="text-sm text-secondary underline">צפייה בפרטים</p>
                    </div>
                  </Link>
                  <AdminItemActions itemId={item.id} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={HEADING}>השאלות באיחור</h2>
        <div className={CARD}>
          <LoanList loans={lateLoans} empty="אין השאלות באיחור" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={HEADING}>השאלות פעילות</h2>
        <div className={CARD}>
          <LoanList loans={activeLoans} empty="אין השאלות פעילות" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={HEADING}>ניהול משתמשים</h2>
        <div className={CARD}>
          {members.length === 0 ? (
            <p className={EMPTY}>אין משתמשים</p>
          ) : (
            <ul className="divide-y divide-secondary/5">
              {members.map((user) => (
                <UserRow key={user.id} user={user} currentAdminId={currentAdminId} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={HEADING}>יומן מיילים</h2>
        <p className="text-sm text-on-surface-variant">
          20 ההודעות האחרונות שהמערכת שלחה דרך Resend. היומן לא שומר את תוכן ההודעה או את הכתובת.
        </p>
        <div className={CARD}>
          {emailLog.length === 0 ? (
            <p className={EMPTY}>עדיין לא נשלחו מיילים</p>
          ) : (
            <ul className="divide-y divide-secondary/5">
              {emailLog.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-bold text-brand-deep">{EMAIL_TYPE_LABELS[entry.type]}</p>
                    <p className="text-sm text-on-surface-variant">
                      אל: {entry.recipient_name ?? "משתמש שנמחק"} · {formatDateTime(entry.sent_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${EMAIL_STATUS[entry.status].className}`}
                  >
                    {EMAIL_STATUS[entry.status].label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
