import { User } from "lucide-react";

import { DueDateLabel } from "@/components/pipeline/due-date-label";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { Deal } from "@/lib/deals";
import { cn, formatCurrency } from "@/lib/utils";

/** Card content: title, value, linked lead, deadline and owner. Dragging lives in the board. */
export function DealCard({
  deal,
  ownerName,
  today,
  className,
}: {
  deal: Deal;
  ownerName?: string;
  today: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border bg-background p-3 text-left shadow-sm", className)}>
      <p className="line-clamp-2 break-words text-sm font-medium">{deal.title}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(deal.value_cents)}</p>
      {deal.lead && (
        <p className="mt-1.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{deal.lead.name}</span>
        </p>
      )}
      {(deal.due_date || ownerName) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {deal.due_date ? <DueDateLabel dueDate={deal.due_date} stage={deal.stage} today={today} /> : <span />}
          {ownerName && <UserAvatar name={ownerName} size="sm" />}
        </div>
      )}
    </div>
  );
}
