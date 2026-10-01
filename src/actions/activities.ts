"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { RATE_LIMITED, type ActionResult } from "@/lib/action-result";
import { resolveWorkspace } from "@/lib/action-workspace";
import { createClient } from "@/lib/supabase/server";
import { fromSaoPauloInput } from "@/lib/utils";
import { activitySchema, type ActivityFormValues } from "@/lib/validations/activity";

export type ActivityActionResult = ActionResult<{ activityId: string }>;

const idSchema = z.uuid();

const NOT_FOUND = "Atividade não encontrada. Ela pode ter sido excluída.";
const NOT_ALLOWED = "Só quem registrou a atividade ou um admin do workspace pode alterá-la.";

function toRow(values: ActivityFormValues) {
  return { type: values.type, description: values.description, occurred_at: fromSaoPauloInput(values.occurredAt) };
}

function revalidateLead(slug: string, leadId: string) {
  revalidatePath(`/${slug}/leads/${leadId}`);
}

/**
 * RLS hides a failed update/delete as "0 rows". Tell apart "gone" from "not yours"
 * by checking whether the member can still see it.
 */
async function missingOrForbidden(activityId: string, workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("id")
    .eq("id", activityId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data ? NOT_ALLOWED : NOT_FOUND;
}

export async function createActivity(
  workspaceSlug: string,
  leadId: string,
  input: unknown,
): Promise<ActivityActionResult> {
  if (!idSchema.safeParse(leadId).success) return { ok: false, error: "Lead não encontrado." };
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const resolved = await resolveWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  // The author is the logged-in user (column default + RLS check).
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .insert({ ...toRow(parsed.data), lead_id: leadId, workspace_id: workspace.id })
    .select("id")
    .single();
  if (error) {
    // FK: the lead was deleted meanwhile, or belongs to another workspace.
    if (error.code === "23503") return { ok: false, error: "Lead não encontrado. Ele pode ter sido excluído." };
    if (error.message === "rate_limited") return { ok: false, error: RATE_LIMITED };
    return { ok: false, error: "Não foi possível registrar a atividade. Tente novamente." };
  }

  revalidateLead(workspace.slug, leadId);
  return { ok: true, activityId: data.id };
}

export async function updateActivity(
  workspaceSlug: string,
  activityId: string,
  input: unknown,
): Promise<ActivityActionResult> {
  if (!idSchema.safeParse(activityId).success) return { ok: false, error: NOT_FOUND };
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const resolved = await resolveWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .update(toRow(parsed.data))
    .eq("id", activityId)
    .eq("workspace_id", workspace.id)
    .select("id, lead_id")
    .maybeSingle();
  if (error) return { ok: false, error: "Não foi possível salvar a atividade. Tente novamente." };
  if (!data) return { ok: false, error: await missingOrForbidden(activityId, workspace.id) };

  revalidateLead(workspace.slug, data.lead_id);
  return { ok: true, activityId: data.id };
}

export async function deleteActivity(workspaceSlug: string, activityId: string): Promise<ActivityActionResult> {
  if (!idSchema.safeParse(activityId).success) return { ok: false, error: NOT_FOUND };

  const resolved = await resolveWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .delete()
    .eq("id", activityId)
    .eq("workspace_id", workspace.id)
    .select("id, lead_id")
    .maybeSingle();
  if (error) return { ok: false, error: "Não foi possível excluir a atividade. Tente novamente." };
  if (!data) return { ok: false, error: await missingOrForbidden(activityId, workspace.id) };

  revalidateLead(workspace.slug, data.lead_id);
  return { ok: true, activityId: data.id };
}
