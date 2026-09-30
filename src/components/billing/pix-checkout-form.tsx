"use client";

import { useState } from "react";

import { BillingRedirectButton } from "@/components/billing/billing-redirect-button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PIX_MONTH_OPTIONS, PRO_MONTHLY_CENTS, type PixMonths } from "@/lib/plans";
import { formatCurrency } from "@/lib/utils";

const monthsLabel = (months: number) => (months === 1 ? "1 mês" : `${months} meses`);

/** Pay N months of Pro with Pix (one-off, no automatic renewal). */
export function PixCheckoutForm({
  workspaceSlug,
  renewing,
  disabled,
}: {
  workspaceSlug: string;
  /** Pro via Pix still valid: the months are added after the current end. */
  renewing: boolean;
  disabled?: boolean;
}) {
  const [months, setMonths] = useState<PixMonths>(1);

  return (
    <div className="space-y-2">
      <Label htmlFor="pix-months">{renewing ? "Renovar com Pix por" : "Ou pague com Pix por"}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={String(months)} onValueChange={(value) => setMonths(Number(value) as PixMonths)}>
          <SelectTrigger id="pix-months" className="w-full sm:w-36 sm:shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIX_MONTH_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {monthsLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <BillingRedirectButton
          workspaceSlug={workspaceSlug}
          target="pix"
          months={months}
          variant="outline"
          className="flex-1"
          disabled={disabled}
        >
          Pagar {formatCurrency(months * PRO_MONTHLY_CENTS)} com Pix
        </BillingRedirectButton>
      </div>
      <p className="text-xs text-muted-foreground">
        Pagamento único pelo QR code, sem renovação automática
        {renewing ? " — os meses são somados ao que ainda falta." : "."}
      </p>
    </div>
  );
}
