"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { resolveWorkspace } from "@/lib/action-workspace";
import { generateApiKey } from "@/lib/api-keys";
import { createClient } from "@/lib/supabase/server";

const nameSchema = z.string().trim().min(1, "Dê um nome para a chave.").max(60, "Use no máximo 60 caracteres.");

const DB_ERRORS: Record<string, string> = {
  not_admin: "Apenas administradores gerenciam chaves de API.",
  too_many_keys: "Este workspace já tem 10 chaves ativas. Revogue uma antes de criar outra.",
  rate_limited: "Muitas chaves criadas hoje. Tente novamente amanhã.",
  key_not_found: "Chave não encontrada.",
};

async function resolveAdmin(slug: string) {
  const resolved = await resolveWorkspace(slug);
  if ("error" in resolved) return resolved;
  if (resolved.workspace.role !== "admin") return { error: { ok: false as const, error: DB_ERRORS.not_admin } };
  return resolved;
}

/** Creates a key and returns it — the only time it can be seen (only its hash is stored). */
export async function createApiKey(workspaceSlug: string, name: unknown): Promise<ActionResult<{ token: string }>> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  const resolved = await resolveAdmin(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  const key = generateApiKey();
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_api_key", {
    p_workspace_id: workspace.id,
    p_name: parsed.data,
    p_key_hash: key.hash,
    p_prefix: key.prefix,
  });
  if (error) return { ok: false, error: DB_ERRORS[error.message] ?? "Não foi possível criar a chave. Tente novamente." };

  revalidatePath(`/${workspace.slug}/settings/api`);
  return { ok: true, token: key.token };
}

export async function revokeApiKey(workspaceSlug: string, keyId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(keyId).success) return { ok: false, error: DB_ERRORS.key_not_found };
  const resolved = await resolveAdmin(workspaceSlug);
  if ("error" in resolved) return resolved.error;

  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_api_key", { p_key_id: keyId });
  if (error) return { ok: false, error: DB_ERRORS[error.message] ?? "Não foi possível revogar a chave. Tente novamente." };

  revalidatePath(`/${resolved.workspace.slug}/settings/api`);
  return { ok: true };
}
