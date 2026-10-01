-- Public API (milestone 10): per-workspace API keys for /api/v1.
--
-- The key ("pf_" + 32 random bytes) is shown once to the admin who creates it;
-- only its SHA-256 is stored. The API route hashes the Authorization header and
-- calls authenticate_api_key() with the secret key (service role): it returns the
-- workspace and applies a per-key rate limit. The API then reads/writes with the
-- service role, always filtering by that workspace, so the rules that RLS and
-- auth.uid() give the app are re-applied there (owner must be a member, etc.).

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  -- First characters of the key, to tell keys apart in the list ("pf_a1B2c3…").
  prefix text not null check (prefix ~ '^pf_[A-Za-z0-9_-]{4,12}$'),
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index api_keys_workspace_idx on public.api_keys (workspace_id, created_at desc);

alter table public.api_keys enable row level security;

-- Admins see their workspace's keys (never the hash); writes only through the RPCs.
create policy "api_keys: admins read" on public.api_keys
  for select to authenticated using (public.is_workspace_admin(workspace_id));

revoke all on public.api_keys from anon, authenticated;
grant select (id, workspace_id, name, prefix, created_by, created_at, last_used_at, revoked_at)
  on public.api_keys to authenticated;

-- ---------------------------------------------------------------------------
-- create_api_key / revoke_api_key (admins)
-- ---------------------------------------------------------------------------

create function public.create_api_key(p_workspace_id uuid, p_name text, p_key_hash text, p_prefix text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null or not public.is_workspace_admin(p_workspace_id) then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  perform private.hit_rate_limit('create_api_key', 20, interval '1 day');

  -- Serialize per workspace, then cap the active keys.
  perform 1 from public.workspaces where id = p_workspace_id for update;
  if (select count(*) from public.api_keys where workspace_id = p_workspace_id and revoked_at is null) >= 10 then
    raise exception 'too_many_keys' using errcode = 'P0001';
  end if;

  insert into public.api_keys (workspace_id, name, prefix, key_hash)
  values (p_workspace_id, trim(p_name), p_prefix, p_key_hash)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.revoke_api_key(p_key_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select workspace_id into v_workspace_id from public.api_keys where id = p_key_id;
  -- Same error for "doesn't exist" and "not yours".
  if v_workspace_id is null or not public.is_workspace_admin(v_workspace_id) then
    raise exception 'key_not_found' using errcode = 'P0002';
  end if;
  update public.api_keys set revoked_at = now() where id = p_key_id and revoked_at is null;
end;
$$;

revoke execute on function public.create_api_key(uuid, text, text, text) from public, anon;
revoke execute on function public.revoke_api_key(uuid) from public, anon;
grant execute on function public.create_api_key(uuid, text, text, text) to authenticated;
grant execute on function public.revoke_api_key(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- authenticate_api_key (service role only): workspace of a live key + rate limit
-- ---------------------------------------------------------------------------

create table private.api_key_usage (
  key_id uuid not null references public.api_keys (id) on delete cascade,
  window_start timestamptz not null,
  requests integer not null default 0,
  primary key (key_id, window_start)
);

create function public.authenticate_api_key(p_key_hash text)
returns table (key_id uuid, workspace_id uuid, created_by uuid)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_key public.api_keys;
  v_window timestamptz := date_trunc('minute', now());
  v_requests integer;
begin
  select * into v_key from public.api_keys k where k.key_hash = p_key_hash and k.revoked_at is null;
  if v_key.id is null then
    raise exception 'invalid_key' using errcode = 'P0002';
  end if;

  -- 120 requests per minute per key.
  insert into private.api_key_usage as u (key_id, window_start, requests)
  values (v_key.id, v_window, 1)
  on conflict (key_id, window_start) do update set requests = u.requests + 1
  returning u.requests into v_requests;
  if v_requests > 120 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  delete from private.api_key_usage where api_key_usage.key_id = v_key.id and window_start < v_window - interval '1 hour';

  -- At most one write a minute for "last used".
  update public.api_keys set last_used_at = now()
  where id = v_key.id and (last_used_at is null or last_used_at < now() - interval '1 minute');

  return query select v_key.id, v_key.workspace_id, v_key.created_by;
end;
$$;

revoke execute on function public.authenticate_api_key(text) from public, anon, authenticated;
grant execute on function public.authenticate_api_key(text) to service_role;

-- ---------------------------------------------------------------------------
-- move_deal: the renumbering moves to private.move_deal_in(), shared by the app's
-- move_deal() (member check via auth.uid()) and the API's api_move_deal()
-- (service role, workspace from the key).
-- ---------------------------------------------------------------------------

create function private.move_deal_in(p_workspace_id uuid, p_deal_id uuid, p_stage public.deal_stage, p_index integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from_stage public.deal_stage;
  v_count integer;
  v_index integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('move_deal:' || p_workspace_id::text, 0));

  select stage into v_from_stage from public.deals where id = p_deal_id and workspace_id = p_workspace_id;
  if v_from_stage is null then
    raise exception 'deal not found' using errcode = 'P0002';
  end if;

  -- Column it leaves: close the gap.
  if v_from_stage <> p_stage then
    update public.deals d
    set position = o.rn
    from (
      select id, (row_number() over (order by position, created_at, id) - 1)::integer as rn
      from public.deals
      where workspace_id = p_workspace_id and stage = v_from_stage and id <> p_deal_id
    ) o
    where d.id = o.id and d.position <> o.rn;
  end if;

  -- Column it enters: 0..n-1 without the deal, leaving a hole at v_index.
  select count(*) into v_count
  from public.deals
  where workspace_id = p_workspace_id and stage = p_stage and id <> p_deal_id;
  v_index := greatest(0, least(coalesce(p_index, v_count), v_count));

  update public.deals d
  set position = o.new_position
  from (
    select id, rn + (rn >= v_index)::integer as new_position
    from (
      select id, (row_number() over (order by position, created_at, id) - 1)::integer as rn
      from public.deals
      where workspace_id = p_workspace_id and stage = p_stage and id <> p_deal_id
    ) numbered
  ) o
  where d.id = o.id and d.position <> o.new_position;

  update public.deals
  set stage = p_stage, position = v_index
  where id = p_deal_id and (stage <> p_stage or position <> v_index);
end;
$$;

revoke execute on function private.move_deal_in(uuid, uuid, public.deal_stage, integer) from public, anon, authenticated;

create or replace function public.move_deal(p_deal_id uuid, p_stage public.deal_stage, p_index integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select workspace_id into v_workspace_id from public.deals where id = p_deal_id;
  -- Same error for "doesn't exist" and "not yours": don't reveal other workspaces' ids.
  if v_workspace_id is null or not public.is_workspace_member(v_workspace_id) then
    raise exception 'deal not found' using errcode = 'P0002';
  end if;
  perform private.move_deal_in(v_workspace_id, p_deal_id, p_stage, p_index);
end;
$$;

create function public.api_move_deal(p_workspace_id uuid, p_deal_id uuid, p_stage public.deal_stage, p_index integer)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.move_deal_in(p_workspace_id, p_deal_id, p_stage, p_index);
$$;

revoke execute on function public.api_move_deal(uuid, uuid, public.deal_stage, integer) from public, anon, authenticated;
grant execute on function public.api_move_deal(uuid, uuid, public.deal_stage, integer) to service_role;
