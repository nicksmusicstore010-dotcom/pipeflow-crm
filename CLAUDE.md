# PipeFlow CRM

CRM SaaS multiempresa para PMEs, freelancers e times de vendas: leads, pipeline Kanban, timeline de atividades, dashboard de métricas e planos Free/Pro via Stripe. Alternativa simples e acessível ao HubSpot/Pipedrive, focada **só em vendas**.

O PRD completo está em [docs/PRD.md](docs/PRD.md) — consulte-o antes de implementar qualquer funcionalidade.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 14 (App Router) + React 18 + TypeScript 5 (strict) |
| UI | Tailwind CSS + shadcn/ui + lucide-react |
| Banco + Auth | Supabase (PostgreSQL + RLS + Auth) via `@supabase/ssr` |
| Pagamentos | Stripe (Checkout, Customer Portal, webhooks) |
| E-mail | Resend (convites de workspace) |
| Drag-and-drop | @dnd-kit |
| Gráficos | Recharts |
| Validação | Zod (+ react-hook-form nos formulários) |
| Deploy | Vercel + Supabase |

## Comandos

```bash
npm run dev          # servidor local
npm run build        # build de produção
npm run lint         # ESLint
npx tsc --noEmit     # checagem de tipos
npx supabase db push                                                   # aplicar migrations no projeto linkado
npx supabase gen types typescript --linked > src/types/database.ts  # regenerar tipos do banco
```

## Estrutura de pastas

```
src/
  app/
    (marketing)/            # landing page pública (/, /pricing)
    (auth)/                 # login, signup, callback, aceitar convite
    (app)/
      [workspaceSlug]/      # tudo que é do workspace fica sob o slug
        dashboard/
        leads/              # listagem + [leadId]/ (detalhe + timeline)
        pipeline/           # Kanban de negócios
        settings/           # membros, convites, billing (só admin)
      onboarding/           # criar primeiro workspace
    api/
      webhooks/stripe/      # route handler do webhook Stripe
      v1/                   # API pública (integrações)
  components/
    ui/                     # componentes shadcn/ui (gerados, não editar à mão sem motivo)
    layout/                 # sidebar, header, workspace switcher
    leads/ pipeline/ activities/ dashboard/ billing/ marketing/
  lib/
    supabase/               # client.ts (browser), server.ts (RSC/actions), middleware.ts, admin.ts (service role)
    stripe.ts
    resend.ts
    plans.ts                # limites dos planos (fonte única da verdade)
    utils.ts                # cn(), formatCurrency(), formatDate()
  actions/                  # Server Actions por domínio (leads.ts, deals.ts, activities.ts, workspaces.ts...)
  hooks/
  types/
    database.ts             # tipos gerados pelo Supabase
supabase/
  migrations/               # SQL versionado (schema + RLS + policies)
  seed.sql
docs/
  PRD.md
  PLAN.md                   # milestones, tarefas e status
```

## Modelo de domínio

- `workspaces` — id, name, slug, plan (`free` | `pro`), stripe_customer_id, stripe_subscription_id
- `workspace_members` — workspace_id, user_id, role (`admin` | `member`)
- `workspace_invites` — workspace_id, email, role, token, expires_at, accepted_at
- `profiles` — espelha `auth.users` (nome, avatar)
- `leads` — workspace_id, name, email, phone, company, position, status, owner_id
- `deals` — workspace_id, lead_id, title, value_cents, stage, owner_id, due_date, position
- `activities` — workspace_id, lead_id, author_id, type (`call` | `email` | `meeting` | `note`), description, occurred_at

Etapas do pipeline (`deal_stage`, nesta ordem): `new_lead` → `contacted` → `proposal_sent` → `negotiation` → `won` | `lost`. Rótulos na UI: Novo Lead, Contato Realizado, Proposta Enviada, Negociação, Fechado Ganho, Fechado Perdido.

## Convenções

### Código
- **Código em inglês** (nomes de variáveis, tabelas, colunas, arquivos); **UI e textos para o usuário em pt-BR**.
- Server Components por padrão; `"use client"` só quando precisar de estado, eventos ou bibliotecas de browser (dnd-kit, Recharts, formulários).
- Mutações via **Server Actions** em `src/actions/`; **Route Handlers** apenas para webhooks e para a API pública (`/api/v1`).
- Toda entrada de usuário é validada com Zod no servidor, mesmo que já validada no cliente.
- Arquivos em `kebab-case.tsx`; componentes em `PascalCase`; um componente exportado por arquivo.
- Imports absolutos com `@/` (ex.: `@/lib/utils`).
- Sem `any`; use os tipos gerados em `@/types/database`.

