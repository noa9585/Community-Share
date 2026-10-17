import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { isMockMode } from "@/lib/config";
import { getRepository } from "@/lib/data/index";
import { getMockUserIdFromCookie } from "@/lib/mock/auth";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types/database";

/**
 * The signed-in user's profile, verified against the auth server on every
 * request (never trusted from the cookie alone). Deduplicated per request.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (isMockMode()) {
    const userId = await getMockUserIdFromCookie();
    if (!userId) return null;
    const repo = await getRepository();
    return repo.getUserById(userId);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, full_name, email, residence_area, role, status, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (data as User | null) ?? null;
});

/** For Server Actions: throws unless the caller is an approved member. */
export async function requireApprovedUser(): Promise<User> {
  const profile = await getCurrentUser();
  if (!profile || profile.status !== "approved") {
    throw new Error("Unauthorized");
  }
  return profile;
}

/** For Server Actions: throws unless the caller is an approved admin. */
export async function requireAdminUser(): Promise<User> {
  const profile = await requireApprovedUser();
  if (profile.role !== "admin") {
    throw new Error("Forbidden");
  }
  return profile;
}

/**
 * For pages: returns the approved member or redirects. The proxy already guards
 * these routes; checking again next to the data means a routing mistake can
 * never expose a page.
 */
export async function requirePageUser(): Promise<User> {
  const profile = await getCurrentUser();
  if (!profile) redirect("/login");
  if (profile.status === "blocked") redirect("/blocked");
  if (profile.status !== "approved") redirect("/pending-approval");
  return profile;
}

export async function requirePageAdmin(): Promise<User> {
  const profile = await requirePageUser();
  if (profile.role !== "admin") redirect("/");
  return profile;
}
