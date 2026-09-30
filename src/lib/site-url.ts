import { headers } from "next/headers";

function originOf(url: string | undefined) {
  if (!url) return null;
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).origin;
  } catch {
    return null;
  }
}

/** Origins this app is served from: the configured site URL and this Vercel deployment's URLs. */
function allowedOrigins() {
  return [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL,
  ].flatMap((url) => originOf(url) ?? []);
}

function isLocalhost(origin: string) {
  const { hostname } = new URL(origin);
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Base URL for links sent by e-mail and to Stripe. The request's Origin is used
 * only when it is one of this app's own origins (so previews and localhost link
 * back to themselves); a forged Origin header can't put another site's address
 * in an invite e-mail.
 */
export async function siteOrigin() {
  const allowed = allowedOrigins();
  const requestOrigin = originOf((await headers()).get("origin") ?? undefined);

  if (
    requestOrigin &&
    // Any localhost port when running locally (dev server, a production build on another port).
    (allowed.includes(requestOrigin) || (isLocalhost(requestOrigin) && allowed.some(isLocalhost)))
  ) {
    return requestOrigin;
  }
  return allowed[0] ?? "";
}
