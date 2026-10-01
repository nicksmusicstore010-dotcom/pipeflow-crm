import { BarChart3, Building2, KanbanSquare, MessageSquareText, ShieldCheck, Users } from "lucide-react";

const FEATURES = [
  {
    icon: Users,
    title: "Leads organizados",
    text: "Nome, e-mail, telefone, empresa e cargo num só lugar, com busca sem acento e filtros por status, responsável e data.",
  },
  {
    icon: KanbanSquare,
    title: "Pipeline Kanban",
    text: "Arraste os negócios entre as etapas, do primeiro contato ao fechamento. Valor de cada coluna e prazos em destaque.",
  },
  {
    icon: MessageSquareText,
    title: "Histórico de atividades",
    text: "Ligações, e-mails, reuniões e notas na linha do tempo de cada lead — ninguém perde o contexto da conversa.",
  },
  {
    icon: BarChart3,
    title: "Dashboard de vendas",
    text: "Leads, negócios abertos, valor do pipeline, taxa de conversão e o funil por etapa, atualizados na hora.",
  },
  {
    icon: Building2,
    title: "Multiempresa",
    text: "Um workspace para cada empresa ou time, e troca entre eles em um clique. Os dados de um nunca aparecem no outro.",
  },
  {
    icon: ShieldCheck,
    title: "Equipe com permissões",
    text: "Convide por e-mail. Admins cuidam de membros e do plano; membros trabalham com leads, negócios e atividades.",
  },
];

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="scroll-mt-20 border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Tudo que um time de vendas precisa. Nada além disso.</h2>
          <p className="mt-3 text-muted-foreground">
            Sem automações de marketing nem menus infinitos: o PipeFlow é focado só em vender.
          </p>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-lg border bg-card p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
