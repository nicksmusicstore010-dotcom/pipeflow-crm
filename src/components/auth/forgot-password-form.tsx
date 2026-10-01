"use client";

import Link from "next/link";

import { requestPasswordReset, type AuthFormState } from "@/actions/auth";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionFormState } from "@/hooks/use-action-form-state";

export function ForgotPasswordForm({ initialState = {} }: { initialState?: AuthFormState }) {
  const [state, formAction] = useActionFormState(requestPasswordReset, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl" role="heading" aria-level={1}>Esqueceu a senha?</CardTitle>
        <CardDescription>Informe seu e-mail e enviaremos um link para criar uma nova senha.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.error && <FormMessage type="error">{state.error}</FormMessage>}
          {state.success && <FormMessage type="success">{state.success}</FormMessage>}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} required />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <SubmitButton>Enviar link</SubmitButton>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            Voltar para o login
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
