import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

const EMAIL_OTP_TYPES: EmailOtpType[] = ["signup", "email", "invite", "magiclink", "recovery", "email_change"];

/**
 * Landing point for links in auth e-mails (signup confirmation, magic link, recovery).
 *
 * - `?token_hash=…&type=…` (preferred): verified server-side, so it works in any browser or
 *   device — e.g. the link opened from the Gmail app on the phone. Needs the e-mail template
 *   to link to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`.
 * - `?code=…` (Supabase default template, PKCE): only works in the browser that started the
 *   signup, because the code verifier lives in a cookie there.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const supabase = createClient();

  const fail = (reason: string) => NextResponse.redirect(`${origin}/login?error=${reason}`);

  if (tokenHash && type && EMAIL_OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return fail(error.code === "otp_expired" ? "link_expirado" : "link_invalido");
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    // Supabase already confirmed the e-mail before redirecting here; only the session
    // hand-off failed because the link was opened in another browser.
    if (error.code === "pkce_code_verifier_not_found" || /code verifier/i.test(error.message)) {
      return fail("outro_navegador");
    }
    return fail("link_invalido");
  }

  // Supabase puts its own errors in the query string (e.g. error_code=otp_expired).
  return fail(searchParams.get("error_code") === "otp_expired" ? "link_expirado" : "link_invalido");
}
