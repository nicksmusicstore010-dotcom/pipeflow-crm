import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheck, Crown, Info, TriangleAlert, type LucideIcon } from "lucide-react";

import { BillingRedirectButton } from "@/components/billing/billing-redirect-button";
import { PixCheckoutForm } from "@/components/billing/pix-checkout-form";
import { PlanComparison } from "@/components/billing/plan-comparison";
import { UsageMeter } from "@/components/billing/usage-meter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillingState } from "@/lib/billing";
import { canAddLead, canAddMember } from "@/lib/limits";
import { PLAN_LABELS, PLAN_PRICES } from "@/lib/plans";
import { isStripeConfigured } from "@/lib/stripe";
import { SUBSCRIPTION_STATUS_LABELS } from "@/lib/subscription-status";
import { cn, formatDate } from "@/lib/utils";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export const metadata: Metadata = { title: "Cobrança" };

const NOTICE_STYLES = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100",
  warning: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
  info: "border-border bg-card text-foreground",
};

function Notice({ tone, icon: Icon, children }: { tone: keyof typeof NOTICE_STYLES; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div role="status" className={cn("flex gap-3 rounded-lg border p-4 text-sm", NOTICE_STYLES[tone])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export default async function BillingPage(props: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  if (!workspace) notFound();
  // The layout shows the "admins only" notice.
  if (workspace.role !== "admin") return null;

  const [leads, seats, { subscription, cardActive, prepaid }] = await Promise.all([
    canAddLead(workspace),
    canAddMember(workspace),
    getBillingState(workspace.id),
  ]);
  const configured = isStripeConfigured();
  const isPro = workspace.plan === "pro";
  const checkout = searchParams.checkout;
  const periodEnd = subscription?.current_period_end ? formatDate(subscription.current_period_end) : null;
  // Pro through Pix only (no card subscription keeping it): ends on a date, renewed by hand.
  const pixOnly = prepaid !== null && !cardActive;
  const prepaidEnd = prepaid ? formatDate(prepaid.until) : null;
  const canBuy = !cardActive && subscription?.status !== "unpaid";

  return (
    <div className="space-y-6">
      {checkout === "success" &&
        (isPro ? (
          <Notice tone="success" icon={CircleCheck}>
            <strong>Assinatura confirmada!</strong> O workspace está no plano Pro, sem limites de leads e membros.
          </Notice>
        ) : (
          <Notice tone="info" icon={Info}>
            <strong>Pagamento recebido.</strong> Estamos aguardando a confirmação do Stripe — o plano Pro é ativado
            em alguns segundos. Atualize a página se ele ainda não aparecer.
          </Notice>
        ))}
      {checkout === "pix" &&
        (prepaid ? (
          <Notice tone="success" icon={CircleCheck}>
            <strong>Pix confirmado!</strong> O workspace está no plano Pro até <strong>{prepaidEnd}</strong>.
          </Notice>
        ) : (
          <Notice tone="info" icon={Info}>
            <strong>Aguardando a confirmação do Pix.</strong> Assim que o banco confirmar o pagamento (normalmente em
            segundos), o Pro é ativado — atualize a página. Se você fechou o QR code sem pagar, nada foi cobrado.
          </Notice>
        ))}
      {checkout === "canceled" && !isPro && (
        <Notice tone="info" icon={Info}>
          Pagamento cancelado. Nada foi cobrado — você pode assinar o Pro quando quiser.
        </Notice>
      )}
      {pixOnly && prepaid.daysLeft <= 7 && checkout !== "pix" && (
        <Notice tone="warning" icon={TriangleAlert}>
          <strong>
            Seu Pro pago com Pix vence em {prepaid.daysLeft} {prepaid.daysLeft === 1 ? "dia" : "dias"} ({prepaidEnd}).
          </strong>{" "}
          Renove abaixo para não voltar ao plano Free — os meses são somados ao que ainda falta.
        </Notice>
      )}
      {subscription?.status === "unpaid" && (
        <Notice tone="warning" icon={TriangleAlert}>
          <strong>A assinatura está sem pagamento</strong> e o workspace voltou para o plano Free. Atualize o cartão e
          pague a fatura em aberto em &quot;Gerenciar assinatura&quot; para reativar o Pro.
        </Notice>
      )}
      {subscription?.status === "past_due" && (
        <Notice tone="warning" icon={TriangleAlert}>
          <strong>Não conseguimos cobrar a renovação.</strong> O Stripe vai tentar de novo nos próximos dias; atualize o
          cartão em &quot;Gerenciar assinatura&quot; para não voltar ao plano Free.
        </Notice>
      )}
      {cardActive && subscription?.cancel_at_period_end && periodEnd && (
        <Notice tone="warning" icon={Info}>
          Assinatura cancelada: o workspace continua no Pro até <strong>{periodEnd}</strong> e depois volta para o
          Free. Para manter o Pro, reative em &quot;Gerenciar assinatura&quot;.
        </Notice>
      )}
      {!configured && (
        <Notice tone="info" icon={Info}>
          Os pagamentos ainda não foram configurados neste ambiente (chaves do Stripe ausentes).
        </Notice>
      )}

      <Card className="rounded-lg shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-muted-foreground" aria-hidden />
              Plano {PLAN_LABELS[workspace.plan]}
              {cardActive && subscription && (
                <Badge variant="secondary">{SUBSCRIPTION_STATUS_LABELS[subscription.status]}</Badge>
              )}
              {pixOnly && <Badge variant="secondary">Pago com Pix</Badge>}
            </CardTitle>
            <CardDescription>
              <span className="tabular-nums">{PLAN_PRICES[workspace.plan]}</span>/mês
              {cardActive && periodEnd && !subscription?.cancel_at_period_end && ` · renova em ${periodEnd}`}
              {pixOnly && ` · válido até ${prepaidEnd}, sem renovação automática`}
            </CardDescription>
          </div>
          {subscription && (
            <BillingRedirectButton workspaceSlug={workspace.slug} target="portal" variant="outline" disabled={!configured}>
              Gerenciar assinatura
            </BillingRedirectButton>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <UsageMeter label="Leads" usage={leads} units={["lead", "leads"]} />
          <UsageMeter label="Membros e convites" usage={seats} units={["vaga", "vagas"]} />
        </CardContent>
      </Card>

      <PlanComparison
        currentPlan={workspace.plan}
        action={
          canBuy && (
            <div className="space-y-4">
              {prepaid ? (
                <p className="text-xs text-muted-foreground">
                  A assinatura com cartão fica disponível depois de {prepaidEnd}, quando o período pago com Pix acabar.
                </p>
              ) : (
                <BillingRedirectButton workspaceSlug={workspace.slug} target="checkout" className="w-full" disabled={!configured}>
                  Assinar com cartão
                </BillingRedirectButton>
              )}
              <PixCheckoutForm workspaceSlug={workspace.slug} renewing={prepaid !== null} disabled={!configured} />
            </div>
          )
        }
      />
      <p className="text-xs text-muted-foreground">
        Pagamento processado pelo Stripe. Cartão: renova todo mês; cancele quando quiser em &quot;Gerenciar
        assinatura&quot; e o Pro vale até o fim do período pago. Pix: pagamento único por 1 a 12 meses, sem renovação
        automática. Ao voltar para o Free, nenhum dado é apagado — só novos leads e membros ficam limitados.
      </p>
    </div>
  );
}
