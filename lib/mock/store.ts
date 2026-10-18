import { AppError } from "@/lib/errors";
import { DEFAULT_AREAS, todayInIsrael } from "@/lib/validation/schemas";
import type {
  AppNotification,
  ApprovalStatus,
  Area,
  BorrowRequest,
  Category,
  ChatMessage,
  Item,
  ItemImage,
  Loan,
  Report,
  User,
  UserStatus,
} from "@/types/database";

import { DEMO_USERS } from "@/lib/mock/users";
import {
  SEED_BORROW_REQUESTS,
  SEED_CATEGORIES,
  SEED_ITEM_IMAGES,
  SEED_ITEMS,
  SEED_LOANS,
} from "@/lib/mock/seed";

// In-memory stand-in for the database, used only when USE_MOCK_DATA=true.
// It mirrors the rules of supabase/migrations/003_functions.sql.

export type MockConversation = {
  id: string;
  item_id: string;
  owner_id: string;
  member_id: string;
  owner_last_read_at: string;
  member_last_read_at: string;
  last_message_at: string;
  created_at: string;
};

export type MockNotification = AppNotification & { user_id: string; related_id: string };

export type MockAuditEntry = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  created_at: string;
};

export interface MockState {
  users: User[];
  areas: Area[];
  categories: Category[];
  items: Item[];
  itemImages: ItemImage[];
  borrowRequests: BorrowRequest[];
  loans: Loan[];
  conversations: MockConversation[];
  messages: ChatMessage[];
  notifications: MockNotification[];
  reports: Report[];
  auditLog: MockAuditEntry[];
}

function cloneSeed(): MockState {
  return {
    // Demo users carry a button label for the login screen; the store keeps only the user.
    users: DEMO_USERS.map(({ id, full_name, email, residence_area, role, status, created_at }) => ({
      id,
      full_name,
      email,
      residence_area,
      role,
      status,
      created_at,
    })),
    areas: DEFAULT_AREAS.map((name) => ({ id: crypto.randomUUID(), name })),
    categories: SEED_CATEGORIES.map((c) => ({ ...c })),
    items: SEED_ITEMS.map((i) => ({ ...i })),
    itemImages: SEED_ITEM_IMAGES.map((img) => ({ ...img })),
    borrowRequests: SEED_BORROW_REQUESTS.map((br) => ({ ...br })),
    loans: SEED_LOANS.map((l) => ({ ...l })),
    conversations: [],
    messages: [],
    notifications: [],
    reports: [],
    auditLog: [],
  };
}

const state: MockState = cloneSeed();

export function getMockState(): MockState {
  return state;
}

export function createId(): string {
  return crypto.randomUUID();
}

function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  const current = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (current <= last && days.length <= 366) {
    days.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

/** Open loans of an item, with the end date pushed to today while not yet returned. */
export function openBookings(itemId: string) {
  const today = todayInIsrael();
  return state.borrowRequests.flatMap((request) => {
    if (request.item_id !== itemId || request.status !== "approved") return [];
    const loan = state.loans.find((l) => l.borrow_request_id === request.id);
    if (!loan || loan.status === "completed") return [];
    return [
      {
        start_date: request.start_date,
        end_date: request.end_date > today ? request.end_date : today,
        requested_quantity: request.requested_quantity,
      },
    ];
  });
}

export function checkItemAvailability(
  itemId: string,
  startDate: string,
  endDate: string,
  quantity: number,
): boolean {
  const item = state.items.find((i) => i.id === itemId && i.approval_status === "approved");
  if (!item || quantity < 1 || startDate > endDate) return false;

  const bookings = openBookings(itemId);
  let maxBooked = 0;
  for (const day of eachDay(startDate, endDate)) {
    const booked = bookings
      .filter((b) => b.start_date <= day && day <= b.end_date)
      .reduce((sum, b) => sum + b.requested_quantity, 0);
    maxBooked = Math.max(maxBooked, booked);
  }

  return item.total_quantity - maxBooked >= quantity;
}

export function updateUserStatus(userId: string, status: UserStatus): void {
  const user = state.users.find((u) => u.id === userId);
  if (!user) throw new AppError("NOT_FOUND");
  if (user.role === "admin") throw new AppError("CANNOT_MODIFY_ADMIN");
  user.status = status;
}

export function updateItemApproval(itemId: string, approvalStatus: ApprovalStatus): void {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) throw new AppError("NOT_FOUND");
  const changed = item.approval_status !== approvalStatus;
  item.approval_status = approvalStatus;
  if (changed) afterItemApprovalChange(item);
}

