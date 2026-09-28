"use client";

import { useState } from "react";
import { Handshake, Plus } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { DealFormDialog } from "@/components/pipeline/deal-form-dialog";
import { DueDateLabel } from "@/components/pipeline/due-date-label";
import { StageBadge } from "@/components/pipeline/stage-badge";
import { Button } from "@/components/ui/button";
import type { Deal, LeadOption } from "@/lib/deals";
import { formatCurrency } from "@/lib/utils";
import type { WorkspaceMember } from "@/lib/workspaces";

/** "Negócios" section of a lead's page: its deals, with create (lead pre-filled) and edit. */
export function LeadDeals({
  workspaceSlug,
  leadId,
  deals,
  members,
  leads,
  currentUserId,
  today,
}: {
  workspaceSlug: string;
  leadId: string;
  deals: Deal[];
  members: WorkspaceMember[];
  leads: LeadOption[];
  currentUserId: string;
  today: string;
}) {
  const [editing, setEditing] = useState<Deal | null>(null);
  const dialogProps = { workspaceSlug, members, leads, currentUserId };

  const newDealButton = (
    <DealFormDialog
      {...dialogProps}
      defaults={{ leadId }}
      trigger={
        <Button variant="outline" size="sm">
          <Plus />
          Novo negócio
        </Button>
      }
    />
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Negócios</h2>
        {deals.length > 0 && newDealButton}
      </div>

      {deals.length === 0 ? (
        <EmptyState
          className="py-10"
          icon={Handshake}
          title="Nenhum negócio com este lead"
          description="Crie uma oportunidade para acompanhar este contato no pipeline."
          action={newDealButton}
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card shadow-sm">
          {deals.map((deal) => (
            <li key={deal.id}>
              <button
                type="button"
                onClick={() => setEditing(deal)}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1 basis-40 truncate text-sm font-medium">{deal.title}</span>
                <StageBadge stage={deal.stage} />
                {deal.due_date && <DueDateLabel dueDate={deal.due_date} stage={deal.stage} today={today} />}
                <span className="w-28 text-right text-sm font-semibold tabular-nums">
                  {formatCurrency(deal.value_cents)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <DealFormDialog
        {...dialogProps}
        deal={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </section>
  );
}
