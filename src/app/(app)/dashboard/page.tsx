import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral das suas vendas." />
      <EmptyState
        icon={LayoutDashboard}
        title="Suas métricas aparecem aqui"
        description="Cadastre leads e negócios para acompanhar o funil, o valor do pipeline e a taxa de conversão."
      />
    </>
  );
}