export function insertItem(item: Item, images: ItemImage[]): void {
  state.items.push(item);
  state.itemImages.push(...images);
  afterItemApprovalChange(item);
}

export function deleteItem(itemId: string): void {
  const requestIds = state.borrowRequests
    .filter((br) => br.item_id === itemId)
    .map((br) => br.id);
  const onLoan = state.loans.some(
    (l) => requestIds.includes(l.borrow_request_id) && l.status !== "completed",
  );
  if (onLoan) throw new AppError("ITEM_ON_LOAN");

  state.items = state.items.filter((i) => i.id !== itemId);
  state.itemImages = state.itemImages.filter((img) => img.item_id !== itemId);
  state.borrowRequests = state.borrowRequests.filter((br) => br.item_id !== itemId);
  state.loans = state.loans.filter((l) => !requestIds.includes(l.borrow_request_id));

  const conversationIds = state.conversations.filter((c) => c.item_id === itemId).map((c) => c.id);
  state.conversations = state.conversations.filter((c) => c.item_id !== itemId);
  state.messages = state.messages.filter((m) => !conversationIds.includes(m.conversation_id));
}

export function insertBorrowRequest(request: BorrowRequest): void {
  const item = state.items.find(
    (i) => i.id === request.item_id && i.approval_status === "approved",
  );
  if (!item) throw new AppError("NOT_FOUND");
  if (item.owner_id === request.requester_id) throw new AppError("OWN_ITEM");
  if (
    !checkItemAvailability(
      request.item_id,
      request.start_date,
      request.end_date,
      request.requested_quantity,
    )
  ) {
    throw new AppError("NOT_AVAILABLE");
  }
  state.borrowRequests.push(request);
  afterRequestChange(request, "created");
}

function ownedPendingRequest(requestId: string, ownerId: string): BorrowRequest {
  const request = state.borrowRequests.find((br) => br.id === requestId);
  const item = request ? state.items.find((i) => i.id === request.item_id) : undefined;
  if (!request || !item || item.owner_id !== ownerId) throw new AppError("FORBIDDEN");
  if (request.status !== "pending") throw new AppError("NOT_PENDING");
  return request;
}

export function approveBorrowRequest(requestId: string, ownerId: string): void {
  const request = ownedPendingRequest(requestId, ownerId);
  if (
    !checkItemAvailability(
      request.item_id,
      request.start_date,
      request.end_date,
      request.requested_quantity,
    )
  ) {
    throw new AppError("NOT_AVAILABLE");
  }
  request.status = "approved";
  const item = state.items.find((i) => i.id === request.item_id);
  if (item) {
    item.available_quantity = Math.max(0, item.available_quantity - request.requested_quantity);
  }
  state.loans.push({
    id: createId(),
    borrow_request_id: requestId,
    status: "active",
    actual_return_date: null,
    deposit_received: false,
    created_at: new Date().toISOString(),
  });
  afterRequestChange(request, "approved");
}

export function rejectBorrowRequest(requestId: string, ownerId: string): void {
  const request = ownedPendingRequest(requestId, ownerId);
  request.status = "rejected";
  afterRequestChange(request, "rejected");
}

export function cancelBorrowRequest(requestId: string, requesterId: string): void {
  const request = state.borrowRequests.find((br) => br.id === requestId);
  if (!request || request.requester_id !== requesterId || request.status !== "pending") {
    throw new AppError("NOT_PENDING");
  }
  request.status = "cancelled";
  afterRequestChange(request, "cancelled");
}

function loanWithParties(loanId: string) {
  const loan = state.loans.find((l) => l.id === loanId);
  const request = loan
    ? state.borrowRequests.find((br) => br.id === loan.borrow_request_id)
    : undefined;
  const item = request ? state.items.find((i) => i.id === request.item_id) : undefined;
  if (!loan || !request || !item) throw new AppError("LOAN_STATE");
  return { loan, request, item };
}

export function markLoanReturned(loanId: string, requesterId: string): void {
  const { loan, request } = loanWithParties(loanId);
  if (!["active", "late"].includes(loan.status)) throw new AppError("LOAN_STATE");
  if (request.requester_id !== requesterId) throw new AppError("FORBIDDEN");
  loan.status = "returned_pending_confirmation";
  loan.actual_return_date = todayInIsrael();
  afterLoanChange(loan);
}

