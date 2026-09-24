"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createLead, updateLead } from "@/actions/leads";
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
import { LEAD_STATUS_STYLES, LEAD_STATUSES } from "@/lib/lead-status";
import type { Lead } from "@/lib/leads";
import { leadSchema, type LeadFormValues } from "@/lib/validations/lead";
import type { WorkspaceMember } from "@/lib/workspaces";

// Radix Select can't use "" as an item value.
const NO_OWNER = "none";

function defaultValues(lead: Lead | undefined, currentUserId: string): LeadFormValues {
  return {
    name: lead?.name ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    company: lead?.company ?? "",
    position: lead?.position ?? "",
    status: lead?.status ?? "new",
    ownerId: lead ? (lead.owner_id ?? "") : currentUserId,
  };
}

/** Create (no `lead`) or edit a lead in a dialog opened by `trigger`. */
export function LeadFormDialog({
  workspaceSlug,
  members,
  currentUserId,
  lead,
  trigger,
}: {
  workspaceSlug: string;
  members: WorkspaceMember[];
  currentUserId: string;
  lead?: Lead;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(lead);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: defaultValues(lead, currentUserId),
  });
  const { errors, isSubmitting } = form.formState;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Start from the saved values every time the dialog opens.
    if (next) form.reset(defaultValues(lead, currentUserId));
  }

  async function onSubmit(values: LeadFormValues) {
    const result = lead
      ? await updateLead(workspaceSlug, lead.id, values)
      : await createLead(workspaceSlug, values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setOpen(false);
    if (isEdit) {
      toast.success("Lead atualizado.");
    } else {
      // Stay on the list (it refreshes by itself) so several leads can be added in a row.
      toast.success("Lead cadastrado.", {
        action: { label: "Abrir", onClick: () => router.push(`/${workspaceSlug}/leads/${result.leadId}`) },
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar lead" : "Novo lead"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize os dados do contato." : "Cadastre um contato para acompanhar no seu funil."}
          </DialogDescription>
        </DialogHeader>

        <form id="lead-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Nome" htmlFor="lead-name" error={errors.name?.message} className="sm:col-span-2">
            <Input id="lead-name" autoComplete="off" autoFocus {...form.register("name")} />
          </Field>
          <Field label="E-mail" htmlFor="lead-email" error={errors.email?.message}>
            <Input id="lead-email" type="email" autoComplete="off" {...form.register("email")} />
          </Field>
          <Field label="Telefone" htmlFor="lead-phone" error={errors.phone?.message}>
            <Input id="lead-phone" type="tel" autoComplete="off" {...form.register("phone")} />
          </Field>
          <Field label="Empresa" htmlFor="lead-company" error={errors.company?.message}>
            <Input id="lead-company" autoComplete="off" {...form.register("company")} />
          </Field>
          <Field label="Cargo" htmlFor="lead-position" error={errors.position?.message}>
            <Input id="lead-position" autoComplete="off" {...form.register("position")} />
          </Field>
          <Field label="Status" htmlFor="lead-status" error={errors.status?.message}>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="lead-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {LEAD_STATUS_STYLES[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Responsável" htmlFor="lead-owner" error={errors.ownerId?.message}>
            <Controller
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <Select
                  value={field.value || NO_OWNER}
                  onValueChange={(value) => field.onChange(value === NO_OWNER ? "" : value)}
                >
                  <SelectTrigger id="lead-owner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_OWNER}>Sem responsável</SelectItem>
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
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="lead-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isEdit ? "Salvar alterações" : "Cadastrar lead"}
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
