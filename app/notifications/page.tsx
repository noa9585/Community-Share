import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
import { MaterialIcon } from "@/components/MaterialIcon";
import {
  markAllNotificationsReadAction,
  openNotificationAction,
} from "@/lib/actions/notifications";
import { requirePageUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "התראות | שיתוף קהילתי",
};

const ICONS: Record<string, string> = {
  request_created: "inbox",
  request_approved: "check_circle",
  request_rejected: "cancel",
  request_cancelled: "undo",
  return_marked: "assignment_return",
  loan_completed: "task_alt",
  loan_closed_by_admin: "admin_panel_settings",
  return_reminder: "schedule",
  loan_overdue: "warning",
  new_message: "chat",
  user_approved: "celebration",
  item_approved: "inventory",
  item_rejected: "block",
  user_pending: "person_add",
  item_pending: "inventory",
  report_created: "flag",
  report_updated: "flag",
};

const dateFormat = new Intl.DateTimeFormat("he-IL", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Jerusalem",
});

export default async function NotificationsPage() {
  const user = await requirePageUser();
  const repo = await getRepository();
  const notifications = await repo.getNotifications(user.id, 50);
  const hasUnread = notifications.some((notification) => !notification.read_at);

  return (
    <AppNav user={user} activePath="/notifications" headerTitle="התראות">
      <div className="mx-auto max-w-3xl">
        <div className="mb-stack-md flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-headline-md text-headline-md-mobile text-brand-deep md:text-headline-md">
            התראות
          </h1>
          {hasUnread && (
            <form action={markAllNotificationsReadAction}>
              <button
                type="submit"
                className="rounded-lg border border-secondary/40 px-4 py-2 text-sm font-medium text-secondary hover:bg-secondary/5"
              >
                סימון הכול כנקרא
              </button>
            </form>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="rounded-xl border border-secondary/10 bg-white/70 p-10 text-center text-on-surface-variant">
            אין התראות. נעדכן אותך כאן על בקשות, אישורים, תזכורות והודעות חדשות.
          </p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((notification) => {
              const unread = !notification.read_at;
              return (
                <li key={notification.id}>
                  <form action={openNotificationAction}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <button
                      type="submit"
                      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-right transition-colors hover:bg-white ${
                        unread
                          ? "border-brand-mint bg-white"
                          : "border-secondary/10 bg-white/60"
                      }`}
                    >
                      <MaterialIcon
                        name={ICONS[notification.type] ?? "notifications"}
                        className={notification.type === "loan_overdue" ? "text-error" : "text-secondary"}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-brand-deep ${unread ? "font-bold" : "font-medium"}`}
                        >
                          {notification.title}
                        </span>
                        {notification.body && (
                          <span className="block break-words text-sm text-on-surface-variant">
                            {notification.body}
                          </span>
                        )}
                        <span className="mt-1 block text-xs text-on-surface-variant" dir="ltr">
                          {dateFormat.format(new Date(notification.created_at))}
                        </span>
                      </span>
                      {unread && (
                        <span
                          className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-error"
                          aria-label="לא נקרא"
                        />
                      )}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppNav>
  );
}
