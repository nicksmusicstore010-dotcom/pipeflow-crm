import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Handshake, Plus } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { DealFormDialog } from "@/components/pipeline/deal-form-dialog";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { Button } from "@/components/ui/button";
import { listDeals, listLeadOptions } from "@/lib/deals";
import { getCurrentUser } from "@/lib/session";
import { todaySaoPaulo } from "@/lib/utils";
import { getWorkspaceBySlug, getWorkspaceMembers } from "@/lib/workspaces";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({ params }: { params: { workspaceSlug: string } }) {
  const [workspace, user] = await Promise.all([getWorkspaceBySlug(params.workspaceSlug), getCurrentUser()]);
  if (!workspace || !user) notFound();

  const [deals, members, leads] = await Promise.all([
    listDeals(workspace.id),
    getWorkspaceMembers(workspace.id),
    listLeadOptions(workspace.id),
  ]);

  const newDealButton = (label: string) => (
    <DealFormDialog
      workspaceSlug={workspace.slug}
      members={members}
      leads={leads}
      currentUserId={user.id}
      trigger={
        <Button>
          <Plus />
          {label}
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Acompanhe seus negócios por etapa. Arraste os cards para mudar de etapa."
        actions={newDealButton("Novo negócio")}
      />
      {deals.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Nenhum negócio ainda"
          description="Cadastre a primeira oportunidade e acompanhe ela da primeira conversa até o fechamento."
          action={newDealButton("Cadastrar primeiro negócio")}
        />
      ) : (
        <PipelineBoard
          workspaceSlug={workspace.slug}
          deals={deals}
          members={members}
          leads={leads}
          currentUserId={user.id}
          today={todaySaoPaulo()}
        />
      )}
    </>
  );
}
