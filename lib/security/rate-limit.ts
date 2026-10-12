import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { isMockMode } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";

type Limit = { max: number; windowSeconds: number };

/** Named limits, so every call site states which budget it draws from. */
export const LIMITS = {
  loginPerIp: { max: 10, windowSeconds: 15 * 60 },
  loginPerEmail: { max: 8, windowSeconds: 15 * 60 },
  registerPerIp: { max: 5, windowSeconds: 60 * 60 },
  passwordResetPerIp: { max: 5, windowSeconds: 60 * 60 },
  passwordResetPerEmail: { max: 3, windowSeconds: 60 * 60 },
  passwordChange: { max: 5, windowSeconds: 60 * 60 },
  search: { max: 90, windowSeconds: 60 },
  itemWrite: { max: 30, windowSeconds: 60 * 60 },
  borrowRequest: { max: 30, windowSeconds: 60 * 60 },
  mutation: { max: 120, windowSeconds: 60 },
} as const satisfies Record<string, Limit>;

export type LimitName = keyof typeof LIMITS;

const memoryBuckets = new Map<string, { windowStart: number; hits: number }>();

function checkInMemory(key: string, limit: Limit): boolean {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  if (!bucket || now - bucket.windowStart > limit.windowSeconds * 1000) {
    memoryBuckets.set(key, { windowStart: now, hits: 1 });
    return true;
  }
  bucket.hits += 1;
  return bucket.hits <= limit.max;
}

/**
 * The client address as reported by the hosting platform. On Vercel these
 * headers are set by the edge and cannot be spoofed by the caller.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get("x-real-ip") ??
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Counts one attempt against a limit and throws AppError("RATE_LIMITED") once
 * the budget is spent.
 *
 * The counters live in Postgres because serverless instances share no memory.
 * Identifiers (IP, e-mail, user id) are hashed before they are stored. If the
 * counter store is unreachable the request is refused, so an outage can never
 * be used to switch brute-force protection off.
 */
export async function enforceRateLimit(name: LimitName, identifier: string): Promise<void> {
  const limit = LIMITS[name];
  const key = createHash("sha256").update(`${name}:${identifier}`).digest("hex");

  if (isMockMode()) {
    if (!checkInMemory(key, limit)) throw new AppError("RATE_LIMITED");
    return;
  }

  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key,
    p_max: limit.max,
    p_window_seconds: limit.windowSeconds,
  });

  if (error) {
    console.error("[community-share] rate limit check failed", error.message);
    throw new AppError("RATE_LIMITED");
  }
  if (data !== true) {
    throw new AppError("RATE_LIMITED");
  }
}
