import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { FaqSection } from "@/components/marketing/faq-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Button } from "@/components/ui/button";

const HIGHLIGHTS = ["Grátis para começar", "Sem cartão de crédito", "Pix ou cartão no Pro"];

export default function HomePage() {
  return (
    <>
      <section className="overflow-hidden py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="text-center lg:text-left">
            <p className="text-sm font-medium text-primary">CRM para pequenas empresas e times de vendas</p>
            <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Organize suas vendas sem complicação
            </h1>
            <p className="mt-4 text-balance text-lg text-muted-foreground">
              Leads, pipeline Kanban, histórico de atividades e métricas em um só lugar. Mais simples que o HubSpot,
              com plano grátis de verdade.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Criar conta grátis
                  <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:justify-start">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <HeroPreview />
        </div>
      </section>
      <FeaturesSection />
      <HowItWorks />
      <PricingSection />
      <FaqSection />
      <FinalCta />
    </>
  );
}
