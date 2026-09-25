"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { leadSchema, toLeadRow } from "@/lib/validations/lead";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export type LeadActionResult = { ok: true; leadId: string } | { ok: false; error: string };

const leadIdSchema = z.uuid();

// The slug is resolved against the user's own workspaces; RLS enforces membership again on write.
const GENERIC_ERROR = "Não foi possível salvar o lead. Tente novamente.";

// RLS rejects an owner from outside the workspace with 42501.
function writeError(code: string | undefined) {
  return code === "42501" ? "O responsável precisa ser membro deste workspace." : GENERIC_ERROR;
}

export async function createLead(workspaceSlug: string, input: unknown): Promise<LeadActionResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) return { ok: false, error: "Workspace não encontrado." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...toLeadRow(parsed.data), workspace_id: workspace.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: writeError(error.code) };

  revalidatePath(`/${workspace.slug}/leads`, "layout");
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

  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) return { ok: false, error: "Workspace não encontrado." };

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

  revalidatePath(`/${workspace.slug}/leads`, "layout");
  return { ok: true, leadId: data.id };
}

export async function deleteLead(workspaceSlug: string, leadId: string): Promise<LeadActionResult> {
  if (!leadIdSchema.safeParse(leadId).success) return { ok: false, error: "Lead não encontrado." };

  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) return { ok: false, error: "Workspace não encontrado." };

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

  revalidatePath(`/${workspace.slug}/leads`, "layout");
  return { ok: true, leadId: data.id };
}
