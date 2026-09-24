"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { login, type AuthFormState } from "@/actions/auth";
import { FormMessage } from "@/components/auth/form-message";
import { ResendConfirmationForm } from "@/components/auth/resend-confirmation-form";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  next,
  initialState = {},
}: {
  next?: string;
  initialState?: AuthFormState;
}) {
  const [state, formAction] = useFormState<AuthFormState, FormData>(login, initialState);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Entrar</CardTitle>
          <CardDescription>Acesse sua conta para ver seu pipeline.</CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {state.error && <FormMessage type="error">{state.error}</FormMessage>}
            {state.success && <FormMessage type="success">{state.success}</FormMessage>}
            <input type="hidden" name="next" value={next ?? ""} />
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <SubmitButton>Entrar</SubmitButton>
            <p className="text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Criar conta grátis
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      {state.needsConfirmation && <ResendConfirmationForm />}
    </div>
  );
}
