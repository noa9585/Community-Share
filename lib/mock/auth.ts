import "server-only";

import { cookies } from "next/headers";

import { MOCK_USER_COOKIE } from "@/lib/mock/users";

export async function getMockUserIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(MOCK_USER_COOKIE)?.value ?? null;
}

export async function setMockUserCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(MOCK_USER_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearMockUserCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(MOCK_USER_COOKIE);
}
