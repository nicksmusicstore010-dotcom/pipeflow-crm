/** Cookie with the slug of the last workspace the user opened (set by the middleware). */
export const LAST_WORKSPACE_COOKIE = "pf_last_workspace";

// Top-level paths that a workspace slug must never shadow.
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "dashboard",
  "invite",
  "leads",
  "login",
  "logout",
  "onboarding",
  "pipeline",
  "pricing",
  "settings",
  "signup",
  "workspaces",
]);

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Whether a path segment can be a workspace slug (same rules as the DB check). */
export function isWorkspaceSlug(segment: string) {
  return (
    segment.length >= 3 &&
    segment.length <= 48 &&
    SLUG_PATTERN.test(segment) &&
    !RESERVED_SLUGS.has(segment)
  );
}

/** "Açaí & Cia Vendas" → "acai-cia-vendas". Collisions are resolved by create_workspace(). */
export function workspaceSlugFor(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");

  if (isWorkspaceSlug(base)) return base;
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "workspace"}-${suffix}`;
}
