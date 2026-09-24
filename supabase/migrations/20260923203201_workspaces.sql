-- Milestone 2: multi-tenant foundation.
-- profiles (mirrors auth.users), workspaces, workspace_members, RLS helpers
-- and create_workspace(), the only way clients create a workspace.

create type public.workspace_role as enum ('admin', 'member');
create type public.workspace_plan as enum ('free', 'pro');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users who signed up before this migration.
insert into public.profiles (id, full_name, avatar_url)
select id, raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- workspaces + members
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  slug text not null unique check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48
  ),
  plan public.workspace_plan not null default 'free',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);

-- ---------------------------------------------------------------------------
-- RLS helpers. SECURITY DEFINER so policies on workspace_members can call them
-- without recursing into their own RLS.
-- ---------------------------------------------------------------------------

create function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = (select auth.uid())
  );
$$;

create function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

-- True when the current user and p_user_id belong to a common workspace.
create function public.shares_workspace_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Privileges + RLS
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.workspaces, public.workspace_members from anon, authenticated;
grant all on public.profiles, public.workspaces, public.workspace_members to service_role;

grant select on public.profiles, public.workspaces, public.workspace_members to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
-- plan and stripe_* only change through the Stripe webhook (service role).
grant update (name, slug) on public.workspaces to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create policy "profiles: read self and teammates"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));

create policy "profiles: update self"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "workspaces: members read"
  on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));

create policy "workspaces: admins update"
  on public.workspaces for update to authenticated
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

create policy "workspace_members: members read"
  on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- create_workspace: inserts the workspace and makes the caller its admin in one
-- transaction. Slugs are global, so a taken slug gets a short random suffix.
-- ---------------------------------------------------------------------------

create function public.create_workspace(p_name text, p_slug text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_slug text := p_slug;
  v_workspace public.workspaces;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  while exists (select 1 from public.workspaces where slug = v_slug) loop
    v_slug := rtrim(left(p_slug, 43), '-') || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.workspaces (name, slug, created_by)
  values (trim(p_name), v_slug, v_user_id)
  returning * into v_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace.id, v_user_id, 'admin');

  return v_workspace;
end;
$$;

revoke execute on function public.create_workspace(text, text) from public, anon;
grant execute on function public.create_workspace(text, text) to authenticated;
