import type {
  ApprovalStatus,
  BorrowRequest,
  Category,
  Item,
  ItemImage,
  Loan,
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

export interface MockState {
  users: User[];
  categories: Category[];
  items: Item[];
  itemImages: ItemImage[];
  borrowRequests: BorrowRequest[];
  loans: Loan[];
}

function cloneSeed(): MockState {
  return {
    users: DEMO_USERS.map(({ label: _label, ...user }) => ({ ...user })),
    categories: SEED_CATEGORIES.map((c) => ({ ...c })),
    items: SEED_ITEMS.map((i) => ({ ...i })),
    itemImages: SEED_ITEM_IMAGES.map((img) => ({ ...img })),
    borrowRequests: SEED_BORROW_REQUESTS.map((br) => ({ ...br })),
    loans: SEED_LOANS.map((l) => ({ ...l })),
  };
}

let state: MockState = cloneSeed();

export function getMockState(): MockState {
  return state;
}

export function resetMockStore(): void {
  state = cloneSeed();
}

function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA <= endB && endA >= startB;
}

function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  const current = new Date(start);
  const last = new Date(end);
  while (current <= last) {
    days.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function checkItemAvailability(
  itemId: string,
  startDate: string,
  endDate: string,
  quantity: number,
): boolean {
  const item = state.items.find((i) => i.id === itemId && i.approval_status === "approved");
  if (!item || quantity < 1) return false;

  const activeStatuses = new Set(["active", "returned_pending_confirmation", "late"]);
  let maxBooked = 0;

  for (const day of eachDay(startDate, endDate)) {
    let dayBooked = 0;
    for (const request of state.borrowRequests) {
      if (request.item_id !== itemId || request.status !== "approved") continue;
      const loan = state.loans.find((l) => l.borrow_request_id === request.id);
      if (!loan || !activeStatuses.has(loan.status)) continue;
      if (datesOverlap(day, day, request.start_date, request.end_date)) {
        dayBooked += request.requested_quantity;
      }
    }
    maxBooked = Math.max(maxBooked, dayBooked);
  }

  return item.total_quantity - maxBooked >= quantity;
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function updateUserStatus(userId: string, status: UserStatus): void {
  const user = state.users.find((u) => u.id === userId);
  if (user) user.status = status;
}

export function updateItemApproval(itemId: string, approvalStatus: ApprovalStatus): void {
  const item = state.items.find((i) => i.id === itemId);
  if (item) item.approval_status = approvalStatus;
}

export function insertItem(item: Item, images: ItemImage[]): void {
  state.items.push(item);
  state.itemImages.push(...images);
}

export function deleteItem(itemId: string): void {
  state.items = state.items.filter((i) => i.id !== itemId);
  state.itemImages = state.itemImages.filter((img) => img.item_id !== itemId);
  const requestIds = state.borrowRequests
    .filter((br) => br.item_id === itemId)
    .map((br) => br.id);
  state.borrowRequests = state.borrowRequests.filter((br) => br.item_id !== itemId);
  state.loans = state.loans.filter((l) => !requestIds.includes(l.borrow_request_id));
}

export function insertBorrowRequest(request: BorrowRequest): void {
  state.borrowRequests.push(request);
}

export function approveBorrowRequest(requestId: string): void {
  const request = state.borrowRequests.find((br) => br.id === requestId);
  if (!request || request.status !== "pending") {
    throw new Error("Request not found or not pending");
  }
  if (
    !checkItemAvailability(
      request.item_id,
      request.start_date,
      request.end_date,
      request.requested_quantity,
    )
  ) {
    throw new Error("Item not available");
  }
  request.status = "approved";
  const item = state.items.find((i) => i.id === request.item_id);
  if (item) {
    item.available_quantity = Math.max(0, item.available_quantity - request.requested_quantity);
  }
  state.loans.push({
    id: createId("l"),
    borrow_request_id: requestId,
    status: "active",
    actual_return_date: null,
    deposit_received: false,
    created_at: new Date().toISOString(),
  });
}

export function rejectBorrowRequest(requestId: string): void {
  const request = state.borrowRequests.find((br) => br.id === requestId);
  if (!request || request.status !== "pending") {
    throw new Error("Request not found or not pending");
  }
  request.status = "rejected";
}

export function markLoanReturned(loanId: string, requesterId: string): void {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan || !["active", "late"].includes(loan.status)) {
    throw new Error("Loan not returnable");
  }
  const request = state.borrowRequests.find((br) => br.id === loan.borrow_request_id);
  if (!request || request.requester_id !== requesterId) {
    throw new Error("Forbidden");
  }
  loan.status = "returned_pending_confirmation";
  loan.actual_return_date = new Date().toISOString().slice(0, 10);
}

export function confirmLoanReturn(loanId: string, ownerId: string): void {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan || loan.status !== "returned_pending_confirmation") {
    throw new Error("Loan not awaiting confirmation");
  }
  const request = state.borrowRequests.find((br) => br.id === loan.borrow_request_id);
  const item = request ? state.items.find((i) => i.id === request.item_id) : undefined;
  if (!request || !item || item.owner_id !== ownerId) {
    throw new Error("Forbidden");
  }
  loan.status = "completed";
  item.available_quantity = Math.min(
    item.total_quantity,
    item.available_quantity + request.requested_quantity,
  );
}

export function markDepositReceived(loanId: string): void {
  const loan = state.loans.find((l) => l.id === loanId);
  if (loan) loan.deposit_received = true;
}

export function markLateLoans(): number {
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  for (const loan of state.loans) {
    if (loan.status !== "active") continue;
    const request = state.borrowRequests.find((br) => br.id === loan.borrow_request_id);
    if (request && request.end_date < today) {
      loan.status = "late";
      count += 1;
    }
  }
  return count;
}
