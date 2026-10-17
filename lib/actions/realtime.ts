"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { getRealtimeConfig } from "@/lib/supabase/realtime";

/** A fresh access token for the open Realtime connection, or null once signed out. */
export async function refreshRealtimeTokenAction(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") return null;
  return (await getRealtimeConfig())?.token ?? null;
}
