import Link from "next/link";

import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Lead } from "@/lib/leads";
import { formatDate } from "@/lib/utils";
import type { WorkspaceMember } from "@/lib/workspaces";

export function LeadsTable({
  leads,
  members,
  workspaceSlug,
}: {
  leads: Lead[];
  members: WorkspaceMember[];
  workspaceSlug: string;
}) {
  const memberName = new Map(members.map((m) => [m.id, m.name]));

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden md:table-cell">Empresa</TableHead>
            <TableHead className="hidden lg:table-cell">Telefone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Responsável</TableHead>
            <TableHead className="hidden text-right xl:table-cell">Criado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const ownerName = lead.owner_id ? memberName.get(lead.owner_id) : undefined;
            return (
              <TableRow key={lead.id}>
                <TableCell className="max-w-[16rem]">
                  <Link
                    href={`/${workspaceSlug}/leads/${lead.id}`}
                    className="block truncate font-medium hover:text-primary hover:underline"
                  >
                    {lead.name}
                  </Link>
                  {lead.email && <span className="block truncate text-xs text-muted-foreground">{lead.email}</span>}
                </TableCell>
                <TableCell className="hidden max-w-[14rem] md:table-cell">
                  <span className="block truncate">{lead.company ?? "—"}</span>
                  {lead.position && (
                    <span className="block truncate text-xs text-muted-foreground">{lead.position}</span>
                  )}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap lg:table-cell">{lead.phone ?? "—"}</TableCell>
                <TableCell>
                  <LeadStatusBadge status={lead.status} />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {ownerName ? (
                    <span className="flex items-center gap-2">
                      <UserAvatar name={ownerName} size="sm" />
                      <span className="truncate">{ownerName}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-right tabular-nums text-muted-foreground xl:table-cell">
                  {formatDate(lead.created_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
