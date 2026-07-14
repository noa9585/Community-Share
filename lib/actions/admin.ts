"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import {
  adminItemActionSchema,
  adminUserActionSchema,
} from "@/lib/validation/schemas";
import type { ActionResult } from "@/lib/actions/auth";

export async function adminUserAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdminUser();

  const parsed = adminUserActionSchema.safeParse({
    userId: formData.get("userId"),
    action: formData.get("action"),
  });

  if (!parsed.success) {
    return { error: "קלט לא תקין" };
  }

  const repo = await getRepository();
  await repo.updateUserStatus(parsed.data.userId, parsed.data.action);

  revalidatePath("/admin");
  return { success: "סטטוס המשתמש עודכן" };
}

export async function adminItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdminUser();

  const parsed = adminItemActionSchema.safeParse({
    itemId: formData.get("itemId"),
    action: formData.get("action"),
  });

  if (!parsed.success) {
    return { error: "קלט לא תקין" };
  }

  const repo = await getRepository();
  await repo.updateItemApproval(parsed.data.itemId, parsed.data.action);

  revalidatePath("/admin");
  revalidatePath("/catalog");
  return { success: "סטטוס הפריט עודכן" };
}

export async function markLateLoansAction(): Promise<ActionResult> {
  await requireAdminUser();
  const repo = await getRepository();
  await repo.markLateLoans();
  revalidatePath("/admin");
  return { success: "השאלות באיחור עודכנו" };
}
