import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown, MailPlus, Users } from "lucide-react";

import { UsageMeter } from "@/components/billing/usage-meter";
import { InviteMemberForm } from "@/components/members/invite-member-form";
import { MembersList } from "@/components/members/members-list";
import { OpenInvitesList } from "@/components/members/open-invites-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canAddMember } from "@/lib/limits";
import { listMembers, listOpenInvites } from "@/lib/members";
import { PLAN_LABELS } from "@/lib/plans";
import { getCurrentUser } from "@/lib/session";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage({ params }: { params: { workspaceSlug: string } }) {
  const [workspace, user] = await Promise.all([getWorkspaceBySlug(params.workspaceSlug), getCurrentUser()]);
  if (!workspace || !user) notFound();
  // The layout shows the "admins only" notice.
  if (workspace.role !== "admin") return null;

  const [members, invites, seats] = await Promise.all([
    listMembers(workspace.id),
    listOpenInvites(workspace.id),
    canAddMember(workspace),
  ]);
  const billingHref = `/${workspace.slug}/settings/billing`;

  return (
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
            <InviteMemberForm workspaceSlug={workspace.slug} disabled={!seats.allowed} />
            {!seats.allowed && (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                O plano {PLAN_LABELS[workspace.plan]} permite até {seats.limit} membros, contando convites pendentes.
                Cancele um convite ou remova um membro — ou{" "}
                <Link href={billingHref} className="font-medium underline underline-offset-4">
                  faça upgrade para o Pro
                </Link>{" "}
                para convidar mais pessoas.
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
          <CardDescription>
            {seats.limit === null ? "Membros ilimitados." : `Até ${seats.limit} membros por workspace.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageMeter label="Membros e convites" usage={seats} units={["vaga", "vagas"]} />
          <Button asChild variant={workspace.plan === "free" ? "default" : "outline"} size="sm" className="w-full">
            <Link href={billingHref}>{workspace.plan === "free" ? "Ver o plano Pro" : "Gerenciar plano"}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
