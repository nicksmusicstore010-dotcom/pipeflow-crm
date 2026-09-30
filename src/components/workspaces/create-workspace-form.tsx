"use client";

import Link from "next/link";

import { createWorkspace, type WorkspaceFormState } from "@/actions/workspaces";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionFormState } from "@/hooks/use-action-form-state";

export function CreateWorkspaceForm({ isFirst }: { isFirst: boolean }) {
  const [state, formAction] = useActionFormState<WorkspaceFormState>(createWorkspace, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{isFirst ? "Crie seu workspace" : "Novo workspace"}</CardTitle>
        <CardDescription>
          Um workspace reúne os leads, negócios e o time de uma empresa ou cliente.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.error && <FormMessage type="error">{state.error}</FormMessage>}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do workspace</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex.: Acme Vendas"
              minLength={2}
              maxLength={60}
              autoComplete="organization"
              autoFocus
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <SubmitButton>Criar workspace</SubmitButton>
          {!isFirst && (
            <Link href="/app" className="text-sm font-medium text-primary hover:underline">
              Voltar
            </Link>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
