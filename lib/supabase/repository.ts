import type { DataRepository } from "@/lib/data/repository";

async function notImplemented(): Promise<never> {
  throw new Error(
    "Supabase repository not configured. Set USE_MOCK_DATA=true for demo mode.",
  );
}

export const supabaseRepository: DataRepository = {
  getUserById: notImplemented,
  getCategories: notImplemented,
  getHomeDashboard: notImplemented,
  getCatalogItems: notImplemented,
  searchItems: notImplemented,
  getItemById: notImplemented,
  getItemBookings: notImplemented,
  getMyItems: notImplemented,
  getIncomingRequests: notImplemented,
  getMyLoans: notImplemented,
  getAdminDashboard: notImplemented,
  createItem: notImplemented,
  deleteItem: notImplemented,
  createBorrowRequest: notImplemented,
  checkItemAvailability: notImplemented,
  approveBorrowRequest: notImplemented,
  rejectBorrowRequest: notImplemented,
  markLoanReturned: notImplemented,
  confirmLoanReturn: notImplemented,
  markDepositReceived: notImplemented,
  updateUserStatus: notImplemented,
  updateItemApproval: notImplemented,
  markLateLoans: notImplemented,
};
