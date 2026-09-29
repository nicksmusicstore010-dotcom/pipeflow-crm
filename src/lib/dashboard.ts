import { CLOSED_STAGES, DEAL_STAGES, type DealStage } from "@/lib/deal-stages";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/utils";

/** "My deals due soon" looks this many days ahead (overdue ones are always included). */
export const UPCOMING_DAYS = 7;
const UPCOMING_LIMIT = 10;

export type StageTotal = { stage: DealStage; count: number; valueCents: number };

export type DashboardMetrics = {
  /** Every stage in board order, zero when it has no deals. */
  stages: StageTotal[];
  openCount: number;
  openValueCents: number;
  wonCount: number;
  lostCount: number;
  /** won ÷ (won + lost), 0–1; null while no deal has been closed. */
  conversionRate: number | null;
};

/** Deal counts and values per stage, aggregated in the database (`deal_stage_totals`). */
export async function getDashboardMetrics(workspaceId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("deal_stage_totals", { p_workspace_id: workspaceId });
  if (error) throw error;

  const stages = DEAL_STAGES.map((stage) => {
    const row = data.find((r) => r.stage === stage);
    return { stage, count: row?.deal_count ?? 0, valueCents: row?.value_cents ?? 0 };
  });
  const open = stages.filter((s) => !CLOSED_STAGES.includes(s.stage));
  const wonCount = stages.find((s) => s.stage === "won")?.count ?? 0;
  const lostCount = stages.find((s) => s.stage === "lost")?.count ?? 0;
  const closed = wonCount + lostCount;

  return {
    stages,
    openCount: open.reduce((sum, s) => sum + s.count, 0),
    openValueCents: open.reduce((sum, s) => sum + s.valueCents, 0),
    wonCount,
    lostCount,
    conversionRate: closed === 0 ? null : wonCount / closed,
  };
}

export type UpcomingDeal = {
  id: string;
  title: string;
  value_cents: number;
  stage: DealStage;
  due_date: string;
  lead: { id: string; name: string } | null;
};

/** Open deals owned by the user, overdue or due within UPCOMING_DAYS, soonest first. */
export async function listUpcomingDeals(workspaceId: string, userId: string, today: string): Promise<UpcomingDeal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("id, title, value_cents, stage, due_date, lead:leads(id, name)")
    .eq("workspace_id", workspaceId)
    .eq("owner_id", userId)
    .not("stage", "in", `(${CLOSED_STAGES.join(",")})`)
    .not("due_date", "is", null)
    .lte("due_date", addDays(today, UPCOMING_DAYS))
    .order("due_date")
    .order("created_at")
    .limit(UPCOMING_LIMIT);
  if (error) throw error;
  // due_date is filtered to non-null above; the generated type can't know that.
  return data.flatMap((deal) => (deal.due_date ? [{ ...deal, due_date: deal.due_date }] : []));
}
