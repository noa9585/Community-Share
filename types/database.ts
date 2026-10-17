export type UserRole = "regular" | "admin";
export type UserStatus = "pending" | "approved" | "blocked";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type BorrowRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LoanStatus =
  | "active"
  | "returned_pending_confirmation"
  | "completed"
  | "late";

export interface User {
  id: string;
  full_name: string;
  email: string;
  residence_area: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  /** Material Symbols glyph name. */
  icon?: string;
}

export interface Area {
  id: string;
  name: string;
}

/** How many items use each category, and members/items each area (keyed by id). */
export type TaxonomyUsage = {
  categories: Record<string, number>;
  areas: Record<string, { users: number; items: number }>;
};

export interface Item {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  condition_rating: number;
  total_quantity: number;
  available_quantity: number;
  deposit_amount: number;
  area: string;
  approval_status: ApprovalStatus;
  created_at: string;
  category?: Category | null;
  item_images?: ItemImage[];
  owner?: Pick<User, "full_name" | "residence_area"> | null;
}

export interface ItemImage {
  id: string;
  item_id: string;
  url: string;
}

export interface BorrowRequest {
  id: string;
  item_id: string;
  requester_id: string;
  start_date: string;
  end_date: string;
  requested_quantity: number;
  status: BorrowRequestStatus;
  created_at: string;
}

export interface Loan {
  id: string;
  borrow_request_id: string;
  status: LoanStatus;
  actual_return_date: string | null;
  deposit_received: boolean;
  created_at: string;
}

export type ItemWithRelations = Item;

export type BorrowRequestWithRelations = BorrowRequest & {
  item: ItemWithRelations | null;
  requester: Pick<User, "full_name"> | null;
  loan: Loan | null;
  /** E-mail of the other party, when the viewer is allowed to see it. */
  contact_email?: string | null;
};

export type LoanWithRelations = Loan & {
  borrow_request: BorrowRequestWithRelations | null;
};

export type ItemBooking = {
  start_date: string;
  end_date: string;
  requested_quantity: number;
};

export type MessageKind = "text" | "image" | "system";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  /** Null for automatic system messages. */
  sender_id: string | null;
  kind: MessageKind;
  body: string;
  image_url: string | null;
  created_at: string;
}

export type ConversationSummary = {
  id: string;
  item_id: string;
  item: ItemWithRelations | null;
  other_party_id: string;
  other_party_name: string | null;
  /** True when the viewer owns the item the chat is about. */
  viewer_is_owner: boolean;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
};

export type ConversationDetail = Omit<
  ConversationSummary,
  "last_message_preview" | "unread_count"
> & {
  messages: ChatMessage[];
};

export type UnreadCounts = { notifications: number; conversations: number };

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
}

export type ReportTargetType = "item" | "user";
export type ReportReason = "damaged" | "misleading" | "not_returned" | "behavior" | "other";
export type ReportStatus = "open" | "in_progress" | "resolved" | "dismissed";

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  item_id: string | null;
  reported_user_id: string | null;
  target_label: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  admin_note: string | null;
  handled_at: string | null;
  created_at: string;
}

export type ReportWithRelations = Report & {
  reporter_name: string | null;
  reported_user_name: string | null;
  reported_user_status: UserStatus | null;
};

export type AdminStats = {
  users: { total: number; approved: number; pending: number; blocked: number };
  items: { total: number; approved: number; pending: number; rejected: number };
  requests: { total: number; pending: number };
  loans: { active: number; late: number; awaiting: number; completed: number };
  openReports: number;
  messages: number;
  topItems: { name: string; loans: number }[];
};

export type AuditLogEntry = {
  id: string;
  action: string;
  target_type: string;
  created_at: string;
  admin_name: string | null;
};

export type AdminDashboard = {
  pendingUsers: User[];
  users: User[];
  pendingItems: ItemWithRelations[];
  items: ItemWithRelations[];
  activeLoans: LoanWithRelations[];
  lateLoans: LoanWithRelations[];
  reports: ReportWithRelations[];
  stats: AdminStats;
  auditLog: AuditLogEntry[];
};

export type EmailLogType =
  | "request_created"
  | "request_approved"
  | "request_rejected"
  | "user_approved"
  | "item_approved"
  | "return_reminder"
  | "loan_overdue"
  | "return_marked";

export type EmailLogEntry = {
  id: string;
  type: EmailLogType;
  status: "sent" | "failed" | "skipped";
  sent_at: string;
  recipient_name: string | null;
};

export type HomeDashboard = {
  categories: Category[];
  recentItems: ItemWithRelations[];
  myLoans: BorrowRequestWithRelations[];
  pendingRequests: BorrowRequestWithRelations[];
};
