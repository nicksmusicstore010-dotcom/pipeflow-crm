import type { ActionFailure } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/session";
import { getWorkspaceBySlug, type WorkspaceSummary } from "@/lib/workspaces";

/**
 * For Server Actions: the user's workspace for this slug, or the failure to return
 * (expired session / not a member). RLS enforces membership again on every write.
 */
export async function resolveWorkspace(
  slug: string,
): Promise<{ workspace: WorkspaceSummary } | { error: ActionFailure }> {
  if (!(await getCurrentUser())) {
    return { error: { ok: false, error: "Sua sessão expirou. Entre novamente.", unauthenticated: true } };
  }
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return { error: { ok: false, error: "Workspace não encontrado." } };
  return { workspace };
}
