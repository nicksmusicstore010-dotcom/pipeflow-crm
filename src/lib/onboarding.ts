import "server-only";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import type { WorkspaceSummary } from "@/lib/workspaces";

export type OnboardingStep = { key: string; label: string; description: string; href: string; done: boolean };

/** Cookie (set in the browser by "Ocultar") that hides the checklist for one workspace. */
export function onboardingHiddenCookie(workspaceId: string) {
  return `pf_onboarding_hidden_${workspaceId}`;
}

/**
 * "Primeiros passos" on the dashboard: each step is done when the data exists, so it
 * also counts what teammates did. Null when hidden or finished. `counts` are the
 * dashboard's own numbers (no second query).
 */
export async function getOnboardingSteps(
  workspace: WorkspaceSummary,
  counts: { leads: number; deals: number },
): Promise<OnboardingStep[] | null> {
  if ((await cookies()).get(onboardingHiddenCookie(workspace.id))) return null;

  const supabase = await createClient();
  const isAdmin = workspace.role === "admin";
  const [activities, members, invites] = await Promise.all([
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase.from("workspace_members").select("user_id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    // Only admins can read invites (RLS); members don't get the invite step.
    isAdmin
      ? supabase.from("workspace_invites").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id)
      : Promise.resolve({ count: 0 }),
  ]);
  const base = `/${workspace.slug}`;

  const steps: OnboardingStep[] = [
    {
      key: "lead",
      label: "Cadastre seu primeiro lead",
      description: "Ou carregue leads de exemplo para explorar.",
      href: `${base}/leads`,
      done: counts.leads > 0,
    },
    {
      key: "deal",
      label: "Crie um negócio no pipeline",
      description: "Uma oportunidade com valor e etapa.",
      href: `${base}/pipeline`,
      done: counts.deals > 0,
    },
    {
      key: "activity",
      label: "Registre uma atividade",
      description: "Uma ligação, e-mail, reunião ou nota no detalhe de um lead.",
      href: `${base}/leads`,
      done: (activities.count ?? 0) > 0,
    },
  ];
  if (isAdmin) {
    steps.push({
      key: "invite",
      label: "Convide alguém do time",
      description: "Vendas em equipe, cada um com seus negócios.",
      href: `${base}/settings`,
      done: (members.count ?? 0) > 1 || (invites.count ?? 0) > 0,
    });
  }
  return steps.every((step) => step.done) ? null : steps;
}
