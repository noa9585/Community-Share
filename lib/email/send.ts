import "server-only";

import { Resend } from "resend";

import { isMockMode } from "@/lib/config";
import { type EmailContent, renderEmail, singleLine } from "@/lib/email/template";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailLogType } from "@/types/database";

export type Recipient = { id: string; email: string };

const DEFAULT_FROM = "שיתוף קהילתי <onboarding@resend.dev>";

async function writeLog(
  type: EmailLogType,
  recipientId: string,
  relatedId: string,
  status: "sent" | "failed" | "skipped",
): Promise<void> {
  const { error } = await createAdminClient().from("email_log").insert({
    type,
    recipient_user_id: recipientId,
    related_id: relatedId,
    status,
  });
  if (error) console.error("[community-share] email_log insert failed", error.message);
}

/** True when this exact notification was already logged with the given outcome. */
async function alreadyLogged(
  type: EmailLogType,
  recipientId: string,
  relatedId: string,
  status: "sent" | "skipped",
): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("email_log")
    .select("id")
    .eq("type", type)
    .eq("recipient_user_id", recipientId)
    .eq("related_id", relatedId)
    .eq("status", status)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/**
 * Sends one notification through Resend and records the outcome in email_log.
 *
 * It never throws: an e-mail is a side effect, and a mail outage must not undo
 * or fail the action that triggered it. The API key is read here, on the
 * server, and is never passed to the browser.
 */
export async function sendEmail(options: {
  type: EmailLogType;
  recipient: Recipient;
  relatedId: string;
  content: EmailContent;
  /** For scheduled messages: skip silently if this one was already sent. */
  once?: boolean;
}): Promise<"sent" | "failed" | "skipped" | "duplicate"> {
  const { type, recipient, relatedId, content, once = false } = options;

  if (isMockMode()) return "skipped";

  try {
    if (once && (await alreadyLogged(type, recipient.id, relatedId, "sent"))) {
      return "duplicate";
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Scheduled messages are retried daily; record the skip only once.
      if (!once || !(await alreadyLogged(type, recipient.id, relatedId, "skipped"))) {
        await writeLog(type, recipient.id, relatedId, "skipped");
      }
      return "skipped";
    }

    const { html, text } = renderEmail(content);
    const { error } = await new Resend(apiKey).emails.send({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: recipient.email,
      subject: singleLine(content.subject),
      html,
      text,
    });

    if (error) {
      // The provider's message can name the recipient; log only its category.
      console.error("[community-share] e-mail send failed", type, error.name);
      await writeLog(type, recipient.id, relatedId, "failed");
      return "failed";
    }

    await writeLog(type, recipient.id, relatedId, "sent");
    return "sent";
  } catch (error) {
    console.error(
      "[community-share] e-mail send crashed",
      type,
      error instanceof Error ? error.name : "unknown",
    );
    await writeLog(type, recipient.id, relatedId, "failed").catch(() => undefined);
    return "failed";
  }
}
