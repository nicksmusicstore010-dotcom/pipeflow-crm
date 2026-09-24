# Plano de implementação — PipeFlow CRM

Roteiro de construção em milestones, derivado do [PRD](PRD.md). Cada milestone é um incremento entregável: só avançamos depois de verificar o anterior.

**Legenda:** ✅ concluído · 🚧 em andamento · ⬜ não iniciado

| # | Milestone | Status |
| --- | --- | --- |
| 1 | Fundação | ✅ |
| 2 | Workspaces (multiempresa) | ✅ |
| 3 | Leads | ⬜ |
| 4 | Pipeline Kanban | ⬜ (base visual pronta) |
| 5 | Atividades | ⬜ |
| 6 | Dashboard | ⬜ |
| 7 | Colaboração e permissões | ⬜ |
| 8 | Monetização (Stripe) | ⬜ |
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

## 3. Leads ⬜

- [ ] Migration: `leads` (name, email, phone, company, position, status, owner_id, workspace_id) + RLS + índices
- [ ] Server Actions: criar, editar e excluir lead, com validação Zod
- [ ] Listagem em tabela com busca (nome, e-mail, empresa) e filtros (status, responsável, data de criação) via query string
- [ ] Paginação
- [ ] Formulário de lead em dialog (react-hook-form + Zod)
- [ ] Página de detalhe `/leads/[leadId]` com o perfil (a timeline chega no milestone 5)
- [ ] Estados vazios e de carregamento

**Pronto quando:** dá para cadastrar, buscar, filtrar, editar e excluir leads, e os leads de um workspace não aparecem em outro.

---

## 4. Pipeline Kanban ⬜

- [ ] Migration: enum `deal_stage` e tabela `deals` (title, value_cents, lead_id, owner_id, due_date, stage, position) + RLS
- [x] Helpers `formatCurrency` (centavos → BRL) e `formatDate` em `src/lib/utils.ts` (feito no esqueleto visual)
- [x] Board com 6 colunas (Novo Lead → Fechado Ganho/Perdido), com a cor de cada etapa — `KanbanColumn` + `lib/deal-stages.ts` (colunas vazias; os cards chegam com os negócios)
- [ ] Card: título, valor, lead, responsável (avatar), prazo (âmbar se próximo, vermelho se vencido)
- [ ] Drag-and-drop com @dnd-kit entre colunas e dentro da coluna
- [ ] Persistência de `stage` + `position` via Server Action, com atualização otimista e reversão em caso de erro
- [ ] Criar/editar negócio em dialog; total de valor por coluna
- [x] Rolagem horizontal no mobile (verificada em 390px: o board rola dentro do container, a página não)

**Pronto quando:** mover um card persiste após recarregar a página, e um erro no servidor devolve o card à posição original.

---

## 5. Atividades ⬜

- [ ] Migration: enum `activity_type` (`call`, `email`, `meeting`, `note`) e tabela `activities` + RLS
- [ ] Formulário de nova atividade no detalhe do lead (tipo, descrição, data)
- [ ] Timeline cronológica com ícone por tipo, autor e data
- [ ] Editar e excluir (apenas o autor ou um admin)

**Pronto quando:** as atividades aparecem na timeline do lead em ordem cronológica, com o autor correto.

---

## 6. Dashboard ⬜

- [ ] Cards: total de leads, negócios abertos, valor total do pipeline, taxa de conversão (ganhos ÷ fechados) — componente `StatCard` pronto, já no Dashboard com valores zerados; falta ligar aos dados
- [ ] Gráfico de funil por etapa com Recharts
- [ ] Lista "Meus negócios com prazo próximo" (usuário logado, próximos 7 dias + vencidos)
- [ ] Consultas agregadas no servidor (views ou funções SQL se necessário)

**Pronto quando:** os números batem com os dados cadastrados e mudam ao mover negócios no pipeline.

---

## 7. Colaboração e permissões ⬜

- [ ] Migration: `workspace_invites` (email, role, token, expires_at, accepted_at) + RLS
- [ ] Tela de membros em Configurações: listar, alterar papel, remover (só admin)
- [ ] Convite por e-mail com Resend (template em pt-BR com link `/invite/[token]`)
- [ ] Aceitar convite: com conta existente ou criando uma nova
- [ ] Permissões: membro sem acesso a Configurações/Billing (UI + servidor + RLS)

**Pronto quando:** um admin convida um e-mail, a pessoa aceita e entra no workspace como membro, sem acesso às configurações.

---

## 8. Monetização (Stripe) ⬜

- [ ] `src/lib/plans.ts` com os limites (Free: 2 colaboradores, 50 leads; Pro: ilimitado, R$ 49/mês)
- [ ] Checagem dos limites no servidor ao criar lead e convidar membro; aviso + CTA de upgrade na UI
- [ ] Produto e preço no Stripe; Server Action que cria a sessão do Stripe Checkout
- [ ] Webhook `/api/webhooks/stripe` (assinatura verificada): `checkout.session.completed`, `customer.subscription.updated/deleted` → atualiza `workspaces.plan`
- [ ] Botão para o Customer Portal (gerenciar/cancelar)
- [ ] Página de Billing em Configurações com o plano atual e o uso

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
