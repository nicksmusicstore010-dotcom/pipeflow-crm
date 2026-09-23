import type { Metadata } from "next";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <>
      <PageHeader title="Leads" description="Seus contatos e oportunidades." />
      <EmptyState
        icon={Users}
        title="Nenhum lead ainda"
        description="Em breve você poderá cadastrar e filtrar seus leads aqui."
      />
    </>
  );
}
