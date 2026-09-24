import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { KanbanColumn } from "@/components/pipeline/kanban-column";
import { DEAL_STAGES } from "@/lib/deal-stages";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  // Empty board for now; deals and drag-and-drop arrive in milestone 4.
  return (
    <>
      <PageHeader title="Pipeline" description="Acompanhe seus negócios por etapa." />
      {/* Negative margins let the board scroll edge to edge on small screens. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex gap-4">
          {DEAL_STAGES.map((stage) => (
            <KanbanColumn key={stage} stage={stage} count={0} totalCents={0} />
          ))}
        </div>
      </div>
    </>
  );
}
