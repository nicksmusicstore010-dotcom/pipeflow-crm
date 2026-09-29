import type { WorkspaceRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type MemberRow = {
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
};

/** Members with name and e-mail (admins only — returns [] for anyone else). */
export async function listMembers(workspaceId: string): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_workspace_members", { p_workspace_id: workspaceId });
  if (error) throw error;
  return data.map((m) => ({
    userId: m.user_id,
    name: m.full_name?.trim() || m.email,
    email: m.email,
    role: m.role,
    joinedAt: m.joined_at,
  }));
}

export type OpenInvite = {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  expired: boolean;
  createdAt: string;
};

/** Invites not accepted yet, newest first (RLS: admins only). */
export async function listOpenInvites(workspaceId: string): Promise<OpenInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("id, email, role, expires_at, created_at")
    .eq("workspace_id", workspaceId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const now = Date.now();
  return data.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    expiresAt: i.expires_at,
    expired: Date.parse(i.expires_at) <= now,
    createdAt: i.created_at,
  }));
}

export type InvitePreview = {
  workspaceName: string;
  email: string;
  role: WorkspaceRole;
  inviterName: string | null;
  status: "pending" | "expired" | "accepted";
};

/** What /invite/[token] shows; null for an unknown token. Works without a session. */
export async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_preview", { p_token: token });
  if (error) throw error;
  const row = data[0];
  if (!row) return null;
  return {
    workspaceName: row.workspace_name,
    email: row.email,
    role: row.role,
    inviterName: row.inviter_name,
    status: row.status as InvitePreview["status"],
  };
}
