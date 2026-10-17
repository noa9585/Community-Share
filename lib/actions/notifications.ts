"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApprovedUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { safeRedirectPath } from "@/lib/utils/url";
import { idSchema } from "@/lib/validation/schemas";

/** Marks one notification as read and takes the user to what it is about. */
export async function openNotificationAction(formData: FormData): Promise<void> {
  const user = await requireApprovedUser();

  const parsed = idSchema.safeParse(formData.get("notificationId"));
  if (!parsed.success) redirect("/notifications");

  const repo = await getRepository();
  // The target comes from the user's own stored notification, never from the form.
  const notifications = await repo.getNotifications(user.id, 100);
  const notification = notifications.find((entry) => entry.id === parsed.data);
  if (!notification) redirect("/notifications");

  await repo.markNotificationsRead(user.id, [notification.id]);
  redirect(safeRedirectPath(notification.link, "/notifications"));
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireApprovedUser();
  const repo = await getRepository();
  await repo.markNotificationsRead(user.id);
  revalidatePath("/notifications");
}
