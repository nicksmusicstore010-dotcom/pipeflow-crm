"use client";

import { useTransition } from "react";
import { CreditCard, Loader2, Sparkles } from "lucide-react";

import { createCheckoutSession, createPortalSession } from "@/actions/billing";
import { Button, type ButtonProps } from "@/components/ui/button";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";

const TARGETS = {
  checkout: { action: createCheckoutSession, icon: Sparkles },
  portal: { action: createPortalSession, icon: CreditCard },
};

/** Sends the admin to Stripe: Checkout ("Assinar Pro") or the Customer Portal ("Gerenciar assinatura"). */
export function BillingRedirectButton({
  workspaceSlug,
  target,
  children,
  ...props
}: { workspaceSlug: string; target: keyof typeof TARGETS } & Omit<ButtonProps, "onClick">) {
  const [pending, startTransition] = useTransition();
  const { action, icon: Icon } = TARGETS[target];

  function go() {
    startTransition(async () => {
      const result = await action(workspaceSlug).catch(() => NETWORK_ERROR);
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
