import type { DataRepository } from "@/lib/data/repository";
import type {
  AdminDashboard,
  BorrowRequestWithRelations,
  HomeDashboard,
  ItemBooking,
  ItemWithRelations,
  User,
} from "@/types/database";

import {
  approveBorrowRequest,
  checkItemAvailability,
  confirmLoanReturn,
  createId,
  deleteItem,
  getMockState,
  insertBorrowRequest,
  insertItem,
  markDepositReceived,
  markLateLoans,
  markLoanReturned,
  rejectBorrowRequest,
  updateItemApproval,
  updateUserStatus,
} from "@/lib/mock/store";
import type { BorrowRequest, Item, ItemImage } from "@/types/database";

function enrichItem(item: Item): ItemWithRelations {
  const { categories, itemImages, users } = getMockState();
  return {
    ...item,
    category: categories.find((c) => c.id === item.category_id) ?? null,
    item_images: itemImages.filter((img) => img.item_id === item.id),
    owner: users.find((u) => u.id === item.owner_id) ?? null,
  };
}

function enrichBorrowRequestRow(request: BorrowRequest): BorrowRequestWithRelations {
  const state = getMockState();
  const loan = state.loans.find((l) => l.borrow_request_id === request.id) ?? null;
  const item = state.items.find((i) => i.id === request.item_id);
  const requester = state.users.find((u) => u.id === request.requester_id);
  return {
    ...request,
    item: item ? enrichItem(item) : null,
    requester: requester
      ? { full_name: requester.full_name, email: requester.email }
      : null,
    loan,
  };
}

function getLoanDashboardEntry(loan: import("@/types/database").Loan) {
  const state = getMockState();
  const request = state.borrowRequests.find((br) => br.id === loan.borrow_request_id);
  if (!request) return { ...loan, borrow_request: null };
  return {
    ...loan,
    borrow_request: enrichBorrowRequestRow(request),
  };
}

