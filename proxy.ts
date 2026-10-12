import { NextResponse, type NextRequest } from "next/server";

import { isMockMode } from "@/lib/config";
import { MOCK_USER_COOKIE } from "@/lib/mock/users";
import { updateSession } from "@/lib/supabase/middleware";

// Reachable without a session.
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/auth/callback"];

// Reachable with a session regardless of approval status.
const AUTH_ONLY_PATHS = ["/pending-approval", "/blocked", "/reset-password"];

function matches(paths: string[], pathname: string) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function originOf(value: string | undefined): string {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

/**
 * Strict Content-Security-Policy. Scripts run only with this request's nonce
 * (no 'unsafe-inline'), so injected markup cannot execute. Images may come only
 * from our own storage; nothing may frame the site or post forms elsewhere.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const imageHosts = isMockMode()
    ? "https://picsum.photos https://fastly.picsum.photos"
    : originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes are used for a few computed sizes; styles cannot run code.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' blob: data: ${imageHosts}`.trim(),
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

type Profile = { status: string; role: string } | null;

/** Returns the path to redirect to, or null when the request may continue. */
function guard(pathname: string, hasSession: boolean, profile: Profile): string | null {
  if (matches(PUBLIC_PATHS, pathname)) {
    return hasSession && (pathname === "/login" || pathname === "/register") ? "/" : null;
  }

  if (!hasSession) return "/login";

  if (pathname === "/reset-password") return null;

  // A session without a profile row is treated like an unapproved account.
  if (!profile || profile.status === "pending") {
    return pathname === "/pending-approval" ? null : "/pending-approval";
  }

  if (profile.status === "blocked") {
    return pathname === "/blocked" ? null : "/blocked";
  }

  if (profile.status !== "approved") return "/login";

  if (matches(AUTH_ONLY_PATHS, pathname)) return "/";

  if (matches(["/admin"], pathname) && profile.role !== "admin") return "/";

  return null;
}

function redirectTo(request: NextRequest, target: string, pathname: string) {
  const url = new URL(target, request.url);
  if (target === "/login" && pathname !== "/") {
    url.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(url);
}

async function getMockProfile(userId: string | null): Promise<Profile> {
  if (!userId) return null;
  const { mockRepository } = await import("@/lib/mock/repository");
  const user = await mockRepository.getUserById(userId);
  return user ? { status: user.status, role: user.role } : null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  // Next.js reads the nonce from the request's CSP header and applies it to its own scripts.
  const forwarded = { "x-nonce": nonce, "Content-Security-Policy": csp };

  if (isMockMode()) {
    const userId = request.cookies.get(MOCK_USER_COOKIE)?.value ?? null;
    const profile = await getMockProfile(userId);
    const target = guard(pathname, Boolean(profile), profile);
    if (target) return redirectTo(request, target, pathname);

    const requestHeaders = new Headers(request.headers);
    for (const [key, value] of Object.entries(forwarded)) requestHeaders.set(key, value);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const { supabase, getResponse, user } = await updateSession(request, forwarded);

  let profile: Profile = null;
  if (user && !matches(PUBLIC_PATHS, pathname)) {
    const { data } = await supabase
      .from("users")
      .select("status, role")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  const target = guard(pathname, Boolean(user), profile);
  const sessionResponse = getResponse();

  if (target) {
    const response = redirectTo(request, target, pathname);
    // Keep any refreshed session cookies, or the next request would be signed out.
    sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  sessionResponse.headers.set("Content-Security-Policy", csp);
  return sessionResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
