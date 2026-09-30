"use client";

import { useTransition } from "react";
import { CreditCard, Loader2, QrCode, Sparkles } from "lucide-react";

import { createCheckoutSession, createPixCheckoutSession, createPortalSession } from "@/actions/billing";
import { Button, type ButtonProps } from "@/components/ui/button";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";

const TARGETS = {
  checkout: { action: (slug: string) => createCheckoutSession(slug), icon: Sparkles },
  pix: { action: (slug: string, months?: number) => createPixCheckoutSession(slug, months), icon: QrCode },
  portal: { action: (slug: string) => createPortalSession(slug), icon: CreditCard },
};

/**
 * Sends the admin to Stripe: card Checkout ("Assinar Pro"), Pix Checkout for
 * `months` of Pro, or the Customer Portal ("Gerenciar assinatura").
 */
export function BillingRedirectButton({
  workspaceSlug,
  target,
  months,
  children,
  ...props
}: { workspaceSlug: string; target: keyof typeof TARGETS; months?: number } & Omit<ButtonProps, "onClick">) {
  const [pending, startTransition] = useTransition();
  const { action, icon: Icon } = TARGETS[target];

  function go() {
    startTransition(async () => {
      const result = await action(workspaceSlug, months).catch(() => NETWORK_ERROR);
      if (!result.ok) {
        toastActionError(result);
        return;
      }
      window.location.assign(result.url);
      // Keep the spinner while the browser leaves for Stripe.
      await new Promise(() => {});
    });
  }

  return (
    <Button {...props} onClick={go} disabled={pending || props.disabled}>
      {pending ? <Loader2 className="animate-spin" /> : <Icon />}
      {children}
    </Button>
  );
}
