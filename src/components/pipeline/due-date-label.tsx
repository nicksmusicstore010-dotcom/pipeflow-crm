import { CalendarClock } from "lucide-react";

import { CLOSED_STAGES, type DealStage } from "@/lib/deal-stages";
import { cn, daysBetween, formatDay } from "@/lib/utils";

/** Deadlines this close (in days) are highlighted in amber. */
export const DUE_SOON_DAYS = 3;

type DueStatus = "overdue" | "soon" | "ok";

export function dueStatus(dueDate: string, stage: DealStage, today: string): DueStatus {
  if (CLOSED_STAGES.includes(stage)) return "ok";
  const days = daysBetween(today, dueDate);
  if (days < 0) return "overdue";
  return days <= DUE_SOON_DAYS ? "soon" : "ok";
}

const STATUS_TEXT: Record<DueStatus, string | null> = {
  overdue: "Vencido",
  soon: "Vence em breve",
  ok: null,
};

/** "30/09/2026" with a clock icon; amber when due soon, rose when overdue (open deals only). */
export function DueDateLabel({
  dueDate,
  stage,
  today,
  className,
}: {
  dueDate: string;
  stage: DealStage;
  /** "yyyy-MM-dd" in São Paulo, computed once by the caller so the server and browser agree. */
  today: string;
  className?: string;
}) {
  const status = dueStatus(dueDate, stage, today);
  const statusText = STATUS_TEXT[status];

  return (
    <span
      title={statusText ? `${statusText} · prazo ${formatDay(dueDate)}` : `Prazo ${formatDay(dueDate)}`}
      className={cn(
        "inline-flex items-center gap-1 text-xs tabular-nums",
        status === "overdue" && "font-medium text-rose-600 dark:text-rose-400",
        status === "soon" && "font-medium text-amber-600 dark:text-amber-400",
        status === "ok" && "text-muted-foreground",
        className,
      )}
    >
      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
      {formatDay(dueDate)}
      {statusText && <span className="sr-only">({statusText})</span>}
    </span>
  );
}
