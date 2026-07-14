import "server-only";

import { isMockMode } from "@/lib/config";
import { getRepository } from "@/lib/data/index";
import { getMockUserIdFromCookie } from "@/lib/mock/auth";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types/database";

export async function getCurrentUser(): Promise<User | null> {
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
    .select("*")
    .eq("id", user.id)
    .single();

  return data as User | null;
}

export async function requireApprovedUser(): Promise<User> {
  const profile = await getCurrentUser();
  if (!profile || profile.status !== "approved") {
    throw new Error("Unauthorized");
  }
  return profile;
}

export async function requireAdminUser(): Promise<User> {
  const profile = await requireApprovedUser();
  if (profile.role !== "admin") {
    throw new Error("Forbidden");
  }
  return profile;
}
