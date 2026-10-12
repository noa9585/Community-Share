"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { messageForError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import {
  adminItemActionSchema,
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

  revalidatePath("/admin");
  revalidatePath("/catalog");
  return { success: "סטטוס הפריט עודכן" };
}
