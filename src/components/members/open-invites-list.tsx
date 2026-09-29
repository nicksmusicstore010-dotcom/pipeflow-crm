"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { cancelInvite, inviteMember } from "@/actions/members";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";
import type { OpenInvite } from "@/lib/members";
import { ROLE_LABELS } from "@/lib/roles";
import { formatDate } from "@/lib/utils";

/** Pending invites with "Reenviar" (new link, new 7 days) and "Cancelar". */
export function OpenInvitesList({ workspaceSlug, invites }: { workspaceSlug: string; invites: OpenInvite[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function resend(invite: OpenInvite) {
    startTransition(async () => {
      const result = await inviteMember(workspaceSlug, { email: invite.email, role: invite.role }).catch(() => NETWORK_ERROR);
      if (!result.ok) {
        toastActionError(result);
        return;
      }
      if (result.emailSent) toast.success(`Convite reenviado para ${invite.email}.`);
      else
        toast.warning(`Novo link criado, mas o e-mail para ${invite.email} não foi enviado.`, {
          duration: 15000,
          action: {
            label: "Copiar link",
            onClick: () => void navigator.clipboard.writeText(result.link).then(() => toast.success("Link copiado.")),
          },
        });
      router.refresh();
    });
  }

  function cancel(invite: OpenInvite) {
    startTransition(async () => {
      const result = await cancelInvite(workspaceSlug, invite.id).catch(() => NETWORK_ERROR);
      if (!result.ok) {
        toastActionError(result);
        return;
      }
      toast.success(`Convite para ${invite.email} cancelado.`);
      router.refresh();
    });
  }

  return (
    <ul className="divide-y" aria-label="Convites pendentes">
      {invites.map((invite) => (
        <li key={invite.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Mail className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{invite.email}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {ROLE_LABELS[invite.role]} ·
              {invite.expired ? (
                <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-500/40 dark:text-amber-300">
                  Expirado
                </Badge>
              ) : (
                <span>vale até {formatDate(invite.expiresAt)}</span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => resend(invite)} disabled={pending}>
            Reenviar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => cancel(invite)}
            disabled={pending}
          >
            Cancelar
          </Button>
        </li>
      ))}
    </ul>
  );
}
