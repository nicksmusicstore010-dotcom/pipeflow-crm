import { Handshake, Pencil, UserPlus, type LucideIcon } from "lucide-react";

import { ActivityActions } from "@/components/activities/activity-actions";
import { StageBadge } from "@/components/pipeline/stage-badge";
import type { Activity } from "@/lib/activities";
import { ACTIVITY_TYPE_STYLES } from "@/lib/activity-types";
import type { Deal } from "@/lib/deals";
import type { Lead } from "@/lib/leads";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

// Full class names so Tailwind can see them (activity tones live in lib/activity-types).
const EVENT_TONES = {
  primary: "bg-primary/10 text-primary",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  muted: "bg-muted text-muted-foreground",
};

type TimelineItem = {
  id: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  at: string;
  author?: string;
  /** Free text written by the user (activity description). */
  body?: string;
  details?: React.ReactNode;
  scheduled?: boolean;
  actions?: React.ReactNode;
};

// Saving the form a few seconds after creating it isn't a separate "update".
const UPDATE_THRESHOLD_MS = 60_000;

/**
 * The lead's history, newest first: activities (calls, e-mails, meetings, notes), deals
 * opened, the last edit and when it was created. Activities can be edited or deleted by
 * their author or a workspace admin.
 */
export function LeadTimeline({
  workspaceSlug,
  lead,
  deals,
  activities,
  memberNames,
  currentUserId,
  isAdmin,
  now,
}: {
  workspaceSlug: string;
  lead: Lead;
  deals: Deal[];
  activities: Activity[];
  memberNames: Map<string, string>;
  currentUserId: string;
  isAdmin: boolean;
  /** Request time (ms), so "scheduled" is decided once on the server. */
  now: number;
}) {
  const nameOf = (id: string | null) => (id ? memberNames.get(id) : undefined);

  const items: TimelineItem[] = [
    ...activities.map((activity): TimelineItem => {
      const { label, icon, tone } = ACTIVITY_TYPE_STYLES[activity.type];
      return {
        id: `activity-${activity.id}`,
        icon,
        tone,
        title: label,
        at: activity.occurred_at,
        author: nameOf(activity.author_id),
        body: activity.description,
        scheduled: Date.parse(activity.occurred_at) > now,
        actions:
          isAdmin || activity.author_id === currentUserId ? (
            <ActivityActions workspaceSlug={workspaceSlug} activity={activity} />
          ) : undefined,
      };
    }),
    ...deals.map(
      (deal): TimelineItem => ({
        id: `deal-${deal.id}`,
        icon: Handshake,
        tone: EVENT_TONES.indigo,
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
    {
      id: "created",
      icon: UserPlus,
      tone: EVENT_TONES.primary,
      title: "Lead cadastrado",
      at: lead.created_at,
      author: nameOf(lead.created_by),
    },
  ];
  if (Date.parse(lead.updated_at) - Date.parse(lead.created_at) > UPDATE_THRESHOLD_MS) {
    items.push({ id: "updated", icon: Pencil, tone: EVENT_TONES.muted, title: "Dados do lead atualizados", at: lead.updated_at });
  }
  // Stable for equal times: activities first, then deals, then lead events (insertion order).
  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return (
    <ol aria-label="Histórico do lead" className="relative space-y-6 rounded-lg border bg-card p-5 shadow-sm">
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-4">
          {/* Connector to the next item. */}
          {index < items.length - 1 && (
            <span aria-hidden className="absolute -bottom-6 left-4 top-9 w-px -translate-x-1/2 bg-border" />
          )}
          <span className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full", item.tone)}>
            <item.icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-start justify-between gap-2">
              <p className="flex flex-wrap items-center gap-2 break-words text-sm font-medium">
                {item.title}
                {item.scheduled && (
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                    Agendada
                  </span>
                )}
              </p>
              {item.actions && <div className="-mr-1 -mt-1 shrink-0">{item.actions}</div>}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <time dateTime={item.at} className="tabular-nums">
                {formatDateTime(item.at)}
              </time>
              {item.author && <> · por {item.author}</>}
            </p>
            {item.body && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.body}</p>}
            {item.details && <div className="mt-2">{item.details}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
