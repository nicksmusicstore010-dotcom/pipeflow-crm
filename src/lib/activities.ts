import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Activity = Pick<
  Tables<"activities">,
  "id" | "lead_id" | "author_id" | "type" | "description" | "occurred_at" | "created_at"
>;

/** A lead's activities, most recent first. */
export async function listLeadActivities(workspaceId: string, leadId: string): Promise<Activity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("id, lead_id, author_id, type, description, occurred_at, created_at")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
