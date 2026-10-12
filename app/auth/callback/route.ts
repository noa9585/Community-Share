import { NextResponse } from "next/server";

import { isMockMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils/url";

const OTP_TYPES = ["signup", "recovery", "email", "invite", "email_change"] as const;
type OtpType = (typeof OTP_TYPES)[number];

/**
 * Landing point for links in auth e-mails (address confirmation, password reset).
 * `next` is reduced to a same-site path, so the link cannot be turned into a
 * redirect to another website.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeRedirectPath(searchParams.get("next"));

  if (isMockMode()) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && OTP_TYPES.includes(type as OtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as OtpType,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?notice=link`);
}
