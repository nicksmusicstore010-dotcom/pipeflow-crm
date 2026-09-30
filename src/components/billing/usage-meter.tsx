import type { LimitCheck } from "@/lib/limits";
import { cn } from "@/lib/utils";

/** "12 de 50 leads" with a bar; amber when the plan limit is reached. Unlimited = count only. */
export function UsageMeter({
  label,
  usage,
  units,
}: {
  label: string;
  usage: LimitCheck;
  /** Singular and plural, e.g. ["lead", "leads"]. */
  units: [string, string];
}) {
  const { used, limit } = usage;
  const unit = (n: number) => units[n === 1 ? 0 : 1];
  const full = limit !== null && used >= limit;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("tabular-nums", full && "font-medium text-amber-700 dark:text-amber-300")}>
          {limit === null ? `${used} ${unit(used)} · ilimitado` : `${used} de ${limit} ${unit(limit)}`}
        </span>
      </div>
      {limit !== null && (
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={label}
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
        >
          <div
            className={full ? "h-full bg-amber-500" : "h-full bg-primary"}
            style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
