import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground shadow-sm sm:px-12">
          <h2 className="text-balance text-3xl font-bold tracking-tight">Pare de perder vendas em planilhas</h2>
          <p className="mx-auto mt-3 max-w-xl text-balance text-primary-foreground/80">
            Crie seu workspace grátis e tenha o funil de vendas do seu time organizado ainda hoje.
          </p>
          <Button size="lg" variant="secondary" className="mt-8" asChild>
            <Link href="/signup">
              Criar conta grátis
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
