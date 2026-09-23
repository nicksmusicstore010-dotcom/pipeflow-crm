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
