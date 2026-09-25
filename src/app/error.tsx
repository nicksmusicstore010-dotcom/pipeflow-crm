"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

/** Unexpected failure outside a workspace (login, onboarding…), instead of Next's English error screen. */
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // reset() alone re-renders with the cached server payload; refresh() refetches it.
  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <EmptyState
        className="w-full max-w-md"
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
    </div>
  );
}
