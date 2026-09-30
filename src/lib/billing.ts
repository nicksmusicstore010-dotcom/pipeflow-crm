import { createClient } from "@/lib/supabase/server";

/**
 * Billing state for the billing page: the Stripe customer and the latest
 * subscription. RLS lets only admins read subscriptions.
 */
export async function getBillingState(workspaceId: string) {
  const supabase = await createClient();
  const [workspace, subscription] = await Promise.all([
    supabase.from("workspaces").select("stripe_customer_id").eq("id", workspaceId).single(),
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

  return { hasCustomer: Boolean(workspace.data.stripe_customer_id), subscription: subscription.data };
}
