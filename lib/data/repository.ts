import type { ItemInput, ProfileInput } from "@/lib/validation/schemas";
import type {
  AdminDashboard,
  BorrowRequestWithRelations,
  HomeDashboard,
  ItemBooking,
  ItemWithRelations,
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
  ): Promise<void>;
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
}
