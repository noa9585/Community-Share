import type { ItemInput } from "@/lib/validation/schemas";
import type {
  AdminDashboard,
  BorrowRequestWithRelations,
  HomeDashboard,
  ItemBooking,
  ItemWithRelations,
  User,
} from "@/types/database";

export interface DataRepository {
  getUserById(userId: string): Promise<User | null>;
  getCategories(): Promise<HomeDashboard["categories"]>;
  getHomeDashboard(userId: string): Promise<HomeDashboard>;
  getCatalogItems(filters: {
    q?: string;
    category?: string;
    area?: string;
  }): Promise<ItemWithRelations[]>;
  searchItems(query: string): Promise<{ id: string; name: string }[]>;
  getItemById(itemId: string): Promise<ItemWithRelations | null>;
  getItemBookings(itemId: string): Promise<ItemBooking[]>;
  getMyItems(userId: string): Promise<ItemWithRelations[]>;
  getIncomingRequests(ownerId: string): Promise<BorrowRequestWithRelations[]>;
  getMyLoans(userId: string): Promise<BorrowRequestWithRelations[]>;
  getAdminDashboard(): Promise<AdminDashboard>;
  createItem(
    userId: string,
    input: ItemInput,
    imageUrls: string[],
  ): Promise<{ id: string }>;
  deleteItem(itemId: string, userId: string): Promise<void>;
  createBorrowRequest(
    userId: string,
    input: { itemId: string; startDate: string; endDate: string; requestedQuantity: number },
  ): Promise<void>;
  checkItemAvailability(
    itemId: string,
    startDate: string,
    endDate: string,
    quantity: number,
  ): Promise<boolean>;
  approveBorrowRequest(requestId: string, ownerId: string): Promise<void>;
  rejectBorrowRequest(requestId: string, ownerId: string): Promise<void>;
  markLoanReturned(loanId: string, requesterId: string): Promise<void>;
  confirmLoanReturn(loanId: string, ownerId: string): Promise<void>;
  markDepositReceived(loanId: string): Promise<void>;
  updateUserStatus(
    userId: string,
    action: "approve" | "block" | "unblock",
  ): Promise<void>;
  updateItemApproval(
    itemId: string,
    action: "approve" | "reject",
  ): Promise<void>;
  markLateLoans(): Promise<number>;
}
