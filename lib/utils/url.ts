import { isMockMode } from "@/lib/config";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function isValidStorageUrl(url: string): boolean {
  if (!url || url.toLowerCase().startsWith("javascript:")) {
    return false;
  }

  if (isMockMode()) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || url.startsWith("/mock/");
    } catch {
      return false;
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const parsed = new URL(url);
    const allowed = new URL(supabaseUrl);
    return parsed.origin === allowed.origin;
  } catch {
    return false;
  }
}

export function isAllowedImageType(type: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(type as (typeof ALLOWED_IMAGE_TYPES)[number]);
}

export function buildStoragePath(userId: string, itemId: string): string {
  const uuid = crypto.randomUUID();
  return `${userId}/${itemId}/${uuid}.webp`;
}
