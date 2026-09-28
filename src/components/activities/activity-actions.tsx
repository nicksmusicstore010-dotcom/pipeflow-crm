"use client";

import { useState, useTransition } from "react";
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteActivity } from "@/actions/activities";
import { ActivityForm } from "@/components/activities/activity-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";
import type { Activity } from "@/lib/activities";

/** "⋯" menu on a timeline activity: edit (dialog) or delete (confirmation). Author or admin only. */
export function ActivityActions({ workspaceSlug, activity }: { workspaceSlug: string; activity: Activity }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteActivity(workspaceSlug, activity.id).catch(() => NETWORK_ERROR);
      if (!result.ok) {
        toastActionError(result);
        return;
      }
      setConfirming(false);
      toast.success("Atividade excluída.");
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" aria-label="Ações da atividade">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirming(true)} className="text-destructive focus:text-destructive">
            <Trash2 />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar atividade</DialogTitle>
            <DialogDescription>Corrija o tipo, a descrição ou a data.</DialogDescription>
          </DialogHeader>
          {editing && (
            <ActivityForm
              workspaceSlug={workspaceSlug}
              activity={activity}
              onSaved={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir atividade?</DialogTitle>
            <DialogDescription>Ela sai do histórico do lead. Essa ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Excluir atividade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
