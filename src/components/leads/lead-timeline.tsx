import { Handshake, Pencil, UserPlus, type LucideIcon } from "lucide-react";

import { StageBadge } from "@/components/pipeline/stage-badge";
import type { Deal } from "@/lib/deals";
import type { Lead } from "@/lib/leads";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

// Full class names so Tailwind can see them. Activities (call, e-mail, meeting, note) get
// their own tones in milestone 5.
const TONES = {
  primary: "bg-primary/10 text-primary",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  muted: "bg-muted text-muted-foreground",
} as const;

type TimelineItem = {
  id: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  title: string;
  at: string;
  author?: string;
  details?: React.ReactNode;
};

// Saving the form a few seconds after creating it isn't a separate "update".
const UPDATE_THRESHOLD_MS = 60_000;

/** The lead's history, newest first: created, deals opened, last edit. Activities join it in milestone 5. */
export function LeadTimeline({
  lead,
  deals,
  memberNames,
}: {
  lead: Lead;
  deals: Deal[];
  memberNames: Map<string, string>;
}) {
  const nameOf = (id: string | null) => (id ? memberNames.get(id) : undefined);

  const items: TimelineItem[] = [
    {
      id: "created",
      icon: UserPlus,
      tone: "primary",
      title: "Lead cadastrado",
      at: lead.created_at,
      author: nameOf(lead.created_by),
    },
    ...deals.map(
      (deal): TimelineItem => ({
        id: `deal-${deal.id}`,
        icon: Handshake,
        tone: "indigo",
        title: `Negócio criado: ${deal.title}`,
        at: deal.created_at,
        author: nameOf(deal.created_by),
        details: (
          <span className="flex flex-wrap items-center gap-2">
            <StageBadge stage={deal.stage} />
            <span className="text-sm font-medium tabular-nums">{formatCurrency(deal.value_cents)}</span>
          </span>
        ),
      }),
    ),
  ];
  if (Date.parse(lead.updated_at) - Date.parse(lead.created_at) > UPDATE_THRESHOLD_MS) {
    items.push({ id: "updated", icon: Pencil, tone: "muted", title: "Dados do lead atualizados", at: lead.updated_at });
  }
  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return (
    <ol aria-label="Histórico do lead" className="relative space-y-6 rounded-lg border bg-card p-5 shadow-sm">
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-4">
          {/* Connector to the next item. */}
          {index < items.length - 1 && (
            <span aria-hidden className="absolute left-4 top-9 -bottom-6 w-px -translate-x-1/2 bg-border" />
          )}
          <span className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full", TONES[item.tone])}>
            <item.icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <p className="break-words text-sm font-medium">{item.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <time dateTime={item.at} className="tabular-nums">
                {formatDateTime(item.at)}
              </time>
              {item.author && <> · por {item.author}</>}
            </p>
            {item.details && <div className="mt-2">{item.details}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
