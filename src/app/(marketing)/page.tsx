import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

// Placeholder: the full landing page (features, pricing, CTA) is Milestone 9.
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Começar grátis</Link>
          </Button>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Organize suas vendas sem complicação
        </h1>
        <p className="mt-4 max-w-xl text-balance text-lg text-muted-foreground">
          Leads, pipeline Kanban e métricas em um só lugar. Feito para pequenas empresas, freelancers
          e times de vendas.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">Criar conta grátis</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Já tenho conta</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
