"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Admins, anywhere in the app: Pro paid with Pix ends in a few days (hidden on the billing page itself). */
export function PrepaidExpiryBanner({
  workspaceSlug,
  daysLeft,
  until,
}: {
  workspaceSlug: string;
  daysLeft: number;
  /** Already formatted (dd/MM/yyyy). */
  until: string;
}) {
  const billingHref = `/${workspaceSlug}/settings/billing`;
  if (usePathname() === billingHref) return null;

  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
    >
      <p className="flex gap-3">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <span>
          O Pro pago com Pix vence em {daysLeft} {daysLeft === 1 ? "dia" : "dias"} ({until}). Depois disso o workspace
          volta para o plano Free.
        </span>
      </p>
      <Button asChild size="sm" className="shrink-0">
        <Link href={billingHref}>Renovar com Pix</Link>
      </Button>
    </div>
  );
}
