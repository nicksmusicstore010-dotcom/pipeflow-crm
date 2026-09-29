import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crown, MailPlus, ShieldAlert, Users } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { InviteMemberForm } from "@/components/members/invite-member-form";
import { MembersList } from "@/components/members/members-list";
import { OpenInvitesList } from "@/components/members/open-invites-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listMembers, listOpenInvites } from "@/lib/members";
import { hasMemberSeat, PLAN_LABELS, PLAN_LIMITS } from "@/lib/plans";
import { getCurrentUser } from "@/lib/session";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage({ params }: { params: { workspaceSlug: string } }) {
  const [workspace, user] = await Promise.all([getWorkspaceBySlug(params.workspaceSlug), getCurrentUser()]);
  if (!workspace || !user) notFound();

  if (workspace.role !== "admin") {
    return (
      <>
        <PageHeader title="Configurações" description="Membros, convites e plano do workspace." />
        <EmptyState
          icon={ShieldAlert}
          title="Acesso restrito a administradores"
          description="Só admins gerenciam membros, convites e o plano. Fale com um admin deste workspace."
        />
      </>
    );
  }

  const [members, invites] = await Promise.all([listMembers(workspace.id), listOpenInvites(workspace.id)]);
  const limit = PLAN_LIMITS[workspace.plan].members;
  // Seats: members + invites still valid (the database counts the same way).
  const seatsUsed = members.length + invites.filter((i) => !i.expired).length;
  const canInvite = hasMemberSeat(workspace.plan, seatsUsed);

  return (
    <>
      <PageHeader title="Configurações" description="Membros, convites e plano do workspace." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MailPlus className="h-4 w-4 text-muted-foreground" aria-hidden />
                Convidar pessoas
              </CardTitle>
              <CardDescription>
                A pessoa recebe um link por e-mail, válido por 7 dias. Admins gerenciam membros e o plano; membros
                trabalham com leads, negócios e atividades.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteMemberForm workspaceSlug={workspace.slug} disabled={!canInvite} />
              {!canInvite && (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                  O plano {PLAN_LABELS[workspace.plan]} permite até {limit} membros, contando convites pendentes. Cancele
                  um convite ou remova um membro — ou faça upgrade para o Pro (em breve) para convidar mais pessoas.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
                Membros
                <Badge variant="secondary" className="tabular-nums">
                  {members.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MembersList workspaceSlug={workspace.slug} members={members} currentUserId={user.id} />
            </CardContent>
          </Card>

          {invites.length > 0 && (
            <Card className="rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  Convites pendentes
                  <Badge variant="secondary" className="tabular-nums">
                    {invites.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OpenInvitesList workspaceSlug={workspace.slug} invites={invites} />
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-muted-foreground" aria-hidden />
              Plano {PLAN_LABELS[workspace.plan]}
            </CardTitle>
            <CardDescription>{limit === null ? "Membros ilimitados." : `Até ${limit} membros por workspace.`}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              <span className="text-2xl font-semibold tabular-nums">{seatsUsed}</span>
              <span className="text-muted-foreground">
                {limit === null ? " membros e convites" : ` de ${limit} vagas usadas`}
              </span>
            </p>
            {limit !== null && (
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Vagas usadas"
                aria-valuenow={seatsUsed}
                aria-valuemin={0}
                aria-valuemax={limit}
              >
                <div
                  className={seatsUsed >= limit ? "h-full bg-amber-500" : "h-full bg-primary"}
                  style={{ width: `${Math.min(100, (seatsUsed / limit) * 100)}%` }}
                />
              </div>
            )}
            {workspace.plan === "free" && (
              <p className="text-xs text-muted-foreground">
                O Pro (R$ 49/mês) libera membros e leads ilimitados. O upgrade chega em breve.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
