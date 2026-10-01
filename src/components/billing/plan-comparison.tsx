import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_FEATURES, PLAN_LABELS, PLAN_PRICES, type WorkspacePlan } from "@/lib/plans";
import { cn } from "@/lib/utils";

const PLANS: { plan: WorkspacePlan; description: string }[] = [
  { plan: "free", description: "Para começar e testar com um time pequeno." },
  { plan: "pro", description: "Para times que querem crescer sem limites." },
];

/**
 * Free × Pro side by side. `action` goes in the Pro card (e.g. "Assinar Pro"),
 * `freeAction` in the Free one (the landing page's sign-up CTA).
 */
export function PlanComparison({
  currentPlan,
  action,
  freeAction,
}: {
  /** Shows the "Plano atual" badge; left out on the public pricing page. */
  currentPlan?: WorkspacePlan;
  action?: React.ReactNode;
  freeAction?: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PLANS.map(({ plan, description }) => {
        const current = plan === currentPlan;
        return (
          <Card
            key={plan}
            className={cn("flex flex-col rounded-lg shadow-sm", plan === "pro" && "border-primary/60 ring-1 ring-primary/20")}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                {PLAN_LABELS[plan]}
                {current && <Badge variant="secondary">Plano atual</Badge>}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
              <p className="pt-2">
                <span className="text-3xl font-semibold tabular-nums">{PLAN_PRICES[plan]}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <ul className="space-y-2 text-sm">
                {PLAN_FEATURES[plan].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan === "pro" && action && <div className="mt-auto">{action}</div>}
              {plan === "free" && freeAction && <div className="mt-auto">{freeAction}</div>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
