# PipeFlow CRM

CRM SaaS multiempresa para PMEs, freelancers e times de vendas: leads, pipeline Kanban, timeline de atividades, dashboard de métricas e planos Free/Pro via Stripe. Alternativa simples e acessível ao HubSpot/Pipedrive, focada **só em vendas**.

O PRD completo está em [docs/PRD.md](docs/PRD.md) — consulte-o antes de implementar qualquer funcionalidade.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript 5 (strict) |
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
npm run lint         # ESLint 9 (eslint.config.mjs; `next lint` não existe mais no Next 16)
npm run check:keys   # confere as chaves do Supabase no .env.local (sem imprimi-las)
npm run stripe:go-live  # cobrança live em produção: produto/preço, portal, webhook, envs na Vercel e redeploy (pede a sk_live_ escondida)
npx tsc --noEmit     # checagem de tipos
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_failed --forward-to localhost:3000/api/webhooks/stripe   # webhook local (whsec_ → STRIPE_WEBHOOK_SECRET)
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
    shared/                 # peças genéricas reutilizadas entre domínios (ex.: UserAvatar)
    leads/ pipeline/ activities/ dashboard/ members/ billing/ marketing/
  lib/
    supabase/               # client.ts (browser), server.ts (RSC/actions), middleware.ts (sessão, chamado por src/proxy.ts), admin.ts (service role)
    stripe.ts               # cliente Stripe (server-only, sob demanda) + envs de preço e webhook
    stripe-sync.ts          # lado do webhook: busca a assinatura no Stripe e grava subscriptions + workspaces.plan (chave secreta)
    billing.ts              # estado de cobrança da página /settings/billing (customer + última assinatura)
    subscription-status.ts  # status da assinatura: rótulos e quais mantêm o Pro
    limits.ts               # canAddLead() / canAddMember(): uso x limite do plano, checados no servidor
    resend.ts               # envio de e-mail (API do Resend) + template do convite
    plans.ts                # limites dos planos (fonte única da verdade; o de membros também é garantido no banco por plan_member_limit())
    members.ts              # membros (com e-mail), convites pendentes e prévia do convite
    roles.ts                # papéis admin/membro e rótulos (pode ser importado no cliente)
    site-url.ts             # siteOrigin(): base dos links de e-mail e do Stripe (Origin só se for uma origem do próprio app)
    deal-stages.ts          # ordem, rótulos e cores das etapas do pipeline (fonte única)
    lead-status.ts          # status dos leads: ordem, rótulos e cores (fonte única)
    activity-types.ts       # tipos de atividade: ordem, rótulos, ícones e cores (fonte única)
    activities.ts           # consultas de atividades (timeline do lead)
    leads.ts                # consultas de leads (listagem com filtros/paginação, detalhe)
    sample-leads.ts         # leads de exemplo (fictícios) do botão "Carregar leads de exemplo"
    deals.ts                # consultas de negócios (board, negócios do lead)
    dashboard.ts            # métricas do dashboard (RPC deal_stage_totals) e negócios com prazo próximo
    validations/            # schemas Zod compartilhados entre formulário e Server Action
    action-result.ts        # tipo de retorno das Server Actions ({ ok: true } | ActionFailure)
    action-workspace.ts     # resolveWorkspace(): sessão + workspace do slug, para Server Actions
    action-feedback.ts      # toast de erro de Server Action (sessão expirada, sem conexão)
    utils.ts                # cn(), formatCurrency(), formatDate(), initials()
  actions/                  # Server Actions por domínio (leads.ts, deals.ts, activities.ts, workspaces.ts...)
  hooks/                    # use-action-form-state.ts: useActionState que guarda o que foi digitado e mostra "sem conexão" no formulário
  proxy.ts                  # (ex-middleware.ts, renomeado no Next 16) renova a sessão e protege as rotas
  types/
    database.ts             # tipos gerados pelo Supabase
    supabase.ts             # nomes das linhas de cada tabela (Workspace, Lead, Subscription...) a partir de database.ts
supabase/
  migrations/               # SQL versionado (schema + RLS + policies)
  seed.sql
docs/
  PRD.md
  PLAN.md                   # milestones, tarefas e status
