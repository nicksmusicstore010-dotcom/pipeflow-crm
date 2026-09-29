"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionFailure, ActionResult } from "@/lib/action-result";
import { resolveWorkspace } from "@/lib/action-workspace";
import { ROLE_LABELS } from "@/lib/roles";
import { PLAN_LIMITS } from "@/lib/plans";
import { inviteEmail, sendEmail } from "@/lib/resend";
import { getCurrentUser } from "@/lib/session";
import { siteOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { inviteSchema, roleSchema } from "@/lib/validations/invite";
import type { WorkspaceSummary } from "@/lib/workspaces";

const uuidSchema = z.uuid();
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,128}$/);

/** Messages for the exceptions raised by the collaboration functions and triggers. */
const DB_ERRORS: Record<string, string> = {
  plan_limit: `O plano Free permite até ${PLAN_LIMITS.free.members} membros (contando convites pendentes). Faça upgrade para o Pro para convidar mais pessoas.`,
  already_member: "Essa pessoa já é membro deste workspace.",
  last_admin: "O workspace precisa de pelo menos um admin. Promova outra pessoa antes.",
  not_admin: "Apenas administradores podem fazer isso.",
  invite_not_found: "Convite não encontrado. Peça um novo convite a quem te convidou.",
  invite_used: "Este convite já foi usado.",
  invite_expired: "Este convite expirou. Peça um novo a quem te convidou.",
  invite_wrong_email: "Este convite foi enviado para outro e-mail. Entre com a conta do e-mail convidado.",
};

function dbError(error: { message: string; code?: string }, fallback: string): ActionFailure {
  return { ok: false, error: DB_ERRORS[error.message] ?? fallback };
}

/** Admin-only actions: workspace from the slug + the caller's role checked (RLS checks again). */
async function resolveAdminWorkspace(slug: string): Promise<{ workspace: WorkspaceSummary } | { error: ActionFailure }> {
  const resolved = await resolveWorkspace(slug);
  if ("error" in resolved) return resolved;
  if (resolved.workspace.role !== "admin") return { error: { ok: false, error: DB_ERRORS.not_admin } };
  return resolved;
}

export type InviteResult = ActionResult<{ email: string; emailSent: boolean; link: string }>;

/**
 * Creates (or replaces) the invite and e-mails the link. When the e-mail can't
 * be sent the invite still exists and the link comes back for the admin to share.
 */
export async function inviteMember(workspaceSlug: string, input: unknown): Promise<InviteResult> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const resolved = await resolveAdminWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  // 32 random bytes; only its SHA-256 is stored.
  const token = randomBytes(32).toString("base64url");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_workspace_invite", {
    p_workspace_id: workspace.id,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
    p_token: token,
  });
  if (error) return dbError(error, "Não foi possível criar o convite. Tente novamente.");

  const user = await getCurrentUser();
  const inviterName = (user?.user_metadata.full_name as string | undefined)?.trim() || user?.email || "Alguém";
  const link = `${siteOrigin()}/invite/${token}`;
  const emailSent = await sendEmail({
    to: parsed.data.email,
    ...inviteEmail({
      workspaceName: workspace.name,
      inviterName,
      roleLabel: ROLE_LABELS[parsed.data.role].toLowerCase(),
      link,
    }),
  });

  revalidatePath(`/${workspace.slug}/settings`);
  return { ok: true, email: parsed.data.email, emailSent, link };
}

export async function cancelInvite(workspaceSlug: string, inviteId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(inviteId).success) return { ok: false, error: "Convite não encontrado." };
  const resolved = await resolveAdminWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_invites")
    .delete()
    .eq("id", inviteId)
    .eq("workspace_id", workspace.id)
    .is("accepted_at", null);
  if (error) return { ok: false, error: "Não foi possível cancelar o convite. Tente novamente." };

  revalidatePath(`/${workspace.slug}/settings`);
  return { ok: true };
}

export async function updateMemberRole(workspaceSlug: string, userId: string, role: unknown): Promise<ActionResult> {
  const parsedRole = roleSchema.safeParse(role);
  if (!uuidSchema.safeParse(userId).success || !parsedRole.success) return { ok: false, error: "Dados inválidos." };
  const resolved = await resolveAdminWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .update({ role: parsedRole.data })
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();
  if (error) return dbError(error, "Não foi possível alterar o papel. Tente novamente.");
  if (!data) return { ok: false, error: "Membro não encontrado." };

  // The sidebar (settings link) depends on the role.
  revalidatePath(`/${workspace.slug}`, "layout");
  return { ok: true };
}

export async function removeMember(workspaceSlug: string, userId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(userId).success) return { ok: false, error: "Membro não encontrado." };
  const resolved = await resolveAdminWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();
  if (error) return dbError(error, "Não foi possível remover o membro. Tente novamente.");
  if (!data) return { ok: false, error: "Membro não encontrado." };

  // Removed owners become "sem responsável" in leads and deals.
  revalidatePath(`/${workspace.slug}`, "layout");
  return { ok: true };
}

export type AcceptInviteResult = ActionResult<{ workspaceSlug: string }>;

export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  if (!tokenSchema.safeParse(token).success) return { ok: false, error: DB_ERRORS.invite_not_found };
  if (!(await getCurrentUser())) {
    return { ok: false, error: "Sua sessão expirou. Entre novamente.", unauthenticated: true };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_workspace_invite", { p_token: token });
  if (error?.message === "plan_limit") {
    return { ok: false, error: "Este workspace atingiu o limite de membros do plano. Peça a um admin para liberar uma vaga." };
  }
  if (error) return dbError(error, "Não foi possível aceitar o convite. Tente novamente.");

  revalidatePath("/", "layout");
  return { ok: true, workspaceSlug: data };
}
