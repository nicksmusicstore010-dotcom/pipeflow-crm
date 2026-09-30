import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsTabs } from "@/components/layout/settings-tabs";
import { getWorkspaceBySlug } from "@/lib/workspaces";

/** Settings are admin-only: members see the notice instead of the pages (which also check the role). */
export default async function SettingsLayout(props: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { children } = props;
  const params = await props.params;
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  if (!workspace) notFound();

  return (
    <>
      <PageHeader title="Configurações" description="Membros, convites e plano do workspace." />
      {workspace.role === "admin" ? (
        <>
          <SettingsTabs workspaceSlug={workspace.slug} />
          {children}
        </>
      ) : (
        <EmptyState
          icon={ShieldAlert}
          title="Acesso restrito a administradores"
          description="Só admins gerenciam membros, convites e o plano. Fale com um admin deste workspace."
        />
      )}
    </>
  );
}
