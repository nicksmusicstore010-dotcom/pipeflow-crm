import { headers } from "next/headers";

/** Base URL for links sent by e-mail: the current origin, or the configured site URL. */
export function siteOrigin() {
  return headers().get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
}
