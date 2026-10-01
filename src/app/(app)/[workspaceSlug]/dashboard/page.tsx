import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, ChartBar, CircleDollarSign, Handshake, LayoutDashboard, Percent, Users } from "lucide-react";

import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { StageFunnelChart } from "@/components/dashboard/stage-funnel-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { UpcomingDealsList } from "@/components/dashboard/upcoming-deals-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardMetrics, listUpcomingDeals, UPCOMING_DAYS } from "@/lib/dashboard";
import { countLeads } from "@/lib/leads";
import { getOnboardingSteps, onboardingHiddenCookie } from "@/lib/onboarding";
import { getCurrentUser } from "@/lib/session";
import { formatCurrency, todaySaoPaulo } from "@/lib/utils";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export const metadata: Metadata = { title: "Dashboard" };

const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

export default async function DashboardPage(props: { params: Promise<{ workspaceSlug: string }> }) {
  const params = await props.params;
  const [workspace, user] = await Promise.all([getWorkspaceBySlug(params.workspaceSlug), getCurrentUser()]);
  if (!workspace || !user) notFound();

  const today = todaySaoPaulo();
  const [totalLeads, metrics, upcoming] = await Promise.all([
    countLeads(workspace.id),
    getDashboardMetrics(workspace.id),
    listUpcomingDeals(workspace.id, user.id, today),
  ]);
  const totalDeals = metrics.stages.reduce((sum, s) => sum + s.count, 0);
  const closed = metrics.wonCount + metrics.lostCount;
  const onboarding = await getOnboardingSteps(workspace, { leads: totalLeads, deals: totalDeals });

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral das suas vendas." />
      {onboarding && <OnboardingChecklist steps={onboarding} cookieName={onboardingHiddenCookie(workspace.id)} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de leads" value={totalLeads.toLocaleString("pt-BR")} icon={Users} />
        <StatCard label="Negócios abertos" value={metrics.openCount.toLocaleString("pt-BR")} icon={Handshake} />
        <StatCard label="Valor do pipeline" value={formatCurrency(metrics.openValueCents)} icon={CircleDollarSign} hint="Soma dos negócios abertos" />
        <StatCard
          label="Taxa de conversão"
          value={metrics.conversionRate === null ? "—" : percent.format(metrics.conversionRate)}
          icon={Percent}
          hint={
            closed === 0
              ? "Nenhum negócio fechado ainda"
              : `${metrics.wonCount} ${metrics.wonCount === 1 ? "ganho" : "ganhos"} de ${closed} ${closed === 1 ? "fechado" : "fechados"}`
          }
        />
      </div>

      {totalDeals === 0 ? (
        <EmptyState
          className="mt-6"
          icon={LayoutDashboard}
          title="Nenhum negócio ainda"
          description="Crie negócios no pipeline para acompanhar o funil, o valor em aberto e a taxa de conversão."
          action={
            <Button asChild>
              <Link href={`/${workspace.slug}/pipeline`}>Ir para o pipeline</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ChartBar className="h-4 w-4 text-muted-foreground" aria-hidden />
                Funil por etapa
              </CardTitle>
              <CardDescription>Quantidade de negócios em cada etapa do pipeline.</CardDescription>
            </CardHeader>
            <CardContent>
              <StageFunnelChart stages={metrics.stages} />
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
                Meus negócios com prazo próximo
              </CardTitle>
              <CardDescription>Abertos, sob sua responsabilidade, vencidos ou vencendo em até {UPCOMING_DAYS} dias.</CardDescription>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum prazo nos próximos {UPCOMING_DAYS} dias. Tudo em dia!
                </p>
              ) : (
                <UpcomingDealsList deals={upcoming} workspaceSlug={workspace.slug} today={today} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
