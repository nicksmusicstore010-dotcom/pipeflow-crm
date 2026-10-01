import Link from "next/link";
import { ChevronRight, CircleCheck, Circle, Rocket } from "lucide-react";

import { HideOnboardingButton } from "@/components/dashboard/hide-onboarding-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingStep } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/** "Primeiros passos": what is left to get value from the CRM, with a link to each. */
export function OnboardingChecklist({ steps, cookieName }: { steps: OnboardingStep[]; cookieName: string }) {
  const done = steps.filter((step) => step.done).length;

  return (
    <Card className="mb-6 rounded-lg border-primary/40 shadow-sm">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-4 w-4 text-primary" aria-hidden />
            Primeiros passos
          </CardTitle>
          <CardDescription>
            {done} de {steps.length} concluídos
          </CardDescription>
        </div>
        <HideOnboardingButton cookieName={cookieName} />
      </CardHeader>
      <CardContent>
        <div
          className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Progresso dos primeiros passos"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={done}
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
        <ol className="grid gap-2 sm:grid-cols-2">
          {steps.map((step) => (
            <li key={step.key}>
              <Link
                href={step.href}
                className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
              >
                {step.done ? (
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-medium", step.done && "text-muted-foreground line-through")}>
                    {step.label}
                    <span className="sr-only">{step.done ? " (concluído)" : " (pendente)"}</span>
                  </span>
                  <span className="block text-xs text-muted-foreground">{step.description}</span>
                </span>
                {!step.done && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
