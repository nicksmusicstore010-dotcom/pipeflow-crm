import { CalendarClock } from "lucide-react";

import { DEAL_STAGE_STYLES, type DealStage } from "@/lib/deal-stages";
import { cn } from "@/lib/utils";

// Fictitious deals, only to show what the board looks like.
const COLUMNS: { stage: DealStage; total: string; deals: { title: string; value: string; due?: string; late?: boolean }[] }[] = [
  {
    stage: "new_lead",
    total: "R$ 12.400",
    deals: [
      { title: "Site institucional", value: "R$ 4.900" },
      { title: "Consultoria fiscal", value: "R$ 7.500", due: "Amanhã" },
    ],
  },
  { stage: "proposal_sent", total: "R$ 18.000", deals: [{ title: "Plano anual — Clínica Vida", value: "R$ 18.000", due: "Vencido", late: true }] },
  { stage: "negotiation", total: "R$ 32.700", deals: [{ title: "Reforma do escritório", value: "R$ 32.700" }] },
  { stage: "won", total: "R$ 9.800", deals: [{ title: "Treinamento da equipe", value: "R$ 9.800" }] },
];

/** Static picture of the Kanban for the hero (decorative: the text next to it says the same). */
export function HeroPreview() {
  return (
    <div aria-hidden className="relative overflow-hidden rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex gap-3 overflow-hidden">
        {COLUMNS.map(({ stage, total, deals }) => {
          const style = DEAL_STAGE_STYLES[stage];
          return (
            <div key={stage} className={cn("w-48 shrink-0 rounded-lg border border-t-4 bg-muted/40", style.border)}>
              <div className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
                  <span className="truncate">{style.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{total}</span>
              </div>
              <div className="space-y-2 px-2 pb-2">
                {deals.map((deal) => (
                  <div key={deal.title} className="rounded-md border bg-background p-2.5 text-left shadow-sm">
                    <p className="truncate text-xs font-medium">{deal.title}</p>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums">{deal.value}</p>
                    {deal.due && (
                      <p
                        className={cn(
                          "mt-1.5 flex items-center gap-1 text-[11px] font-medium",
                          deal.late ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400",
                        )}
                      >
                        <CalendarClock className="h-3 w-3" />
                        {deal.due}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* Fades the board out on the right, where it is cut. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-card to-transparent" />
    </div>
  );
}
