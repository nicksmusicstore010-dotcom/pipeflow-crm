"use server";

import type { ActionFailure, ActionResult } from "@/lib/action-result";
import { resolveWorkspace } from "@/lib/action-workspace";
import { getCurrentUser } from "@/lib/session";
import { siteOrigin } from "@/lib/site-url";
import { getProPriceId, getStripe, isStripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceSummary } from "@/lib/workspaces";

export type BillingRedirectResult = ActionResult<{ url: string }>;

const NOT_CONFIGURED: ActionFailure = { ok: false, error: "Os pagamentos ainda não foram configurados neste ambiente." };

/** Billing is admin-only: workspace from the slug + role checked. */
async function resolveBillingWorkspace(slug: string): Promise<{ workspace: WorkspaceSummary } | { error: ActionFailure }> {
  const resolved = await resolveWorkspace(slug);
  if ("error" in resolved) return resolved;
  if (resolved.workspace.role !== "admin") {
    return { error: { ok: false, error: "Apenas administradores gerenciam o plano." } };
  }
  return resolved;
}

async function stripeCustomerId(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspaces").select("stripe_customer_id").eq("id", workspaceId).single();
  if (error) throw error;
  return data.stripe_customer_id;
}

/**
 * Opens a Stripe Checkout for the Pro plan. The plan only changes when the
 * webhook confirms the payment — never from here.
 */
export async function createCheckoutSession(workspaceSlug: string): Promise<BillingRedirectResult> {
  if (!isStripeConfigured()) return NOT_CONFIGURED;

  const resolved = await resolveBillingWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;
  if (workspace.plan === "pro") return { ok: false, error: "Este workspace já está no plano Pro." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente.", unauthenticated: true };

  try {
    const customer = await stripeCustomerId(workspace.id);
    const billingUrl = `${siteOrigin()}/${workspace.slug}/settings/billing`;
    // Read by the webhook to know which workspace to upgrade (and who subscribed).
    const metadata = { workspace_id: workspace.id, user_id: user.id };

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: getProPriceId(), quantity: 1 }],
      // Same Stripe customer on a new subscription after a cancellation.
      ...(customer ? { customer } : { customer_email: user.email }),
      client_reference_id: workspace.id,
      metadata,
      subscription_data: { metadata },
      locale: "pt-BR",
      success_url: `${billingUrl}?checkout=success`,
      cancel_url: `${billingUrl}?checkout=canceled`,
    });
    if (!session.url) throw new Error("Checkout session without URL.");
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[billing] checkout session failed:", error);
    return { ok: false, error: "Não foi possível abrir o pagamento. Tente novamente." };
  }
}

/** Opens the Stripe Customer Portal (card, invoices, cancel). */
export async function createPortalSession(workspaceSlug: string): Promise<BillingRedirectResult> {
  if (!isStripeConfigured()) return NOT_CONFIGURED;

  const resolved = await resolveBillingWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  try {
    const customer = await stripeCustomerId(workspace.id);
    if (!customer) return { ok: false, error: "Este workspace ainda não tem uma assinatura." };

    const session = await getStripe().billingPortal.sessions.create({
      customer,
      locale: "pt-BR",
      return_url: `${siteOrigin()}/${workspace.slug}/settings/billing`,
    });
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[billing] portal session failed:", error);
    return { ok: false, error: "Não foi possível abrir o portal de assinatura. Tente novamente." };
  }
}
