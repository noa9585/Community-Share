"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApprovedUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { messageForError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { readUploadedImages } from "@/lib/utils/images";
import { idSchema, messageSchema, startConversationSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/lib/actions/auth";

/** Opens (or reopens) the chat about an item and takes the user to it. */
export async function startConversationAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const parsed = startConversationSchema.safeParse({
    itemId: formData.get("itemId"),
    memberId: formData.get("memberId") || undefined,
  });

  if (!parsed.success) {
    return { error: "קלט לא תקין" };
  }

  let conversationId: string;
  try {
    await enforceRateLimit("mutation", user.id);
    const repo = await getRepository();
    // Who may talk to whom about which item is decided inside the database.
    const { id } = await repo.startConversation(user.id, parsed.data.itemId, parsed.data.memberId);
    conversationId = id;
  } catch (error) {
    return { error: messageForError(error, "לא ניתן לפתוח את השיחה") };
  }

  redirect(`/messages/${conversationId}`);
}

export async function sendMessageAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const parsed = messageSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  const { conversationId, body } = parsed.data;

  try {
    await enforceRateLimit("chatMessage", user.id);
    const [image = null] = await readUploadedImages(formData, "image", 1);
    if (!body && !image) {
      return { error: "אי אפשר לשלוח הודעה ריקה" };
    }
    const repo = await getRepository();
    await repo.sendMessage(user.id, conversationId, body, image);
  } catch (error) {
    return { error: messageForError(error, "ההודעה לא נשלחה") };
  }

  revalidatePath(`/messages/${conversationId}`);
  return {};
}

/** Called by the open chat page whenever it shows a message the user had not seen. */
export async function markConversationReadAction(conversationId: string): Promise<void> {
  const user = await requireApprovedUser();

  const parsed = idSchema.safeParse(conversationId);
  if (!parsed.success) return;

  try {
    const repo = await getRepository();
    await repo.markConversationRead(parsed.data, user.id);
  } catch {
    // The unread badge stays; nothing else depends on this.
    return;
  }

  revalidatePath(`/messages/${parsed.data}`);
}
