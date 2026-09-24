"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteLead } from "@/actions/leads";
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

/** "Excluir" button with a confirmation dialog; goes back to the list afterwards. */
export function DeleteLeadButton({
  workspaceSlug,
  leadId,
  leadName,
}: {
  workspaceSlug: string;
  leadId: string;
  leadName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteLead(workspaceSlug, leadId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success("Lead excluído.");
      router.push(`/${workspaceSlug}/leads`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 />
          Excluir
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir lead?</DialogTitle>
          <DialogDescription>
            <strong className="font-medium text-foreground">{leadName}</strong> será excluído
            permanentemente. Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Excluir lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
