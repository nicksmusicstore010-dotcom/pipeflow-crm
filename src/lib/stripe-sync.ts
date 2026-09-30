import "server-only";

import type Stripe from "stripe";
import { z } from "zod";

import { getStripe } from "@/lib/stripe";
import { isSubscriptionStatus, PRO_STATUSES } from "@/lib/subscription-status";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook side of billing: Stripe → subscriptions + workspaces.plan, with the
// secret key (the webhook has no logged-in user). Every write filters by workspace.

type AdminClient = ReturnType<typeof createAdminClient>;

const uuidSchema = z.uuid();

/** Who subscribed, as set by the checkout action (session and subscription metadata). */
export function readCheckoutMetadata(metadata: Stripe.Metadata | null | undefined) {
  const workspaceId = uuidSchema.safeParse(metadata?.workspace_id);
  const userId = uuidSchema.safeParse(metadata?.user_id);
  return {
    workspaceId: workspaceId.success ? workspaceId.data : null,
    userId: userId.success ? userId.data : null,
  };
}

/** Id of an expandable Stripe field (string, or the expanded object). */
export function stripeId(ref: string | { id: string } | null | undefined) {
  return typeof ref === "string" ? ref : (ref?.id ?? null);
}

function isoFromUnix(seconds: number | null | undefined) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/** The workspace a subscription belongs to: its metadata, else the Stripe customer already linked. */
async function findWorkspaceId(admin: AdminClient, subscription: Stripe.Subscription, hint: string | null) {
  const hinted = uuidSchema.safeParse(hint);
  const candidate = readCheckoutMetadata(subscription.metadata).workspaceId ?? (hinted.success ? hinted.data : null);
  if (candidate) {
    const { data, error } = await admin.from("workspaces").select("id").eq("id", candidate).maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  }
  const customerId = stripeId(subscription.customer);
  if (!customerId) return null;
  const { data, error } = await admin.from("workspaces").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/**
 * The workspace is Pro while any of its subscriptions is active (or retrying a
 * payment); otherwise it goes back to Free. Existing members and leads are kept.
 */
async function refreshWorkspacePlan(admin: AdminClient, workspaceId: string, customerId: string) {
  const { data, error } = await admin
    .from("subscriptions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("status", [...PRO_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;

  const current = data[0] ?? null;
  const { error: updateError } = await admin
    .from("workspaces")
    .update({
      plan: current ? "pro" : "free",
      stripe_customer_id: customerId,
      stripe_subscription_id: current?.id ?? null,
    })
    .eq("id", workspaceId);
  if (updateError) throw updateError;

  return current ? "pro" : "free";
}

/**
 * Copies the subscription's current state from Stripe (fetched again, so events
 * arriving out of order or twice don't matter) and updates the workspace plan.
 */
export async function syncSubscription(subscriptionId: string, workspaceHint: string | null = null) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const admin = createAdminClient();

  const workspaceId = await findWorkspaceId(admin, subscription, workspaceHint);
  // Workspace deleted, or a subscription not created by this app: nothing to update.
  if (!workspaceId) return null;

  const customerId = stripeId(subscription.customer);
  if (!customerId) throw new Error(`Subscription ${subscription.id} has no customer.`);
  if (!isSubscriptionStatus(subscription.status)) {
    throw new Error(`Unknown subscription status: ${subscription.status}`);
  }

  // Since API 2025-03-31 the billing period lives on the subscription items.
  const item = subscription.items.data[0];
  const { error } = await admin.from("subscriptions").upsert({
    id: subscription.id,
    workspace_id: workspaceId,
    stripe_customer_id: customerId,
    stripe_price_id: item?.price.id ?? null,
    status: subscription.status,
    current_period_end: isoFromUnix(item?.current_period_end),
    // The Customer Portal may schedule the cancellation with `cancel_at` instead.
    cancel_at_period_end: subscription.cancel_at_period_end || subscription.cancel_at !== null,
    canceled_at: isoFromUnix(subscription.canceled_at),
  });
  if (error) throw error;

  const plan = await refreshWorkspacePlan(admin, workspaceId, customerId);
  return { workspaceId, status: subscription.status, plan };
}

/** Subscription an invoice was issued for (null for one-off invoices). */
export function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  return stripeId(invoice.parent?.subscription_details?.subscription);
}
