"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { notifyItemApproved, notifyUserApproved } from "@/lib/email/notify";
import { messageForError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import {
  adminAreaSchema,
  adminCategorySchema,
  adminItemActionSchema,
  adminLoanActionSchema,
  adminReportActionSchema,
  adminUserActionSchema,
} from "@/lib/validation/schemas";
import type { ActionResult } from "@/lib/actions/auth";

export async function adminUserAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdminUser();

  const parsed = adminUserActionSchema.safeParse({
    userId: formData.get("userId"),
    action: formData.get("action"),
  });

  if (!parsed.success) {
    return { error: "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("mutation", admin.id);
    const repo = await getRepository();
    await repo.updateUserStatus(admin.id, parsed.data.userId, parsed.data.action);
  } catch (error) {
    return { error: messageForError(error, "לא ניתן לעדכן את המשתמש") };
  }

  if (parsed.data.action === "approve") {
    await notifyUserApproved(parsed.data.userId);
  }

  revalidatePath("/admin");
  return { success: "סטטוס המשתמש עודכן" };
}

export async function adminItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdminUser();

  const parsed = adminItemActionSchema.safeParse({
    itemId: formData.get("itemId"),
    action: formData.get("action"),
  });

  if (!parsed.success) {
    return { error: "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("mutation", admin.id);
    const repo = await getRepository();
    await repo.updateItemApproval(parsed.data.itemId, parsed.data.action);
  } catch (error) {
    return { error: messageForError(error, "לא ניתן לעדכן את הפריט") };
  }

  if (parsed.data.action === "approve") {
    await notifyItemApproved(parsed.data.itemId);
  }

  revalidatePath("/admin");
  revalidatePath("/catalog");
  return { success: "סטטוס הפריט עודכן" };
}

/** Closes a stuck loan on the owner's behalf. The database records it in the audit log. */
export async function adminLoanAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdminUser();

  const parsed = adminLoanActionSchema.safeParse({ loanId: formData.get("loanId") });

  if (!parsed.success) {
    return { error: "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("mutation", admin.id);
    const repo = await getRepository();
    await repo.adminCloseLoan(admin.id, parsed.data.loanId);
  } catch (error) {
    return { error: messageForError(error, "לא ניתן לסגור את ההשאלה") };
  }

  revalidatePath("/", "layout");
  return { success: "ההשאלה נסגרה והמלאי שוחרר" };
}

export async function adminReportAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdminUser();

  const parsed = adminReportActionSchema.safeParse({
    reportId: formData.get("reportId"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("mutation", admin.id);
    const repo = await getRepository();
    await repo.updateReport(admin.id, parsed.data.reportId, parsed.data.status, parsed.data.note);
  } catch (error) {
    return { error: messageForError(error, "לא ניתן לעדכן את הדיווח") };
  }

  revalidatePath("/admin");
  return { success: "הדיווח עודכן" };
}

export async function adminCategoryAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdminUser();

  const parsed = adminCategorySchema.safeParse({
    intent: formData.get("intent"),
    id: formData.get("id") || undefined,
    name: formData.get("name") ?? "",
    icon: formData.get("icon") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("mutation", admin.id);
    const repo = await getRepository();
    if (parsed.data.intent === "save") {
      await repo.saveCategory(admin.id, parsed.data);
    } else {
      await repo.deleteCategory(admin.id, parsed.data.id);
    }
  } catch (error) {
    return { error: messageForError(error, "לא ניתן לעדכן את הקטגוריה") };
  }

  revalidatePath("/", "layout");
  return {
    success: parsed.data.intent === "delete" ? "הקטגוריה נמחקה" : "הקטגוריה נשמרה",
  };
}

export async function adminAreaAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdminUser();

  const parsed = adminAreaSchema.safeParse({
    intent: formData.get("intent"),
    id: formData.get("id") || undefined,
    name: formData.get("name") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("mutation", admin.id);
    const repo = await getRepository();
    if (parsed.data.intent === "save") {
      await repo.saveArea(admin.id, parsed.data);
    } else {
      await repo.deleteArea(admin.id, parsed.data.id);
    }
  } catch (error) {
    return { error: messageForError(error, "לא ניתן לעדכן את האזור") };
  }

  revalidatePath("/", "layout");
  return { success: parsed.data.intent === "delete" ? "האזור נמחק" : "האזור נשמר" };
}
