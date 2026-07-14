import { NextResponse, type NextRequest } from "next/server";

import { isMockMode } from "@/lib/config";
import { MOCK_USER_COOKIE } from "@/lib/mock/users";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
];

const AUTH_ONLY_PATHS = ["/pending-approval", "/blocked"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isAuthOnlyPath(pathname: string) {
  return AUTH_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

async function getMockProfile(request: NextRequest) {
  const userId = request.cookies.get(MOCK_USER_COOKIE)?.value;
  if (!userId) return null;

  const { mockRepository } = await import("@/lib/mock/repository");
  const user = await mockRepository.getUserById(userId);
  if (!user) return null;
  return { status: user.status, role: user.role };
}

function applyProfileGuards(
  request: NextRequest,
  pathname: string,
  profile: { status: string; role: string } | null,
  hasSession: boolean,
) {
  if (isPublicPath(pathname)) {
    if (hasSession && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next({ request });
  }

  if (!hasSession) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (!profile) {
    if (!isAuthOnlyPath(pathname)) {
      return NextResponse.redirect(new URL("/pending-approval", request.url));
    }
    return NextResponse.next({ request });
  }

  if (profile.status === "blocked") {
    if (pathname !== "/blocked") {
      return NextResponse.redirect(new URL("/blocked", request.url));
    }
    return NextResponse.next({ request });
  }

  if (profile.status === "pending") {
    if (pathname !== "/pending-approval") {
      return NextResponse.redirect(new URL("/pending-approval", request.url));
    }
    return NextResponse.next({ request });
  }

  if (pathname === "/pending-approval" || pathname === "/blocked") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin") && profile.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next({ request });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isMockMode()) {
    const userId = request.cookies.get(MOCK_USER_COOKIE)?.value ?? null;
    const profile = await getMockProfile(request);
    return applyProfileGuards(request, pathname, profile, Boolean(userId));
  }

  const { supabase, supabaseResponse, user } = await updateSession(request);

  if (isPublicPath(pathname)) {
    if (user && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("status, role")
    .eq("id", user.id)
    .single();

  const guardResponse = applyProfileGuards(
    request,
    pathname,
    profile,
    Boolean(user),
  );
  if (guardResponse.headers.get("location")) {
    return guardResponse;
  }
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
