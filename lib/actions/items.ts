"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApprovedUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { messageForError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { readUploadedImages } from "@/lib/utils/images";
import { idSchema, itemSchema, searchQuerySchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/lib/actions/auth";

function parseItem(formData: FormData) {
  return itemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    categoryId: formData.get("categoryId"),
    conditionRating: formData.get("conditionRating"),
    totalQuantity: formData.get("totalQuantity"),
    depositAmount: formData.get("depositAmount") || 0,
    area: formData.get("area"),
  });
}

export async function createItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const parsed = parseItem(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("itemWrite", user.id);
    const images = await readUploadedImages(formData, "images");
    const repo = await getRepository();
    await repo.createItem(user.id, parsed.data, images);
  } catch (error) {
    return { error: messageForError(error, "שגיאה ביצירת הפריט") };
  }

  revalidatePath("/my-items");
  revalidatePath("/admin");
  redirect("/my-items?created=1");
}

export async function updateItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const itemId = idSchema.safeParse(formData.get("itemId"));
  const removeImageIds = idSchema.array().max(5).safeParse(formData.getAll("removeImageIds"));
  const parsed = parseItem(formData);

  if (!itemId.success || !removeImageIds.success) {
    return { error: "קלט לא תקין" };
  }
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("itemWrite", user.id);
    const images = await readUploadedImages(formData, "images");
    const repo = await getRepository();
    await repo.updateItem(user.id, itemId.data, parsed.data, images, removeImageIds.data);
  } catch (error) {
    return { error: messageForError(error, "שגיאה בעדכון הפריט") };
  }

  revalidatePath("/my-items");
  revalidatePath("/catalog");
  revalidatePath(`/items/${itemId.data}`);
  redirect("/my-items?updated=1");
}

export async function deleteItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const itemId = idSchema.safeParse(formData.get("itemId"));
  if (!itemId.success) {
    return { error: "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("itemWrite", user.id);
    const repo = await getRepository();
    await repo.deleteItem(itemId.data, user.id);
  } catch (error) {
    return { error: messageForError(error, "לא ניתן למחוק את הפריט") };
  }

  revalidatePath("/my-items");
  revalidatePath("/catalog");
  return { success: "הפריט נמחק" };
}

export async function searchItemsAction(query: string): Promise<{ id: string; name: string }[]> {
  const user = await requireApprovedUser();

  const parsed = searchQuerySchema.safeParse(query);
  if (!parsed.success) return [];

  try {
    await enforceRateLimit("search", user.id);
    const repo = await getRepository();
    return await repo.searchItems(parsed.data);
  } catch {
    return [];
  }
}
