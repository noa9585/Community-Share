import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/config";

/**
 * Refreshes the Supabase session cookies for this request and returns the
 * verified user. `extraRequestHeaders` are forwarded to the app (the CSP nonce).
 */
export async function updateSession(
  request: NextRequest,
  extraRequestHeaders: Record<string, string>,
) {
  const buildResponse = () => {
    const requestHeaders = new Headers(request.headers);
    for (const [key, value] of Object.entries(extraRequestHeaders)) {
      requestHeaders.set(key, value);
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  };

  let supabaseResponse = buildResponse();
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = buildResponse();
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the token with the auth server; getSession() would not.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, getResponse: () => supabaseResponse, user };
}
