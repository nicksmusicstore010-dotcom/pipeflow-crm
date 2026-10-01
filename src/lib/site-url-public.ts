/**
 * The site's canonical address, for metadata, robots and sitemap (no request
 * needed, so static pages can use it). E-mail and Stripe links use siteOrigin().
 */
export function publicSiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "http://localhost:3000";
  return new URL(url.includes("://") ? url : `https://${url}`).origin;
}
