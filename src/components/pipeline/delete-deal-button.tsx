"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteDeal } from "@/actions/deals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";

/** "Excluir" with a confirmation dialog; `onDeleted` lets the edit dialog close itself. */
export function DeleteDealButton({
  workspaceSlug,
  dealId,
  dealTitle,
  onDeleted,
}: {
  workspaceSlug: string;
  dealId: string;
  dealTitle: string;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteDeal(workspaceSlug, dealId).catch(() => NETWORK_ERROR);
      if (!result.ok) {
        toastActionError(result);
        return;
      }
      setOpen(false);
      toast.success("Negócio excluído.");
      onDeleted?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive sm:mr-auto">
          <Trash2 />
          Excluir
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir negócio?</DialogTitle>
          <DialogDescription>
            <strong className="font-medium text-foreground">{dealTitle}</strong> será excluído permanentemente. Essa
            ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Excluir negócio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
