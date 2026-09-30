import { PLAN_LIMITS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceSummary } from "@/lib/workspaces";

type LimitedWorkspace = Pick<WorkspaceSummary, "id" | "plan">;

export type LimitCheck = {
  /** Whether `adding` more still fit in the plan. */
  allowed: boolean;
  used: number;
  /** null = unlimited (Pro). */
  limit: number | null;
};

function check(used: number, limit: number | null, adding: number): LimitCheck {
  return { allowed: limit === null || used + adding <= limit, used, limit };
}

/** Whether the workspace's plan has room for `adding` more leads. Server-side check before inserting. */
export async function canAddLead(workspace: LimitedWorkspace, adding = 1): Promise<LimitCheck> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);
  if (error) throw error;
  return check(count ?? 0, PLAN_LIMITS[workspace.plan].leads, adding);
}

/**
 * Whether the plan has a seat for one more member. Seats = members + invites
 * still valid, the same count the database uses (`create_workspace_invite()` and
 * the `workspace_members` trigger also enforce it). Invites are admin-only, so
 * call it as an admin.
 */
export async function canAddMember(workspace: LimitedWorkspace): Promise<LimitCheck> {
  const supabase = await createClient();
  const [members, invites] = await Promise.all([
    supabase.from("workspace_members").select("user_id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase
      .from("workspace_invites")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
  ]);
  if (members.error) throw members.error;
  if (invites.error) throw invites.error;
  return check((members.count ?? 0) + (invites.count ?? 0), PLAN_LIMITS[workspace.plan].members, 1);
}
