"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { UserX } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

/** Deleted lead, stale link or a lead from another workspace — shown inside the app shell. */
export default function LeadNotFound() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();

  return (
    <EmptyState
      icon={UserX}
      title="Lead não encontrado"
      description="Ele pode ter sido excluído, ou o link está incorreto."
      action={
        <Button asChild>
          <Link href={`/${workspaceSlug}/leads`}>Voltar para Leads</Link>
        </Button>
      }
    />
  );
}
