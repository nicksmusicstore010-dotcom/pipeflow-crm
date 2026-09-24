import { LEAD_STATUS_STYLES, type LeadStatus } from "@/lib/lead-status";
import { cn } from "@/lib/utils";

export function LeadStatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const { label, badge, dot } = LEAD_STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
        badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}
