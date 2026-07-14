"use server";

import { revalidatePath } from "next/cache";

import { requireApprovedUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { isMockMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { itemSchema } from "@/lib/validation/schemas";
import {
  buildStoragePath,
  isAllowedImageType,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/utils/url";
import type { ActionResult } from "@/lib/actions/auth";

export async function createItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    conditionRating: formData.get("conditionRating"),
    totalQuantity: formData.get("totalQuantity"),
    depositAmount: formData.get("depositAmount"),
    area: formData.get("area"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  const repo = await getRepository();

  if (isMockMode()) {
    const imageUrls: string[] = [];
    const files = formData
      .getAll("images")
      .filter((f): f is File => f instanceof File && f.size > 0);

    for (const file of files.slice(0, 5)) {
      if (!isAllowedImageType(file.type) || file.size > MAX_IMAGE_SIZE_BYTES) continue;
      imageUrls.push(`https://picsum.photos/seed/${crypto.randomUUID()}/800/600`);
    }

    await repo.createItem(user.id, parsed.data, imageUrls);
    revalidatePath("/my-items");
    revalidatePath("/catalog");
    return { success: "הפריט נשלח לאישור אדמין" };
  }

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("items")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      category_id: parsed.data.categoryId,
      condition_rating: parsed.data.conditionRating,
      total_quantity: parsed.data.totalQuantity,
      available_quantity: parsed.data.totalQuantity,
      deposit_amount: parsed.data.depositAmount,
      area: parsed.data.area,
      approval_status: "pending",
    })
    .select("id")
    .single();

  if (error || !item) {
    return { error: error?.message ?? "שגיאה ביצירת פריט" };
  }

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

  for (const file of files.slice(0, 5)) {
    if (!isAllowedImageType(file.type) || file.size > MAX_IMAGE_SIZE_BYTES) continue;

    const path = buildStoragePath(user.id, item.id);
    const { error: uploadError } = await supabase.storage
      .from("item-images")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) continue;

    const { data: publicUrl } = supabase.storage.from("item-images").getPublicUrl(path);

    await supabase.from("item_images").insert({
      item_id: item.id,
      url: publicUrl.publicUrl,
    });
  }

  revalidatePath("/my-items");
  revalidatePath("/catalog");
  return { success: "הפריט נשלח לאישור אדמין" };
}

export async function deleteItemAction(itemId: string): Promise<ActionResult> {
  const user = await requireApprovedUser();
  const repo = await getRepository();

  try {
    await repo.deleteItem(itemId, user.id);
  } catch {
    return { error: "לא ניתן למחוק את הפריט" };
  }

  revalidatePath("/my-items");
  revalidatePath("/catalog");
  return { success: "הפריט נמחק" };
}

export async function searchItemsAction(query: string) {
  await requireApprovedUser();
  const repo = await getRepository();
  return repo.searchItems(query);
}
