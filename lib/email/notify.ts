import "server-only";

import { isMockMode } from "@/lib/config";
import { type Recipient, sendEmail } from "@/lib/email/send";
import { formatDate } from "@/lib/email/template";
import { createAdminClient } from "@/lib/supabase/admin";

// Notifications are addressed to *other* members, whose e-mail addresses the
// acting user is not allowed to read. So the lookups here use the service
// role, on the server, after the action itself was authorised and completed.

type Party = Recipient & { full_name: string };

type RequestContext = {
  requestId: string;
  loanId: string | null;
  itemId: string;
  itemName: string;
  startDate: string;
  endDate: string;
  quantity: number;
  requester: Party;
  owner: Party;
};

type RequestRow = {
  id: string;
  start_date: string;
  end_date: string;
  requested_quantity: number;
  requester_id: string;
  item: { id: string; name: string; owner_id: string } | { id: string; name: string; owner_id: string }[] | null;
  loan: { id: string } | { id: string }[] | null;
};

const REQUEST_SELECT =
  "id, start_date, end_date, requested_quantity, requester_id, item:items(id, name, owner_id), loan:loans(id)";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function loadParties(ids: string[]): Promise<Map<string, Party>> {
  const { data } = await createAdminClient()
    .from("users")
    .select("id, email, full_name, status")
    .in("id", ids);

  const parties = new Map<string, Party>();
  for (const row of (data ?? []) as (Party & { status: string })[]) {
    // Blocked members get no mail from the community.
    if (row.status !== "blocked" && row.email) parties.set(row.id, row);
  }
  return parties;
}

async function toContexts(rows: RequestRow[]): Promise<RequestContext[]> {
  const ids = new Set<string>();
  for (const row of rows) {
    const item = one(row.item);
    ids.add(row.requester_id);
    if (item) ids.add(item.owner_id);
  }
  const parties = await loadParties([...ids]);

  return rows.flatMap((row) => {
    const item = one(row.item);
    const requester = parties.get(row.requester_id);
    const owner = item ? parties.get(item.owner_id) : undefined;
    if (!item || !requester || !owner) return [];
    return [
      {
        requestId: row.id,
        loanId: one(row.loan)?.id ?? null,
        itemId: item.id,
        itemName: item.name,
        startDate: row.start_date,
        endDate: row.end_date,
        quantity: row.requested_quantity,
        requester,
        owner,
      },
    ];
  });
}

async function loadRequest(requestId: string): Promise<RequestContext | null> {
  const { data } = await createAdminClient()
    .from("borrow_requests")
    .select(REQUEST_SELECT)
    .eq("id", requestId)
    .maybeSingle();
  if (!data) return null;
  const [context] = await toContexts([data as RequestRow]);
  return context ?? null;
}

/** Requests whose loan is in the given state, narrowed by a date rule. */
async function loadOpenLoans(
  loanStatus: "active" | "late",
  keep: (row: RequestRow) => boolean,
): Promise<RequestContext[]> {
  const admin = createAdminClient();
  const { data: loans } = await admin
    .from("loans")
    .select("borrow_request_id")
    .eq("status", loanStatus)
    .limit(500);
  const requestIds = ((loans ?? []) as { borrow_request_id: string }[]).map(
    (loan) => loan.borrow_request_id,
  );
  if (requestIds.length === 0) return [];

  const { data } = await admin.from("borrow_requests").select(REQUEST_SELECT).in("id", requestIds);
  return toContexts(((data ?? []) as RequestRow[]).filter(keep));
}

function dates(context: RequestContext): string {
  return `${formatDate(context.startDate)} – ${formatDate(context.endDate)}`;
}

/** Runs a notification and swallows any failure: mail never breaks the action. */
async function quietly(task: () => Promise<unknown>): Promise<void> {
  if (isMockMode()) return;
  try {
    await task();
  } catch (error) {
    console.error(
      "[community-share] notification failed",
      error instanceof Error ? error.name : "unknown",
    );
  }
}

