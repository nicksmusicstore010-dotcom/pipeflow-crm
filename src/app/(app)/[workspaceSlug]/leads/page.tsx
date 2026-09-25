import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus, SearchX, Users } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { LeadsFilters } from "@/components/leads/leads-filters";
import { LeadsPagination } from "@/components/leads/leads-pagination";
import { LeadsTable } from "@/components/leads/leads-table";
import { Button } from "@/components/ui/button";
import { hasActiveFilters, LEADS_PAGE_SIZE, listLeads, parseLeadFilters } from "@/lib/leads";
import { getCurrentUser } from "@/lib/session";
import { getWorkspaceBySlug, getWorkspaceMembers } from "@/lib/workspaces";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: { workspaceSlug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [workspace, user] = await Promise.all([getWorkspaceBySlug(params.workspaceSlug), getCurrentUser()]);
  if (!workspace || !user) notFound();

  const filters = parseLeadFilters(searchParams);
  const [{ leads, total }, members] = await Promise.all([
    listLeads(workspace.id, filters),
    getWorkspaceMembers(workspace.id),
  ]);

  const basePath = `/${workspace.slug}/leads`;
  // A page past the end (stale link, deleted leads): go back to the first page.
  if (filters.page > 1 && (leads.length === 0 || filters.page > Math.ceil(total / LEADS_PAGE_SIZE))) {
    const rest = Object.entries(searchParams).filter(([key, v]) => key !== "page" && typeof v === "string");
    const qs = new URLSearchParams(rest as [string, string][]).toString();
    redirect(qs ? `${basePath}?${qs}` : basePath);
  }

  const newLeadButton = (label: string) => (
    <LeadFormDialog
      workspaceSlug={workspace.slug}
      members={members}
      currentUserId={user.id}
      trigger={
        <Button>
          <Plus />
          {label}
        </Button>
      }
    />
  );
  const filtering = hasActiveFilters(filters);

  return (
    <>
      <PageHeader title="Leads" description="Seus contatos e oportunidades." actions={newLeadButton("Novo lead")} />

      {total === 0 && !filtering ? (
        <EmptyState
          icon={Users}
          title="Nenhum lead ainda"
          description="Cadastre o primeiro contato para começar a acompanhar suas oportunidades."
          action={newLeadButton("Cadastrar primeiro lead")}
        />
      ) : (
        <>
          <LeadsFilters members={members} currentUserId={user.id} />
          {leads.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nenhum lead encontrado"
              description="Nenhum lead corresponde à busca e aos filtros aplicados."
              action={
                <Button variant="outline" asChild>
                  <Link href={basePath}>Limpar filtros</Link>
                </Button>
              }
            />
          ) : (
            <>
              <LeadsTable leads={leads} members={members} workspaceSlug={workspace.slug} />
              <LeadsPagination
                basePath={basePath}
                page={filters.page}
                pageSize={LEADS_PAGE_SIZE}
                total={total}
                searchParams={searchParams}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
