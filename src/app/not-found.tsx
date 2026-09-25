import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

/** Unknown URL, or a workspace the user isn't a member of (we don't reveal which). */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/40 px-4 py-12">
      <Logo href="/app" />
      <EmptyState
        className="w-full max-w-md"
        icon={FileQuestion}
        title="Página não encontrada"
        description="O endereço pode estar incorreto, ou você não tem acesso a este workspace."
        action={
          <Button asChild>
            <Link href="/app">Voltar para o início</Link>
          </Button>
        }
      />
    </div>
  );
}