export const mockRepository: DataRepository = {
  async getUserById(userId) {
    return getMockState().users.find((u) => u.id === userId) ?? null;
  },

  async getCategories() {
    return getMockState().categories;
  },

  async getHomeDashboard(userId): Promise<HomeDashboard> {
    const state = getMockState();
    const recentItems = state.items
      .filter((i) => i.approval_status === "approved")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6)
      .map(enrichItem);

    const myLoans = state.borrowRequests
      .filter(
        (br) =>
          br.requester_id === userId &&
          (br.status === "pending" || br.status === "approved"),
      )
      .slice(0, 5)
      .map(enrichBorrowRequestRow);

    const ownedItemIds = new Set(
      state.items.filter((i) => i.owner_id === userId).map((i) => i.id),
    );
    const pendingRequests = state.borrowRequests
      .filter((br) => br.status === "pending" && ownedItemIds.has(br.item_id))
      .slice(0, 5)
      .map(enrichBorrowRequestRow);

    return {
      categories: state.categories.slice(0, 6),
      recentItems,
      myLoans,
      pendingRequests,
    };
  },

  async getCatalogItems({ q, category, area }) {
    let items = getMockState().items.filter((i) => i.approval_status === "approved");
    if (q) {
      const term = q.trim().toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(term));
    }
    if (category) items = items.filter((i) => i.category_id === category);
    if (area) items = items.filter((i) => i.area === area);
    return items.map(enrichItem);
  },

  async searchItems(query) {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return getMockState()
      .items.filter(
        (i) => i.approval_status === "approved" && i.name.toLowerCase().includes(term),
      )
      .slice(0, 10)
      .map((i) => ({ id: i.id, name: i.name }));
  },

  async getItemById(itemId) {
    const item = getMockState().items.find((i) => i.id === itemId);
    return item ? enrichItem(item) : null;
  },

  async getItemBookings(itemId): Promise<ItemBooking[]> {
    const state = getMockState();
    const activeStatuses = new Set(["active", "returned_pending_confirmation", "late"]);
    return state.borrowRequests
      .filter((br) => br.item_id === itemId && br.status === "approved")
      .map((br) => {
        const loan = state.loans.find((l) => l.borrow_request_id === br.id) ?? null;
        return {
          start_date: br.start_date,
          end_date: br.end_date,
          requested_quantity: br.requested_quantity,
          status: br.status,
          loan: loan ? { status: loan.status } : null,
        };
      })
      .filter((b) => b.loan && activeStatuses.has(b.loan.status));
  },

  async getMyItems(userId) {
    return getMockState()
      .items.filter((i) => i.owner_id === userId)
      .map(enrichItem);
  },

  async getIncomingRequests(ownerId) {
    const ownedIds = new Set(
      getMockState()
        .items.filter((i) => i.owner_id === ownerId)
        .map((i) => i.id),
    );
    return getMockState()
      .borrowRequests.filter((br) => br.status === "pending" && ownedIds.has(br.item_id))
      .map(enrichBorrowRequestRow);
  },

  async getMyLoans(userId) {
    return getMockState()
      .borrowRequests.filter((br) => br.requester_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(enrichBorrowRequestRow);
  },

  async getAdminDashboard(): Promise<AdminDashboard> {
    const state = getMockState();
    return {
      pendingUsers: state.users
        .filter((u) => u.status === "pending")
        .map((u) => ({ id: u.id, full_name: u.full_name, email: u.email })),
      pendingItems: state.items
        .filter((i) => i.approval_status === "pending")
        .map((i) => ({ id: i.id, name: i.name })),
      activeLoans: state.loans.filter((l) => l.status === "active").map(getLoanDashboardEntry),
      lateLoans: state.loans.filter((l) => l.status === "late").map(getLoanDashboardEntry),
    };
  },

  async createItem(userId, input, imageUrls) {
    const itemId = createId("i");
    const item: Item = {
      id: itemId,
      owner_id: userId,
      name: input.name,
      description: input.description || null,
      category_id: input.categoryId,
      condition_rating: input.conditionRating,
      total_quantity: input.totalQuantity,
      available_quantity: input.totalQuantity,
      deposit_amount: input.depositAmount,
      area: input.area,
      approval_status: "pending",
      created_at: new Date().toISOString(),
    };
    const images: ItemImage[] = imageUrls.map((url, index) => ({
      id: createId(`img-${index}`),
      item_id: itemId,
      url,
    }));
    insertItem(item, images);
    return { id: itemId };
  },

  async deleteItem(itemId, userId) {
    const item = getMockState().items.find((i) => i.id === itemId);
    if (!item || item.owner_id !== userId) throw new Error("Forbidden");
    deleteItem(itemId);
  },

  async createBorrowRequest(userId, input) {
    insertBorrowRequest({
      id: createId("br"),
      item_id: input.itemId,
      requester_id: userId,
      start_date: input.startDate,
      end_date: input.endDate,
      requested_quantity: input.requestedQuantity,
      status: "pending",
      created_at: new Date().toISOString(),
    });
  },

  async checkItemAvailability(itemId, startDate, endDate, quantity) {
    return checkItemAvailability(itemId, startDate, endDate, quantity);
  },

  async approveBorrowRequest(requestId, ownerId) {
    const state = getMockState();
    const request = state.borrowRequests.find((br) => br.id === requestId);
    const item = request ? state.items.find((i) => i.id === request.item_id) : undefined;
    if (!request || !item || item.owner_id !== ownerId) throw new Error("Forbidden");
    approveBorrowRequest(requestId);
  },

  async rejectBorrowRequest(requestId, ownerId) {
    const state = getMockState();
    const request = state.borrowRequests.find((br) => br.id === requestId);
    const item = request ? state.items.find((i) => i.id === request.item_id) : undefined;
    if (!request || !item || item.owner_id !== ownerId) throw new Error("Forbidden");
    rejectBorrowRequest(requestId);
  },

  async markLoanReturned(loanId, requesterId) {
    markLoanReturned(loanId, requesterId);
  },

  async confirmLoanReturn(loanId, ownerId) {
    confirmLoanReturn(loanId, ownerId);
  },

  async markDepositReceived(loanId) {
    markDepositReceived(loanId);
  },

  async updateUserStatus(userId, action) {
    const statusMap = {
      approve: "approved",
      block: "blocked",
      unblock: "approved",
    } as const;
    updateUserStatus(userId, statusMap[action]);
  },

  async updateItemApproval(itemId, action) {
    updateItemApproval(itemId, action === "approve" ? "approved" : "rejected");
  },

  async markLateLoans() {
    return markLateLoans();
  },
};
