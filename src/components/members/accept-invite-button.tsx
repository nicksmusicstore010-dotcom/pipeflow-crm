"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { acceptInvite } from "@/actions/members";
import { Button } from "@/components/ui/button";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";

export function AcceptInviteButton({ token, workspaceName }: { token: string; workspaceName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      const result = await acceptInvite(token).catch(() => NETWORK_ERROR);
      if (!result.ok) {
        toastActionError(result);
        router.refresh();
        return;
      }
      toast.success(`Bem-vindo a ${workspaceName}!`);
      router.push(`/${result.workspaceSlug}/dashboard`);
    });
  }

  return (
    <Button className="w-full" onClick={accept} disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      Aceitar convite
    </Button>
  );
}
