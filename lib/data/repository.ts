import type { ItemInput, ProfileInput, ReportInput } from "@/lib/validation/schemas";
import type {
  AdminDashboard,
  AppNotification,
  Area,
  BorrowRequestWithRelations,
  ConversationDetail,
  ConversationSummary,
  EmailLogEntry,
  HomeDashboard,
  ItemBooking,
  ItemWithRelations,
  Report,
  ReportStatus,
  TaxonomyUsage,
  UnreadCounts,
  User,
} from "@/types/database";

/** An image that already passed server-side type and size checks. */
export type UploadImage = {
  bytes: Uint8Array;
  mime: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
};

export type CatalogFilters = {
  q?: string;
  category?: string;
  area?: string;
  from?: string;
  to?: string;
};

export interface DataRepository {
  getUserById(userId: string): Promise<User | null>;
  getCategories(): Promise<HomeDashboard["categories"]>;
  getAreas(): Promise<Area[]>;
  getHomeDashboard(userId: string): Promise<HomeDashboard>;
  getCatalogItems(filters: CatalogFilters): Promise<ItemWithRelations[]>;
  searchItems(query: string): Promise<{ id: string; name: string }[]>;
  getItemById(itemId: string): Promise<ItemWithRelations | null>;
  getItemBookings(itemId: string): Promise<ItemBooking[]>;
  getMyItems(userId: string): Promise<ItemWithRelations[]>;
  getIncomingRequests(ownerId: string): Promise<BorrowRequestWithRelations[]>;
  getOwnerLoans(ownerId: string): Promise<BorrowRequestWithRelations[]>;
  getMyLoans(userId: string): Promise<BorrowRequestWithRelations[]>;
  getAdminDashboard(): Promise<AdminDashboard>;
  getEmailLog(limit: number): Promise<EmailLogEntry[]>;
  createItem(
    userId: string,
    input: ItemInput,
    images: UploadImage[],
  ): Promise<{ id: string }>;
  updateItem(
    userId: string,
    itemId: string,
    input: ItemInput,
    images: UploadImage[],
    removeImageIds: string[],
  ): Promise<void>;
  deleteItem(itemId: string, userId: string): Promise<void>;
  createBorrowRequest(
    userId: string,
    input: { itemId: string; startDate: string; endDate: string; requestedQuantity: number },
  ): Promise<{ id: string }>;
  cancelBorrowRequest(requestId: string, requesterId: string): Promise<void>;
  approveBorrowRequest(requestId: string, ownerId: string): Promise<void>;
  rejectBorrowRequest(requestId: string, ownerId: string): Promise<void>;
  markLoanReturned(loanId: string, requesterId: string): Promise<void>;
  confirmLoanReturn(loanId: string, ownerId: string): Promise<void>;
  markDepositReceived(loanId: string, ownerId: string): Promise<void>;
  updateProfile(userId: string, input: ProfileInput): Promise<void>;
  updateUserStatus(
    adminId: string,
    userId: string,
    action: "approve" | "block" | "unblock",
  ): Promise<void>;
  updateItemApproval(
    itemId: string,
    action: "approve" | "reject",
  ): Promise<void>;
  adminCloseLoan(adminId: string, loanId: string): Promise<void>;
  getTaxonomyUsage(): Promise<TaxonomyUsage>;
  saveCategory(
    adminId: string,
    input: { id?: string; name: string; icon: string },
  ): Promise<void>;
  deleteCategory(adminId: string, categoryId: string): Promise<void>;
  saveArea(adminId: string, input: { id?: string; name: string }): Promise<void>;
  deleteArea(adminId: string, areaId: string): Promise<void>;

  // Chat
  getConversations(userId: string): Promise<ConversationSummary[]>;
  getConversation(conversationId: string, userId: string): Promise<ConversationDetail | null>;
  /** `memberId` is only needed when the item's owner opens the chat. */
  startConversation(userId: string, itemId: string, memberId?: string): Promise<{ id: string }>;
  sendMessage(
    userId: string,
    conversationId: string,
    body: string,
    image: UploadImage | null,
  ): Promise<void>;
  markConversationRead(conversationId: string, userId: string): Promise<void>;

  // Notifications
  getUnreadCounts(userId: string): Promise<UnreadCounts>;
  getNotifications(userId: string, limit: number): Promise<AppNotification[]>;
  /** Marks the given notifications as read, or all of them when `ids` is omitted. */
  markNotificationsRead(userId: string, ids?: string[]): Promise<void>;

  // Reports
  createReport(userId: string, input: ReportInput): Promise<void>;
  getMyReports(userId: string): Promise<Report[]>;
  updateReport(
    adminId: string,
    reportId: string,
    status: Exclude<ReportStatus, "open">,
    note: string,
  ): Promise<void>;
}
