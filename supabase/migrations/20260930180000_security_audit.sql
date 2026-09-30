-- Security audit before deploy (aula 5.1).
--
-- Found by calling the Supabase API directly with a signed-in user's JWT:
--   1. Workspace slugs could shadow the app's own routes ("login", "app", "api"...):
--      create_workspace() and the admins' update grant took any slug that matched the
--      format. The app never sends one (workspaceSlugFor), the database now refuses too.
--   2. Deals and activities had no volume limit: a single Free account inserted
--      501 activities (~1 MB) in one request. Enough of that fills the database
--      for every customer. Per-user rate limit on inserts, like invites/workspaces.

-- ---------------------------------------------------------------------------
-- 1. Reserved slugs. Keep in sync with RESERVED_SLUGS in src/lib/workspace-slug.ts.
-- ---------------------------------------------------------------------------

alter table public.workspaces
  add constraint workspaces_slug_not_reserved check (
    slug <> all (array[
      'admin', 'api', 'app', 'auth', 'dashboard', 'invite', 'leads', 'login', 'logout',
      'onboarding', 'pipeline', 'pricing', 'settings', 'signup', 'workspaces'
    ])
  );

-- ---------------------------------------------------------------------------
-- 2. Insert rate limit on deals and activities: 300 per hour per user (a busy
--    salesperson logs a few dozen). Rows from the service role (webhooks, jobs,
--    future API keys) have no auth.uid() and are not limited. A rejected batch
--    rolls back its own hits, so it doesn't eat the quota.
-- ---------------------------------------------------------------------------

create function public.rate_limit_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    -- tg_argv: action name, max per window, window.
    perform private.hit_rate_limit(tg_argv[0], tg_argv[1]::integer, tg_argv[2]::interval);
  end if;
  return new;
end;
$$;

revoke execute on function public.rate_limit_insert() from public, anon, authenticated;

create trigger deals_rate_limit
  before insert on public.deals
  for each row execute function public.rate_limit_insert('create_deal', '300', '1 hour');

create trigger activities_rate_limit
  before insert on public.activities
  for each row execute function public.rate_limit_insert('create_activity', '300', '1 hour');
