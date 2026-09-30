import "server-only";

import Stripe from "stripe";

let client: Stripe | null = null;

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}. Copy it from the Stripe dashboard into .env.local.`);
  return value;
}

/** Whether checkout can run: secret key and Pro price set. The billing page shows a notice otherwise. */
export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRO_PRICE_ID?.trim());
}

/**
 * Stripe client with the secret key. Server-only (never prefix the key with
 * NEXT_PUBLIC_); created lazily so the app builds and boots without the key.
 */
export function getStripe() {
  client ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    appInfo: { name: "PipeFlow CRM" },
  });
  return client;
}

/** Price (price_...) of the Pro plan's monthly subscription. */
export function getProPriceId() {
  return requireEnv("STRIPE_PRO_PRICE_ID");
}

/** Signing secret (whsec_...) of the webhook endpoint, or of `stripe listen` locally. */
export function getWebhookSecret() {
  return requireEnv("STRIPE_WEBHOOK_SECRET");
}
