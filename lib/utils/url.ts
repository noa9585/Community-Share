import { isMockMode } from "@/lib/config";

/**
 * Only render an image when its URL points at our own storage. This keeps a
 * stored value from ever turning into a `javascript:` URL or a tracking pixel.
 */
export function isValidStorageUrl(url: string): boolean {
  if (!url) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  if (isMockMode()) {
    return parsed.hostname === "picsum.photos";
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    return parsed.origin === new URL(supabaseUrl).origin;
  } catch {
    return false;
  }
}

/** The item's first picture, if it has one that is safe to render. */
export function firstImageUrl(
  item?: { item_images?: { url: string }[] } | null,
): string | null {
  const url = item?.item_images?.[0]?.url;
  return url && isValidStorageUrl(url) ? url : null;
}

/**
 * Returns a same-site path to redirect to, or the fallback. Rejects anything
 * that a browser could resolve to another origin (`//evil.com`, `/\evil.com`,
 * `@evil.com`, absolute URLs), which would otherwise be an open redirect.
 */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) {
    return fallback;
  }
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) {
    return fallback;
  }

  try {
    const base = "http://localhost";
    const parsed = new URL(value, base);
    if (parsed.origin !== base) return fallback;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}