// 1. New borrow request -> item owner.
export function notifyRequestCreated(requestId: string): Promise<void> {
  return quietly(async () => {
    const context = await loadRequest(requestId);
    if (!context) return;
    await sendEmail({
      type: "request_created",
      recipient: context.owner,
      relatedId: requestId,
      content: {
        subject: `בקשת השאלה חדשה: ${context.itemName}`,
        heading: "קיבלת בקשת השאלה חדשה",
        lines: [
          `שלום ${context.owner.full_name},`,
          `${context.requester.full_name} מבקש/ת לשאול את "${context.itemName}" (כמות: ${context.quantity}) לתאריכים ${dates(context)}.`,
          "אפשר לאשר או לדחות את הבקשה בעמוד הפריטים שלך.",
        ],
        cta: { label: "לצפייה בבקשה", path: "/my-items" },
      },
    });
  });
}

// 2. Request approved / rejected -> borrower.
export function notifyRequestDecision(requestId: string, approved: boolean): Promise<void> {
  return quietly(async () => {
    const context = await loadRequest(requestId);
    if (!context) return;
    await sendEmail({
      type: approved ? "request_approved" : "request_rejected",
      recipient: context.requester,
      relatedId: requestId,
      content: approved
        ? {
            subject: `הבקשה אושרה: ${context.itemName}`,
            heading: "בקשת ההשאלה שלך אושרה",
            lines: [
              `שלום ${context.requester.full_name},`,
              `${context.owner.full_name} אישר/ה את בקשתך לשאול את "${context.itemName}" לתאריכים ${dates(context)}.`,
              "פרטי הקשר של בעל/ת הפריט מופיעים בעמוד ההשאלות שלך, לתיאום האיסוף.",
            ],
            cta: { label: "להשאלות שלי", path: "/my-loans?tab=active" },
          }
        : {
            subject: `הבקשה נדחתה: ${context.itemName}`,
            heading: "בקשת ההשאלה שלך נדחתה",
            lines: [
              `שלום ${context.requester.full_name},`,
              `לצערנו הבקשה לשאול את "${context.itemName}" לתאריכים ${dates(context)} לא אושרה.`,
              "אפשר לחפש פריט דומה בקטלוג או לנסות תאריכים אחרים.",
            ],
            cta: { label: "לקטלוג", path: "/catalog" },
          },
    });
  });
}

// 3. Member approved by an admin -> the member.
export function notifyUserApproved(userId: string): Promise<void> {
  return quietly(async () => {
    const user = (await loadParties([userId])).get(userId);
    if (!user) return;
    await sendEmail({
      type: "user_approved",
      recipient: user,
      relatedId: userId,
      content: {
        subject: "ברוך הבא לקהילה! החשבון שלך אושר",
        heading: "ברוך הבא לקהילה",
        lines: [
          `שלום ${user.full_name},`,
          "החשבון שלך אושר על ידי מנהל הקהילה. מעכשיו אפשר לחפש ציוד בקטלוג, לבקש השאלות ולשתף פריטים משלך.",
        ],
        cta: { label: "כניסה לאתר", path: "/" },
      },
    });
  });
}

// 4. Item approved by an admin -> item owner.
export function notifyItemApproved(itemId: string): Promise<void> {
  return quietly(async () => {
    const { data } = await createAdminClient()
      .from("items")
      .select("id, name, owner_id")
      .eq("id", itemId)
      .maybeSingle();
    const item = data as { id: string; name: string; owner_id: string } | null;
    if (!item) return;
    const owner = (await loadParties([item.owner_id])).get(item.owner_id);
    if (!owner) return;
    await sendEmail({
      type: "item_approved",
      recipient: owner,
      relatedId: itemId,
      content: {
        subject: `הפריט אושר: ${item.name}`,
        heading: "הפריט שלך אושר ופורסם",
        lines: [
          `שלום ${owner.full_name},`,
          `הפריט "${item.name}" אושר ומופיע עכשיו בקטלוג הקהילה. תקבל/י הודעה כשמישהו יבקש לשאול אותו.`,
        ],
        cta: { label: "לצפייה בפריט", path: `/items/${item.id}` },
      },
    });
  });
}

