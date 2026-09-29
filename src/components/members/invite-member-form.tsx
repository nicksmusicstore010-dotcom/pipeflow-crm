"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { inviteMember } from "@/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";
import { inviteSchema, type InviteInput } from "@/lib/validations/invite";

/** E-mail + role. If the e-mail couldn't be sent, shows the invite link to copy. */
export function InviteMemberForm({ workspaceSlug, disabled }: { workspaceSlug: string; disabled?: boolean }) {
  const router = useRouter();
  const [fallback, setFallback] = useState<{ email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  async function onSubmit(values: InviteInput) {
    setFallback(null);
    const result = await inviteMember(workspaceSlug, values).catch(() => NETWORK_ERROR);
    if (!result.ok) {
      toastActionError(result);
      return;
    }
    form.reset({ email: "", role: values.role });
    router.refresh();
    if (result.emailSent) {
      toast.success(`Convite enviado para ${result.email}.`);
    } else {
      setCopied(false);
      setFallback({ email: result.email, link: result.link });
    }
  }

  async function copyLink() {
    if (!fallback) return;
    await navigator.clipboard.writeText(fallback.link).catch(() => {});
    setCopied(true);
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <div className="space-y-4">
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="invite-email" className="sr-only">
            E-mail
          </Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="email@empresa.com.br"
            autoComplete="off"
            disabled={disabled}
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
              <SelectTrigger id="invite-role" className="sm:w-36" aria-label="Papel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <Button type="submit" disabled={disabled || isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
          Convidar
        </Button>
      </form>

      {fallback && (
        <div role="status" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-amber-900 dark:text-amber-200">
            Convite criado para <strong className="font-medium">{fallback.email}</strong>, mas não foi possível enviar o
            e-mail. Copie o link e envie você mesmo — ele vale por 7 dias.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={fallback.link} aria-label="Link do convite" className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={copyLink}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
