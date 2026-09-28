"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createDeal, updateDeal } from "@/actions/deals";
import { DeleteDealButton } from "@/components/pipeline/delete-deal-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";
import { DEAL_STAGE_STYLES, DEAL_STAGES, type DealStage } from "@/lib/deal-stages";
import type { Deal, LeadOption } from "@/lib/deals";
import { formatMoneyInput, parseMoneyToCents } from "@/lib/utils";
import { dealSchema, type DealFormValues } from "@/lib/validations/deal";
import type { WorkspaceMember } from "@/lib/workspaces";

// Radix Select can't use "" as an item value.
const NONE = "none";

type Defaults = { leadId?: string; stage?: DealStage };

function defaultValues(
  deal: Deal | undefined,
  defaults: Defaults,
  currentUserId: string,
  members: WorkspaceMember[],
  leads: LeadOption[],
): DealFormValues {
  // An owner who left, or a lead that's gone, can't be saved — start with none instead.
  const ownerId = deal ? deal.owner_id : currentUserId;
  const leadId = deal ? deal.lead_id : (defaults.leadId ?? null);
  return {
    title: deal?.title ?? "",
    value: deal && deal.value_cents > 0 ? formatMoneyInput(deal.value_cents) : "",
    stage: deal?.stage ?? defaults.stage ?? "new_lead",
    leadId: leadId && leads.some((l) => l.id === leadId) ? leadId : "",
    ownerId: ownerId && members.some((m) => m.id === ownerId) ? ownerId : "",
    dueDate: deal?.due_date ?? "",
  };
}

/**
 * Create (no `deal`) or edit a deal. Opened by `trigger`, or controlled with `open` /
 * `onOpenChange` (the board opens it when a card is clicked).
 */
export function DealFormDialog({
  workspaceSlug,
  members,
  leads,
  currentUserId,
  deal,
  defaults = {},
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  workspaceSlug: string;
  members: WorkspaceMember[];
  leads: LeadOption[];
  currentUserId: string;
  deal?: Deal;
  /** Pre-filled lead/stage for a new deal (e.g. "Novo negócio" on a lead's page). */
  defaults?: Defaults;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const isEdit = Boolean(deal);
  const initial = () => defaultValues(deal, defaults, currentUserId, members, leads);

  const form = useForm<DealFormValues>({ resolver: zodResolver(dealSchema), defaultValues: initial() });
  const { errors, isSubmitting } = form.formState;

  function setOpen(next: boolean) {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  // Start from the saved values every time the dialog opens (by trigger or by the board).
  useEffect(() => {
    if (open) form.reset(initial());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on opening, not when props refresh
  }, [open]);

  async function onSubmit(values: DealFormValues) {
    const save = deal ? updateDeal(workspaceSlug, deal.id, values) : createDeal(workspaceSlug, values);
    const result = await save.catch(() => NETWORK_ERROR);
    if (!result.ok) {
      toastActionError(result);
      return;
    }
    setOpen(false);
    toast.success(isEdit ? "Negócio atualizado." : "Negócio cadastrado.");
  }

  const valueField = form.register("value");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar negócio" : "Novo negócio"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize os dados da oportunidade." : "Cadastre uma oportunidade para acompanhar no pipeline."}
          </DialogDescription>
        </DialogHeader>

        <form id="deal-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Título" htmlFor="deal-title" error={errors.title?.message} className="sm:col-span-2">
            <Input
              id="deal-title"
              autoComplete="off"
              placeholder="Ex.: Implantação do CRM"
              autoFocus
              {...form.register("title")}
            />
          </Field>
          <Field label="Valor (R$)" htmlFor="deal-value" error={errors.value?.message}>
            <Input
              id="deal-value"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              {...valueField}
              onBlur={(event) => {
                // "1500" → "1.500,00" once the user leaves the field.
                const cents = parseMoneyToCents(event.target.value);
                if (cents !== null) form.setValue("value", formatMoneyInput(cents));
                void valueField.onBlur(event);
              }}
            />
          </Field>
          <Field label="Prazo" htmlFor="deal-due" error={errors.dueDate?.message}>
            <Input id="deal-due" type="date" {...form.register("dueDate")} />
          </Field>
          <Field label="Etapa" htmlFor="deal-stage" error={errors.stage?.message}>
            <Controller
              control={form.control}
              name="stage"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="deal-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {DEAL_STAGE_STYLES[stage].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Responsável" htmlFor="deal-owner" error={errors.ownerId?.message}>
            <Controller
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                  <SelectTrigger id="deal-owner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem responsável</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                        {member.id === currentUserId && " (você)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Lead" htmlFor="deal-lead" error={errors.leadId?.message} className="sm:col-span-2">
            <Controller
              control={form.control}
              name="leadId"
              render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                  <SelectTrigger id="deal-lead">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem lead vinculado</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </form>

        <DialogFooter className="gap-2 sm:space-x-0">
          {deal && (
            <DeleteDealButton
              workspaceSlug={workspaceSlug}
              dealId={deal.id}
              dealTitle={deal.title}
              onDeleted={() => setOpen(false)}
            />
          )}
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="deal-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isEdit ? "Salvar alterações" : "Cadastrar negócio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="space-y-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {children}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
