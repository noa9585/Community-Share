import Link from "next/link";

import {
  AdminItemActions,
  AdminLoanActions,
  AdminReportActions,
  AdminUserActions,
} from "@/components/ItemActions";
import { ItemThumbnail } from "@/components/ItemCard";
import { AdminTaxonomy } from "@/components/AdminTaxonomy";
import { MaterialIcon } from "@/components/MaterialIcon";
import { ReportStatusBadge, StatusBadge } from "@/components/StatusBadge";
import { CountBadge } from "@/components/TopAppBar";
import { REPORT_REASONS } from "@/lib/validation/schemas";
import type {
  AdminDashboard,
  Area,
  AuditLogEntry,
  Category,
  EmailLogEntry,
  EmailLogType,
  LoanWithRelations,
  ReportWithRelations,
  TaxonomyUsage,
  User,
} from "@/types/database";

const CARD = "overflow-hidden rounded-xl border border-secondary/10 bg-white";
const HEADING = "font-headline-sm text-headline-sm text-brand-deep";
const EMPTY = "p-6 text-center font-body-md text-on-surface-variant";

export const ADMIN_TABS = [
  { key: "overview", label: "סקירה" },
  { key: "users", label: "משתמשים" },
  { key: "items", label: "פריטים" },
  { key: "loans", label: "השאלות" },
  { key: "reports", label: "דיווחים" },
  { key: "settings", label: "קטגוריות ואזורים" },
  { key: "log", label: "יומנים" },
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number]["key"];

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

const AUDIT_LABELS: Record<string, string> = {
  user_approve: "אישור משתמש",
  user_block: "חסימת משתמש",
  user_unblock: "שחרור חסימה",
  item_approve: "אישור פריט",
  item_reject: "דחיית פריט / הסרה מהקטלוג",
  loan_force_close: "סגירת השאלה במקום הבעלים",
  report_in_progress: "דיווח הועבר לטיפול",
  report_resolved: "דיווח סומן כטופל",
  report_dismissed: "דיווח נסגר ללא פעולה",
  category_create: "הוספת קטגוריה",
  category_update: "עריכת קטגוריה",
  category_delete: "מחיקת קטגוריה",
  area_create: "הוספת אזור",
  area_update: "עריכת אזור",
  area_delete: "מחיקת אזור",
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
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={loan.status} />
              <AdminLoanActions loanId={loan.id} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ReportCard({
  report,
  currentAdminId,
}: {
  report: ReportWithRelations;
  currentAdminId: string;
}) {
  const canBlock =
    report.reported_user_id &&
    report.reported_user_id !== currentAdminId &&
    report.reported_user_status === "approved";

  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-brand-deep">
            {report.target_type === "item" ? "פריט: " : "משתמש/ת: "}
            {report.item_id ? (
              <Link href={`/items/${report.item_id}`} className="underline">
                {report.target_label}
              </Link>
            ) : (
              report.target_label
            )}
          </p>
          <p className="text-sm text-on-surface-variant">
            {REPORT_REASONS[report.reason]} · דווח על ידי {report.reporter_name ?? "משתמש שנמחק"} ·{" "}
            {formatDateTime(report.created_at)}
          </p>
          {report.target_type === "item" && report.reported_user_name && (
            <p className="text-sm text-on-surface-variant">
              בעל/ת הפריט: {report.reported_user_name}
            </p>
          )}
        </div>
        <ReportStatusBadge status={report.status} />
      </div>

      <p className="whitespace-pre-line break-words rounded-lg bg-surface-container-low p-3 text-sm text-on-surface">
        {report.details}
      </p>

      <AdminReportActions reportId={report.id} status={report.status} note={report.admin_note} />

      {(canBlock || (report.item_id && report.target_type === "item")) && (
        <div className="flex flex-wrap items-center gap-3 border-t border-secondary/5 pt-3">
          <span className="text-sm font-bold text-secondary">פעולות על מושא הדיווח:</span>
          {report.item_id && report.target_type === "item" && (
            <AdminItemActions itemId={report.item_id} status="approved" />
          )}
          {canBlock && report.reported_user_id && (
            <AdminUserActions userId={report.reported_user_id} status="approved" />
          )}
        </div>
      )}
    </li>
  );
}

