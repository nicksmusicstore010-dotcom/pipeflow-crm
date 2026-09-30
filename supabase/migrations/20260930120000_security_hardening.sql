-- Security hardening (post milestone 8 audit).
--
-- Anyone signed in can call the Supabase API directly with the publishable key
-- and their own JWT, skipping the Server Actions. So every business rule the
-- app relies on must also hold in the database:
--   1. Free plan lead limit (was only checked in the app).
--   2. Size/format limits on profiles (was unbounded text, shown to teammates).
--   3. Rate limits on invites (they send e-mail) and on workspace creation.

-- ---------------------------------------------------------------------------
-- 1. Lead limit. Mirrors PLAN_LIMITS in src/lib/plans.ts (like plan_member_limit()).
-- ---------------------------------------------------------------------------

create function public.plan_lead_limit(p_plan public.workspace_plan)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan when 'free' then 50 else null end;
$$;

create function public.enforce_lead_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  -- Row lock: concurrent inserts in the same workspace are counted one at a time.
  -- Rows inserted earlier in the same statement are visible, so a batch insert
  -- (e.g. the sample leads) can't overshoot either.
  select public.plan_lead_limit(plan) into v_limit
  from public.workspaces where id = new.workspace_id
  for update;

  if v_limit is not null
    and (select count(*) from public.leads where workspace_id = new.workspace_id) >= v_limit then
    raise exception 'plan_limit' using errcode = 'P0001', hint = 'The workspace plan lead limit was reached.';
  end if;
  return new;
end;
$$;

create trigger leads_enforce_limit
  before insert on public.leads
  for each row execute function public.enforce_lead_limit();

revoke execute on function public.enforce_lead_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Profiles: bounded name, avatar only as an https URL. The signup trigger
-- sanitizes instead of failing, so a long name sent straight to the Auth API
-- can't block the signup; a direct profile update past the limit is rejected.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add constraint profiles_full_name_length check (char_length(full_name) <= 100),
  add constraint profiles_avatar_url_https check (
    avatar_url is null or (avatar_url ~ '^https://[^\s]+$' and char_length(avatar_url) <= 2048)
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 100), '');
  v_avatar text := new.raw_user_meta_data ->> 'avatar_url';
begin
  if v_avatar is not null and (v_avatar !~ '^https://[^\s]+$' or char_length(v_avatar) > 2048) then
    v_avatar := null;
  end if;

  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, v_name, v_avatar);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Rate limits. Events live in a schema the Data API doesn't expose; only
-- the security definer functions below write to it.
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_lookup_idx on private.rate_limit_events (user_id, action, created_at desc);

-- Records one `action` by the current user, or raises 'rate_limited' when they
-- already did it `p_max` times within `p_window`. Old events are pruned as it goes.
create function private.hit_rate_limit(p_action text, p_max integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- Serialize this user's hits for this action (no race past the limit).
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_action, 0));

  delete from private.rate_limit_events
  where user_id = v_user_id and action = p_action and created_at < now() - interval '1 day';

  if (select count(*) from private.rate_limit_events
      where user_id = v_user_id and action = p_action and created_at > now() - p_window) >= p_max then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'Too many requests. Try again later.';
  end if;

  insert into private.rate_limit_events (user_id, action) values (v_user_id, p_action);
end;
$$;

revoke execute on function private.hit_rate_limit(text, integer, interval) from public, anon, authenticated;

-- Invites send e-mail: at most 20 per hour per user (re-sends included).
create or replace function public.create_workspace_invite(
  p_workspace_id uuid,
  p_email text,
  p_role public.workspace_role,
  p_token text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_limit integer;
  v_id uuid;
begin
  if (select auth.uid()) is null or not public.is_workspace_admin(p_workspace_id) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_token is null or char_length(p_token) < 32 then
    raise exception 'invalid_token' using errcode = '22023';
  end if;

  select public.plan_member_limit(plan) into v_limit
  from public.workspaces where id = p_workspace_id
  for update;

  if exists (
    select 1 from public.workspace_members m
    join auth.users u on u.id = m.user_id
    where m.workspace_id = p_workspace_id and lower(u.email) = v_email
  ) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  delete from public.workspace_invites
  where workspace_id = p_workspace_id and email = v_email and accepted_at is null;

  if v_limit is not null
    and (select count(*) from public.workspace_members where workspace_id = p_workspace_id)
      + (select count(*) from public.workspace_invites
         where workspace_id = p_workspace_id and accepted_at is null and expires_at > now())
      >= v_limit then
    raise exception 'plan_limit' using errcode = 'P0001';
  end if;

  -- Last check, so a rejected invite doesn't use up the quota.
  perform private.hit_rate_limit('invite', 20, interval '1 hour');

  insert into public.workspace_invites (workspace_id, email, role, token_hash, invited_by)
  values (p_workspace_id, v_email, p_role, public.invite_token_hash(p_token), (select auth.uid()))
  returning id into v_id;

  return v_id;
end;
$$;

-- Workspaces: at most 10 created per day per user (each one is a new Free quota).
create or replace function public.create_workspace(p_name text, p_slug text)
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

  perform private.hit_rate_limit('create_workspace', 10, interval '1 day');

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
