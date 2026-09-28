"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createActivity, updateActivity } from "@/actions/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";
import type { Activity } from "@/lib/activities";
import { ACTIVITY_TYPE_STYLES, ACTIVITY_TYPES } from "@/lib/activity-types";
import { cn, toSaoPauloInput } from "@/lib/utils";
import { activitySchema, type ActivityFormValues } from "@/lib/validations/activity";

/**
 * Log a new activity on a lead (`leadId`) or edit one (`activity`). After saving, a new
 * activity form clears the text and keeps the type, ready for the next one.
 */
export function ActivityForm({
  workspaceSlug,
  leadId,
  activity,
  onSaved,
  onCancel,
}: {
  workspaceSlug: string;
  leadId?: string;
  activity?: Activity;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const idPrefix = activity ? `activity-${activity.id}` : "new-activity";
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: activity?.type ?? "call",
      description: activity?.description ?? "",
      occurredAt: toSaoPauloInput(activity?.occurred_at),
    },
  });
  const { errors, isSubmitting } = form.formState;
  const type = form.watch("type");

  async function onSubmit(input: ActivityFormValues) {
    // The field is pre-filled when the page loads; untouched on a new activity, it means "now".
    const values =
      !activity && !form.getFieldState("occurredAt").isDirty ? { ...input, occurredAt: toSaoPauloInput() } : input;
    const save = activity
      ? updateActivity(workspaceSlug, activity.id, values)
      : createActivity(workspaceSlug, leadId ?? "", values);
    const result = await save.catch(() => NETWORK_ERROR);
    if (!result.ok) {
      toastActionError(result);
      return;
    }
    toast.success(activity ? "Atividade atualizada." : "Atividade registrada.");
    if (!activity) form.reset({ type: values.type, description: "", occurredAt: toSaoPauloInput() });
    onSaved?.();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Controller
        control={form.control}
        name="type"
        render={({ field }) => (
          <div role="radiogroup" aria-label="Tipo de atividade" className="flex flex-wrap gap-2">
            {ACTIVITY_TYPES.map((value) => {
              const { label, icon: Icon, tone } = ACTIVITY_TYPE_STYLES[value];
              const selected = field.value === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => field.onChange(value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? cn("border-transparent", tone) : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        )}
      />

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-description`}>Descrição</Label>
        <Textarea
          id={`${idPrefix}-description`}
          rows={3}
          placeholder={ACTIVITY_TYPE_STYLES[type].placeholder}
          {...form.register("description")}
        />
        {errors.description && (
          <p role="alert" className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-when`}>Data e hora</Label>
          <Input id={`${idPrefix}-when`} type="datetime-local" className="w-56" {...form.register("occurredAt")} />
          {errors.occurredAt && (
            <p role="alert" className="text-xs text-destructive">
              {errors.occurredAt.message}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {activity ? "Salvar alterações" : "Registrar atividade"}
          </Button>
        </div>
      </div>
    </form>
  );
}