function AuditList({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) return <p className={EMPTY}>עדיין לא בוצעו פעולות ניהול</p>;

  return (
    <ul className="divide-y divide-secondary/5">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="font-bold text-brand-deep">{AUDIT_LABELS[entry.action] ?? entry.action}</p>
          <p className="text-sm text-on-surface-variant">
            {entry.admin_name ?? "אדמין שנמחק"} · {formatDateTime(entry.created_at)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function AdminPanel({
  dashboard,
  emailLog,
  currentAdminId,
  tab,
  taxonomy,
}: {
  dashboard: AdminDashboard;
  emailLog: EmailLogEntry[];
  currentAdminId: string;
  tab: AdminTab;
  /** Loaded only for the settings tab. */
  taxonomy?: { categories: Category[]; areas: Area[]; usage: TaxonomyUsage };
}) {
  const { pendingUsers, users, pendingItems, items, activeLoans, lateLoans, reports, stats } =
    dashboard;
  const members = users.filter((user) => user.status !== "pending");
  const openReports = reports.filter(
    (report) => report.status === "open" || report.status === "in_progress",
  );
  const closedReports = reports.filter(
    (report) => report.status === "resolved" || report.status === "dismissed",
  );
  const reviewedItems = items.filter((item) => item.approval_status !== "pending");
  const mostLoans = Math.max(1, ...stats.topItems.map((item) => item.loans));

  const waiting: Record<AdminTab, number> = {
    overview: 0,
    users: pendingUsers.length,
    items: pendingItems.length,
    loans: lateLoans.length,
    reports: openReports.length,
    settings: 0,
    log: 0,
  };

  return (
    <div className="space-y-stack-lg">
      <nav
        aria-label="אזורי הניהול"
        className="flex gap-1 overflow-x-auto rounded-lg border border-outline-variant/30 bg-surface-container p-1"
      >
        {ADMIN_TABS.map((entry) => (
          <Link
            key={entry.key}
            href={`/admin?tab=${entry.key}`}
            aria-current={tab === entry.key ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-md px-4 py-2 font-label-md text-label-md transition-all ${
              tab === entry.key
                ? "bg-white text-secondary shadow-sm"
                : "text-on-surface-variant hover:bg-white/50"
            }`}
          >
            {entry.label}
            <CountBadge count={waiting[entry.key]} />
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <>
          <section className="space-y-4">
            <h2 className={HEADING}>ממתין לטיפול</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard icon="person_add" label="משתמשים לאישור" value={pendingUsers.length} />
              <StatCard icon="inventory" label="פריטים לבדיקה" value={pendingItems.length} />
              <StatCard icon="history" label="השאלות באיחור" value={stats.loans.late} tone="error" />
              <StatCard icon="flag" label="דיווחים פתוחים" value={stats.openReports} tone="error" />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className={HEADING}>הקהילה במספרים</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard icon="groups" label="חברים פעילים" value={stats.users.approved} />
              <StatCard icon="inventory_2" label="פריטים בקטלוג" value={stats.items.approved} />
              <StatCard
                icon="swap_horiz"
                label="השאלות פתוחות"
                value={stats.loans.active + stats.loans.awaiting + stats.loans.late}
              />
              <StatCard icon="task_alt" label="השאלות שהסתיימו" value={stats.loans.completed} />
              <StatCard icon="inbox" label="בקשות השאלה (סה״כ)" value={stats.requests.total} />
              <StatCard icon="pending_actions" label="בקשות ממתינות" value={stats.requests.pending} />
              <StatCard icon="chat" label="הודעות צ'אט" value={stats.messages} />
              <StatCard icon="block" label="משתמשים חסומים" value={stats.users.blocked} />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className={HEADING}>הפריטים המושאלים ביותר</h2>
            <div className={CARD}>
              {stats.topItems.length === 0 ? (
                <p className={EMPTY}>עדיין אין השאלות</p>
              ) : (
                <ol className="divide-y divide-secondary/5">
                  {stats.topItems.map((item, index) => (
                    <li key={`${item.name}-${index}`} className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-bold text-brand-deep">{item.name}</span>
                        <span className="shrink-0 text-sm text-on-surface-variant">
                          {item.loans} השאלות
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className="h-full rounded-full bg-brand-mint"
                          style={{ width: `${(item.loans / mostLoans) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </>
      )}

      {tab === "users" && (
        <>
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
        </>
      )}

      {tab === "items" && (
        <>
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
                      <AdminItemActions itemId={item.id} status="pending" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className={HEADING}>כל הפריטים</h2>
            <p className="text-sm text-on-surface-variant">
              הסרה מהקטלוג מסתירה את הפריט מהחברים ושולחת לבעלים התראה. השאלות קיימות אינן מושפעות.
            </p>
            <div className={CARD}>
              {reviewedItems.length === 0 ? (
                <p className={EMPTY}>אין פריטים</p>
              ) : (
                <ul className="divide-y divide-secondary/5">
                  {reviewedItems.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <Link href={`/items/${item.id}`} className="flex min-w-0 items-center gap-3">
                        <ItemThumbnail item={item} className="h-12 w-12 rounded-lg" />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-brand-deep">{item.name}</p>
                          <p className="text-sm text-on-surface-variant">
                            {item.owner?.full_name ?? "—"} · {item.available_quantity} פנויים מתוך{" "}
                            {item.total_quantity}
                          </p>
                        </div>
                      </Link>
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={item.approval_status} />
                        <AdminItemActions itemId={item.id} status={item.approval_status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      {tab === "loans" && (
        <>
          <p className="text-sm text-on-surface-variant">
            בדרך כלל בעל הפריט סוגר את ההשאלה. &quot;סגירת השאלה&quot; מיועדת למקרה שהפריט חזר
            והבעלים לא מעדכן: היא משחררת את המלאי, מודיעה לשני הצדדים ונרשמת ביומן.
          </p>
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
        </>
      )}

      {tab === "reports" && (
        <>
          <section className="space-y-4">
            <h2 className={HEADING}>דיווחים לטיפול</h2>
            <div className={CARD}>
              {openReports.length === 0 ? (
                <p className={EMPTY}>אין דיווחים פתוחים</p>
              ) : (
                <ul className="divide-y divide-secondary/10">
                  {openReports.map((report) => (
                    <ReportCard key={report.id} report={report} currentAdminId={currentAdminId} />
                  ))}
                </ul>
              )}
            </div>
          </section>

          {closedReports.length > 0 && (
            <section className="space-y-4">
              <h2 className={HEADING}>דיווחים שנסגרו</h2>
              <div className={CARD}>
                <ul className="divide-y divide-secondary/10">
                  {closedReports.map((report) => (
                    <ReportCard key={report.id} report={report} currentAdminId={currentAdminId} />
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}

      {tab === "settings" && taxonomy && <AdminTaxonomy {...taxonomy} />}

      {tab === "log" && (
        <>
          <section className="space-y-4">
            <h2 className={HEADING}>יומן פעולות אדמין</h2>
            <p className="text-sm text-on-surface-variant">30 הפעולות האחרונות של מנהלי הקהילה.</p>
            <div className={CARD}>
              <AuditList entries={dashboard.auditLog} />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className={HEADING}>יומן מיילים</h2>
            <p className="text-sm text-on-surface-variant">
              20 ההודעות האחרונות שהמערכת שלחה דרך Resend. היומן לא שומר את תוכן ההודעה או את
              הכתובת.
            </p>
            <div className={CARD}>
              {emailLog.length === 0 ? (
                <p className={EMPTY}>עדיין לא נשלחו מיילים</p>
              ) : (
                <ul className="divide-y divide-secondary/5">
                  {emailLog.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-brand-deep">{EMAIL_TYPE_LABELS[entry.type]}</p>
                        <p className="text-sm text-on-surface-variant">
                          אל: {entry.recipient_name ?? "משתמש שנמחק"} ·{" "}
                          {formatDateTime(entry.sent_at)}
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
        </>
      )}
    </div>
  );
}
