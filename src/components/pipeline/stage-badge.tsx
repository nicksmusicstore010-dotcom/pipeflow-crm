import { DEAL_STAGE_STYLES, type DealStage } from "@/lib/deal-stages";
import { cn } from "@/lib/utils";

/** Colored pill with the stage label ("Negociação", "Fechado Ganho"…). */
export function StageBadge({ stage, className }: { stage: DealStage; className?: string }) {
  const { label, badge, dot } = DEAL_STAGE_STYLES[stage];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}
