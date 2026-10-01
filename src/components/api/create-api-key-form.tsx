"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createApiKey } from "@/actions/api-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";

/** Name → new key, shown once with a copy button (only its hash is stored). */
export function CreateApiKeyForm({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createApiKey(workspaceSlug, name).catch(() => NETWORK_ERROR);
      if (!result.ok) {
        toastActionError(result);
        return;
      }
      setToken(result.token);
      setName("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="api-key-name">Nome da chave</Label>
          <Input
            id="api-key-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Formulário do site"
            maxLength={60}
            required
          />
        </div>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
          Criar chave
        </Button>
      </form>

      {token && (
        <div role="status" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Copie a chave agora: por segurança, ela não será mostrada de novo.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={token} aria-label="Nova chave de API" className="font-mono text-xs" onFocus={(e) => e.target.select()} />
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigator.clipboard.writeText(token).then(() => toast.success("Chave copiada."))}
            >
              <Copy />
              Copiar
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setToken(null)}>
            Já copiei
          </Button>
        </div>
      )}
    </div>
  );
}
