import type { Enums } from "@/types/database";

export type WorkspacePlan = Enums<"workspace_plan">;

type PlanLimits = {
  /** Members, admins included; null = unlimited. */
  members: number | null;
  /** Leads per workspace; null = unlimited. Checked in `canAddLead()` (lib/limits.ts). */
  leads: number | null;
};

/**
 * Plan limits — single source of truth for the app. Both limits are also
 * enforced by the database (`plan_member_limit()` and `plan_lead_limit()`),
 * so a change here needs a migration too.
 */
export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  free: { members: 2, leads: 50 },
  pro: { members: null, leads: null },
};

export const PLAN_LABELS: Record<WorkspacePlan, string> = {
  free: "Free",
  pro: "Pro",
};

/** Display price; the amount charged is the Stripe price in STRIPE_PRO_PRICE_ID. */
export const PLAN_PRICES: Record<WorkspacePlan, string> = {
  free: "R$ 0",
  pro: "R$ 49",
};

export const PLAN_FEATURES: Record<WorkspacePlan, string[]> = {
  free: [
    `Até ${PLAN_LIMITS.free.leads} leads`,
    `Até ${PLAN_LIMITS.free.members} membros`,
    "Pipeline Kanban e atividades",
    "Dashboard de métricas",
  ],
  pro: [
    "Leads ilimitados",
    "Membros ilimitados",
    "Pipeline Kanban e atividades",
    "Dashboard de métricas",
  ],
};
