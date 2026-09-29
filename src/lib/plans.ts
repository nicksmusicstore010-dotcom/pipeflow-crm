import type { Enums } from "@/types/database";

export type WorkspacePlan = Enums<"workspace_plan">;

type PlanLimits = {
  /** Members, admins included; null = unlimited. */
  members: number | null;
  /** Leads per workspace; null = unlimited. Enforced in milestone 8. */
  leads: number | null;
};

/**
 * Plan limits — single source of truth for the app. The member limit is also
 * enforced by the database (`plan_member_limit()` in the collaboration
 * migration), so a change here needs a migration too.
 */
export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  free: { members: 2, leads: 50 },
  pro: { members: null, leads: null },
};

export const PLAN_LABELS: Record<WorkspacePlan, string> = {
  free: "Free",
  pro: "Pro",
};

/** Whether `used` seats (members + open invites) leave room for one more. */
export function hasMemberSeat(plan: WorkspacePlan, used: number) {
  const limit = PLAN_LIMITS[plan].members;
  return limit === null || used < limit;
}
