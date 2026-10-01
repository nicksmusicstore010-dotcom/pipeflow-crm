import type { Metadata } from "next";

import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { PricingSection } from "@/components/marketing/pricing-section";

export const metadata: Metadata = {
  title: "Preços",
  description: "Plano Free grátis para sempre (50 leads, 2 membros) e Pro por R$ 49/mês por workspace, no cartão ou no Pix.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      <PricingSection headingLevel={1} />
      <FaqSection />
      <FinalCta />
    </>
  );
}
