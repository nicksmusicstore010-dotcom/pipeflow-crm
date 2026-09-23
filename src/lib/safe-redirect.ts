/** Only allow same-origin relative paths as post-login redirects. */
export function safeNextPath(next: unknown, fallback = "/dashboard") {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return fallback;
  }
  return next;
}
