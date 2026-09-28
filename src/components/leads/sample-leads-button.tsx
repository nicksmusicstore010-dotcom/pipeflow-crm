"use client";

import { useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { createSampleLeads } from "@/actions/leads";
import { Button } from "@/components/ui/button";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";

/** Empty-state shortcut: creates the example leads so the list can be explored right away. */
export function SampleLeadsButton({ workspaceSlug }: { workspaceSlug: string }) {
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await createSampleLeads(workspaceSlug).catch(() => NETWORK_ERROR);
      if (!result.ok) {
        toastActionError(result);
        return;
      }
      toast.success(`${result.count} leads de exemplo carregados.`);
    });
  }

  return (
    <Button variant="outline" onClick={load} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
      Carregar leads de exemplo
    </Button>
  );
}
