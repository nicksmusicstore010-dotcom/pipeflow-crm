"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { revokeApiKey } from "@/actions/api-keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";
import { formatDate } from "@/lib/utils";
import type { ApiKey } from "@/types/supabase";

/** The workspace's keys (prefix only) with "Revogar" behind a confirmation. */
export function ApiKeysList({ workspaceSlug, keys }: { workspaceSlug: string; keys: ApiKey[] }) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [pending, startTransition] = useTransition();

  function revoke(key: ApiKey) {
    startTransition(async () => {
      const result = await revokeApiKey(workspaceSlug, key.id).catch(() => NETWORK_ERROR);
      if (!result.ok) {
        toastActionError(result);
        return;
      }
      toast.success(`Chave "${key.name}" revogada.`);
      setRevoking(null);
      router.refresh();
    });
  }

  if (keys.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma chave criada ainda.</p>;
  }

  return (
    <>
      <ul className="divide-y" aria-label="Chaves de API">
        {keys.map((key) => (
          <li key={key.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <KeyRound className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="truncate">{key.name}</span>
                {key.revoked_at && <Badge variant="secondary">Revogada</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{key.prefix}…</span> · criada em {formatDate(key.created_at)} ·{" "}
                {key.last_used_at ? `último uso em ${formatDate(key.last_used_at)}` : "nunca usada"}
              </p>
            </div>
            {!key.revoked_at && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setRevoking(key)}
              >
                Revogar
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar a chave &quot;{revoking?.name}&quot;?</DialogTitle>
            <DialogDescription>
              Integrações que usam esta chave param de funcionar na hora. Não dá para desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoking(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => revoking && revoke(revoking)} disabled={pending}>
              Revogar chave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
