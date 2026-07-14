export type UserRole = "regular" | "admin";
export type UserStatus = "pending" | "approved" | "blocked";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type BorrowRequestStatus = "pending" | "approved" | "rejected";
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
}

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
  item?: Item | null;
  requester?: Pick<User, "full_name" | "email"> | null;
  loan?: Loan | null;
}

export interface Loan {
  id: string;
  borrow_request_id: string;
  status: LoanStatus;
  actual_return_date: string | null;
  deposit_received: boolean;
  created_at: string;
  borrow_request?: BorrowRequest | null;
}

export type ItemWithRelations = Item & {
  category?: Category | null;
  item_images?: ItemImage[];
  owner?: Pick<User, "full_name" | "residence_area"> | null;
};

export type BorrowRequestWithRelations = BorrowRequest & {
  item?: Pick<Item, "id" | "name" | "owner_id"> | ItemWithRelations | null;
  requester?: Pick<User, "full_name" | "email"> | null;
  loan?: Loan | null;
};

export type LoanWithRelations = Loan & {
  borrow_request?: BorrowRequestWithRelations | null;
};

export type ItemBooking = {
  start_date: string;
  end_date: string;
  requested_quantity: number;
  status: BorrowRequestStatus;
  loan?: Pick<Loan, "status"> | null;
};

export type AdminDashboard = {
  pendingUsers: Pick<User, "id" | "full_name" | "email">[];
  pendingItems: Pick<Item, "id" | "name">[];
  activeLoans: LoanWithRelations[];
  lateLoans: LoanWithRelations[];
};

export type HomeDashboard = {
  categories: Category[];
  recentItems: ItemWithRelations[];
  myLoans: BorrowRequestWithRelations[];
  pendingRequests: BorrowRequestWithRelations[];
};
