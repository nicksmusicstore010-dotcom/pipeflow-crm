import type { Enums } from "@/types/database";

export type SubscriptionStatus = Enums<"subscription_status">;

/** Same values as Stripe's `subscription.status`. */
export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
];

/**
 * Statuses that keep the workspace on Pro. `past_due` too: Stripe retries the
 * charge for a while, and cancels the subscription (→ Free) if it keeps failing.
 */
export const PRO_STATUSES: readonly SubscriptionStatus[] = ["trialing", "active", "past_due"];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Em teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  unpaid: "Não paga",
  canceled: "Cancelada",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada",
  paused: "Pausada",
};

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return (SUBSCRIPTION_STATUSES as readonly string[]).includes(value);
}
