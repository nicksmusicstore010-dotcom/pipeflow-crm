"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { NETWORK_ERROR } from "@/lib/action-feedback";

/** Unexpected failure in a workspace page (e.g. the database is unreachable); keeps the app shell. */
export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // reset() alone re-renders with the cached server payload; refresh() refetches it.
  function retry() {
    // Offline, the refresh would become a full page load on the browser's error page.
    if (!navigator.onLine) {
      toast.error(NETWORK_ERROR.error);
      return;
    }
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <EmptyState
      icon={AlertTriangle}
      title="Algo deu errado"
      description="Não foi possível carregar esta página. Verifique sua conexão e tente novamente."
      action={
        <Button onClick={retry} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <RotateCw />}
          Tentar novamente
        </Button>
      }
    />
  );
}
