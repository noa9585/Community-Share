import "server-only";

import type { DataRepository, UploadImage } from "@/lib/data/repository";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminDashboard,
  BorrowRequest,
  BorrowRequestWithRelations,
  Category,
  HomeDashboard,
  Item,
  ItemBooking,
  ItemWithRelations,
  Loan,
  LoanWithRelations,
  User,
} from "@/types/database";

// Every query here runs through the user's own session, so Row Level Security
// decides what comes back, and every write is a database function that
// re-checks the caller. Nothing in this file uses the service role.

type Supabase = Awaited<ReturnType<typeof createClient>>;

const BUCKET = "item-images";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const USER_SELECT = "id, full_name, email, residence_area, role, status, created_at";

const ITEM_SELECT =
  "id, owner_id, name, description, category_id, condition_rating, total_quantity, " +
  "available_quantity, deposit_amount, area, approval_status, created_at, " +
  "category:categories(id, name), item_images(id, item_id, storage_path, created_at)";

const REQUEST_SELECT =
  "id, item_id, requester_id, start_date, end_date, requested_quantity, status, created_at, " +
  "loan:loans(id, borrow_request_id, status, actual_return_date, deposit_received, created_at), " +
  `item:items(${ITEM_SELECT})`;

type ImageRow = { id: string; item_id: string; storage_path: string; created_at: string };

type ItemRow = Omit<Item, "category" | "item_images" | "owner"> & {
  category: Category | Category[] | null;
  item_images: ImageRow[] | null;
};

type RequestRow = BorrowRequest & {
  loan: Loan | Loan[] | null;
  item: ItemRow | ItemRow[] | null;
};

type DbError = { message: string; code?: string };

/** PostgREST returns a to-one embed as an object or a one-element array depending on version. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/** Turns a failed write into an AppError the UI can translate; hides everything else. */
function throwWriteError(error: DbError): never {
  const match = /CS:([A-Z_]+)/.exec(error.message);
  if (match) throw new AppError(match[1]);
  // Check / foreign-key / bad-syntax violations all mean the input was rejected.
  if (error.code && ["23502", "23503", "23514", "22P02", "22003", "22001"].includes(error.code)) {
    throw new AppError("INVALID_INPUT");
  }
  throw new Error(`Database write failed (${error.code ?? "unknown"}): ${error.message}`);
}

function assertRead<T>(result: { data: T | null; error: DbError | null }): T {
  if (result.error) {
    throw new Error(`Database read failed (${result.error.code ?? "unknown"}): ${result.error.message}`);
  }
  return result.data as T;
}

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

async function signPaths(supabase: Supabase, paths: string[]): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  if (paths.length === 0) return signed;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return signed;
  for (const entry of data) {
    if (entry.path && entry.signedUrl && !entry.error) {
      signed.set(entry.path, entry.signedUrl);
    }
  }
  return signed;
}

async function fetchNames(
  supabase: Supabase,
  ids: string[],
  source: "public_profiles" | "users",
): Promise<Map<string, { full_name: string; residence_area: string }>> {
  const names = new Map<string, { full_name: string; residence_area: string }>();
  if (ids.length === 0) return names;

  const { data } = await supabase
    .from(source)
    .select("id, full_name, residence_area")
    .in("id", ids);

  for (const row of (data ?? []) as { id: string; full_name: string; residence_area: string }[]) {
    names.set(row.id, { full_name: row.full_name, residence_area: row.residence_area });
  }
  return names;
}

