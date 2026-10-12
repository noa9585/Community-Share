import type { DataRepository } from "@/lib/data/repository";
import { AppError } from "@/lib/errors";
import type {
  AdminDashboard,
  BorrowRequest,
  BorrowRequestWithRelations,
  HomeDashboard,
  Item,
  ItemBooking,
  ItemImage,
  ItemWithRelations,
  Loan,
  LoanWithRelations,
} from "@/types/database";

import {
  approveBorrowRequest,
  cancelBorrowRequest,
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
  openBookings,
  rejectBorrowRequest,
  updateItemApproval,
  updateUserStatus,
} from "@/lib/mock/store";

function placeholderImage(): string {
  return `https://picsum.photos/seed/${crypto.randomUUID()}/800/600`;
}

function enrichItem(item: Item): ItemWithRelations {
  const { categories, itemImages, users } = getMockState();
  const owner = users.find((u) => u.id === item.owner_id);
  return {
    ...item,
    category: categories.find((c) => c.id === item.category_id) ?? null,
    item_images: itemImages.filter((img) => img.item_id === item.id),
    owner: owner ? { full_name: owner.full_name, residence_area: owner.residence_area } : null,
  };
}

function enrichRequest(request: BorrowRequest, viewerId?: string): BorrowRequestWithRelations {
  const state = getMockState();
  const item = state.items.find((i) => i.id === request.item_id);
  const requester = state.users.find((u) => u.id === request.requester_id);
  const owner = item ? state.users.find((u) => u.id === item.owner_id) : undefined;

  let contactEmail: string | null = null;
  if (viewerId && item?.owner_id === viewerId && ["pending", "approved"].includes(request.status)) {
    contactEmail = requester?.email ?? null;
  } else if (viewerId && request.requester_id === viewerId && request.status === "approved") {
    contactEmail = owner?.email ?? null;
  }

  return {
    ...request,
    item: item ? enrichItem(item) : null,
    requester: requester ? { full_name: requester.full_name } : null,
    loan: state.loans.find((l) => l.borrow_request_id === request.id) ?? null,
    contact_email: contactEmail,
  };
}

function loanEntry(loan: Loan): LoanWithRelations {
  const request = getMockState().borrowRequests.find((br) => br.id === loan.borrow_request_id);
  return { ...loan, borrow_request: request ? enrichRequest(request) : null };
}

function ownedIds(ownerId: string): Set<string> {
  return new Set(
    getMockState()
      .items.filter((i) => i.owner_id === ownerId)
      .map((i) => i.id),
  );
}

function ownedItem(itemId: string, userId: string): Item {
  const item = getMockState().items.find((i) => i.id === itemId);
  if (!item || item.owner_id !== userId) throw new AppError("FORBIDDEN");
  return item;
}

function byNewest(a: { created_at: string }, b: { created_at: string }): number {
  return b.created_at.localeCompare(a.created_at);
}

