"use server";

import { revalidatePath } from "next/cache";

import { requireApprovedUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import {
  notifyRequestCreated,
  notifyRequestDecision,
  notifyReturnMarked,
} from "@/lib/email/notify";
import { messageForError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
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

  let requestId: string;
  try {
    await enforceRateLimit("borrowRequest", user.id);
    const repo = await getRepository();
    // Availability, ownership and date rules are re-checked inside the database.
    const { id } = await repo.createBorrowRequest(user.id, parsed.data);
    requestId = id;
  } catch (error) {
    return { error: messageForError(error, "שגיאה בשליחת הבקשה") };
  }

  await notifyRequestCreated(requestId);

  revalidatePath("/my-loans");
  revalidatePath("/");
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

  const { requestId, action } = parsed.data;

  try {
    await enforceRateLimit("mutation", user.id);
    const repo = await getRepository();
    if (action === "approve") {
      await repo.approveBorrowRequest(requestId, user.id);
    } else if (action === "reject") {
      await repo.rejectBorrowRequest(requestId, user.id);
    } else {
      await repo.cancelBorrowRequest(requestId, user.id);
    }
  } catch (error) {
    return { error: messageForError(error, "שגיאה בעדכון הבקשה") };
  }

  if (action !== "cancel") {
    await notifyRequestDecision(requestId, action === "approve");
  }

  revalidatePath("/", "layout");
  const messages = { approve: "הבקשה אושרה", reject: "הבקשה נדחתה", cancel: "הבקשה בוטלה" };
  return { success: messages[action] };
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

  const { loanId, action } = parsed.data;

  try {
    await enforceRateLimit("mutation", user.id);
    const repo = await getRepository();
    if (action === "mark_returned") {
      await repo.markLoanReturned(loanId, user.id);
    } else if (action === "confirm_return") {
      await repo.confirmLoanReturn(loanId, user.id);
    } else {
      await repo.markDepositReceived(loanId, user.id);
    }
  } catch (error) {
    return { error: messageForError(error, "שגיאה בביצוע הפעולה") };
  }

  if (action === "mark_returned") {
    await notifyReturnMarked(loanId);
  }

  revalidatePath("/", "layout");
  return { success: "הפעולה בוצעה בהצלחה" };
}