async function hydrateItems(
  supabase: Supabase,
  rows: ItemRow[],
  options: { allImages?: boolean; nameSource?: "public_profiles" | "users" } = {},
): Promise<ItemWithRelations[]> {
  if (rows.length === 0) return [];

  const imagesByItem = new Map<string, ImageRow[]>();
  for (const row of rows) {
    const sorted = [...(row.item_images ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    imagesByItem.set(row.id, options.allImages ? sorted : sorted.slice(0, 1));
  }

  const [owners, signed] = await Promise.all([
    fetchNames(supabase, unique(rows.map((row) => row.owner_id)), options.nameSource ?? "public_profiles"),
    signPaths(
      supabase,
      [...imagesByItem.values()].flat().map((image) => image.storage_path),
    ),
  ]);

  return rows.map((row) => {
    return {
      ...row,
      deposit_amount: Number(row.deposit_amount),
      category: one(row.category),
      owner: owners.get(row.owner_id) ?? null,
      item_images: (imagesByItem.get(row.id) ?? []).flatMap((image) => {
        const url = signed.get(image.storage_path);
        return url ? [{ id: image.id, item_id: image.item_id, url }] : [];
      }),
    };
  });
}

async function hydrateRequests(
  supabase: Supabase,
  rows: RequestRow[],
  options: { nameSource?: "public_profiles" | "users"; contacts?: boolean } = {},
): Promise<BorrowRequestWithRelations[]> {
  if (rows.length === 0) return [];

  const itemRows = new Map<string, ItemRow>();
  for (const row of rows) {
    const item = one(row.item);
    if (item) itemRows.set(item.id, item);
  }

  const [items, requesters, contacts] = await Promise.all([
    hydrateItems(supabase, [...itemRows.values()], { nameSource: options.nameSource }),
    fetchNames(
      supabase,
      unique(rows.map((row) => row.requester_id)),
      options.nameSource ?? "public_profiles",
    ),
    options.contacts
      ? supabase.rpc("get_request_contacts", { p_request_ids: rows.map((row) => row.id) })
      : Promise.resolve({ data: [] }),
  ]);

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const contactByRequest = new Map<string, string | null>();
  for (const row of (contacts.data ?? []) as { request_id: string; contact_email: string | null }[]) {
    contactByRequest.set(row.request_id, row.contact_email);
  }

  return rows.map((row) => {
    const requester = requesters.get(row.requester_id);
    return {
      ...row,
      item: itemsById.get(row.item_id) ?? null,
      requester: requester ? { full_name: requester.full_name } : null,
      loan: one(row.loan),
      contact_email: contactByRequest.get(row.id) ?? null,
    };
  });
}

/** Flags overdue loans. Best effort: a failure here must not break the page. */
async function refreshLateLoans(supabase: Supabase): Promise<void> {
  const { error } = await supabase.rpc("mark_late_loans");
  if (error) console.error("[community-share] mark_late_loans failed", error.message);
}

async function ownedItemIds(supabase: Supabase, ownerId: string): Promise<string[]> {
  const rows = assertRead<{ id: string }[]>(
    await supabase.from("items").select("id").eq("owner_id", ownerId),
  );
  return rows.map((row) => row.id);
}

async function uploadImages(
  supabase: Supabase,
  userId: string,
  itemId: string,
  images: UploadImage[],
): Promise<void> {
  for (const image of images) {
    const path = `${userId}/${itemId}/${crypto.randomUUID()}.${image.ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, image.bytes, { contentType: image.mime, upsert: false });

    if (uploadError) {
      console.error("[community-share] image upload failed", uploadError.message);
      throw new AppError("INVALID_IMAGE");
    }

    const { error } = await supabase.rpc("add_item_image", {
      p_item_id: itemId,
      p_storage_path: path,
    });

    if (error) {
      // Do not leave an orphaned file behind when the row was refused.
      await supabase.storage.from(BUCKET).remove([path]);
      throwWriteError(error);
    }
  }
}

async function rpcWrite(
  supabase: Supabase,
  fn: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throwWriteError(error);
  return data;
}

function loansFromRequests(
  requests: BorrowRequestWithRelations[],
  status: Loan["status"],
): LoanWithRelations[] {
  return requests.flatMap((request) =>
    request.loan && request.loan.status === status
      ? [{ ...request.loan, borrow_request: request }]
      : [],
  );
}

export const supabaseRepository: DataRepository = {
  async getUserById(userId) {
    if (!GUID.test(userId)) return null;
    const supabase = await createClient();
    return assertRead<User | null>(
      await supabase.from("users").select(USER_SELECT).eq("id", userId).maybeSingle(),
    );
  },

  async getCategories() {
    const supabase = await createClient();
    return assertRead<Category[]>(
      await supabase.from("categories").select("id, name").order("name"),
    );
  },

  async getHomeDashboard(userId): Promise<HomeDashboard> {
    const supabase = await createClient();
    await refreshLateLoans(supabase);

    const itemIds = await ownedItemIds(supabase, userId);

    const [categories, recentRows, loanRows, pendingRows] = await Promise.all([
      supabase.from("categories").select("id, name").order("name").limit(6),
      supabase
        .from("items")
        .select(ITEM_SELECT)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("borrow_requests")
        .select(REQUEST_SELECT)
        .eq("requester_id", userId)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false })
        .limit(50),
      itemIds.length
        ? supabase
            .from("borrow_requests")
            .select(REQUEST_SELECT)
            .in("item_id", itemIds)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const [recentItems, myLoans, pendingRequests] = await Promise.all([
      hydrateItems(supabase, assertRead<ItemRow[]>(recentRows as never)),
      hydrateRequests(supabase, assertRead<RequestRow[]>(loanRows as never)),
      hydrateRequests(supabase, assertRead<RequestRow[]>(pendingRows as never)),
    ]);

    return {
      categories: assertRead<Category[]>(categories),
      recentItems,
      myLoans,
      pendingRequests,
    };
  },

  async getCatalogItems({ q, category, area, from, to }) {
    const supabase = await createClient();

    let query = supabase
      .from("items")
      .select(ITEM_SELECT)
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false })
      .limit(100);

    if (q) query = query.ilike("name", `%${escapeLike(q)}%`);
    if (category) query = query.eq("category_id", category);
    if (area) query = query.eq("area", area);

    let rows = assertRead<ItemRow[]>((await query) as never);

    const start = from ?? to;
    const end = to ?? from;
    if (start && end && start <= end && rows.length > 0) {
      const { data, error } = await supabase.rpc("filter_available_items", {
        p_item_ids: rows.map((row) => row.id),
        p_start_date: start,
        p_end_date: end,
      });
      if (!error) {
        const available = new Set((data ?? []) as string[]);
        rows = rows.filter((row) => available.has(row.id));
      }
    }

    return hydrateItems(supabase, rows);
  },

  async searchItems(query) {
    const term = query.trim();
    if (!term) return [];
    const supabase = await createClient();
    return assertRead<{ id: string; name: string }[]>(
      await supabase
        .from("items")
        .select("id, name")
        .eq("approval_status", "approved")
        .ilike("name", `%${escapeLike(term)}%`)
        .order("name")
        .limit(8),
    );
  },

  async getItemById(itemId) {
    if (!GUID.test(itemId)) return null;
    const supabase = await createClient();
    const row = assertRead<ItemRow | null>(
      (await supabase.from("items").select(ITEM_SELECT).eq("id", itemId).maybeSingle()) as never,
    );
    if (!row) return null;
    const [item] = await hydrateItems(supabase, [row], { allImages: true });
    return item ?? null;
  },

  async getItemBookings(itemId): Promise<ItemBooking[]> {
    if (!GUID.test(itemId)) return [];
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_item_bookings", { p_item_id: itemId });
    if (error) return [];
    return (data ?? []) as ItemBooking[];
  },

  async getMyItems(userId) {
    const supabase = await createClient();
    const rows = assertRead<ItemRow[]>(
      (await supabase
        .from("items")
        .select(ITEM_SELECT)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })) as never,
    );
    return hydrateItems(supabase, rows);
  },

  async getIncomingRequests(ownerId) {
    const supabase = await createClient();
    const itemIds = await ownedItemIds(supabase, ownerId);
    if (itemIds.length === 0) return [];

    const rows = assertRead<RequestRow[]>(
      (await supabase
        .from("borrow_requests")
        .select(REQUEST_SELECT)
        .in("item_id", itemIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(100)) as never,
    );
    return hydrateRequests(supabase, rows, { contacts: true });
  },

  async getOwnerLoans(ownerId) {
    const supabase = await createClient();
    await refreshLateLoans(supabase);
    const itemIds = await ownedItemIds(supabase, ownerId);
    if (itemIds.length === 0) return [];

    const rows = assertRead<RequestRow[]>(
      (await supabase
        .from("borrow_requests")
        .select(REQUEST_SELECT)
        .in("item_id", itemIds)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(200)) as never,
    );
    return hydrateRequests(supabase, rows, { contacts: true });
  },

  async getMyLoans(userId) {
    const supabase = await createClient();
    await refreshLateLoans(supabase);

    const rows = assertRead<RequestRow[]>(
      (await supabase
        .from("borrow_requests")
        .select(REQUEST_SELECT)
        .eq("requester_id", userId)
        .order("created_at", { ascending: false })
        .limit(200)) as never,
    );
    return hydrateRequests(supabase, rows, { contacts: true });
  },

  async getAdminDashboard(): Promise<AdminDashboard> {
    const supabase = await createClient();
    await refreshLateLoans(supabase);

    const [userRows, itemRows, loanRows] = await Promise.all([
      supabase
        .from("users")
        .select(USER_SELECT)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("items")
        .select(ITEM_SELECT)
        .eq("approval_status", "pending")
        .order("created_at", { ascending: true })
        .limit(100),
      supabase
        .from("loans")
        .select("borrow_request_id")
        .in("status", ["active", "late", "returned_pending_confirmation"])
        .limit(300),
    ]);

    const users = assertRead<User[]>(userRows);
    const openRequestIds = assertRead<{ borrow_request_id: string }[]>(loanRows).map(
      (row) => row.borrow_request_id,
    );

    const requestRows = openRequestIds.length
      ? assertRead<RequestRow[]>(
          (await supabase
            .from("borrow_requests")
            .select(REQUEST_SELECT)
            .in("id", openRequestIds)
            .order("end_date", { ascending: true })) as never,
        )
      : [];

    const [pendingItems, requests] = await Promise.all([
      hydrateItems(supabase, assertRead<ItemRow[]>(itemRows as never), { nameSource: "users" }),
      hydrateRequests(supabase, requestRows, { nameSource: "users" }),
    ]);

    return {
      pendingUsers: users.filter((user) => user.status === "pending"),
      users,
      pendingItems,
      activeLoans: [
        ...loansFromRequests(requests, "active"),
        ...loansFromRequests(requests, "returned_pending_confirmation"),
      ],
      lateLoans: loansFromRequests(requests, "late"),
    };
  },

  async createItem(userId, input, images) {
    const supabase = await createClient();
    const id = (await rpcWrite(supabase, "create_item", {
      p_name: input.name,
      p_description: input.description ?? "",
      p_category_id: input.categoryId,
      p_condition_rating: input.conditionRating,
      p_total_quantity: input.totalQuantity,
      p_deposit_amount: input.depositAmount,
      p_area: input.area,
    })) as string;

    await uploadImages(supabase, userId, id, images);
    return { id };
  },

  async updateItem(userId, itemId, input, images, removeImageIds) {
    const supabase = await createClient();

    await rpcWrite(supabase, "update_item", {
      p_item_id: itemId,
      p_name: input.name,
      p_description: input.description ?? "",
      p_category_id: input.categoryId,
      p_condition_rating: input.conditionRating,
      p_total_quantity: input.totalQuantity,
      p_deposit_amount: input.depositAmount,
      p_area: input.area,
    });

    for (const imageId of removeImageIds) {
      const path = (await rpcWrite(supabase, "remove_item_image", {
        p_image_id: imageId,
      })) as string | null;
      if (path) await supabase.storage.from(BUCKET).remove([path]);
    }

    await uploadImages(supabase, userId, itemId, images);
  },

  async deleteItem(itemId) {
    const supabase = await createClient();
    const paths = (await rpcWrite(supabase, "delete_item", { p_item_id: itemId })) as
      | string[]
      | null;
    if (paths && paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }
  },

  async createBorrowRequest(_userId, input) {
    const supabase = await createClient();
    await rpcWrite(supabase, "create_borrow_request", {
      p_item_id: input.itemId,
      p_start_date: input.startDate,
      p_end_date: input.endDate,
      p_quantity: input.requestedQuantity,
    });
  },

  async cancelBorrowRequest(requestId) {
    const supabase = await createClient();
    await rpcWrite(supabase, "cancel_borrow_request", { p_request_id: requestId });
  },

  async approveBorrowRequest(requestId) {
    const supabase = await createClient();
    await rpcWrite(supabase, "approve_borrow_request", { p_request_id: requestId });
  },

  async rejectBorrowRequest(requestId) {
    const supabase = await createClient();
    await rpcWrite(supabase, "reject_borrow_request", { p_request_id: requestId });
  },

  async markLoanReturned(loanId) {
    const supabase = await createClient();
    await rpcWrite(supabase, "mark_loan_returned", { p_loan_id: loanId });
  },

  async confirmLoanReturn(loanId) {
    const supabase = await createClient();
    await rpcWrite(supabase, "confirm_loan_return", { p_loan_id: loanId });
  },

  async markDepositReceived(loanId) {
    const supabase = await createClient();
    await rpcWrite(supabase, "mark_deposit_received", { p_loan_id: loanId });
  },

  async updateProfile(_userId, input) {
    const supabase = await createClient();
    await rpcWrite(supabase, "update_my_profile", {
      p_full_name: input.fullName,
      p_residence_area: input.residenceArea,
    });
  },

  async updateUserStatus(_adminId, userId, action) {
    const supabase = await createClient();
    await rpcWrite(supabase, "admin_set_user_status", {
      p_user_id: userId,
      p_action: action,
    });
  },

  async updateItemApproval(itemId, action) {
    const supabase = await createClient();
    await rpcWrite(supabase, "admin_set_item_approval", {
      p_item_id: itemId,
      p_action: action,
    });
  },
};
