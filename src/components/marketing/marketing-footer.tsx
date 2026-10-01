import Link from "next/link";

import { Logo } from "@/components/layout/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-muted-foreground">CRM simples para quem vende.</p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/#funcionalidades" className="hover:text-foreground">
            Funcionalidades
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Preços
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Entrar
          </Link>
          <Link href="/signup" className="hover:text-foreground">
            Criar conta
          </Link>
        </nav>
      </div>
      <p className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PipeFlow CRM
      </p>
    </footer>
  );
}
