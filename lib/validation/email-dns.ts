import "server-only";

import { resolveMx } from "node:dns/promises";

const LOOKUP_TIMEOUT_MS = 3000;

/**
 * False only when DNS says for certain that the address's domain cannot
 * receive mail (no such domain, or no mail server). A slow or failing lookup
 * returns true: a DNS hiccup must never stop a real person from registering.
 */
export async function domainAcceptsMail(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf("@") + 1);
  if (!domain) return false;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), LOOKUP_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([resolveMx(domain), timeout]);
    if (result === "timeout") return true;
    return result.some((record) => record.exchange && record.exchange !== ".");
  } catch (error) {
    const code = (error as { code?: string }).code;
    return !(code === "ENOTFOUND" || code === "ENODATA");
  } finally {
    clearTimeout(timer);
  }
}
