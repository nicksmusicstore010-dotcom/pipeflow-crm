"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { leadSchema, toLeadRow } from "@/lib/validations/lead";
import { getWorkspaceBySlug, type WorkspaceSummary } from "@/lib/workspaces";

export type LeadActionResult =
  | { ok: true; leadId: string }
  | { ok: false; error: string; /** Session expired: the client offers to log in again. */ unauthenticated?: boolean };

const leadIdSchema = z.uuid();

const GENERIC_ERROR = "Não foi possível salvar o lead. Tente novamente.";

/**
 * The user's workspace for this slug, or the error to return (expired session / not a member).
 * RLS enforces membership again on write.
 */
async function resolveWorkspace(
  slug: string,
): Promise<{ workspace: WorkspaceSummary } | { error: Extract<LeadActionResult, { ok: false }> }> {
  if (!(await getCurrentUser())) {
    return { error: { ok: false, error: "Sua sessão expirou. Entre novamente.", unauthenticated: true } };
  }
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return { error: { ok: false, error: "Workspace não encontrado." } };
  return { workspace };
}

// RLS rejects an owner from outside the workspace with 42501.
function writeError(code: string | undefined) {
  return code === "42501" ? "O responsável precisa ser membro deste workspace." : GENERIC_ERROR;
}

export async function createLead(workspaceSlug: string, input: unknown): Promise<LeadActionResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const resolved = await resolveWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...toLeadRow(parsed.data), workspace_id: workspace.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: writeError(error.code) };

  // Whole workspace: lead counts also show on the dashboard.
  revalidatePath(`/${workspace.slug}`, "layout");
  return { ok: true, leadId: data.id };
}

export async function updateLead(
  workspaceSlug: string,
  leadId: string,
  input: unknown,
): Promise<LeadActionResult> {
  if (!leadIdSchema.safeParse(leadId).success) return { ok: false, error: "Lead não encontrado." };
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const resolved = await resolveWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .update(toLeadRow(parsed.data))
    .eq("id", leadId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: writeError(error.code) };
  if (!data) return { ok: false, error: "Lead não encontrado." };

  revalidatePath(`/${workspace.slug}`, "layout");
  return { ok: true, leadId: data.id };
}

export async function deleteLead(workspaceSlug: string, leadId: string): Promise<LeadActionResult> {
  if (!leadIdSchema.safeParse(leadId).success) return { ok: false, error: "Lead não encontrado." };

  const resolved = await resolveWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "Não foi possível excluir o lead. Tente novamente." };
  if (!data) return { ok: false, error: "Lead não encontrado." };

  revalidatePath(`/${workspace.slug}`, "layout");
  return { ok: true, leadId: data.id };
}
