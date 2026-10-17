import "server-only";

import { getSupabaseEnv, isMockMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export type RealtimeConfig = { url: string; anonKey: string; token: string };

/**
 * What the browser needs to listen for live changes: the public project
 * settings and the signed-in user's own short-lived access token.
 *
 * The browser uses it for one thing only, a Realtime subscription. Realtime
 * applies the same Row Level Security as every other read, so a member only
 * ever receives rows they could already see. Every write still goes through
 * the server. Returns null in demo mode and for signed-out visitors.
 */
export async function getRealtimeConfig(): Promise<RealtimeConfig | null> {
  if (isMockMode()) return null;

  const supabase = await createClient();
  // The caller has already verified the user with getUser(); only the token
  // string is taken from the session here.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  return { ...getSupabaseEnv(), token };
}
