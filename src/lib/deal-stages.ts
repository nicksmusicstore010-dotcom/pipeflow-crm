/**
 * Pipeline stages in board order — single source of truth for labels and colors.
 * Mirrors the `deal_stage` enum that milestone 4 adds to the database.
 */
export const DEAL_STAGES = [
  "new_lead",
  "contacted",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

type StageStyle = {
  label: string;
  /** Badge background/text. */
  badge: string;
  /** Top border of the Kanban column. */
  border: string;
  /** Small dot/indicator. */
  dot: string;
};

// Full class names (no string building) so Tailwind can see them.
export const DEAL_STAGE_STYLES: Record<DealStage, StageStyle> = {
  new_lead: {
    label: "Novo Lead",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    border: "border-t-slate-400",
    dot: "bg-slate-400",
  },
  contacted: {
    label: "Contato Realizado",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    border: "border-t-sky-500",
    dot: "bg-sky-500",
  },
  proposal_sent: {
    label: "Proposta Enviada",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    border: "border-t-indigo-500",
    dot: "bg-indigo-500",
  },
  negotiation: {
    label: "Negociação",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    border: "border-t-amber-500",
    dot: "bg-amber-500",
  },
  won: {
    label: "Fechado Ganho",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    border: "border-t-emerald-500",
    dot: "bg-emerald-500",
  },
  lost: {
    label: "Fechado Perdido",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    border: "border-t-rose-500",
    dot: "bg-rose-500",
  },
};
