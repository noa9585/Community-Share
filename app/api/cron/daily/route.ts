import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { isMockMode } from "@/lib/config";
import { runDailyNotifications } from "@/lib/email/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function israelDate(offsetDays: number): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(date);
}

/** Constant-time comparison, so the secret cannot be guessed byte by byte from response times. */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Daily job, called by Vercel Cron (see vercel.json): flags overdue loans and
 * sends return reminders and overdue notices. It is reachable from the internet,
 * so it does nothing without the bearer secret.
 */
export async function GET(request: Request) {
  if (isMockMode() || !isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyNotifications(israelDate(0), israelDate(1));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error(
      "[community-share] daily job failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
