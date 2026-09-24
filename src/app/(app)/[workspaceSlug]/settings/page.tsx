import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" description="Workspace, membros e plano." />
      <EmptyState
        icon={Settings}
        title="Configurações do workspace"
        description="Em breve você poderá convidar colaboradores e gerenciar seu plano aqui."
      />
    </>
  );
}
