import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleDollarSign, Handshake, LayoutDashboard, Percent, Users } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { countLeads } from "@/lib/leads";
import { formatCurrency } from "@/lib/utils";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ params }: { params: { workspaceSlug: string } }) {
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  if (!workspace) notFound();
  const totalLeads = await countLeads(workspace.id);

  // Deals don't exist yet (milestone 4); the rest of the metrics come in milestone 6.
  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral das suas vendas." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de leads" value={totalLeads.toLocaleString("pt-BR")} icon={Users} />
        <StatCard label="Negócios abertos" value="0" icon={Handshake} />
        <StatCard label="Valor do pipeline" value={formatCurrency(0)} icon={CircleDollarSign} />
        <StatCard label="Taxa de conversão" value="—" icon={Percent} hint="Ganhos ÷ negócios fechados" />
      </div>
      <EmptyState
        className="mt-6"
        icon={LayoutDashboard}
        title="Suas métricas aparecem aqui"
        description="Cadastre leads e negócios para acompanhar o funil, o valor do pipeline e a taxa de conversão."
      />
    </>
  );
}
