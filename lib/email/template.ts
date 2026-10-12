import "server-only";

import { getSiteUrl } from "@/lib/config";

export type EmailContent = {
  subject: string;
  heading: string;
  /** Plain paragraphs. Never pre-escaped: escaping happens here, once. */
  lines: string[];
  cta: { label: string; path: string };
};

// Names and item titles are written by users, so everything placed into the
// HTML is escaped. Without this a member could inject markup into someone
// else's inbox through an item name.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A header value must stay on one line. */
export function singleLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, 150);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** Hebrew, right-to-left e-mail in the site's colours. Tables and inline styles for mail clients. */
export function renderEmail(content: EmailContent): { html: string; text: string } {
  const url = `${getSiteUrl()}${content.cta.path}`;
  const paragraphs = content.lines
    .map(
      (line) =>
        `<p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#414846;">${escapeHtml(line)}</p>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#d9fff4;font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#d9fff4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #c1c8c5;">
        <tr><td style="background:#43637e;padding:20px 24px;color:#ffffff;font-size:20px;font-weight:bold;text-align:center;">שיתוף קהילתי</td></tr>
        <tr><td style="padding:28px 24px 8px;direction:rtl;text-align:right;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#321e48;">${escapeHtml(content.heading)}</h1>
          ${paragraphs}
        </td></tr>
        <tr><td align="center" style="padding:12px 24px 28px;">
          <a href="${escapeHtml(url)}" style="display:inline-block;background:#65dcd5;color:#321e48;font-weight:bold;font-size:16px;text-decoration:none;padding:12px 28px;border-radius:12px;">${escapeHtml(content.cta.label)}</a>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f4f4f2;font-size:12px;line-height:1.5;color:#717976;text-align:center;">
          הודעה אוטומטית מפלטפורמת שיתוף הציוד של הקהילה. אין להשיב להודעה זו.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [content.heading, "", ...content.lines, "", `${content.cta.label}: ${url}`].join("\n");

  return { html, text };
}
