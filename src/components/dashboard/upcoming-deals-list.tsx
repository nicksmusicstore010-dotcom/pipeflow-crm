import Link from "next/link";

import { DueDateLabel } from "@/components/pipeline/due-date-label";
import { StageBadge } from "@/components/pipeline/stage-badge";
import type { UpcomingDeal } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/utils";

/** "Meus negócios com prazo próximo": title, lead, stage, value and the colored deadline. */
export function UpcomingDealsList({
  deals,
  workspaceSlug,
  today,
}: {
  deals: UpcomingDeal[];
  workspaceSlug: string;
  /** "yyyy-MM-dd" in São Paulo. */
  today: string;
}) {
  return (
    <ul className="divide-y">
      {deals.map((deal) => (
        <li key={deal.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <Link
              href={`/${workspaceSlug}/pipeline`}
              title={deal.title}
              className="block truncate text-sm font-medium hover:underline"
            >
              {deal.title}
            </Link>
            {deal.lead && (
              <Link
                href={`/${workspaceSlug}/leads/${deal.lead.id}`}
                className="block truncate text-xs text-muted-foreground hover:underline"
              >
                {deal.lead.name}
              </Link>
            )}
          </div>
          <span className="text-right text-sm font-medium tabular-nums">{formatCurrency(deal.value_cents)}</span>
          <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <StageBadge stage={deal.stage} />
            <DueDateLabel dueDate={deal.due_date} stage={deal.stage} today={today} />
          </div>
        </li>
      ))}
    </ul>
  );
}
