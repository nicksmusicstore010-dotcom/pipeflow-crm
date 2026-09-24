import { DEAL_STAGE_STYLES, type DealStage } from "@/lib/deal-stages";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * One Kanban column: colored top border, stage name, deal count and total value.
 * Deal cards go in `children`; with none, a dashed drop placeholder shows.
 */
export function KanbanColumn({
  stage,
  count,
  totalCents,
  children,
  className,
}: {
  stage: DealStage;
  count: number;
  totalCents: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const { label, border, dot } = DEAL_STAGE_STYLES[stage];

  return (
    <section
      aria-label={label}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border border-t-4 bg-card shadow-sm",
        border,
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} aria-hidden />
          <h2 className="truncate text-sm font-semibold">{label}</h2>
          <span className="rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {formatCurrency(totalCents)}
        </span>
      </header>
      <div className="flex min-h-40 flex-1 flex-col gap-2 p-2">
        {children ?? (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Nenhum negócio
          </div>
        )}
      </div>
    </section>
  );
}
