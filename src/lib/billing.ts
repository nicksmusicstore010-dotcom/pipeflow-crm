import { createClient } from "@/lib/supabase/server";
import { PRO_STATUSES } from "@/lib/subscription-status";

const DAY_MS = 24 * 60 * 60 * 1000;

export type PrepaidPro = { until: string; daysLeft: number };

/** Pro paid with Pix that hasn't run out yet (days left rounded up), or null. */
export function prepaidPro(proUntil: string | null): PrepaidPro | null {
  if (!proUntil) return null;
  const left = Date.parse(proUntil) - Date.now();
  return left > 0 ? { until: proUntil, daysLeft: Math.ceil(left / DAY_MS) } : null;
}

/**
 * Billing state for the billing page: the latest card subscription and the Pro
 * paid with Pix. RLS lets only admins read subscriptions.
 */
export async function getBillingState(workspaceId: string) {
  const supabase = await createClient();
  const [workspace, subscription] = await Promise.all([
    supabase.from("workspaces").select("pro_until").eq("id", workspaceId).single(),
    supabase
      .from("subscriptions")
      .select("id, status, current_period_end, cancel_at_period_end")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (workspace.error) throw workspace.error;
  if (subscription.error) throw subscription.error;

  return {
    subscription: subscription.data,
    /** A card subscription that keeps the workspace Pro right now. */
    cardActive: subscription.data !== null && PRO_STATUSES.includes(subscription.data.status),
    prepaid: prepaidPro(workspace.data.pro_until),
  };
}
