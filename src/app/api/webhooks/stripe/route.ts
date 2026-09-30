import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe, getWebhookSecret } from "@/lib/stripe";
import {
  applyPixCheckout,
  invoiceSubscriptionId,
  isPixProSession,
  readCheckoutMetadata,
  stripeId,
  syncSubscription,
} from "@/lib/stripe-sync";

// The only Route Handler for mutations in the app: Stripe calls it directly,
// with no session. Everything else changes data through Server Actions.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe-Signature header." }, { status: 400 });

  // Raw body: the signature is computed over the exact bytes Stripe sent (JSON.parse would change them).
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (error) {
    console.error("[stripe webhook] signature verification failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (error) {
    // 500 makes Stripe retry the event later (with backoff, for up to 3 days).
    console.error(`[stripe webhook] ${event.type} (${event.id}) failed:`, error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    // Checkout paid → Pro. With Pix the customer may still be paying in the bank app
    // (payment_status "unpaid"): then the Pro comes with async_payment_succeeded.
    case "checkout.session.completed": {
      const session = event.data.object;
      if (isPixProSession(session)) {
        await applyPixAndLog(session, "completed");
        return;
      }
      const subscriptionId = stripeId(session.subscription);
      if (session.mode !== "subscription" || !subscriptionId) return;

      const { workspaceId, userId } = readCheckoutMetadata(session.metadata);
      const result = await syncSubscription(subscriptionId, workspaceId ?? session.client_reference_id);
      console.info(
        `[stripe webhook] checkout completed: workspace ${result?.workspaceId ?? "not found"} → ${result?.plan ?? "-"} (by user ${userId ?? "?"})`,
      );
      return;
    }

    // Pix confirmed by the bank after the checkout → N more months of Pro.
    case "checkout.session.async_payment_succeeded": {
      await applyPixAndLog(event.data.object, "confirmed");
      return;
    }

    // Pix QR code expired unpaid: nothing to undo.
    case "checkout.session.async_payment_failed": {
      console.info(`[stripe webhook] Pix not paid (expired): session ${event.data.object.id}`);
      return;
    }

    // Subscription ended (canceled now, at period end, or after failed retries) → Free.
    case "customer.subscription.deleted": {
      const result = await syncSubscription(event.data.object.id);
      console.info(`[stripe webhook] subscription deleted: workspace ${result?.workspaceId ?? "not found"} → ${result?.plan ?? "-"}`);
      return;
    }

    // Any other change: cancellation scheduled or undone in the Portal, a delayed
    // payment confirmed (incomplete → active), unpaid after the retries (→ Free).
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const result = await syncSubscription(event.data.object.id);
      console.info(`[stripe webhook] ${event.type}: workspace ${result?.workspaceId ?? "not found"} → ${result?.status ?? "-"}`);
      return;
    }

    // Renewal charge failed: status becomes past_due (still Pro while Stripe retries).
    case "invoice.payment_failed": {
      const subscriptionId = invoiceSubscriptionId(event.data.object);
      if (!subscriptionId) return;
      const result = await syncSubscription(subscriptionId);
      console.warn(`[stripe webhook] payment failed: workspace ${result?.workspaceId ?? "not found"} → ${result?.status ?? "-"}`);
      return;
    }

    default:
      // Other events enabled on the endpoint are acknowledged and ignored.
      return;
  }
}

async function applyPixAndLog(session: Stripe.Checkout.Session, stage: string) {
  const result = await applyPixCheckout(session);
  console.info(
    result
      ? `[stripe webhook] Pix ${stage}: workspace ${result.workspaceId} +${result.months} month(s), Pro until ${result.proUntil}`
      : `[stripe webhook] Pix ${stage}: session ${session.id} ${session.payment_status} — nothing to apply yet`,
  );
}
