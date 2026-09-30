# Plano de implementação — PipeFlow CRM

Roteiro de construção em milestones, derivado do [PRD](PRD.md). Cada milestone é um incremento entregável: só avançamos depois de verificar o anterior.

**Legenda:** ✅ concluído · 🚧 em andamento · ⬜ não iniciado

| # | Milestone | Status |
| --- | --- | --- |
| 1 | Fundação | ✅ |
| 2 | Workspaces (multiempresa) | ✅ |
| 3 | Leads | ✅ |
| 4 | Pipeline Kanban | ✅ |
| 5 | Atividades | ✅ |
| 6 | Dashboard | ✅ |
| 7 | Colaboração e permissões | ✅ |
| 8 | Monetização (Stripe) | 🚧 |
| 9 | Landing page | ⬜ |
| 10 | API pública, onboarding e polimento | ⬜ |

**Verificação padrão de todo milestone:** `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erros, mais o teste manual descrito em "Pronto quando".

---

## 1. Fundação ✅

Branch: `feat/m1-fundacao` · commit inicial `826bc99`

- [x] Repositório git + branch `feat/m1-fundacao`; `.gitignore` cobrindo `node_modules`, `.next`, `.env*.local`
- [x] Next.js 14 (App Router, `src/`, alias `@/*`) + TypeScript + Tailwind 3
- [x] shadcn/ui (button, input, label, card, dropdown-menu, avatar, badge, dialog, sonner, separator, sheet)
- [x] Tokens de cor (slate + índigo, cores de gráfico) em `globals.css`; fonte Inter; `lang="pt-BR"`
- [x] Clientes Supabase em `src/lib/supabase/` (browser, server, middleware) com `@supabase/ssr`
- [x] `src/middleware.ts`: renova a sessão e protege rotas (anônimo → `/login?next=...`; logado fora de `/login` e `/signup`)
- [x] Server Actions de login, cadastro e logout (`src/actions/auth.ts`) com Zod e erros em pt-BR
- [x] Páginas `/login`, `/signup` e rota `/auth/callback`
- [x] Layout logado: sidebar no desktop, gaveta no mobile, menu do usuário
- [x] Páginas provisórias: Dashboard, Leads, Pipeline, Configurações
- [x] Landing provisória em `/`, `.env.example`, README

**Verificação (23/09/2026):**
- [x] `npm install` em dia
- [x] `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erros
- [x] Smoke test das rotas (`next dev` com env fictícia): `/`, `/login`, `/signup` → 200; `/dashboard`, `/leads?x=1`, `/settings` → 307 para `/login?next=...` preservando a query string
- [x] Teste manual com Supabase real (local e produção na Vercel), confirmado pelo usuário

**Pronto quando:** cadastro → confirmação por e-mail → login → dashboard → sair funciona num projeto Supabase real. ✅

**Esqueleto visual e componentes base (24/09/2026):**
- [x] Esqueleto visual: barra superior fixa (hamburguer no mobile, breadcrumb workspace › página, tema, menu do usuário); conteúdo da sidebar compartilhado entre desktop e gaveta; **dark mode como padrão** com seletor Claro/Escuro/Sistema; `loading.tsx` com skeleton
- [x] Componentes base: `StatCard`, `StageBadge`, `KanbanColumn` (Pipeline já mostra as 6 colunas vazias), `UserAvatar`, `EmptyState` com `className`; `src/lib/deal-stages.ts` (ordem, rótulos e cores das etapas); shadcn `table`, `select`, `textarea`, `skeleton`, `tooltip`
- [x] Verificação do esqueleto no navegador (Playwright + Edge, usuário de teste temporário apagado depois): navegação pela sidebar e pela gaveta mobile, switcher, tema (padrão escuro, troca, persistência, "Sistema"), sem rolagem horizontal da página em 390px, sem erros no console. Corrigido: `tailwind.config.ts` não varria `src/lib/`, então as cores das etapas não eram geradas

**Confirmação de e-mail (24/09/2026):**
- [x] Correção: confirmação de e-mail falhava ("Link inválido") quando o link era aberto em outro navegador/dispositivo (PKCE). `/auth/callback` agora aceita `token_hash` (`verifyOtp`, funciona em qualquer navegador) além de `code`; mensagens distintas para link expirado/usado e "confirmado em outro navegador"; botão "Reenviar link de confirmação" no login. Testado com Playwright (usuários temporários, sem envio real de e-mail)
- [ ] Dashboard do Supabase: template "Confirm signup" apontando para `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` (fazer depois do deploy da correção)
- [ ] SMTP próprio (Resend) no Supabase — o SMTP padrão é só para testes: poucos e-mails por hora e entrega lenta/incerta

**Infra:**
- [x] Repositório no GitHub: `nicksmusicstore010-dotcom/pipeflow-crm` (privado)
- [x] Deploy na Vercel importando o repo; `vercel.json` fixa o framework `nextjs`; env vars do Supabase configuradas
- [x] Projeto Supabase `qjwxtnacgoununcbsbjx`; `.env.local` preenchido; Redirect URLs (local + Vercel) configuradas
- [x] Integração Supabase ↔ GitHub (diretório de trabalho `.`)
- [x] Merge na `main` (24/09/2026, `49e3ed5`): milestone 2 + esqueleto visual + correção da confirmação de e-mail. Sem PR — o GitHub CLI (`gh`) ainda não está autenticado nesta máquina

**Supabase core — chaves (aula 3.1, 28/09/2026):**

Branch: `feat/supabase-core`

- [x] `src/lib/supabase/admin.ts`: `createAdminClient()` com a chave secreta (ignora o RLS, sem sessão), tipado com `Database`; importa `server-only`
- [x] `getSupabaseSecretKey()` em `env.ts`: lê `SUPABASE_SECRET_KEY` (ou o nome antigo `SUPABASE_SERVICE_ROLE_KEY`) só quando o admin é usado — o app sobe sem ela
- [x] `.env.example`, README (tabela das chaves) e CLAUDE.md documentando a chave secreta e onde ela pode ser usada
- [x] `npm run check:keys` (`scripts/check-supabase-keys.mjs`): confere as chaves sem imprimi-las — publicável conecta e o RLS bloqueia o anônimo; secreta conecta e ignora o RLS; alerta se uma chave secreta tiver prefixo `NEXT_PUBLIC_`
- [x] `SUPABASE_SECRET_KEY` no `.env.local`; `npm run check:keys` passou (publicável bloqueada pelo RLS, secreta conecta e ignora o RLS)
- [x] `SUPABASE_SECRET_KEY` na Vercel, projeto `pipeflow-crm` (Production, Preview e Development, tipo *sensitive*), via Vercel CLI com a pasta ligada ao projeto (`.vercel/`, já no `.gitignore`). Vale a partir do próximo deploy
- [x] **Incidente (29/09/2026):** produção fora do ar (500 em todas as rotas, nos 4 projetos) — o projeto `pipeflow-crm` não tinha `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (só a chave secreta) e o middleware quebrava. Cadastradas (Production, Preview, Development) + `NEXT_PUBLIC_SITE_URL=https://pipeflow-crm-olive.vercel.app` (Production) e redeploy. Verificado: rotas públicas 200, protegidas → login, e login real → onboarding → dashboard/leads/configurações sem erros (usuário temporário apagado)
- [x] Endereço de produção: **https://pipeflow-crm-olive.vercel.app** (`pipeflow-crm.vercel.app` é de outra pessoa)
- [x] Supabase Auth (30/09/2026): Site URL `https://pipeflow-crm-olive.vercel.app`; Redirect URLs `https://pipeflow-crm-olive.vercel.app/**` e `http://localhost:3000/**`. `supabase/config.toml` agora espelha a configuração remota de Auth (`npx supabase config diff` para conferir)
- [x] **Incidente (29–30/09/2026):** o `supabase config push` rodado para trocar a URL não respeitou o "n" (sem terminal interativo ele confirma sozinho) e enviou também os padrões locais do `config.toml`: desligou "Confirm email", MFA TOTP e Storage Analytics, OTP 8→6 dígitos, intervalo entre e-mails 60s→1s. Nenhum cadastro no período. Restaurado (painel + `config push`): confirmação, MFA, OTP 8, intervalo 60s. **Storage Analytics não volta no plano Free** (402: exige plano pago) — o app não usa. Lição: `config push` só depois de `config diff` limpo, e nunca contar com o prompt de confirmação
- [x] Existiam 4 projetos na Vercel fazendo deploy do mesmo repo; os duplicados (`pipeflow`, `pipeflow-crm-1`, `pipeflow-crm-czaz`, sem domínio próprio nem envs, todos com 500) foram apagados em 30/09/2026 — fica só o `pipeflow-crm`
- [x] `client.ts` (navegador) como singleton lazy: criado na primeira chamada, não no import, e reaproveitado — uma sessão e um conjunto de listeners por aba
- [x] `server.ts`: `createClient()` async (`await cookies()`), um client por request; as 29 chamadas em actions, `lib/` e `/auth/callback` passaram a usar `await createClient()` — já no formato exigido pelo Next 15
- [x] `.env.local` confirmado no `.gitignore` (regra `.env*.local`) e nunca versionado

**Verificação (28/09/2026):**
- [x] `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erros
- [x] Componente de cliente temporário importando `admin.ts` → build falha com o erro do `server-only` (arquivo removido depois)
- [x] Bundle do navegador (`static/`) sem nenhuma referência a `SUPABASE_SECRET_KEY`, `sb_secret` ou `createAdminClient`
- [x] `npm run check:keys`: as duas chaves ok
- [x] Clients: `tsc`, `lint` e `build` sem erros; smoke test no build de produção com usuário temporário criado pelo client admin (apagado depois): `/app` → `/onboarding` sem workspace; com workspace, `/app` → dashboard e Dashboard/Leads/Pipeline/Configurações 200 lendo a sessão pelos cookies; workspace alheio → 404; `/auth/callback` com código inválido trata o erro

**Migrations & segurança RLS (aula 3.2, 29/09/2026):**

`workspaces`, `workspace_members`, `leads`, `deals` e `activities` já existiam (milestones 2–5, aplicadas no remoto). Nesta aula:

- [x] Migration `20260929120000_subscriptions.sql`: enum `subscription_status` e tabela `subscriptions` (id = `sub_...` do Stripe, workspace_id, stripe_customer_id, stripe_price_id, status, current_period_end, cancel_at_period_end, canceled_at). RLS: só admins do workspace leem; clientes não têm insert/update/delete — só o webhook (chave secreta) grava. `workspaces.plan` continua sendo o campo dos limites
- [x] Revisão do RLS com `supabase db advisors`: migration `20260929120100_rls_function_grants.sql` tira o `EXECUTE` do `anon` nas funções `SECURITY DEFINER` de apoio às policies e de todos em `handle_new_user()` (trigger); `is_user_in_workspace(ws, user)` deixava qualquer usuário logado descobrir se um usuário X é membro de um workspace Y via `/rest/v1/rpc` — agora só responde para workspaces dos quais quem pergunta é membro
- [x] Tipos regenerados em `src/types/database.ts`; `src/types/supabase.ts` com os nomes das linhas (`Workspace`, `Lead`, `Deal`, `Activity`, `Subscription`...)
- [ ] Ativar "Leaked password protection" no Auth do Supabase (último aviso de segurança dos advisors; configuração do dashboard, disponível no plano Pro do Supabase)

**Verificação (29/09/2026):**
- [x] Migrations + RLS testadas em transação com rollback antes do `db push` (19 checagens: trigger de profiles, id `sub_` obrigatório, admin lê a assinatura do próprio workspace mas não insere/altera/exclui, membro não admin não lê, outro workspace não lê assinatura/leads/workspace, `is_user_in_workspace` não vaza membros de outro workspace, responsável de lead continua validado, anônimo sem acesso à tabela e às funções). Rodada de controle sem a correção: 4 falhas, entre elas o vazamento de membros
- [x] Após o `db push`: as 7 tabelas do `public` com RLS ativo (activities 4 policies, deals 4, leads 4, profiles 2, subscriptions 1, workspace_members 1, workspaces 2); advisors sem avisos de `anon`
- [x] `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erros

**Auth real & proteção de rotas (aula 3.3, 29/09/2026):**

Login/cadastro no Supabase Auth, `/auth/callback`, logout, proteção de rotas, onboarding (workspace + membro admin via `create_workspace()`) e switcher com dados reais já existiam (milestones 1 e 2). A proteção de rotas fica em `src/middleware.ts`: `proxy.ts` é o nome do mesmo arquivo a partir do Next 16, e o projeto está no Next 14.2 (um `proxy.ts` aqui não seria executado). Nesta aula, revisão + teste ponta a ponta:

- [x] Correção: "Sair" encerrava a sessão em **todos** os aparelhos (`signOut()` usa `scope: "global"` por padrão); agora `scope: "local"` — só o navegador atual
- [x] Mensagem em pt-BR para `email_address_invalid` (domínio recusado pelo Supabase), que caía no genérico "Não foi possível concluir"
- [ ] SMTP próprio (Resend) ficou mais urgente: no teste, o SMTP padrão do Supabase já estava no limite de envio da hora e o cadastro pelo formulário respondeu "Muitas tentativas" — cadastros reais falham do mesmo jeito até configurar (item também listado em "Confirmação de e-mail")

**Verificação (29/09/2026):**
- [x] `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erros
- [x] Ponta a ponta no navegador (Playwright + Edge, build de produção, 33 checagens, usuário de teste apagado depois): anônimo em `/app`, `/onboarding` e rotas do workspace → `/login?next=` (com query string); cadastro pelo formulário (limite de e-mail → "Muitas tentativas"; usuário criado pelo mesmo fluxo de signup via `generateLink`, sem e-mail); no banco: usuário com e-mail normalizado, não confirmado, profile com o nome; login antes de confirmar → "Confirme seu e-mail" + reenviar; link de confirmação em outro navegador → logado em `/onboarding`; e-mail confirmado no banco; login → `/app` → `/onboarding` → criar workspace → dashboard com o nome no switcher; no banco: workspace (plano free, `created_by`) e o criador como único membro **admin**; `/app` → dashboard, `/login` logado → app, slug alheio → 404; Sair → `/login`, cookies de sessão apagados, voltar do navegador não mostra a página, rota do app → `/login?next=`, **outra sessão continua ativa**; login com `?next=` volta à página; `?next=` externo ignorado; senha errada → mensagem; sem erros no console. Linha de base antes da correção: "outra sessão continua ativa" falhava
- [ ] Mensagem de `email_address_invalid` não verificada no navegador: com o limite de e-mail atingido, o Supabase responde o rate limit antes de validar o domínio (o código do erro foi confirmado chamando o `signUp` direto)

---

## 2. Workspaces (multiempresa) ✅

Branch: `feat/m2-workspaces`

- [x] Configurar Supabase CLI e a pasta `supabase/migrations/` (devDependency, `init` e `link` ao projeto `qjwxtnacgoununcbsbjx`)
- [x] Migration `20260923203201_workspaces.sql`: `profiles` (trigger a partir de `auth.users` + backfill), `workspaces`, `workspace_members` (role `admin` | `member`), aplicada no remoto
- [x] RLS em todas as tabelas + `is_workspace_member()` / `is_workspace_admin()` / `shares_workspace_with()`; RPC `create_workspace()` (única forma de criar; criador vira admin); `plan`/`stripe_*` sem permissão de update para clientes
- [x] Gerar tipos em `src/types/database.ts`; clientes Supabase tipados com `Database`
- [x] Onboarding: `/app` manda quem não tem workspace para `/onboarding`, que pede o nome e cria o workspace (Server Action + Zod)
- [x] Mover as rotas logadas para `/[workspaceSlug]/...` e validar o acesso ao slug no layout (slug alheio → 404)
- [x] Workspace switcher na sidebar e no menu mobile (dropdown com os workspaces do usuário + "Criar workspace")
- [x] Lembrar o último workspace acessado (cookie `pf_workspace` gravado no navegador por `RememberWorkspace`; `/app` só o usa se o usuário for membro)

**Verificação (23/09/2026):**
- [x] `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erros
- [x] Migration + testes de RLS em transação com rollback antes do `db push` (criação, slug duplicado, B isolado, anon bloqueado, `plan` imutável)
- [x] Ponta a ponta com 2 usuários de teste (apagados depois): A cria workspaces pelo formulário real do onboarding (slug `acai-cia-vendas` a partir de "Açaí & Cia Vendas"; nome reservado "Login" → `login-xxxx`), dashboard renderiza com switcher e nav prefixada, `/app` volta ao último workspace e ignora cookie forjado; B recebe 404 nos slugs de A e `[]` consultando a API REST direto; update de `plan`, insert direto em `workspaces`/`workspace_members` e acesso anônimo → `permission denied`
- [x] Teste no navegador (24/09/2026, Playwright + Edge contra o **build de produção**, 33 verificações, usuários de teste apagados depois): onboarding sem workspace, validação de nome, criar 2+ workspaces pelo formulário e pelo "Criar workspace" do switcher, alternar (desktop e gaveta mobile), marcação do atual, voltar/avançar do navegador, nome duplicado → slug com sufixo, nome só com emoji e nome reservado, nome longo sem estourar a sidebar, slug de outro usuário e inexistente → 404, cookie forjado ignorado, sair e entrar de novo → último workspace, sem erros no console

**Bugs encontrados e corrigidos no teste de 24/09/2026:**
- [x] Abrir o switcher mudava o "último workspace": em produção o Next faz prefetch de todos os workspaces da lista e o middleware gravava cada um como visitado. Agora o cookie é gravado no navegador pelo workspace exibido, e os links do switcher não fazem prefetch (evita renderizar o layout de todos os workspaces a cada abertura)
- [x] Voltar/avançar do navegador não atualizava o "último workspace" (a página vinha do cache do router, sem passar pelo middleware) — resolvido pela mesma mudança
- [x] Workspace com nome começando por emoji mostrava um caractere quebrado no ícone do switcher (`charAt(0)` corta o emoji ao meio); `firstChar()` em `lib/utils.ts`, usado também em `initials()`
- [x] Workspaces com o mesmo nome ficavam indistinguíveis no switcher; agora mostram o slug embaixo do nome

**Pronto quando:** um usuário cria dois workspaces e alterna entre eles; um segundo usuário não consegue ler nada de workspaces dos quais não é membro, nem acessando pelo slug nem consultando o banco direto.

---

## 3. Leads ✅

Branch: `feat/m3-leads`

- [x] Migration `20260924220000_leads.sql`: enum `lead_status` (`new`, `contacted`, `qualified`, `unqualified`, `customer` → Novo, Em contato, Qualificado, Desqualificado, Cliente) e tabela `leads` + índices por workspace; RLS (membros fazem CRUD; responsável precisa ser membro do mesmo workspace via `is_user_in_workspace()`); grants por coluna (`workspace_id` não muda depois de criado; `created_by` vem de `auth.uid()`). Aplicada no remoto; tipos regenerados
- [x] Server Actions `createLead` / `updateLead` / `deleteLead` (`src/actions/leads.ts`) com o mesmo schema Zod do formulário (`src/lib/validations/lead.ts`); e-mail normalizado em minúsculas
- [x] Listagem em tabela com busca (nome, e-mail, empresa) e filtros (status, responsável — incluindo "sem responsável" —, data de criação em dias de São Paulo) na query string (`src/lib/leads.ts`)
- [x] Paginação (20 por página, "Mostrando 21–40 de 57"; página além do fim volta para a 1)
- [x] Formulário de lead em dialog (react-hook-form + Zod), usado para criar e editar; responsável padrão = usuário logado
- [x] Página de detalhe `/leads/[leadId]` com contato (mailto/tel), status, responsável e datas; editar e excluir (com confirmação); área de atividades reservada para o milestone 5
- [x] Estados vazios (sem leads / sem resultado no filtro), `loading.tsx` com skeleton e "Lead não encontrado" dentro do app
- [ ] Limite de 50 leads no plano Free → fica para o milestone 8 (`lib/plans.ts`)

**Leads de exemplo, busca sem acento e histórico (28/09/2026):**
- [x] Botão "Carregar leads de exemplo" no estado vazio: 12 leads brasileiros fictícios (`src/lib/sample-leads.ts`) com status variados, gravados no banco pela Server Action `createSampleLeads` — só num workspace sem leads (clique duplo não duplica)
- [x] Busca sem diferenciar acentos nem maiúsculas ("joao" acha "João", "clinica" acha "Clínica"): migration `20260928120000_leads_search.sql` com coluna gerada `search_text` (`unaccent` + `lower` de nome, e-mail e empresa) e índice trigram
- [x] Histórico visual no detalhe do lead (`LeadTimeline`): lead cadastrado, negócios criados (etapa e valor) e última edição, com autor e data/hora de São Paulo, do mais novo para o mais antigo. Ligações, e-mails, reuniões e notas entram nele no milestone 5
- [x] Verificação: busca de ponta a ponta sem acento em transação com rollback antes do `db push`; Playwright + Edge no build de produção (45 checagens novas: exemplos, cores dos badges, busca por nome/empresa com e sem acento, curingas, filtros de status e responsável combinados, validação do formulário ao criar e editar, excluir, detalhe e histórico, mobile, tema claro, sem erros no console) + as 54 checagens do M3 de novo

**Verificação (24/09/2026):**
- [x] `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erros
- [x] Migration + RLS testadas em transação com rollback antes do `db push` (11 checagens: membro cria/edita/exclui; não insere em outro workspace; responsável de fora rejeitado; não lê/edita/exclui lead alheio; `workspace_id` imutável; nome em branco rejeitado; anônimo bloqueado)
- [x] Ponta a ponta no navegador (Playwright + Edge, build de produção, 54 checagens, usuários de teste apagados depois): estado vazio, validação do formulário, criar/editar/excluir, busca por nome/e-mail/empresa e com caracteres especiais, cada filtro e combinações, paginação mantendo filtros, parâmetros inválidos ignorados, lead de outro workspace/excluído/id inválido → "Lead não encontrado" sem vazar dados, mobile sem rolagem horizontal, sem erros no console

**Pronto quando:** dá para cadastrar, buscar, filtrar, editar e excluir leads, e os leads de um workspace não aparecem em outro.

---

## 4. Pipeline Kanban ✅

Branch: `feat/m4-pipeline`

- [x] Migration `20260925180000_deals.sql`: enum `deal_stage` e tabela `deals` (title, value_cents `bigint` em centavos, lead_id, owner_id, due_date `date`, stage, position) + índices; RLS (membros fazem CRUD; responsável precisa ser membro); lead garantido no mesmo workspace por FK composta `(lead_id, workspace_id)` — excluir o lead mantém o negócio, só desvincula. Aplicada no remoto; tipos regenerados
- [x] `stage`/`position` só mudam pela RPC `move_deal()` (sem grant de update direto): renumera a coluna de origem e a de destino numa transação, com lock por workspace contra movimentos simultâneos; novos negócios entram no fim da coluna (trigger)
- [x] Helpers `formatCurrency` (centavos → BRL) e `formatDate` em `src/lib/utils.ts` (feito no esqueleto visual); novos `formatDay`, `todaySaoPaulo`, `daysBetween`, `parseMoneyToCents`, `formatMoneyInput`
- [x] Board com 6 colunas (Novo Lead → Fechado Ganho/Perdido), com a cor de cada etapa, quantidade e total em R$ por coluna
- [x] Card: título, valor, lead, responsável (avatar), prazo (âmbar se vence em até 3 dias, vermelho se vencido; sem cor em negócios fechados)
- [x] Drag-and-drop com @dnd-kit entre colunas e dentro da coluna — mouse, toque (segurar para arrastar, deslizar continua rolando o board) e teclado (espaço + setas; Enter abre o card), com anúncios em pt-BR para leitores de tela
- [x] Persistência de `stage` + `position` via Server Action `moveDeal`, com atualização otimista e reversão (+ aviso) em caso de erro
- [x] Criar/editar/excluir negócio em dialog (valor digitado como "1.500,00"); clicar no card abre a edição; "Adicionar" em cada coluna já escolhe a etapa; mudar a etapa pelo formulário leva o card para o fim da coluna
- [x] Seção "Negócios" no detalhe do lead, com "Novo negócio" já vinculado ao lead
- [x] Dashboard: "Negócios abertos" e "Valor do pipeline" com dados reais (o resto das métricas é o milestone 6)
- [x] Rolagem horizontal no mobile (verificada em 390px: o board rola dentro do container, a página não)

**Verificação (25/09/2026):**
- [x] `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erros
- [x] Migration + RLS testadas em transação com rollback antes do `db push` (13 checagens: posições do trigger, `created_by`, não insere em outro workspace, lead de outro workspace rejeitado pela FK, responsável de fora rejeitado, `stage`/`position`/`workspace_id` sem update direto, `move_deal` reordena para cima/baixo e entre colunas com índice fora do intervalo, não move negócio alheio, excluir lead desvincula, valor negativo rejeitado, anônimo bloqueado)
- [x] Ponta a ponta no navegador (Playwright + Edge, build de produção, 47 checagens, usuários de teste apagados depois): estado vazio, validação, criar/editar/excluir, cores de prazo, reordenar e mover entre colunas **persistindo após recarregar**, posições no banco sem buracos, teclado, **falha de rede e negócio excluído por outra pessoa devolvem/removem o card com aviso**, seção no lead, lead excluído mantém o negócio, números do dashboard, isolamento entre workspaces, mobile, tema claro, sem erros no console

**Pronto quando:** mover um card persiste após recarregar a página, e um erro no servidor devolve o card à posição original. ✅

---

## 5. Atividades ✅

Branch: `feat/m5-atividades`

- [x] Migration `20260928150000_activities.sql`: enum `activity_type` (`call`, `email`, `meeting`, `note`) e tabela `activities` (lead_id, author_id, type, description, occurred_at) + RLS; lead garantido no mesmo workspace por FK composta (excluir o lead apaga o histórico dele); `author_id` sempre `auth.uid()` (sem grant de insert/update); qualquer membro registra, só o autor ou um admin edita/exclui. Aplicada no remoto; tipos regenerados
- [x] Formulário de nova atividade no detalhe do lead: tipo (Ligação/E-mail/Reunião/Nota, com dica de texto por tipo), descrição (até 2000 caracteres, quebras de linha mantidas), data e hora de São Paulo — se o campo não for alterado, vale a hora em que se clica em "Registrar"
- [x] Timeline cronológica com ícone e cor por tipo, autor e data/hora (`LeadTimeline`, junto com cadastro do lead, negócios e edição); atividade com data futura aparece como "Agendada"
- [x] Editar e excluir (apenas o autor ou um admin) pelo menu "⋯" de cada atividade; o servidor distingue "atividade excluída" de "sem permissão"
- [x] Tipos, rótulos, ícones e cores em `src/lib/activity-types.ts`; schema Zod compartilhado em `src/lib/validations/activity.ts`

**Verificação (28/09/2026):**
- [x] `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erros
- [x] Migration + RLS testadas em transação com rollback antes do `db push` (14 checagens: autor = usuário logado, não insere em outro workspace, lead de outro workspace rejeitado, `author_id` e `lead_id` sem escrita, descrição em branco rejeitada, autor edita a própria, outro membro lê mas não edita/exclui, outro workspace não vê nada, admin edita/exclui a de outro sem mudar o autor, excluir lead apaga o histórico, anônimo bloqueado)
- [x] Ponta a ponta no navegador (Playwright + Edge, build de produção, 25 checagens, 2 usuários, apagados depois): validações, registrar os 4 tipos, ordem cronológica com passado e futuro ("Agendada"), página aberta há 40 min grava a hora do clique, editar, permissões de membro × admin na interface, admin exclui atividade de membro, excluir lead apaga o histórico, mobile, tema claro, sem erros no console. Suites anteriores de novo: leads (45) e pipeline (47)

**Pronto quando:** as atividades aparecem na timeline do lead em ordem cronológica, com o autor correto. ✅

---

## 6. Dashboard ✅

Branch: `feat/leads-data` (aula 3.4 — Leads & Pipeline com dados reais, 29/09/2026)

Leads, negócios, busca, filtros e drag-and-drop já liam e gravavam no Supabase (milestones 3 e 4); o que ainda era placeholder era o dashboard (conversão "—" e um aviso no lugar do funil e dos prazos).

- [x] Cards: total de leads, negócios abertos, valor do pipeline e taxa de conversão (ganhos ÷ fechados, com "X ganhos de Y fechados"; "—" enquanto nenhum negócio foi fechado)
- [x] Gráfico de funil por etapa com Recharts (`StageFunnelChart`): barras horizontais na ordem do board, uma cor só (primária) — a paleta das etapas reprovou no validador de cores como paleta categórica, e o nome no eixo já identifica cada barra; quantidade em cada barra (etapa vazia mostra "0"), valor em R$ no tooltip, tabela para leitor de tela
- [x] Lista "Meus negócios com prazo próximo" (`UpcomingDealsList`): negócios abertos do usuário logado, vencidos ou vencendo em até 7 dias, do mais urgente ao menos; prazo com as cores do Kanban
- [x] Consultas agregadas no servidor: migration `20260929180000_dashboard_metrics.sql` com a função `deal_stage_totals()` (`SECURITY INVOKER`, o RLS dos negócios continua valendo; soma por etapa no banco em vez de carregar todos os negócios). Substitui `openPipelineSummary()`. Aplicada no remoto; tipos regenerados
- [x] Estado vazio do dashboard com CTA "Ir para o pipeline"; `addDays()` em `lib/utils.ts`

**Verificação (29/09/2026):**
- [x] `deal_stage_totals` testada em transação com rollback antes do `db push` (5 checagens: contagens e somas por etapa, outro workspace recebe vazio, anônimo sem acesso)
- [x] `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erros
- [x] Ponta a ponta no navegador (Playwright + Edge, build de produção, 36 checagens, usuário e workspace de teste apagados depois): lead criado pelo formulário persiste após recarregar e está no banco (e-mail minúsculo, responsável e autor); busca sem acento e filtros de status/responsável conferidos contra contagens do banco e leads inseridos direto no banco aparecem na lista; negócio criado pelo formulário persiste (centavos, prazo); dashboard = banco (leads, abertos, valor, conversão, quantidade e valor por etapa); prazos próximos (vencido primeiro, fora de 7 dias / fechado / de outra pessoa ficam de fora); tooltip; **arrastar para outra coluna persiste após recarregar e grava `stage`/`position` sem buracos no banco**; dashboard acompanha os arrastes (conversão 50% → 66,7%); tema claro e escuro; mobile 390px sem rolagem horizontal; sem erros no console
- [x] Revisão visual das capturas: etapa vazia sem barra nem número (corrigido: toco mínimo + "0") e títulos cortados na lista de prazos (corrigido: duas linhas)

**Pronto quando:** os números batem com os dados cadastrados e mudam ao mover negócios no pipeline. ✅

---

## 7. Colaboração e permissões ✅

Branch: `feat/collaboration` (aula 3.5 — Workspace & Colaboração, 29/09/2026)

- [x] Migration `20260929200000_collaboration.sql`: `workspace_invites` (email normalizado, role, **`token_hash`** SHA-256 — o token só existe no link —, invited_by, expires_at de 7 dias, accepted_at/by; um convite aberto por e-mail) + RLS (admins leem e cancelam; ninguém lê o hash; insert só pela RPC). Aplicada no remoto; tipos regenerados
- [x] RPCs: `create_workspace_invite()` (só admin; recusa quem já é membro; limite do plano contando convites abertos; convidar de novo troca o token), `get_invite_preview()` (pública, o token é a permissão), `accept_workspace_invite()` (só o e-mail convidado; vencido/usado/cancelado com erro próprio; aceitar duas vezes não quebra), `list_workspace_members()` (nome + e-mail, só admin)
- [x] Triggers em `workspace_members`: limite do plano Free (2 membros, mesmo fora do fluxo de convite), último admin não sai nem é rebaixado (mas excluir o workspace ou o usuário continua funcionando), membro removido → leads e negócios dele ficam sem responsável
- [x] Convite por e-mail com Resend (`lib/resend.ts`, API via fetch, HTML + texto em pt-BR). Se o e-mail não sai (ex.: domínio ainda não verificado), o convite fica criado e o admin vê o link para copiar
- [x] Página `/invite/[token]` (pública): anônimo → "Criar conta e aceitar" (cadastro com e-mail preenchido e `next` passando pela confirmação) ou "Já tenho conta — entrar" (volta ao convite); logado com o e-mail certo → "Aceitar convite" → dashboard do workspace; conta errada → aviso + "Sair e entrar com outra conta"; vencido / usado / cancelado → mensagem
- [x] Configurações → membros (só admin): lista com e-mail e papel editável, remover com confirmação, convites pendentes (Reenviar / Cancelar), formulário de convite e card do plano ("1 de 2 vagas usadas" + upgrade em breve)
- [x] Permissões: membro não vê "Configurações" na navegação e a página mostra "Acesso restrito" (UI + servidor + RLS)
- [x] `src/lib/plans.ts` com `PLAN_LIMITS` (Free: 2 membros, 50 leads; Pro: ilimitado) — adianta parte do milestone 8

**Verificação (29/09/2026):**
- [x] Migration testada em transação com rollback antes do `db push` (38 checagens: e-mail normalizado, convite substituído, limite com convite aberto, já membro, token curto, hash ilegível, insert direto bloqueado, outro workspace isolado, prévia anônima, token antigo inválido, anônimo não aceita/lê, e-mail errado, token inexistente, aceite + idempotência, membro não convida/remove/promove, trigger do limite, Pro sem limite, vencido, usado, último admin, promover/rebaixar, `workspace_id` imutável, remoção desfaz responsáveis, cascatas de workspace e usuário)
- [x] Advisors: só avisos esperados (RPCs chamadas pelo app; `get_invite_preview` pública por design)
- [x] `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erros
- [x] Ponta a ponta no navegador (Playwright + Edge, build de produção, 41 checagens, 3 usuários de teste, apagados depois): convidar → link para copiar (domínio pendente) → banco com hash e 7 dias; Free cheio bloqueia o formulário; anônimo abre o convite → login → volta ao convite → aceita → dashboard; membro sem "Configurações" e com acesso restrito; banco: `workspace_members` + `accepted_at/by`; link usado; admin vê o membro, promove/rebaixa, não rebaixa o último admin; remove membro (lead/negócio sem responsável, 404 para o removido); conta errada; cancelar convite; mobile; **envio real pelo Resend para o dono da conta: "delivered" no Resend**
- [x] Revisão visual: linha do membro espremida no celular (corrigido)
- [ ] Domínio próprio para e-mail: o `pipeflow.com.br` foi cadastrado no Resend mas não é do projeto (registrado em 2021, DNS na Postali) — a verificação falhou e ele foi removido do Resend (29/09/2026). Sem domínio, o app usa o remetente de teste do Resend: só o dono da conta recebe; os demais convites saem pelo link copiado. Com um domínio próprio: verificar no Resend e definir `RESEND_FROM` (também resolve o SMTP do Supabase)
- [x] `RESEND_API_KEY` na Vercel (Production, sensível) + redeploy (30/09/2026). Verificado em produção: convite para o dono da conta Resend enviado por e-mail
- [ ] Trocar a chave do Resend (foi colada no chat): criar nova em resend.com/api-keys, atualizar `.env.local` e a Vercel, apagar a antiga

**Pronto quando:** um admin convida um e-mail, a pessoa aceita e entra no workspace como membro, sem acesso às configurações. ✅

---

## 8. Monetização (Stripe) 🚧

- [x] `src/lib/plans.ts` com os limites (Free: 2 colaboradores, 50 leads; Pro: ilimitado, R$ 49/mês) — feito no milestone 7
- [x] Checagem dos limites no servidor: `canAddLead()` / `canAddMember()` em `src/lib/limits.ts`. Lead: `createLead` e "Carregar leads de exemplo" recusam acima do limite. Membro: o banco continua sendo a checagem do convite (atômica; `canAddMember()` antes da RPC bloquearia o reenvio de um convite aberto com o plano cheio) e `canAddMember()` alimenta a UI
- [x] Aviso + CTA de upgrade na UI: leads (alerta âmbar, "Novo lead" desabilitado; membro vê "peça a um admin") e card de convites → `/settings/billing`
- [x] Produto e preço no Stripe (modo de teste) + chaves no `.env.local` (30/09/2026): **sandbox** criada pelo Stripe CLI (`stripe sandbox create`, conta `acct_1ULLSaEmGsexno0d`, e-mail do Git) — produto "PipeFlow Pro" `prod_VM7TxgvhLqi0dc`, preço R$ 49/mês `price_1ULPEeEmGsexno0dTFvtnXN2`, Customer Portal `bpc_1ULPF3EmGsexno0diucsZVkX` (cartão, faturas, cancelar no fim do período)
- [ ] **Reivindicar a sandbox até 07/10/2026** (senão ela expira): `stripe sandbox claim` ou o link de claim — ou trocar pelas chaves de teste da conta Stripe definitiva (refazer produto/preço/portal). A chave `rkcs_test_` da sandbox apareceu no log da sessão: trocar ao reivindicar
- [x] Server Action `createCheckoutSession` (só admin; metadata `workspace_id` + `user_id` na sessão e na assinatura; reaproveita o customer do workspace; `success_url`/`cancel_url` → billing)
- [x] Webhook `/api/webhooks/stripe` (Route Handler, `runtime = nodejs`): body cru via `request.text()`, `constructEvent` com `STRIPE_WEBHOOK_SECRET`; `checkout.session.completed` → Pro, `customer.subscription.deleted` → Free, `invoice.payment_failed` → `past_due` (continua Pro enquanto o Stripe tenta de novo). Cada evento busca a assinatura atual no Stripe e grava `subscriptions` + `workspaces.plan`/`stripe_*` com a chave secreta (ordem/duplicidade de eventos não importam). 400 assinatura inválida, 500 falha (Stripe reenvia), 200 `{ received: true }`
- [x] `customer.subscription.created/updated` (aula 4.1): cancelamento agendado no Portal ("Pro até dd/MM/yyyy"), reativação, pagamento que confirma depois do checkout (`incomplete` → `active` → Pro) e `unpaid` depois das tentativas (→ Free, com aviso e só o Portal para regularizar)
- [x] Checkout não abre uma segunda assinatura (aula 4.1): antes de criar a sessão, pergunta ao Stripe se o customer do workspace já tem assinatura viva (clique duplo ou dois admins antes de o webhook chegar). Ainda possível: dois checkouts no **primeiro** upgrade, antes de existir customer, se a pessoa pagar os dois
- [x] Revisão (aula 4.1): tipos, lint e build; webhook no build de produção (os 9 casos acima + `subscription.updated`); billing anônimo → `/login?next=`; segredos fora do bundle do browser e das envs `NEXT_PUBLIC_`; `.env.local` no `.gitignore`
- [x] Botão "Gerenciar assinatura" → Server Action `createPortalSession` (Customer Portal)
- [x] Página `/settings/billing` (aba "Cobrança" em Configurações, layout compartilhado com a checagem de admin): plano atual, uso de leads e vagas, Free × Pro, "Assinar Pro", avisos de retorno do checkout, pagamento pendente e cancelamento agendado
- [x] Verificado (aula 4.2): `tsc`, lint e build; webhook no build de produção com segredo de teste — sem assinatura / assinatura falsa / outro segredo / body alterado → 400; evento válido não tratado, checkout `mode=payment` e fatura avulsa → 200; checkout de assinatura com chave inválida → 500. Nenhum segredo no bundle do browser
- [x] Stripe CLI 1.52.1 instalado (winget). O `stripe listen` dessa versão exige `--events` (comando completo no CLAUDE.md e no `.env.example`)
- [x] Ponta a ponta (30/09/2026; Playwright + Edge, build de produção, `stripe listen`, 25 checagens + falha de pagamento, usuários de teste apagados): Free com 50 leads → aviso + "Novo lead" desabilitado; billing com uso; "Assinar Pro" → checkout.stripe.com com R$ 49 → cartão 4242 → volta com `?checkout=success`; webhook → Pro no banco (subscriptions `active`, preço Pro, customer, metadata `workspace_id`/`user_id`); "Assinatura confirmada!", leads ilimitados, sem aviso; "Gerenciar assinatura" → billing.stripe.com; cancelar no fim do período → continua Pro + aviso "Pro até 30/10/2026"; reativar; cancelar → Free, `canceled`, leads mantidos, "Assinar Pro" de volta; celular sem rolagem horizontal; sem erros de JS. Cartão sempre recusado (`pm_card_chargeCustomerFail`) → `invoice.payment_failed` grava `incomplete` e o workspace fica Free. Todos os eventos → 200; evento de workspace apagado → ignorado com 200
- [x] Revisão visual: "1 vagas · ilimitado" → singular/plural no medidor de uso
- [ ] Conta definitiva / produção: configurar o Customer Portal (na sandbox foi criado via API), senão "Gerenciar assinatura" falha
- [ ] Produção: endpoint do webhook no painel do Stripe (eventos listados no `.env.example`) + envs na Vercel

**Pronto quando:** no modo de teste do Stripe, o upgrade libera os limites e o cancelamento volta o workspace para Free automaticamente.

---

## 9. Landing page ⬜

- [ ] Hero com proposta de valor e CTA
- [ ] Funcionalidades (leads, Kanban, atividades, dashboard, multiempresa)
- [ ] Planos e preços (Free × Pro)
- [ ] CTA final + rodapé
- [ ] SEO básico (metadata, Open Graph) e responsividade

**Pronto quando:** a landing funciona do celular ao desktop e os CTAs levam ao cadastro.

---

## 10. API pública, onboarding e polimento ⬜

- [ ] Chaves de API por workspace (criar/revogar em Configurações, armazenadas com hash)
- [ ] Endpoints `/api/v1` para leads e negócios (listar, criar, atualizar), autenticados por chave
- [ ] Onboarding guiado: checklist (criar lead, criar negócio, convidar colaborador)
- [x] Toggle de modo escuro (feito no esqueleto visual)
- [ ] Revisão de acessibilidade, estados vazios, carregamento e erros
- [ ] Deploy na Vercel + Supabase em produção

**Pronto quando:** um cliente externo cria um lead via API e ele aparece no app; o app está publicado em produção.