// 7. Borrower marked the item as returned -> item owner.
export function notifyReturnMarked(loanId: string): Promise<void> {
  return quietly(async () => {
    const { data } = await createAdminClient()
      .from("loans")
      .select("borrow_request_id")
      .eq("id", loanId)
      .maybeSingle();
    const requestId = (data as { borrow_request_id: string } | null)?.borrow_request_id;
    const context = requestId ? await loadRequest(requestId) : null;
    if (!context) return;
    await sendEmail({
      type: "return_marked",
      recipient: context.owner,
      relatedId: loanId,
      content: {
        subject: `נא לאשר החזרה: ${context.itemName}`,
        heading: "פריט סומן כהוחזר",
        lines: [
          `שלום ${context.owner.full_name},`,
          `${context.requester.full_name} סימן/ה שהחזיר/ה את "${context.itemName}".`,
          "אם הפריט חזר אליך תקין, נא לאשר את ההחזרה כדי לסגור את ההשאלה ולשחרר את המלאי.",
        ],
        cta: { label: "לאישור ההחזרה", path: "/my-items" },
      },
    });
  });
}

export type DailyJobResult = {
  newlyLate: number;
  reminders: number;
  overdueNotices: number;
};

/**
 * 5 + 6. The daily job: flags overdue loans, reminds borrowers one day before
 * the due date, and tells both sides about overdue loans. Each message goes
 * out once per loan and recipient, however often the job runs.
 */
export async function runDailyNotifications(today: string, tomorrow: string): Promise<DailyJobResult> {
  const admin = createAdminClient();
  const result: DailyJobResult = { newlyLate: 0, reminders: 0, overdueNotices: 0 };

  const late = await admin.rpc("cron_mark_late_loans");
  if (late.error) throw new Error("cron_mark_late_loans failed");
  result.newlyLate = ((late.data ?? []) as string[]).length;

  // The in-app twin of the reminder e-mail below. Overdue notices need no call
  // here: the database writes them when a loan turns late.
  const reminders = await admin.rpc("cron_create_return_reminders");
  if (reminders.error) {
    console.error("[community-share] in-app reminders failed", reminders.error.message);
  }

  for (const context of await loadOpenLoans("active", (row) => row.end_date === tomorrow)) {
    if (!context.loanId) continue;
    const outcome = await sendEmail({
      type: "return_reminder",
      recipient: context.requester,
      relatedId: context.loanId,
      once: true,
      content: {
        subject: `תזכורת: להחזיר מחר את ${context.itemName}`,
        heading: "מחר מועד ההחזרה",
        lines: [
          `שלום ${context.requester.full_name},`,
          `תזכורת ידידותית: מחר (${formatDate(context.endDate)}) צריך להחזיר את "${context.itemName}" ל${context.owner.full_name}.`,
          "אחרי ההחזרה, נא לסמן באתר \"סימנתי שהחזרתי\".",
        ],
        cta: { label: "להשאלות שלי", path: "/my-loans?tab=active" },
      },
    });
    if (outcome === "sent") result.reminders += 1;
  }

  for (const context of await loadOpenLoans("late", (row) => row.end_date < today)) {
    if (!context.loanId) continue;
    const toBorrower = await sendEmail({
      type: "loan_overdue",
      recipient: context.requester,
      relatedId: context.loanId,
      once: true,
      content: {
        subject: `באיחור: יש להחזיר את ${context.itemName}`,
        heading: "מועד ההחזרה עבר",
        lines: [
          `שלום ${context.requester.full_name},`,
          `מועד ההחזרה של "${context.itemName}" היה ב-${formatDate(context.endDate)}. נא להחזיר את הפריט ל${context.owner.full_name} בהקדם ולסמן זאת באתר.`,
        ],
        cta: { label: "להשאלות שלי", path: "/my-loans?tab=late" },
      },
    });
    const toOwner = await sendEmail({
      type: "loan_overdue",
      recipient: context.owner,
      relatedId: context.loanId,
      once: true,
      content: {
        subject: `פריט באיחור: ${context.itemName}`,
        heading: "פריט שלך לא הוחזר בזמן",
        lines: [
          `שלום ${context.owner.full_name},`,
          `הפריט "${context.itemName}" שהושאל ל${context.requester.full_name} היה אמור לחזור ב-${formatDate(context.endDate)} ועדיין לא סומן כהוחזר.`,
          "שלחנו לשואל/ת תזכורת. פרטי הקשר מופיעים בעמוד הפריטים שלך.",
        ],
        cta: { label: "לפריטים שלי", path: "/my-items" },
      },
    });
    result.overdueNotices += [toBorrower, toOwner].filter((outcome) => outcome === "sent").length;
  }

  return result;
}
