import type { Metadata } from "next";
import { CircleDollarSign, Handshake, LayoutDashboard, Percent, Users } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  // Leads and deals don't exist yet (milestones 3–4); the real numbers come in milestone 6.
  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral das suas vendas." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de leads" value="0" icon={Users} />
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
