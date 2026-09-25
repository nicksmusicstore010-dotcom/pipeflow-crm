const PROBE_ORIGIN = "http://pipeflow.invalid";

/** Only allow same-origin relative paths as post-login redirects. */
export function safeNextPath(next: unknown, fallback = "/app") {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\") ||
    // URL parsers drop tabs/newlines, so "/\t/evil.com" would become "//evil.com".
    /[\u0000-\u001f\u007f\s\\]/.test(next)
  ) {
    return fallback;
  }
  try {
    // Last line of defense: whatever the parser makes of it must stay on our origin.
    if (new URL(next, PROBE_ORIGIN).origin !== PROBE_ORIGIN) return fallback;
  } catch {
    return fallback;
  }
  return next;
}
