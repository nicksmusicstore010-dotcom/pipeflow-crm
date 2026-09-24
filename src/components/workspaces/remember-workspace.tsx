"use client";

import { useEffect } from "react";

import { LAST_WORKSPACE_COOKIE } from "@/lib/workspace-slug";

/**
 * Stores the workspace on screen so /app can reopen it. Runs in the browser because
 * the server doesn't see every switch: back/forward can be served from the router
 * cache, and prefetches would count as visits. /app still checks membership.
 */
export function RememberWorkspace({ slug }: { slug: string }) {
  useEffect(() => {
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${LAST_WORKSPACE_COOKIE}=${slug}; path=/; max-age=31536000; samesite=lax${secure}`;
  }, [slug]);

  return null;
}