### Dados e segurança
- **Toda tabela de dados de negócio tem `workspace_id` e RLS habilitado.** Policies checam a participação do usuário via `workspace_members`. Nunca confiar em filtro só no cliente.
- O client com service role (`lib/supabase/admin.ts`) só é usado em webhooks e jobs de servidor — nunca em código que roda no browser.
- Mudanças de schema sempre como nova migration em `supabase/migrations/`; nunca editar migrations já aplicadas.
- Valores monetários armazenados em **centavos (integer)** e formatados como BRL (`R$ 1.234,56`) só na exibição.
- Datas em `timestamptz` (UTC) no banco; exibição em `America/Sao_Paulo`, formato `dd/MM/yyyy`.

### Permissões e planos
- **Admin**: tudo, incluindo membros, convites, billing e configurações do workspace.
- **Membro**: CRUD de leads, negócios e atividades. Sem acesso a settings/billing.
- Limites do plano Free (2 colaboradores, 50 leads) são checados **no servidor** antes de inserir, lendo de `lib/plans.ts`. Na UI, mostrar o limite e um CTA de upgrade.
- O plano do workspace só muda via webhook do Stripe (verificando a assinatura do evento) — nunca a partir do client.

### Kanban
- Drag-and-drop com @dnd-kit; atualização otimista na UI e persistência de `stage` + `position` via Server Action; reverter se falhar.

## Identidade visual

Referências: **Pipedrive** (clareza do pipeline), **HubSpot** (organização de contatos), **DataCrazy**. Princípio: **simples, limpo e focado em vendas** — menos menus, menos cliques.

- **Cor primária:** indigo/violeta (`indigo-600` / hover `indigo-700`), configurada como `--primary` nos tokens do shadcn/ui.
- **Neutros:** escala `slate` do Tailwind; fundo do app `slate-50`, cards brancos com borda `slate-200`.
- **Semânticas:** sucesso `emerald` (Fechado Ganho), erro `rose` (Fechado Perdido), alerta `amber` (prazo próximo/vencido).
- **Cores das etapas** (badge/borda superior da coluna): Novo Lead `slate`, Contato Realizado `sky`, Proposta Enviada `indigo`, Negociação `amber`, Fechado Ganho `emerald`, Fechado Perdido `rose`.
- **Tipografia:** Inter (via `next/font`); números de métricas e valores em `tabular-nums`.
- **Layout do app:** sidebar fixa à esquerda (logo, workspace switcher, navegação: Dashboard, Leads, Pipeline, Configurações) + área de conteúdo com header da página.
- **Componentes:** sempre partir do shadcn/ui; raio `rounded-lg`; sombras sutis (`shadow-sm`); ícones lucide.
- **Suporte a dark mode** via tokens CSS do shadcn (classe `dark`).
- **Responsivo:** landing e telas de leitura funcionam no mobile; o Kanban rola horizontalmente em telas pequenas.
- Estados vazios com ícone, frase curta e CTA (ex.: "Nenhum lead ainda — cadastre o primeiro").

## Milestones

O plano detalhado, com tarefas, critérios de pronto e status, está em [docs/PLAN.md](docs/PLAN.md). **Ao concluir tarefas, marque-as lá e atualize o status do milestone.**

Construir em incrementos entregáveis, testando cada um antes do próximo:

1. **Fundação** — setup Next.js + Tailwind + shadcn/ui, Supabase Auth (login/signup), layout do app.
2. **Workspaces** — schema multiempresa + RLS, onboarding (criar workspace), switcher na sidebar.
3. **Leads** — CRUD, listagem com busca/filtros, página de detalhe.
4. **Pipeline** — negócios + Kanban com drag-and-drop persistido.
5. **Atividades** — registro e timeline no detalhe do lead.
6. **Dashboard** — cards de métricas, funil (Recharts), negócios com prazo próximo.
7. **Colaboração** — convites por e-mail (Resend), papéis admin/membro.
8. **Monetização** — planos, limites, Stripe Checkout, webhook, Customer Portal.
9. **Landing page** — hero, funcionalidades, preços, CTA.
10. **API pública e polimento** — `/api/v1`, onboarding guiado, ajustes de UX.
