import { AppError } from "@/lib/errors";
import { todayInIsrael } from "@/lib/validation/schemas";
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

// In-memory stand-in for the database, used only when USE_MOCK_DATA=true.
// It mirrors the rules of supabase/migrations/003_functions.sql.

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
  item.approval_status = approvalStatus;
}

export function insertItem(item: Item, images: ItemImage[]): void {
  state.items.push(item);
  state.itemImages.push(...images);
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
}

export function rejectBorrowRequest(requestId: string, ownerId: string): void {
  ownedPendingRequest(requestId, ownerId).status = "rejected";
}

export function cancelBorrowRequest(requestId: string, requesterId: string): void {
  const request = state.borrowRequests.find((br) => br.id === requestId);
  if (!request || request.requester_id !== requesterId || request.status !== "pending") {
    throw new AppError("NOT_PENDING");
  }
  request.status = "cancelled";
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
      count += 1;
    }
  }
  return count;
}
