import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

const DEAL_COLUMNS =
  "id, title, value_cents, stage, position, owner_id, lead_id, due_date, created_at, created_by, lead:leads(id, name)" as const;

export type Deal = Pick<
  Tables<"deals">,
  "id" | "title" | "value_cents" | "stage" | "position" | "owner_id" | "lead_id" | "due_date" | "created_at" | "created_by"
> & { lead: { id: string; name: string } | null };

/** Every deal of the workspace in board order (stage, then position inside the column). */
export async function listDeals(workspaceId: string): Promise<Deal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_COLUMNS)
    .eq("workspace_id", workspaceId)
    .order("position")
    .order("created_at")
    .order("id");
  if (error) throw error;
  return data;
}

/** Deals linked to one lead, newest first (lead detail page). */
export async function listLeadDeals(workspaceId: string, leadId: string): Promise<Deal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_COLUMNS)
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export type LeadOption = { id: string; name: string };

/** Leads to pick from in the deal form, alphabetically. */
export async function listLeadOptions(workspaceId: string): Promise<LeadOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("name")
    .limit(1000);
  if (error) throw error;
  return data;
}
