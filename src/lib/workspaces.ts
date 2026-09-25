import { cache } from "react";

import { getCurrentUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/types/database";

export type WorkspaceSummary = Pick<Tables<"workspaces">, "id" | "name" | "slug" | "plan"> & {
  role: Enums<"workspace_role">;
};

/** Workspaces the current user belongs to, oldest membership first. RLS scopes the query. */
export const getUserWorkspaces = cache(async (): Promise<WorkspaceSummary[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspace:workspaces(id, name, slug, plan)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw error;

  return data.flatMap(({ role, workspace }) => (workspace ? [{ ...workspace, role }] : []));
});

/** The current user's workspace with this slug, or null (not a member / doesn't exist). */
export async function getWorkspaceBySlug(slug: string) {
  const workspaces = await getUserWorkspaces();
  return workspaces.find((w) => w.slug === slug) ?? null;
}

export type WorkspaceMember = { id: string; name: string };

/** Members of a workspace with their display names, alphabetically. */
export const getWorkspaceMembers = cache(async (workspaceId: string): Promise<WorkspaceMember[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id, profile:profiles(full_name)")
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  return data
    .map(({ user_id, profile }) => ({ id: user_id, name: profile?.full_name?.trim() || "Sem nome" }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
});
