import "server-only";

import type Stripe from "stripe";
import { z } from "zod";

import { isPixMonths, PRO_MONTHLY_CENTS } from "@/lib/plans";
import { getProPriceId, getStripe } from "@/lib/stripe";
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
 * payment) or while Pro paid with Pix hasn't run out; otherwise it goes back to
 * Free. Existing members and leads are kept.
 */
async function refreshWorkspacePlan(admin: AdminClient, workspaceId: string, customerId: string) {
  const [subscriptions, workspace] = await Promise.all([
    admin
      .from("subscriptions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .in("status", [...PRO_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1),
    admin.from("workspaces").select("pro_until").eq("id", workspaceId).single(),
  ]);
  if (subscriptions.error) throw subscriptions.error;
  if (workspace.error) throw workspace.error;

  const current = subscriptions.data[0] ?? null;
  const prepaid = workspace.data.pro_until !== null && Date.parse(workspace.data.pro_until) > Date.now();
  const plan = current || prepaid ? "pro" : "free";
  const { error: updateError } = await admin
    .from("workspaces")
    .update({ plan, stripe_customer_id: customerId, stripe_subscription_id: current?.id ?? null })
    .eq("id", workspaceId);
  if (updateError) throw updateError;

  return plan;
}

let proProductId: Promise<string> | null = null;

/** Product of the Pro price (cached). A price change inside it keeps subscribers Pro. */
function getProProductId() {
  proProductId ??= getStripe()
    .prices.retrieve(getProPriceId())
    .then((price) => stripeId(price.product)!)
    .catch((error) => {
      proProductId = null;
      throw error;
    });
  return proProductId;
}

/**
 * Copies the subscription's current state from Stripe (fetched again, so events
 * arriving out of order or twice don't matter) and updates the workspace plan.
 */
export async function syncSubscription(subscriptionId: string, workspaceHint: string | null = null) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  // Only the Pro product counts: another product sold on the same Stripe account
  // (to the same customer) must not unlock Pro.
  const proProduct = await getProProductId();
  if (!subscription.items.data.some((item) => stripeId(item.price.product) === proProduct)) {
    console.warn(`[stripe] subscription ${subscription.id} is not for the Pro product; ignored.`);
    return null;
  }
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

/** Checkout Session paying Pro in advance with Pix (see createPixCheckoutSession). */
export function isPixProSession(session: Stripe.Checkout.Session) {
  return session.mode === "payment" && session.metadata?.kind === "pix_pro";
}

/**
 * A paid Pix Checkout Session → N more months of Pro (apply_pix_payment() is
 * atomic and ignores a session it already applied, so retries are harmless).
 * Returns null when there is nothing to apply (not paid yet, workspace gone).
 */
export async function applyPixCheckout(session: Stripe.Checkout.Session) {
  if (!isPixProSession(session) || session.payment_status !== "paid") return null;

  const { workspaceId, userId } = readCheckoutMetadata(session.metadata);
  const months = Number(session.metadata?.months);
  const paymentIntentId = stripeId(session.payment_intent);
  const customerId = stripeId(session.customer);
  // All set by createPixCheckoutSession (customer_creation: "always") on a paid session.
  if (!workspaceId || !userId || !isPixMonths(months) || !paymentIntentId || !customerId) {
    throw new Error(`Pix session ${session.id} with missing or invalid data.`);
  }
  // What was actually paid must match the months (the IOF of foreign accounts is charged on top).
  const expected = months * PRO_MONTHLY_CENTS;
  if (session.currency !== "brl" || session.amount_subtotal !== expected) {
    throw new Error(`Pix session ${session.id}: paid ${session.amount_subtotal} ${session.currency}, expected ${expected} brl.`);
  }

  const { data, error } = await createAdminClient().rpc("apply_pix_payment", {
    p_session_id: session.id,
    p_workspace_id: workspaceId,
    p_months: months,
    p_amount_cents: session.amount_total ?? expected,
    p_payment_intent_id: paymentIntentId,
    p_paid_by: userId,
    p_customer_id: customerId,
  });
  // Workspace deleted meanwhile: nothing to extend (and retrying won't help).
  if (error?.code === "P0002") return null;
  if (error) throw error;
  return { workspaceId, months, proUntil: data };
}
