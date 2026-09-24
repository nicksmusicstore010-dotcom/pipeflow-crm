import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Briefcase, History, Mail, Pencil, Phone } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLead } from "@/lib/leads";
import { getCurrentUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { getWorkspaceBySlug, getWorkspaceMembers } from "@/lib/workspaces";

type Params = { workspaceSlug: string; leadId: string };

async function loadLead(params: Params) {
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  if (!workspace) return null;
  const lead = await getLead(workspace.id, params.leadId);
  return lead ? { workspace, lead } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await loadLead(params);
  return { title: data?.lead.name ?? "Lead" };
}

export default async function LeadDetailPage({ params }: { params: Params }) {
  const [data, user] = await Promise.all([loadLead(params), getCurrentUser()]);
  if (!data || !user) notFound();
  const { workspace, lead } = data;

  const members = await getWorkspaceMembers(workspace.id);
  const ownerName = members.find((m) => m.id === lead.owner_id)?.name;
  const subtitle = [lead.position, lead.company].filter(Boolean).join(" · ");

  return (
    <>
      <Link
        href={`/${workspace.slug}/leads`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Leads
      </Link>

      <PageHeader
        title={lead.name}
        description={subtitle || undefined}
        actions={
          <>
            <LeadFormDialog
              workspaceSlug={workspace.slug}
              members={members}
              currentUserId={user.id}
              lead={lead}
              trigger={
                <Button variant="outline">
                  <Pencil />
                  Editar
                </Button>
              }
            />
            <DeleteLeadButton workspaceSlug={workspace.slug} leadId={lead.id} leadName={lead.name} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={Mail} label="E-mail">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="break-all text-primary hover:underline">
                    {lead.email}
                  </a>
                ) : null}
              </InfoRow>
              <InfoRow icon={Phone} label="Telefone">
                {lead.phone ? (
                  <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline">
                    {lead.phone}
                  </a>
                ) : null}
              </InfoRow>
              <InfoRow icon={Building2} label="Empresa">
                {lead.company}
              </InfoRow>
              <InfoRow icon={Briefcase} label="Cargo">
                {lead.position}
              </InfoRow>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalhes</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <LeadStatusBadge status={lead.status} />
                </dd>
                <dt className="text-muted-foreground">Responsável</dt>
                <dd>
                  {ownerName ? (
                    <span className="flex items-center gap-2">
                      <UserAvatar name={ownerName} size="sm" />
                      {ownerName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Sem responsável</span>
                  )}
                </dd>
                <dt className="text-muted-foreground">Criado em</dt>
                <dd className="tabular-nums">{formatDate(lead.created_at)}</dd>
                <dt className="text-muted-foreground">Atualizado em</dt>
                <dd className="tabular-nums">{formatDate(lead.updated_at)}</dd>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold">Atividades</h2>
          <EmptyState
            icon={History}
            title="Nenhuma atividade registrada"
            description="Em breve você poderá registrar ligações, e-mails, reuniões e notas com este lead."
          />
        </div>
      </div>
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="truncate">{children || <span className="text-muted-foreground">—</span>}</div>
      </div>
    </div>
  );
}