export const mockRepository: DataRepository = {
  async getUserById(userId) {
    return getMockState().users.find((u) => u.id === userId) ?? null;
  },

  async getCategories() {
    return getMockState().categories;
  },

  async getHomeDashboard(userId): Promise<HomeDashboard> {
    markLateLoans();
    const state = getMockState();
    const owned = ownedIds(userId);

    return {
      categories: state.categories.slice(0, 6),
      recentItems: state.items
        .filter((i) => i.approval_status === "approved")
        .sort(byNewest)
        .slice(0, 6)
        .map(enrichItem),
      myLoans: state.borrowRequests
        .filter(
          (br) =>
            br.requester_id === userId && (br.status === "pending" || br.status === "approved"),
        )
        .map((br) => enrichRequest(br, userId)),
      pendingRequests: state.borrowRequests
        .filter((br) => br.status === "pending" && owned.has(br.item_id))
        .slice(0, 5)
        .map((br) => enrichRequest(br, userId)),
    };
  },

  async getCatalogItems({ q, category, area, from, to }) {
    let items = getMockState().items.filter((i) => i.approval_status === "approved");
    if (q) {
      const term = q.trim().toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(term));
    }
    if (category) items = items.filter((i) => i.category_id === category);
    if (area) items = items.filter((i) => i.area === area);

    const start = from ?? to;
    const end = to ?? from;
    if (start && end && start <= end) {
      items = items.filter((i) => checkItemAvailability(i.id, start, end, 1));
    }
    return items.sort(byNewest).map(enrichItem);
  },

  async searchItems(query) {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return getMockState()
      .items.filter(
        (i) => i.approval_status === "approved" && i.name.toLowerCase().includes(term),
      )
      .slice(0, 8)
      .map((i) => ({ id: i.id, name: i.name }));
  },

  async getItemById(itemId) {
    const item = getMockState().items.find((i) => i.id === itemId);
    return item ? enrichItem(item) : null;
  },

  async getItemBookings(itemId): Promise<ItemBooking[]> {
    return openBookings(itemId);
  },

  async getMyItems(userId) {
    return getMockState()
      .items.filter((i) => i.owner_id === userId)
      .sort(byNewest)
      .map(enrichItem);
  },

  async getIncomingRequests(ownerId) {
    const owned = ownedIds(ownerId);
    return getMockState()
      .borrowRequests.filter((br) => br.status === "pending" && owned.has(br.item_id))
      .map((br) => enrichRequest(br, ownerId));
  },

  async getOwnerLoans(ownerId) {
    markLateLoans();
    const owned = ownedIds(ownerId);
    return getMockState()
      .borrowRequests.filter((br) => br.status === "approved" && owned.has(br.item_id))
      .sort(byNewest)
      .map((br) => enrichRequest(br, ownerId));
  },

  async getMyLoans(userId) {
    markLateLoans();
    return getMockState()
      .borrowRequests.filter((br) => br.requester_id === userId)
      .sort(byNewest)
      .map((br) => enrichRequest(br, userId));
  },

  async getAdminDashboard(): Promise<AdminDashboard> {
    markLateLoans();
    const state = getMockState();
    return {
      pendingUsers: state.users.filter((u) => u.status === "pending"),
      users: state.users,
      pendingItems: state.items.filter((i) => i.approval_status === "pending").map(enrichItem),
      activeLoans: state.loans
        .filter((l) => l.status === "active" || l.status === "returned_pending_confirmation")
        .map(loanEntry),
      lateLoans: state.loans.filter((l) => l.status === "late").map(loanEntry),
    };
  },

  async createItem(userId, input, images) {
    const itemId = createId();
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
    // Demo mode has no file storage, so uploads become placeholder pictures.
    const itemImages: ItemImage[] = images.map(() => ({
      id: createId(),
      item_id: itemId,
      url: placeholderImage(),
    }));
    insertItem(item, itemImages);
    return { id: itemId };
  },

  async updateItem(userId, itemId, input, images, removeImageIds) {
    const state = getMockState();
    const item = ownedItem(itemId, userId);
    const onLoan = item.total_quantity - item.available_quantity;
    if (input.totalQuantity < onLoan) throw new AppError("QUANTITY_BELOW_LOANED");

    const description = input.description || null;
    const contentChanged =
      item.name !== input.name ||
      item.description !== description ||
      item.category_id !== input.categoryId ||
      images.length > 0;
    if (contentChanged || item.approval_status === "rejected") {
      item.approval_status = "pending";
    }

    item.name = input.name;
    item.description = description;
    item.category_id = input.categoryId;
    item.condition_rating = input.conditionRating;
    item.total_quantity = input.totalQuantity;
    item.available_quantity = input.totalQuantity - onLoan;
    item.deposit_amount = input.depositAmount;
    item.area = input.area;

    state.itemImages = state.itemImages.filter(
      (img) => !(img.item_id === itemId && removeImageIds.includes(img.id)),
    );
    const existing = state.itemImages.filter((img) => img.item_id === itemId).length;
    if (existing + images.length > 5) throw new AppError("TOO_MANY_IMAGES");
    state.itemImages.push(
      ...images.map(() => ({ id: createId(), item_id: itemId, url: placeholderImage() })),
    );
  },

  async deleteItem(itemId, userId) {
    ownedItem(itemId, userId);
    deleteItem(itemId);
  },

  async createBorrowRequest(userId, input) {
    insertBorrowRequest({
      id: createId(),
      item_id: input.itemId,
      requester_id: userId,
      start_date: input.startDate,
      end_date: input.endDate,
      requested_quantity: input.requestedQuantity,
      status: "pending",
      created_at: new Date().toISOString(),
    });
  },

  async cancelBorrowRequest(requestId, requesterId) {
    cancelBorrowRequest(requestId, requesterId);
  },

  async approveBorrowRequest(requestId, ownerId) {
    approveBorrowRequest(requestId, ownerId);
  },

  async rejectBorrowRequest(requestId, ownerId) {
    rejectBorrowRequest(requestId, ownerId);
  },

  async markLoanReturned(loanId, requesterId) {
    markLoanReturned(loanId, requesterId);
  },

  async confirmLoanReturn(loanId, ownerId) {
    confirmLoanReturn(loanId, ownerId);
  },

  async markDepositReceived(loanId, ownerId) {
    markDepositReceived(loanId, ownerId);
  },

  async updateProfile(userId, input) {
    const user = getMockState().users.find((u) => u.id === userId);
    if (!user) throw new AppError("NOT_FOUND");
    user.full_name = input.fullName;
    user.residence_area = input.residenceArea;
  },

  async updateUserStatus(adminId, userId, action) {
    if (adminId === userId) throw new AppError("CANNOT_MODIFY_SELF");
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
};
