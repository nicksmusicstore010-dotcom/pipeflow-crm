/** Only allow same-origin relative paths as post-login redirects. */
export function safeNextPath(next: unknown, fallback = "/app") {
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
