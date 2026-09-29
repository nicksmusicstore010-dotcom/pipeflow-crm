"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { removeMember, updateMemberRole } from "@/actions/members";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";
import type { MemberRow } from "@/lib/members";
import type { WorkspaceRole } from "@/lib/roles";

/** Members with role picker and "Remover" (admins see this page only). */
export function MembersList({
  workspaceSlug,
  members,
  currentUserId,
}: {
  workspaceSlug: string;
  members: MemberRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendingRole, startRole] = useTransition();
  const [pendingRemove, startRemove] = useTransition();
  const [toRemove, setToRemove] = useState<MemberRow | null>(null);

  function changeRole(member: MemberRow, role: WorkspaceRole) {
    if (role === member.role) return;
    startRole(async () => {
      const result = await updateMemberRole(workspaceSlug, member.userId, role).catch(() => NETWORK_ERROR);
      if (!result.ok) {
        toastActionError(result);
        return;
      }
      toast.success(`${member.name} agora é ${role === "admin" ? "admin" : "membro"}.`);
      // Demoting yourself takes Configurações away: leave the page.
      if (member.userId === currentUserId && role !== "admin") router.push(`/${workspaceSlug}/dashboard`);
      router.refresh();
    });
  }

  function confirmRemove() {
    if (!toRemove) return;
    const member = toRemove;
    startRemove(async () => {
      const result = await removeMember(workspaceSlug, member.userId).catch(() => NETWORK_ERROR);
      if (!result.ok) {
        toastActionError(result);
        return;
      }
      setToRemove(null);
      toast.success(`${member.name} foi removido do workspace.`);
      router.refresh();
    });
  }

  return (
    <>
      <ul className="divide-y" aria-label="Membros">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          return (
            <li key={member.userId} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <UserAvatar name={member.name} />
              {/* basis: on narrow screens the controls wrap below instead of squeezing the name. */}
              <div className="min-w-0 flex-1 basis-48">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{member.name}</span>
                  {isSelf && <Badge variant="secondary">Você</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Select value={member.role} onValueChange={(v) => changeRole(member, v as WorkspaceRole)} disabled={pendingRole}>
                  <SelectTrigger className="w-32" aria-label={`Papel de ${member.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                  </SelectContent>
                </Select>
                {isSelf ? (
                  <span className="w-9" aria-hidden />
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remover ${member.name}`}
                    onClick={() => setToRemove(member)}
                  >
                    <UserMinus />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!toRemove} onOpenChange={(open) => !open && setToRemove(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remover membro?</DialogTitle>
            <DialogDescription>
              <strong className="font-medium text-foreground">{toRemove?.name}</strong> perde o acesso a este workspace.
              Leads e negócios sob responsabilidade dessa pessoa ficam sem responsável; atividades registradas continuam
              no histórico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToRemove(null)} disabled={pendingRemove}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmRemove} disabled={pendingRemove}>
              {pendingRemove && <Loader2 className="animate-spin" />}
              Remover membro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