```

## Modelo de domínio

- `workspaces` — id, name, slug, plan (`free` | `pro`), stripe_customer_id, stripe_subscription_id, pro_until (Pro pago com Pix vale até aqui)
- `workspace_members` — workspace_id, user_id, role (`admin` | `member`)
- `workspace_invites` — workspace_id, email, role, token_hash (SHA-256; o token só existe no link do e-mail), invited_by, expires_at (7 dias), accepted_at, accepted_by. Criar/ver/aceitar só pelas RPCs `create_workspace_invite()` / `get_invite_preview()` / `accept_workspace_invite()` (aceita só o e-mail convidado)
- `profiles` — espelha `auth.users` (nome, avatar)
- `leads` — workspace_id, name, email, phone, company, position, status, owner_id
- `deals` — workspace_id, lead_id, title, value_cents, stage, owner_id, due_date, position
- `activities` — workspace_id, lead_id, author_id, type (`call` | `email` | `meeting` | `note`), description, occurred_at
- `subscriptions` — id (`sub_...` do Stripe), workspace_id, stripe_customer_id, stripe_price_id, status, current_period_end, cancel_at_period_end. Só o webhook grava (chave secreta); só admins leem. `workspaces.plan` continua sendo o campo lido para os limites
- `pix_payments` — id (`cs_...` da sessão do Checkout, garante que um webhook repetido não estende duas vezes), workspace_id, months, amount_cents, period_start/end. Gravado só por `apply_pix_payment()` (service role); admins leem

Etapas do pipeline (`deal_stage`, nesta ordem): `new_lead` → `contacted` → `proposal_sent` → `negotiation` → `won` | `lost`. Rótulos na UI: Novo Lead, Contato Realizado, Proposta Enviada, Negociação, Fechado Ganho, Fechado Perdido.

## Convenções

### Código
- **Código em inglês** (nomes de variáveis, tabelas, colunas, arquivos); **UI e textos para o usuário em pt-BR**.
- Next 16: `params`, `searchParams`, `cookies()` e `headers()` são assíncronos (sempre `await`). Formulários com `<form action>`: use `useActionFormState` e `defaultValue={state.fields?.campo}` — o React 19 limpa o formulário a cada envio.
- Server Components por padrão; `"use client"` só quando precisar de estado, eventos ou bibliotecas de browser (dnd-kit, Recharts, formulários).
- Mutações via **Server Actions** em `src/actions/`; **Route Handlers** apenas para webhooks e para a API pública (`/api/v1`).
- Toda entrada de usuário é validada com Zod no servidor, mesmo que já validada no cliente.
- Arquivos em `kebab-case.tsx`; componentes em `PascalCase`; um componente exportado por arquivo.
- Imports absolutos com `@/` (ex.: `@/lib/utils`).
- Sem `any`; use os tipos gerados em `@/types/database`.

### Dados e segurança
- **Toda tabela de dados de negócio tem `workspace_id` e RLS habilitado.** Policies checam a participação do usuário via `workspace_members`. Nunca confiar em filtro só no cliente.
- O client com a chave secreta (`createAdminClient()` em `lib/supabase/admin.ts`, env `SUPABASE_SECRET_KEY`) ignora o RLS: só em webhooks e jobs de servidor, sempre filtrando por `workspace_id`. Ele importa `server-only` (importar no browser quebra o build); a env nunca leva prefixo `NEXT_PUBLIC_`.
- Mudanças de schema sempre como nova migration em `supabase/migrations/`; nunca editar migrations já aplicadas.
- Valores monetários armazenados em **centavos (integer)** e formatados como BRL (`R$ 1.234,56`) só na exibição.
- Datas em `timestamptz` (UTC) no banco; exibição em `America/Sao_Paulo`, formato `dd/MM/yyyy`.
- Busca de leads usa a coluna gerada `search_text` (sem acentos, minúscula); normalize o termo do mesmo jeito antes do `ilike`. O firewall (Cloudflare) na frente do Supabase bloqueia termos com cara de SQL injection com uma página HTML (erro sem `code`): `listLeads` devolve `searchBlocked` em vez de quebrar a página.
- **Qualquer usuário logado pode chamar a API do Supabase direto** (chave publicável + JWT dele), sem passar pelas Server Actions. Toda regra de negócio que importa (limites de plano, quem pode editar, colunas imutáveis) precisa valer no banco: RLS, grants por coluna, triggers e RPCs.
- Rate limits no banco via `private.hit_rate_limit(ação, máx, janela)` (schema `private`, fora da API): convites 20/hora e workspaces 10/dia por usuário — a RPC levanta `rate_limited`.
- Cabeçalhos de segurança e CSP em `next.config.mjs`. O navegador só fala com o próprio app (`connect-src 'self'`; Supabase e Stripe são chamados do servidor): script, fonte ou API externa no cliente exige atualizar a CSP.
- Supabase fora do ar ≠ deslogado: `getCurrentUser()` lança erro (tela "Tentar novamente") e o proxy não redireciona para `/login` quando o Auth não responde. Depois de uma action que falhou por rede (`NETWORK_ERROR`), nunca chame `router.refresh()` — offline ele vira navegação completa para a página de erro do navegador.

### Permissões e planos
- **Admin**: tudo, incluindo membros, convites, billing e configurações do workspace.
- **Membro**: CRUD de leads, negócios e atividades. Sem acesso a settings/billing.
- Limites do plano Free (2 colaboradores, 50 leads) são checados **no servidor** antes de inserir, lendo de `lib/plans.ts`. Na UI, mostrar o limite e um CTA de upgrade. O banco também barra os dois (triggers `enforce_member_limit` — convites abertos contam como vaga — e `enforce_lead_limit`, erro `plan_limit`) — mudar um limite exige migration (`plan_member_limit()` / `plan_lead_limit()`).
- Um workspace sempre tem pelo menos um admin (trigger `protect_last_admin`). Remover um membro deixa os leads/negócios dele sem responsável.
- O plano do workspace só muda via webhook do Stripe (verificando a assinatura do evento) — nunca a partir do client.
- **Duas formas de pagar o Pro:** cartão = assinatura mensal (Checkout `mode=subscription`); **Pix = pré-pago** de 1, 3, 6 ou 12 meses (Checkout `mode=payment`, `metadata.kind = "pix_pro"`), porque conta Stripe do Brasil não tem Pix recorrente (Pix Automático). O Pix é assíncrono: o Pro entra em `checkout.session.completed` (se já veio pago) ou `checkout.session.async_payment_succeeded`. O workspace é Pro enquanto houver assinatura viva **ou** `pro_until` no futuro; o `pg_cron` (`expire-prepaid-pro`, a cada 15 min) rebaixa quem venceu sem cartão. Pix e cartão não se sobrepõem (cada checkout recusa se o outro estiver valendo). Reembolso de Pix pelo painel do Stripe **não** tira o Pro automaticamente.
- Testar Pix no modo de teste: CPF `000.000.000-00`; o e-mail define o resultado (`...succeed_immediately@...` paga na hora; e-mail comum paga em ~3 min; `...expire_immediately@...` expira).

### Atividades
- Qualquer membro registra; só o autor ou um admin edita/exclui (RLS + menu só para quem pode). `author_id` vem de `auth.uid()`, nunca do cliente.
- `occurred_at` é digitado no horário de São Paulo: converter com `fromSaoPauloInput()` / `toSaoPauloInput()` de `lib/utils.ts`.

### Kanban
- Drag-and-drop com @dnd-kit; atualização otimista na UI e persistência de `stage` + `position` via Server Action; reverter se falhar.
- `stage` e `position` só mudam pela RPC `move_deal()` (renumera as colunas numa transação); clientes não têm update direto nessas colunas.
- `due_date` é `date` (dia do calendário, não instante): formatar com `formatDay()`, nunca via `new Date()`.

## Identidade visual

Referências: **Pipedrive** (clareza do pipeline), **HubSpot** (organização de contatos), **DataCrazy**. Princípio: **simples, limpo e focado em vendas** — menos menus, menos cliques.

- **Cor primária:** indigo/violeta (`indigo-600` / hover `indigo-700`), configurada como `--primary` nos tokens do shadcn/ui.
- **Neutros:** escala `slate` do Tailwind; fundo do app `slate-50`, cards brancos com borda `slate-200`.
- **Semânticas:** sucesso `emerald` (Fechado Ganho), erro `rose` (Fechado Perdido), alerta `amber` (prazo próximo/vencido).
- **Cores das etapas** (badge/borda superior da coluna): Novo Lead `slate`, Contato Realizado `sky`, Proposta Enviada `indigo`, Negociação `amber`, Fechado Ganho `emerald`, Fechado Perdido `rose`.
- **Tipografia:** Inter (via `next/font`); números de métricas e valores em `tabular-nums`.
- **Layout do app:** sidebar fixa à esquerda (logo, workspace switcher, navegação: Dashboard, Leads, Pipeline, Configurações) + área de conteúdo com header da página.
- **Componentes:** sempre partir do shadcn/ui; raio `rounded-lg`; sombras sutis (`shadow-sm`); ícones lucide.
- **Dark mode é o tema padrão** (next-themes, classe `dark`), com seletor Claro/Escuro/Sistema na barra superior. Todo componente novo precisa funcionar nos dois temas — use os tokens (`bg-card`, `text-muted-foreground`...) e, para cores fixas, a variante `dark:`.
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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
