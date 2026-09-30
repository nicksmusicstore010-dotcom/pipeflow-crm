"use server";

import type { ActionFailure, ActionResult } from "@/lib/action-result";
import { resolveWorkspace } from "@/lib/action-workspace";
import { isPixMonths, PRO_MONTHLY_CENTS } from "@/lib/plans";
import { getCurrentUser } from "@/lib/session";
import { siteOrigin } from "@/lib/site-url";
import { getProPriceId, getStripe, isStripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
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

async function workspaceBilling(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("stripe_customer_id, pro_until")
    .eq("id", workspaceId)
    .single();
  if (error) throw error;
  const prepaidUntil = data.pro_until && Date.parse(data.pro_until) > Date.now() ? data.pro_until : null;
  return { customer: data.stripe_customer_id, prepaidUntil };
}

/** The customer's subscription that isn't over yet (active, trialing, past_due, unpaid...), if any. */
async function findLiveSubscription(customer: string) {
  const { data } = await getStripe().subscriptions.list({ customer, status: "all", limit: 10 });
  return data.find((s) => !["canceled", "incomplete", "incomplete_expired"].includes(s.status)) ?? null;
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
    const { customer, prepaidUntil } = await workspaceBilling(workspace.id);
    // Paid with Pix until a future date: a card subscription now would charge twice.
    if (prepaidUntil) {
      return {
        ok: false,
        error: `O Pro deste workspace está pago com Pix até ${formatDate(prepaidUntil)}. Renove com Pix ou assine com cartão depois dessa data.`,
      };
    }
    // workspaces.plan only changes when the webhook arrives: ask Stripe too, so a second
    // click (or a second admin) in the meantime doesn't start a second subscription.
    const live = customer ? await findLiveSubscription(customer) : null;
    if (live) {
      return {
        ok: false,
        error: ["past_due", "unpaid"].includes(live.status)
          ? "A assinatura deste workspace tem um pagamento pendente. Regularize em \"Gerenciar assinatura\"."
          : "Este workspace já tem uma assinatura. Atualize a página em alguns segundos.",
      };
    }

    const billingUrl = `${await siteOrigin()}/${workspace.slug}/settings/billing`;
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
    const { customer } = await workspaceBilling(workspace.id);
    if (!customer) return { ok: false, error: "Este workspace ainda não tem uma assinatura." };

    const session = await getStripe().billingPortal.sessions.create({
      customer,
      locale: "pt-BR",
      return_url: `${await siteOrigin()}/${workspace.slug}/settings/billing`,
    });
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[billing] portal session failed:", error);
    return { ok: false, error: "Não foi possível abrir o portal de assinatura. Tente novamente." };
  }
}

/**
 * Pix (one-off payment: Stripe accounts in Brazil have no recurring Pix) for
 * `months` of Pro, added after whatever is left. The webhook applies it once the
 * bank confirms; nothing changes here.
 */
export async function createPixCheckoutSession(workspaceSlug: string, months: unknown): Promise<BillingRedirectResult> {
  if (!isStripeConfigured()) return NOT_CONFIGURED;
  if (!isPixMonths(months)) return { ok: false, error: "Escolha por quantos meses pagar." };

  const resolved = await resolveBillingWorkspace(workspaceSlug);
  if ("error" in resolved) return resolved.error;
  const { workspace } = resolved;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente.", unauthenticated: true };

  try {
    const { customer } = await workspaceBilling(workspace.id);
    // A card subscription already keeps the workspace Pro: paying Pix too would charge twice.
    if (customer && (await findLiveSubscription(customer))) {
      return { ok: false, error: "Este workspace já tem uma assinatura com cartão. Gerencie-a em \"Gerenciar assinatura\"." };
    }

    const billingUrl = `${await siteOrigin()}/${workspace.slug}/settings/billing`;
    const metadata = { workspace_id: workspace.id, user_id: user.id, kind: "pix_pro", months: String(months) };
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["pix"],
      line_items: [
        {
          quantity: months,
          price_data: {
            currency: "brl",
            unit_amount: PRO_MONTHLY_CENTS,
            product_data: { name: "PipeFlow Pro — 1 mês", description: "Pagamento único com Pix, sem renovação automática" },
          },
        },
      ],
      // A customer lets the payments show up together in Stripe (and the webhook link the workspace).
      ...(customer ? { customer } : { customer_email: user.email, customer_creation: "always" as const }),
      client_reference_id: workspace.id,
      metadata,
      payment_intent_data: { metadata },
      locale: "pt-BR",
      success_url: `${billingUrl}?checkout=pix`,
      cancel_url: `${billingUrl}?checkout=canceled`,
    });
    if (!session.url) throw new Error("Checkout session without URL.");
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[billing] Pix checkout session failed:", error);
    return { ok: false, error: "Não foi possível abrir o pagamento com Pix. Tente novamente." };
  }
}
