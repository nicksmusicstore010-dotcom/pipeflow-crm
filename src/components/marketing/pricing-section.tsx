import Link from "next/link";

import { PlanComparison } from "@/components/billing/plan-comparison";
import { Button } from "@/components/ui/button";

/** Free × Pro with sign-up CTAs. `headingLevel` 1 on /pricing, 2 inside the landing page. */
export function PricingSection({ headingLevel = 2 }: { headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <section id="precos" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <Heading className="text-3xl font-bold tracking-tight">Preço simples, sem surpresa</Heading>
          <p className="mt-3 text-muted-foreground">
            Comece grátis. Quando o time ou a carteira crescerem, o Pro libera tudo por R$ 49 por mês — por workspace,
            não por usuário.
          </p>
        </div>
        <div className="mt-12">
          <PlanComparison
            freeAction={
              <Button variant="outline" className="w-full" asChild>
                <Link href="/signup">Começar grátis</Link>
              </Button>
            }
            action={
              <Button className="w-full" asChild>
                <Link href="/signup">Criar conta e assinar o Pro</Link>
              </Button>
            }
          />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Pro no cartão (mensal, cancele quando quiser) ou no Pix (1, 3, 6 ou 12 meses, sem renovação automática).
          Voltar para o Free não apaga nenhum dado.
        </p>
      </div>
    </section>
  );
}
