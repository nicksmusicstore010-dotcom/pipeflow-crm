"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { signup, type AuthFormState } from "@/actions/auth";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [state, formAction] = useFormState<AuthFormState, FormData>(signup, {});

  if (state.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Verifique seu e-mail</CardTitle>
          <CardDescription>{state.success}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
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
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required />
          </div>
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
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <SubmitButton>Criar conta</SubmitButton>
          <p className="text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
