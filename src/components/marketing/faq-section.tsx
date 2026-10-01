import { ChevronDown } from "lucide-react";

import { PLAN_LIMITS } from "@/lib/plans";

const QUESTIONS = [
  {
    q: "Preciso de cartão para começar?",
    a: "Não. O plano Free é grátis para sempre, sem cartão. Você só informa um meio de pagamento se decidir assinar o Pro.",
  },
  {
    q: "O que acontece quando chego ao limite do Free?",
    a: `O Free permite até ${PLAN_LIMITS.free.leads} leads e ${PLAN_LIMITS.free.members} membros por workspace. Ao chegar no limite, tudo continua funcionando e nada é apagado — só não dá para cadastrar novos leads ou convidar mais pessoas até fazer upgrade.`,
  },
  {
    q: "Posso pagar com Pix?",
    a: "Sim. O Pro pode ser pago com Pix por 1, 3, 6 ou 12 meses, sem renovação automática. No cartão, a assinatura é mensal e você cancela quando quiser.",
  },
  {
    q: "Posso usar para mais de uma empresa?",
    a: "Sim. Cada empresa ou time é um workspace separado, com seus próprios leads, membros e plano. Você troca entre eles pelo menu lateral.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Cada workspace é isolado no banco de dados: ninguém de fora vê seus leads, nem consultando o sistema diretamente. A conexão é sempre criptografada (HTTPS).",
  },
  {
    q: "Funciona no celular?",
    a: "Sim. Dá para consultar leads, registrar atividades e acompanhar o pipeline pelo navegador do celular.",
  },
];

/** Native <details>: works without JavaScript and with the keyboard. */
export function FaqSection() {
  return (
    <section id="perguntas" className="scroll-mt-20 border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight">Perguntas frequentes</h2>
        <div className="mt-10 divide-y rounded-lg border bg-card shadow-sm">
          {QUESTIONS.map(({ q, a }) => (
            <details key={q} className="group px-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pb-4 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
