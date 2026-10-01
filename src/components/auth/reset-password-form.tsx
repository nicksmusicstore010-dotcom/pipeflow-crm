"use client";

import { updatePassword } from "@/actions/auth";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionFormState } from "@/hooks/use-action-form-state";

export function ResetPasswordForm({ email }: { email: string }) {
  const [state, formAction] = useActionFormState(updatePassword, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Criar nova senha</CardTitle>
        <CardDescription>
          Para a conta <span className="font-medium text-foreground">{email}</span>. Os outros aparelhos conectados
          serão desconectados.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.error && <FormMessage type="error">{state.error}</FormMessage>}
          {/* Lets password managers save the new password for the right account. */}
          <input type="hidden" name="username" autoComplete="username" value={email} readOnly />
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <SubmitButton>Salvar nova senha</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
