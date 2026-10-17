"use server";

import { revalidatePath } from "next/cache";

import { requireApprovedUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { messageForError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { reportSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/lib/actions/auth";

export async function createReportAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const parsed = reportSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    reason: formData.get("reason"),
    details: formData.get("details") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  try {
    await enforceRateLimit("report", user.id);
    const repo = await getRepository();
    await repo.createReport(user.id, parsed.data);
  } catch (error) {
    return { error: messageForError(error, "לא ניתן לשלוח את הדיווח כרגע") };
  }

  revalidatePath("/report");
  revalidatePath("/admin");
  return { success: "הדיווח נשלח למנהל הקהילה. נעדכן אותך כשיטופל." };
}
