import type { Enums } from "@/types/database";

export type LeadStatus = Enums<"lead_status">;

/** Lead statuses in display order — single source of truth for labels and colors. */
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "customer",
] as const satisfies readonly LeadStatus[];

// Full class names (no string building) so Tailwind can see them.
export const LEAD_STATUS_STYLES: Record<LeadStatus, { label: string; badge: string; dot: string }> = {
  new: {
    label: "Novo",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  contacted: {
    label: "Em contato",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  qualified: {
    label: "Qualificado",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  unqualified: {
    label: "Desqualificado",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  customer: {
    label: "Cliente",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
};

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}
