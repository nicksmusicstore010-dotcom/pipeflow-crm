"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { resolveWorkspace } from "@/lib/action-workspace";
import { DEAL_STAGES } from "@/lib/deal-stages";
import { createClient } from "@/lib/supabase/server";
import { dealSchema, toDealRow } from "@/lib/validations/deal";

export type DealActionResult = ActionResult<{ dealId: string }>;

const dealIdSchema = z.uuid();
const moveSchema = z.object({
  dealId: z.uuid(),
  stage: z.enum(DEAL_STAGES),
  index: z.number().int().min(0).max(100_000),
});

const NOT_FOUND = "Negócio não encontrado. Ele pode ter sido excluído.";

function writeError(error: { code?: string; message?: string }) {
  // RLS: owner from outside the workspace. FK: lead deleted or from another workspace.
  if (error.code === "42501") return "O responsável precisa ser membro deste workspace.";
  if (error.code === "23503") return "O lead escolhido não existe mais neste workspace.";
  return "Não foi possível salvar o negócio. Tente novamente.";
}

// Board, lead pages and dashboard all show deals.
function revalidateWorkspace(slug: string) {
  revalidatePath(`/${slug}`, "layout");
}

export async function createDeal(workspaceSlug: string, input: unknown): Promise<DealActionResult> {
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const resolved = await resolveWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  // New deals go to the bottom of their column (insert trigger).
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deals")
    .insert({ ...toDealRow(parsed.data), stage: parsed.data.stage, workspace_id: workspace.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: writeError(error) };

  revalidateWorkspace(workspace.slug);
  return { ok: true, dealId: data.id };
}

export async function updateDeal(workspaceSlug: string, dealId: string, input: unknown): Promise<DealActionResult> {
  if (!dealIdSchema.safeParse(dealId).success) return { ok: false, error: NOT_FOUND };
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const resolved = await resolveWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("deals")
    .update(toDealRow(parsed.data))
    .eq("id", dealId)
    .eq("workspace_id", workspace.id)
    .select("id, stage")
    .maybeSingle();
  if (error) return { ok: false, error: writeError(error) };
  if (!data) return { ok: false, error: NOT_FOUND };

  // A new stage picked in the form puts the card at the bottom of that column.
  if (data.stage !== parsed.data.stage) {
    const { error: moveError } = await supabase.rpc("move_deal", {
      p_deal_id: dealId,
      p_stage: parsed.data.stage,
      p_index: 100_000,
    });
    if (moveError) {
      revalidateWorkspace(workspace.slug);
      return { ok: false, error: "Os dados foram salvos, mas não foi possível mudar a etapa. Tente novamente." };
    }
  }

  revalidateWorkspace(workspace.slug);
  return { ok: true, dealId: data.id };
}

export async function deleteDeal(workspaceSlug: string, dealId: string): Promise<DealActionResult> {
  if (!dealIdSchema.safeParse(dealId).success) return { ok: false, error: NOT_FOUND };

  const resolved = await resolveWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("deals")
    .delete()
    .eq("id", dealId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "Não foi possível excluir o negócio. Tente novamente." };
  if (!data) return { ok: false, error: NOT_FOUND };

  revalidateWorkspace(workspace.slug);
  return { ok: true, dealId: data.id };
}

/** Drag-and-drop: puts the deal at `index` (0 = top) of `stage`, renumbering both columns. */
export async function moveDeal(
  workspaceSlug: string,
  input: { dealId: string; stage: string; index: number },
): Promise<DealActionResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Movimento inválido." };

  const resolved = await resolveWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;

  const supabase = createClient();
  const { error } = await supabase.rpc("move_deal", {
    p_deal_id: parsed.data.dealId,
    p_stage: parsed.data.stage,
    p_index: parsed.data.index,
  });
  if (error) {
    // P0002: deleted meanwhile (or not ours) — refresh so the card disappears.
    revalidateWorkspace(resolved.workspace.slug);
    return { ok: false, error: error.code === "P0002" ? NOT_FOUND : "Não foi possível mover o negócio. Tente novamente." };
  }

  revalidateWorkspace(resolved.workspace.slug);
  return { ok: true, dealId: parsed.data.dealId };
}
