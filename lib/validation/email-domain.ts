// Catches typos in the domain part of an e-mail address at sign-up, such as
// "gmail.co" or "gmial.com". Many of these typo domains are real (squatters
// register them to collect mis-addressed mail), so checking that the domain
// exists is not enough. Runs in the browser and on the server.

/** Addresses of well-known providers that are correct as written. */
const KNOWN_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.co.il",
  "outlook.com",
  "outlook.co.il",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "walla.com",
  "walla.co.il",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "zahav.net.il",
  "bezeqint.net",
  "netvision.net.il",
  "012.net.il",
  "013net.net",
  "smile.net.il",
] as const;

/** Real providers whose names are one letter away from a known one. */
const ALSO_VALID = new Set(["mail.com", "gmx.com", "gmx.net", "email.com", "inbox.com", "live.co.uk"]);

/** Where a provider's name should lead when the ending is wrong. */
const PROVIDER_HOME: Record<string, string> = {
  gmail: "gmail.com",
  googlemail: "googlemail.com",
  hotmail: "hotmail.com",
  outlook: "outlook.com",
  live: "live.com",
  msn: "msn.com",
  yahoo: "yahoo.com",
  ymail: "ymail.com",
  walla: "walla.co.il",
  icloud: "icloud.com",
  aol: "aol.com",
  protonmail: "protonmail.com",
};

/** Endings that are almost always a slip of the finger on ".com". */
const TYPO_ENDINGS = new Set(["con", "cmo", "ocm", "comm", "coom", "cpm", "vom", "xom", "coml", "cim"]);

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[b.length];
}

/**
 * Returns the address the user probably meant when the domain looks like a
 * typo, or null when the address looks fine.
 */
export function suggestEmailFix(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || ALSO_VALID.has(domain) || (KNOWN_DOMAINS as readonly string[]).includes(domain)) {
    return null;
  }

  // A known provider with the wrong ending: gmail.co, gmail.co.il, hotmail.con.
  const provider = PROVIDER_HOME[domain.split(".")[0]];
  if (provider) return `${local}@${provider}`;

  // A near miss of a known provider: gmial.com, gmai.com, hotmial.com.
  let best: { domain: string; score: number } | null = null;
  for (const known of KNOWN_DOMAINS) {
    const score = distance(domain, known);
    if (score <= 2 && (!best || score < best.score)) best = { domain: known, score };
  }
  if (best) return `${local}@${best.domain}`;

  // Any domain ending in a ".com" slip: example.con.
  const parts = domain.split(".");
  if (parts.length > 1 && TYPO_ENDINGS.has(parts[parts.length - 1])) {
    return `${local}@${[...parts.slice(0, -1), "com"].join(".")}`;
  }

  return null;
}

export function emailTypoMessage(suggestion: string): string {
  return `נראה שיש טעות בכתובת. האם התכוונת ל-${suggestion}?`;
}
