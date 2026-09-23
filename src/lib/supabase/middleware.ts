import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isWorkspaceSlug, LAST_WORKSPACE_COOKIE } from "@/lib/workspace-slug";

import { getSupabaseEnv } from "./env";

const PUBLIC_PATHS = ["/", "/pricing"];
const AUTH_PATHS = ["/login", "/signup"];
// Resolves to the last (or first) workspace, or to /onboarding.
const AFTER_LOGIN_PATH = "/app";

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    AUTH_PATHS.includes(pathname) ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/webhooks/")
  );
}

/**
 * Refreshes the Supabase session cookie on every request and gates routes:
 * anonymous users are sent to /login, logged-in users skip /login and /signup.
 */
export async function updateSession(request: NextRequest) {
  const { url, key } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
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
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname + search);
    return redirectWithCookies(loginUrl, response);
  }

  if (user && AUTH_PATHS.includes(pathname)) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = AFTER_LOGIN_PATH;
    appUrl.search = "";
    return redirectWithCookies(appUrl, response);
  }

  // Remember the last workspace so /app can send the user back to it.
  // Membership is checked where the cookie is read, not here.
  const firstSegment = pathname.split("/")[1] ?? "";
  if (
    user &&
    isWorkspaceSlug(firstSegment) &&
    request.cookies.get(LAST_WORKSPACE_COOKIE)?.value !== firstSegment
  ) {
    response.cookies.set(LAST_WORKSPACE_COOKIE, firstSegment, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

// Keep any refreshed session cookies when redirecting.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
