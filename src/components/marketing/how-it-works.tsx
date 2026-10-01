const STEPS = [
  { title: "Crie sua conta", text: "Grátis, sem cartão. Seu workspace fica pronto em segundos." },
  { title: "Cadastre seus leads", text: "Um a um ou carregando exemplos para explorar o CRM primeiro." },
  { title: "Acompanhe o funil", text: "Mova os negócios no Kanban e veja o resultado no dashboard." },
];

export function HowItWorks() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight">Comece a vender organizado hoje</h2>
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map(({ title, text }, i) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground tabular-nums">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
