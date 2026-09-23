import type { Metadata } from "next";
import { SquareKanban } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <>
      <PageHeader title="Pipeline" description="Acompanhe seus negócios por etapa." />
      <EmptyState
        icon={SquareKanban}
        title="Nenhum negócio no pipeline"
        description="Em breve você poderá arrastar negócios entre as etapas do funil aqui."
      />
    </>
  );
}
