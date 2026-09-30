const isDev = process.env.NODE_ENV !== "production";

// The browser only talks to this app (Supabase and Stripe are called from the
// server; Checkout and the Customer Portal are full-page redirects), so
// everything is 'self'. 'unsafe-inline' scripts: Next's bootstrap and the theme
// script are inline (nonces would force every page to render per request).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Older browsers without frame-ancestors: no embedding (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Invite links carry a token in the path: never send the path to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a verification build (`NEXT_DIST_DIR=.next-verify npm run build`) run
  // without overwriting the `.next` folder a running `npm run dev` is using —
  // that breaks the dev server with "Cannot find module './NNN.js'".
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
