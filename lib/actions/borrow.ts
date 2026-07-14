"use server";

import { revalidatePath } from "next/cache";

import { requireApprovedUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import {
  borrowActionSchema,
  borrowRequestSchema,
  loanActionSchema,
} from "@/lib/validation/schemas";
import type { ActionResult } from "@/lib/actions/auth";

export async function createBorrowRequestAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const parsed = borrowRequestSchema.safeParse({
    itemId: formData.get("itemId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    requestedQuantity: formData.get("requestedQuantity"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  const repo = await getRepository();
  const available = await repo.checkItemAvailability(
    parsed.data.itemId,
    parsed.data.startDate,
    parsed.data.endDate,
    parsed.data.requestedQuantity,
  );

  if (!available) {
    return { error: "הפריט אינו זמין בתאריכים או בכמות המבוקשת" };
  }

  try {
    await repo.createBorrowRequest(user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "שגיאה בשליחת הבקשה" };
  }

  revalidatePath("/my-loans");
  revalidatePath(`/items/${parsed.data.itemId}`);
  return { success: "בקשת ההשאלה נשלחה לבעל הפריט" };
}

export async function handleBorrowRequestAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const parsed = borrowActionSchema.safeParse({
    requestId: formData.get("requestId"),
    action: formData.get("action"),
  });

  if (!parsed.success) {
    return { error: "קלט לא תקין" };
  }

  const repo = await getRepository();

  try {
    if (parsed.data.action === "approve") {
      await repo.approveBorrowRequest(parsed.data.requestId, user.id);
    } else {
      await repo.rejectBorrowRequest(parsed.data.requestId, user.id);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "שגיאה בעדכון הבקשה" };
  }

  revalidatePath("/my-items");
  revalidatePath("/my-loans");
  return { success: parsed.data.action === "approve" ? "הבקשה אושרה" : "הבקשה נדחתה" };
}

export async function handleLoanAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const parsed = loanActionSchema.safeParse({
    loanId: formData.get("loanId"),
    action: formData.get("action"),
  });

  if (!parsed.success) {
    return { error: "קלט לא תקין" };
  }

  const repo = await getRepository();

  try {
    if (parsed.data.action === "mark_returned") {
      await repo.markLoanReturned(parsed.data.loanId, user.id);
    } else if (parsed.data.action === "confirm_return") {
      await repo.confirmLoanReturn(parsed.data.loanId, user.id);
    } else if (parsed.data.action === "mark_deposit_received") {
      await repo.markDepositReceived(parsed.data.loanId);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "שגיאה בביצוע הפעולה" };
  }

  revalidatePath("/my-loans");
  revalidatePath("/my-items");
  revalidatePath("/admin");
  return { success: "הפעולה בוצעה בהצלחה" };
}
