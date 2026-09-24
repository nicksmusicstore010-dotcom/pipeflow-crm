"use client";

import { useFormState } from "react-dom";

import { resendConfirmation, type AuthFormState } from "@/actions/auth";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** "Didn't get the e-mail?" box: sends a fresh signup confirmation link. */
export function ResendConfirmationForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction] = useFormState<AuthFormState, FormData>(resendConfirmation, {});

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-dashed p-4">
      <div>
        <p className="text-sm font-medium">Não recebeu o e-mail de confirmação?</p>
        <p className="text-xs text-muted-foreground">Enviamos um novo link para você.</p>
      </div>
      {state.error && <FormMessage type="error">{state.error}</FormMessage>}
      {state.success && <FormMessage type="success">{state.success}</FormMessage>}
      <div className="space-y-2">
        <Label htmlFor="resend-email" className="sr-only">
          E-mail
        </Label>
        <Input
          id="resend-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          defaultValue={defaultEmail}
          required
        />
      </div>
      <SubmitButton variant="outline">Reenviar link de confirmação</SubmitButton>
    </form>
  );
}
