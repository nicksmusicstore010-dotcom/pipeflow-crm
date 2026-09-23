# PipeFlow CRM

CRM SaaS multiempresa com pipeline Kanban, gestão de leads e dashboard de vendas.

- PRD: [docs/PRD.md](docs/PRD.md)
- Convenções e arquitetura: [CLAUDE.md](CLAUDE.md)

## Rodando localmente

1. Instale as dependências: `npm install`
2. Copie `.env.example` para `.env.local` e preencha com os dados do seu projeto Supabase (Project Settings > API).
3. No Supabase, em Authentication > URL Configuration, adicione `http://localhost:3000/auth/callback` às Redirect URLs.
4. Rode `npm run dev` e abra http://localhost:3000.
