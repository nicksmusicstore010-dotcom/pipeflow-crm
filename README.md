# PipeFlow CRM

CRM SaaS multiempresa com pipeline Kanban, gestão de leads e dashboard de vendas.

- PRD: [docs/PRD.md](docs/PRD.md)
- Convenções e arquitetura: [CLAUDE.md](CLAUDE.md)

## Rodando localmente

1. Instale as dependências: `npm install`
2. Copie `.env.example` para `.env.local` e preencha com os dados do seu projeto Supabase (Project Settings > API).
3. No Supabase, em Authentication > URL Configuration, adicione `http://localhost:3000/auth/callback` às Redirect URLs.
4. Rode `npm run dev` e abra http://localhost:3000.

## Chaves do Supabase

| Variável | Onde pegar | Onde é usada |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings > API | navegador e servidor |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings > API Keys > Publishable key | navegador e servidor (sempre sujeita ao RLS) |
| `SUPABASE_SECRET_KEY` | Project Settings > API Keys > Secret keys | **só no servidor**, via `createAdminClient()` de `src/lib/supabase/admin.ts` |

A chave secreta ignora o RLS: use-a apenas em webhooks e jobs sem usuário logado, sempre filtrando por `workspace_id`. Nunca a prefixe com `NEXT_PUBLIC_`. O `admin.ts` importa `server-only`, então importá-lo em um componente de cliente quebra o build. Em produção, cadastre a mesma variável na Vercel (Settings > Environment Variables).

Para conferir as chaves do `.env.local` (sem imprimi-las): `npm run check:keys`.
