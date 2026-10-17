import type { DataRepository } from "@/lib/data/repository";
import { AppError } from "@/lib/errors";
import type {
  AdminDashboard,
  AdminStats,
  AppNotification,
  BorrowRequest,
  BorrowRequestWithRelations,
  ConversationDetail,
  ConversationSummary,
  HomeDashboard,
  Item,
  ItemBooking,
  ItemImage,
  ItemWithRelations,
  Loan,
  LoanWithRelations,
  TaxonomyUsage,
  UnreadCounts,
} from "@/types/database";

import {
  type MockConversation,
  adminCloseLoan,
  approveBorrowRequest,
  cancelBorrowRequest,
  checkItemAvailability,
  confirmLoanReturn,
  createId,
  deleteItem,
  ensureConversation,
  getMockState,
  insertBorrowRequest,
  insertItem,
  logAdminAction,
  markDepositReceived,
  markLateLoans,
  markLoanReturned,
  notifyAdmins,
  openBookings,
  pushNotification,
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

function participantConversation(conversationId: string, userId: string): MockConversation | null {
  const conversation = getMockState().conversations.find((c) => c.id === conversationId);
  if (!conversation) return null;
  return conversation.owner_id === userId || conversation.member_id === userId
    ? conversation
    : null;
}

function lastReadAt(conversation: MockConversation, userId: string): string {
  return conversation.owner_id === userId
    ? conversation.owner_last_read_at
    : conversation.member_last_read_at;
}

function setLastRead(conversation: MockConversation, userId: string, at: string): void {
  if (conversation.owner_id === userId) conversation.owner_last_read_at = at;
  else conversation.member_last_read_at = at;
}

function conversationParties(conversation: MockConversation, userId: string) {
  const state = getMockState();
  const viewerIsOwner = conversation.owner_id === userId;
  const otherId = viewerIsOwner ? conversation.member_id : conversation.owner_id;
  const item = state.items.find((i) => i.id === conversation.item_id);
  return {
    id: conversation.id,
    item_id: conversation.item_id,
    item: item ? enrichItem(item) : null,
    other_party_id: otherId,
    other_party_name: state.users.find((u) => u.id === otherId)?.full_name ?? null,
    viewer_is_owner: viewerIsOwner,
    last_message_at: conversation.last_message_at,
  };
}

function mockStats(): AdminStats {
  const { users, items, borrowRequests, loans, reports, messages } = getMockState();
  const count = <T,>(rows: T[], test: (row: T) => boolean) => rows.filter(test).length;

  const loansPerItem = new Map<string, number>();
  for (const loan of loans) {
    const request = borrowRequests.find((br) => br.id === loan.borrow_request_id);
    if (request) loansPerItem.set(request.item_id, (loansPerItem.get(request.item_id) ?? 0) + 1);
  }

  return {
    users: {
      total: users.length,
      approved: count(users, (u) => u.status === "approved"),
      pending: count(users, (u) => u.status === "pending"),
      blocked: count(users, (u) => u.status === "blocked"),
    },
    items: {
      total: items.length,
      approved: count(items, (i) => i.approval_status === "approved"),
      pending: count(items, (i) => i.approval_status === "pending"),
      rejected: count(items, (i) => i.approval_status === "rejected"),
    },
    requests: {
      total: borrowRequests.length,
      pending: count(borrowRequests, (br) => br.status === "pending"),
    },
    loans: {
      active: count(loans, (l) => l.status === "active"),
      late: count(loans, (l) => l.status === "late"),
      awaiting: count(loans, (l) => l.status === "returned_pending_confirmation"),
      completed: count(loans, (l) => l.status === "completed"),
    },
    openReports: count(reports, (r) => r.status === "open" || r.status === "in_progress"),
    messages: count(messages, (m) => m.kind !== "system"),
    topItems: [...loansPerItem.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([itemId, total]) => ({
        name: items.find((i) => i.id === itemId)?.name ?? "פריט",
        loans: total,
      })),
  };
}

export const mockRepository: DataRepository = {
  async getUserById(userId) {
    return getMockState().users.find((u) => u.id === userId) ?? null;
  },

  async getCategories() {
    return getMockState().categories;
  },

  async getAreas() {
    return getMockState().areas;
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
    const userById = (id: string | null) => state.users.find((u) => u.id === id);
    return {
      pendingUsers: state.users.filter((u) => u.status === "pending"),
      users: state.users,
      pendingItems: state.items.filter((i) => i.approval_status === "pending").map(enrichItem),
      items: [...state.items].sort(byNewest).map(enrichItem),
      activeLoans: state.loans
        .filter((l) => l.status === "active" || l.status === "returned_pending_confirmation")
        .map(loanEntry),
      lateLoans: state.loans.filter((l) => l.status === "late").map(loanEntry),
      reports: [...state.reports].sort(byNewest).map((report) => {
        const reported = userById(report.reported_user_id);
        return {
          ...report,
          reporter_name: userById(report.reporter_id)?.full_name ?? null,
          reported_user_name: reported?.full_name ?? null,
          reported_user_status: reported?.status ?? null,
        };
      }),
      stats: mockStats(),
      auditLog: [...state.auditLog]
        .sort(byNewest)
        .slice(0, 30)
        .map((entry) => ({
          id: entry.id,
          action: entry.action,
          target_type: entry.target_type,
          created_at: entry.created_at,
          admin_name: userById(entry.admin_id)?.full_name ?? null,
        })),
    };
  },

  // Demo mode sends no e-mail, so there is nothing to log.
  async getEmailLog() {
    return [];
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
    const id = createId();
    insertBorrowRequest({
      id,
      item_id: input.itemId,
      requester_id: userId,
      start_date: input.startDate,
      end_date: input.endDate,
      requested_quantity: input.requestedQuantity,
      status: "pending",
      created_at: new Date().toISOString(),
    });
    return { id };
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
    logAdminAction(adminId, `user_${action}`, "user", userId);
    if (action === "approve") {
      pushNotification(
        userId,
        "user_approved",
        "ברוך הבא לקהילה",
        "החשבון שלך אושר. אפשר לחפש ציוד בקטלוג ולשתף פריטים משלך.",
        "/catalog",
        userId,
      );
    }
  },

  async updateItemApproval(itemId, action) {
    updateItemApproval(itemId, action === "approve" ? "approved" : "rejected");
  },

  async adminCloseLoan(adminId, loanId) {
    adminCloseLoan(loanId, adminId);
  },

  async getTaxonomyUsage(): Promise<TaxonomyUsage> {
    const { categories, areas, items, users } = getMockState();
    return {
      categories: Object.fromEntries(
        categories.map((c) => [c.id, items.filter((i) => i.category_id === c.id).length]),
      ),
      areas: Object.fromEntries(
        areas.map((a) => [
          a.id,
          {
            users: users.filter((u) => u.residence_area === a.name).length,
            items: items.filter((i) => i.area === a.name).length,
          },
        ]),
      ),
    };
  },

  async saveCategory(adminId, input) {
    const { categories } = getMockState();
    if (categories.some((c) => c.name === input.name && c.id !== input.id)) {
      throw new AppError("DUPLICATE_NAME");
    }
    if (input.id) {
      const category = categories.find((c) => c.id === input.id);
      if (!category) throw new AppError("NOT_FOUND");
      category.name = input.name;
      category.icon = input.icon;
    } else {
      categories.push({ id: createId(), name: input.name, icon: input.icon });
    }
    logAdminAction(adminId, input.id ? "category_update" : "category_create", "category", input.id ?? "");
  },

  async deleteCategory(adminId, categoryId) {
    const state = getMockState();
    if (state.items.some((i) => i.category_id === categoryId)) throw new AppError("CATEGORY_IN_USE");
    if (state.categories.length <= 1) throw new AppError("LAST_CATEGORY");
    state.categories = state.categories.filter((c) => c.id !== categoryId);
    logAdminAction(adminId, "category_delete", "category", categoryId);
  },

  async saveArea(adminId, input) {
    const state = getMockState();
    if (state.areas.some((a) => a.name === input.name && a.id !== input.id)) {
      throw new AppError("DUPLICATE_NAME");
    }
    if (input.id) {
      const area = state.areas.find((a) => a.id === input.id);
      if (!area) throw new AppError("NOT_FOUND");
      // What ON UPDATE CASCADE does in the database.
      for (const user of state.users) if (user.residence_area === area.name) user.residence_area = input.name;
      for (const item of state.items) if (item.area === area.name) item.area = input.name;
      area.name = input.name;
    } else {
      state.areas.push({ id: createId(), name: input.name });
    }
    logAdminAction(adminId, input.id ? "area_update" : "area_create", "area", input.id ?? "");
  },

  async deleteArea(adminId, areaId) {
    const state = getMockState();
    const area = state.areas.find((a) => a.id === areaId);
    if (!area) throw new AppError("NOT_FOUND");
    if (
      state.users.some((u) => u.residence_area === area.name) ||
      state.items.some((i) => i.area === area.name)
    ) {
      throw new AppError("AREA_IN_USE");
    }
    if (state.areas.length <= 1) throw new AppError("LAST_AREA");
    state.areas = state.areas.filter((a) => a.id !== areaId);
    logAdminAction(adminId, "area_delete", "area", areaId);
  },

  async getConversations(userId): Promise<ConversationSummary[]> {
    const state = getMockState();
    return state.conversations
      .filter((c) => c.owner_id === userId || c.member_id === userId)
      .flatMap((conversation) => {
        const messages = state.messages.filter((m) => m.conversation_id === conversation.id);
        const last = messages.at(-1);
        if (!last) return [];
        const lastRead = lastReadAt(conversation, userId);
        return [
          {
            ...conversationParties(conversation, userId),
            last_message_preview: last.kind === "image" && !last.body ? "תמונה" : last.body,
            unread_count: messages.filter(
              (m) => m.sender_id !== userId && m.created_at > lastRead,
            ).length,
          },
        ];
      })
      .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
  },

  async getConversation(conversationId, userId): Promise<ConversationDetail | null> {
    const state = getMockState();
    const conversation = participantConversation(conversationId, userId);
    if (!conversation) return null;
    return {
      ...conversationParties(conversation, userId),
      messages: state.messages.filter((m) => m.conversation_id === conversationId),
    };
  },

  async startConversation(userId, itemId, memberId) {
    const state = getMockState();
    const item = state.items.find((i) => i.id === itemId);
    if (!item) throw new AppError("NOT_FOUND");

    const isOwner = item.owner_id === userId;
    const member = isOwner ? memberId : userId;
    if (!member || member === item.owner_id) throw new AppError("INVALID_INPUT");

    const hasRequest = state.borrowRequests.some(
      (br) => br.item_id === itemId && br.requester_id === member,
    );
    const exists = state.conversations.some(
      (c) => c.item_id === itemId && c.member_id === member,
    );
    if (!exists && !hasRequest) {
      if (isOwner) throw new AppError("FORBIDDEN");
      if (item.approval_status !== "approved") throw new AppError("NOT_FOUND");
    }

    const conversation = ensureConversation(itemId, member);
    if (!conversation) throw new AppError("INVALID_INPUT");
    return { id: conversation.id };
  },

  async sendMessage(userId, conversationId, body, image) {
    const state = getMockState();
    const conversation = participantConversation(conversationId, userId);
    if (!conversation) throw new AppError("FORBIDDEN");
    if (!body && !image) throw new AppError("INVALID_INPUT");

    const now = new Date().toISOString();
    state.messages.push({
      id: createId(),
      conversation_id: conversationId,
      sender_id: userId,
      kind: image ? "image" : "text",
      body,
      // Demo mode has no file storage, so uploads become placeholder pictures.
      image_url: image ? placeholderImage() : null,
      created_at: now,
    });
    conversation.last_message_at = now;
    setLastRead(conversation, userId, now);

    const otherId =
      conversation.owner_id === userId ? conversation.member_id : conversation.owner_id;
    const preview = body ? body.slice(0, 140) : "תמונה";
    const pending = state.notifications.find(
      (n) =>
        n.user_id === otherId &&
        n.type === "new_message" &&
        n.related_id === conversationId &&
        !n.read_at,
    );
    if (pending) {
      pending.body = preview;
      pending.created_at = now;
    } else {
      const sender = state.users.find((u) => u.id === userId);
      pushNotification(
        otherId,
        "new_message",
        `הודעה חדשה מ${sender?.full_name ?? "חבר/ת קהילה"}`,
        preview,
        `/messages/${conversationId}`,
        conversationId,
      );
    }
  },

  async markConversationRead(conversationId, userId) {
    const conversation = participantConversation(conversationId, userId);
    if (!conversation) return;
    const now = new Date().toISOString();
    setLastRead(conversation, userId, now);
    for (const notification of getMockState().notifications) {
      if (
        notification.user_id === userId &&
        notification.type === "new_message" &&
        notification.related_id === conversationId
      ) {
        notification.read_at ??= now;
      }
    }
  },

  async getUnreadCounts(userId): Promise<UnreadCounts> {
    const state = getMockState();
    return {
      notifications: state.notifications.filter((n) => n.user_id === userId && !n.read_at).length,
      conversations: state.conversations.filter(
        (c) =>
          (c.owner_id === userId || c.member_id === userId) &&
          state.messages.some(
            (m) =>
              m.conversation_id === c.id &&
              m.sender_id !== userId &&
              m.created_at > lastReadAt(c, userId),
          ),
      ).length,
    };
  },

  async getNotifications(userId, limit): Promise<AppNotification[]> {
    return getMockState()
      .notifications.filter((n) => n.user_id === userId)
      .sort(byNewest)
      .slice(0, limit)
      .map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        read_at: notification.read_at,
        created_at: notification.created_at,
      }));
  },

  async markNotificationsRead(userId, ids) {
    const now = new Date().toISOString();
    for (const notification of getMockState().notifications) {
      if (notification.user_id === userId && (!ids || ids.includes(notification.id))) {
        notification.read_at ??= now;
      }
    }
  },

  async createReport(userId, input) {
    const state = getMockState();
    const item =
      input.targetType === "item" ? state.items.find((i) => i.id === input.targetId) : undefined;
    const reported = state.users.find(
      (u) => u.id === (item ? item.owner_id : input.targetId),
    );
    if (!reported || (input.targetType === "item" && !item)) throw new AppError("NOT_FOUND");
    if (reported.id === userId) throw new AppError("REPORT_SELF");

    const open = state.reports.filter(
      (r) => r.reporter_id === userId && (r.status === "open" || r.status === "in_progress"),
    );
    if (open.length >= 10) throw new AppError("TOO_MANY_REPORTS");

    const label = item ? item.name : reported.full_name;
    const id = createId();
    state.reports.push({
      id,
      reporter_id: userId,
      target_type: input.targetType,
      item_id: item?.id ?? null,
      reported_user_id: reported.id,
      target_label: label,
      reason: input.reason,
      details: input.details,
      status: "open",
      admin_note: null,
      handled_at: null,
      created_at: new Date().toISOString(),
    });
    notifyAdmins(
      "report_created",
      "דיווח חדש",
      `${item ? "על הפריט" : "על המשתמש/ת"} "${label}"`,
      "/admin?tab=reports",
      id,
    );
  },

  async getMyReports(userId) {
    return getMockState()
      .reports.filter((r) => r.reporter_id === userId)
      .sort(byNewest)
      .slice(0, 20);
  },

  async updateReport(adminId, reportId, status, note) {
    const report = getMockState().reports.find((r) => r.id === reportId);
    if (!report) throw new AppError("NOT_FOUND");
    const changed = report.status !== status;
    report.status = status;
    report.admin_note = note || report.admin_note;
    report.handled_at = new Date().toISOString();
    logAdminAction(adminId, `report_${status}`, "report", reportId);

    if (changed) {
      const titles = {
        in_progress: "הדיווח שלך בטיפול",
        resolved: "הדיווח שלך טופל",
        dismissed: "הדיווח שלך נסגר",
      };
      pushNotification(
        report.reporter_id,
        "report_updated",
        titles[status],
        `דיווח על "${report.target_label}"`,
        "/report",
        reportId,
      );
    }
  },
};