export function confirmLoanReturn(loanId: string, ownerId: string): void {
  const { loan, request, item } = loanWithParties(loanId);
  if (loan.status === "completed") throw new AppError("LOAN_STATE");
  if (item.owner_id !== ownerId) throw new AppError("FORBIDDEN");
  loan.status = "completed";
  loan.actual_return_date ??= todayInIsrael();
  item.available_quantity = Math.min(
    item.total_quantity,
    item.available_quantity + request.requested_quantity,
  );
  afterLoanChange(loan);
}

export function markDepositReceived(loanId: string, ownerId: string): void {
  const { loan, item } = loanWithParties(loanId);
  if (item.owner_id !== ownerId || loan.status === "completed") throw new AppError("FORBIDDEN");
  loan.deposit_received = true;
}

export function markLateLoans(): number {
  const today = todayInIsrael();
  let count = 0;
  for (const loan of state.loans) {
    if (loan.status !== "active") continue;
    const request = state.borrowRequests.find((br) => br.id === loan.borrow_request_id);
    if (request && request.end_date < today) {
      loan.status = "late";
      afterLoanChange(loan);
      count += 1;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Notifications, chat and reports. These mirror the triggers and functions of
// supabase/migrations/006_chat_notifications_reports.sql.
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function pushNotification(
  userId: string | undefined,
  type: string,
  title: string,
  body: string,
  link: string,
  relatedId: string,
): void {
  if (!userId) return;
  state.notifications.push({
    id: createId(),
    user_id: userId,
    related_id: relatedId,
    type,
    title,
    body: body.slice(0, 300),
    link,
    read_at: null,
    created_at: nowIso(),
  });
}

export function notifyAdmins(
  type: string,
  title: string,
  body: string,
  link: string,
  relatedId: string,
): void {
  for (const user of state.users) {
    if (user.role === "admin" && user.status === "approved") {
      pushNotification(user.id, type, title, body, link, relatedId);
    }
  }
}

export function ensureConversation(itemId: string, memberId: string): MockConversation | null {
  const item = state.items.find((i) => i.id === itemId);
  if (!item || item.owner_id === memberId) return null;

  const existing = state.conversations.find(
    (c) => c.item_id === itemId && c.member_id === memberId,
  );
  if (existing) return existing;

  const now = nowIso();
  const conversation: MockConversation = {
    id: createId(),
    item_id: itemId,
    owner_id: item.owner_id,
    member_id: memberId,
    owner_last_read_at: now,
    member_last_read_at: now,
    last_message_at: now,
    created_at: now,
  };
  state.conversations.push(conversation);
  return conversation;
}

function postSystemMessage(itemId: string, memberId: string, body: string): void {
  const conversation = ensureConversation(itemId, memberId);
  if (!conversation) return;
  const now = nowIso();
  conversation.last_message_at = now;
  state.messages.push({
    id: createId(),
    conversation_id: conversation.id,
    sender_id: null,
    kind: "system",
    body,
    image_url: null,
    created_at: now,
  });
}

function requestContext(request: BorrowRequest) {
  const item = state.items.find((i) => i.id === request.item_id);
  const requester = state.users.find((u) => u.id === request.requester_id);
  return {
    item,
    itemName: item?.name ?? "פריט",
    requesterName: requester?.full_name ?? "חבר/ת קהילה",
    dates: `${formatDate(request.start_date)} – ${formatDate(request.end_date)}`,
  };
}

/** What the borrow_requests trigger does after an insert or a status change. */
function afterRequestChange(request: BorrowRequest, event: "created" | BorrowRequest["status"]): void {
  const { item, itemName, requesterName, dates } = requestContext(request);
  const system = (body: string) => postSystemMessage(request.item_id, request.requester_id, body);

  if (event === "created") {
    pushNotification(
      item?.owner_id,
      "request_created",
      "בקשת השאלה חדשה",
      `${requesterName} מבקש/ת לשאול את "${itemName}" בתאריכים ${dates}`,
      "/my-items",
      request.id,
    );
    system(`נשלחה בקשת השאלה לתאריכים ${dates} (כמות: ${request.requested_quantity}).`);
  } else if (event === "approved") {
    pushNotification(
      request.requester_id,
      "request_approved",
      "הבקשה שלך אושרה",
      `אפשר לתאם בצ'אט את האיסוף של "${itemName}" (${dates}).`,
      "/my-loans?tab=active",
      request.id,
    );
    system("הבקשה אושרה. אפשר לתאם כאן את האיסוף וההחזרה.");
  } else if (event === "rejected") {
    pushNotification(
      request.requester_id,
      "request_rejected",
      "הבקשה שלך נדחתה",
      `הבקשה לשאול את "${itemName}" (${dates}) לא אושרה.`,
      "/my-loans",
      request.id,
    );
    system("הבקשה נדחתה.");
  } else if (event === "cancelled") {
    pushNotification(
      item?.owner_id,
      "request_cancelled",
      "בקשת השאלה בוטלה",
      `${requesterName} ביטל/ה את הבקשה לשאול את "${itemName}".`,
      "/my-items",
      request.id,
    );
    system("הבקשה בוטלה על ידי המבקש/ת.");
  }
}

/** What the loans trigger does after a status change. */
function afterLoanChange(loan: Loan): void {
  const request = state.borrowRequests.find((br) => br.id === loan.borrow_request_id);
  if (!request) return;
  const { item, itemName } = requestContext(request);
  const system = (body: string) => postSystemMessage(request.item_id, request.requester_id, body);

  if (loan.status === "returned_pending_confirmation") {
    pushNotification(
      item?.owner_id,
      "return_marked",
      "פריט סומן כהוחזר",
      `"${itemName}" סומן כהוחזר. נא לאשר את ההחזרה כדי לסגור את ההשאלה.`,
      "/my-items",
      loan.id,
    );
    system("השואל/ת סימן/ה שהפריט הוחזר. ממתין לאישור בעל/ת הפריט.");
  } else if (loan.status === "completed") {
    pushNotification(
      request.requester_id,
      "loan_completed",
      "ההשאלה נסגרה",
      `ההחזרה של "${itemName}" אושרה. תודה!`,
      "/my-loans?tab=completed",
      loan.id,
    );
    system("ההחזרה אושרה וההשאלה נסגרה.");
  } else if (loan.status === "late") {
    const due = formatDate(request.end_date);
    pushNotification(
      request.requester_id,
      "loan_overdue",
      "השאלה באיחור",
      `מועד ההחזרה של "${itemName}" היה ב-${due}. נא להחזיר בהקדם.`,
      "/my-loans?tab=late",
      loan.id,
    );
    pushNotification(
      item?.owner_id,
      "loan_overdue",
      "פריט שלך לא הוחזר בזמן",
      `"${itemName}" היה אמור לחזור ב-${due}.`,
      "/my-items",
      loan.id,
    );
    system("מועד ההחזרה עבר והפריט טרם סומן כהוחזר.");
  }
}

/** What the items trigger does after an insert or an approval change. */
function afterItemApprovalChange(item: Item): void {
  if (item.approval_status === "pending") {
    notifyAdmins("item_pending", "פריט ממתין לאישור", `"${item.name}"`, "/admin?tab=items", item.id);
  } else if (item.approval_status === "approved") {
    pushNotification(
      item.owner_id,
      "item_approved",
      "הפריט שלך אושר",
      `"${item.name}" מופיע עכשיו בקטלוג הקהילה.`,
      `/items/${item.id}`,
      item.id,
    );
  } else {
    pushNotification(
      item.owner_id,
      "item_rejected",
      "הפריט לא מופיע בקטלוג",
      `"${item.name}" לא אושר על ידי מנהל הקהילה. אפשר לערוך אותו ולשלוח שוב.`,
      `/items/${item.id}`,
      item.id,
    );
  }
}

export function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
): void {
  state.auditLog.push({
    id: createId(),
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    created_at: nowIso(),
  });
}

export function adminCloseLoan(loanId: string, adminId: string): void {
  const { loan, request, item } = loanWithParties(loanId);
  if (loan.status === "completed") throw new AppError("LOAN_STATE");
  loan.status = "completed";
  loan.actual_return_date ??= todayInIsrael();
  item.available_quantity = Math.min(
    item.total_quantity,
    item.available_quantity + request.requested_quantity,
  );
  afterLoanChange(loan);
  logAdminAction(adminId, "loan_force_close", "loan", loanId);
  pushNotification(
    item.owner_id,
    "loan_closed_by_admin",
    "השאלה נסגרה על ידי מנהל הקהילה",
    `ההשאלה של "${item.name}" נסגרה והמלאי שוחרר.`,
    "/my-items",
    loanId,
  );
}
