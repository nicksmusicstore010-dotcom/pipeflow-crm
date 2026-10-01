import { createServerClient } from "@supabase/ssr";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/safe-redirect";

import { getSupabaseEnv, SUPABASE_COOKIE_OPTIONS } from "./env";

const PUBLIC_PATHS = ["/", "/pricing", "/forgot-password", "/robots.txt", "/sitemap.xml"];
const AUTH_PATHS = ["/login", "/signup"];
// Resolves to the last (or first) workspace, or to /onboarding.
const AFTER_LOGIN_PATH = "/app";

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    AUTH_PATHS.includes(pathname) ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/invite/") ||
    // Link previews (WhatsApp, LinkedIn...) fetch it without a session.
    pathname.startsWith("/opengraph-image")
  );
}

/**
 * Refreshes the Supabase session cookie on every request and gates routes:
 * anonymous users are sent to /login, logged-in users skip /login and /signup.
 */
export async function updateSession(request: NextRequest) {
  // Webhooks (Stripe signature) and the public API (API key) never use the session.
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next({ request });

  const { url, key } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not run code between createServerClient and getUser(): it must be the
  // first call so the session is refreshed before anything reads it.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Supabase unreachable: we can't tell whether there is a session. Don't log the
  // user out by redirecting to /login; the page itself shows the connection error.
  if (error && isAuthRetryableFetchError(error)) return response;

  const { pathname, search } = request.nextUrl;

  // A Server Action can't follow a redirect to the login page (the caller gets `undefined`),
  // so let it through: every action checks the session itself and returns a proper error.
  const isServerAction = request.method === "POST" && request.headers.has("next-action");

  if (!user && !isPublic(pathname) && !isServerAction) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname + search);
    return redirectWithCookies(loginUrl, response);
  }

  if (user && AUTH_PATHS.includes(pathname)) {
    // Already logged in (e.g. a second tab): go where the login would have sent them.
    const target = safeNextPath(request.nextUrl.searchParams.get("next"), AFTER_LOGIN_PATH);
    return redirectWithCookies(new URL(target, request.url), response);
  }

  return response;
}

// Keep any refreshed session cookies when redirecting.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
