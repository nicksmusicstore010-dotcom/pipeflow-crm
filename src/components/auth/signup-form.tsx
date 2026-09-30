"use client";

import Link from "next/link";

import { signup, type AuthFormState } from "@/actions/auth";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionFormState } from "@/hooks/use-action-form-state";

/** `next`: where to land after confirming (e.g. an invite); `defaultEmail`: prefilled (invited address). */
export function SignupForm({ next, defaultEmail }: { next?: string; defaultEmail?: string }) {
  const [state, formAction] = useActionFormState<AuthFormState>(signup, {});
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  if (state.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Verifique seu e-mail</CardTitle>
          <CardDescription>{state.success}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href={loginHref} className="text-sm font-medium text-primary hover:underline">
            Voltar para o login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Criar conta</CardTitle>
        <CardDescription>Comece grátis. Sem cartão de crédito.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.error && <FormMessage type="error">{state.error}</FormMessage>}
          <input type="hidden" name="next" value={next ?? ""} />
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome</Label>
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              maxLength={100}
              defaultValue={state.fields?.fullName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.fields?.email ?? defaultEmail} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <SubmitButton>Criar conta</SubmitButton>
          <p className="text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href={loginHref} className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
