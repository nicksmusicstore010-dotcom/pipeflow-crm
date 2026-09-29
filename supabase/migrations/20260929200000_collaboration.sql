-- Aula 3.5 / milestone 7: invites by e-mail, member management and the Free
-- plan member limit.
--
-- Invites store only the SHA-256 of the token (the token travels in the e-mail
-- link). They are created, previewed and accepted through SECURITY DEFINER
-- functions; admins read and cancel them directly under RLS.

-- ---------------------------------------------------------------------------
-- Plan limit. Mirrors PLAN_LIMITS in src/lib/plans.ts (the app checks there
-- first to show the message; this is the guarantee). null = unlimited.
-- ---------------------------------------------------------------------------

create function public.plan_member_limit(p_plan public.workspace_plan)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan when 'free' then 2 else null end;
$$;

-- ---------------------------------------------------------------------------
-- workspace_invites
-- ---------------------------------------------------------------------------

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (
    email = lower(trim(email)) and char_length(email) between 3 and 254 and position('@' in email) > 1
  ),
  role public.workspace_role not null default 'member',
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid default auth.uid() references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- One open invite per e-mail and workspace (inviting again replaces it).
create unique index workspace_invites_open_email_idx
  on public.workspace_invites (workspace_id, email)
  where accepted_at is null;
create index workspace_invites_workspace_created_idx
  on public.workspace_invites (workspace_id, created_at desc);

revoke all on public.workspace_invites from anon, authenticated;
grant all on public.workspace_invites to service_role;
-- Every column but token_hash.
grant select (id, workspace_id, email, role, invited_by, expires_at, accepted_at, accepted_by, created_at)
  on public.workspace_invites to authenticated;
grant delete on public.workspace_invites to authenticated;

alter table public.workspace_invites enable row level security;

create policy "workspace_invites: admins read"
  on public.workspace_invites for select to authenticated
  using (public.is_workspace_admin(workspace_id));

create policy "workspace_invites: admins cancel"
  on public.workspace_invites for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

create function public.invite_token_hash(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

revoke execute on function public.invite_token_hash(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- workspace_members: admins change roles and remove members
-- ---------------------------------------------------------------------------

grant update (role) on public.workspace_members to authenticated;
grant delete on public.workspace_members to authenticated;

create policy "workspace_members: admins change roles"
  on public.workspace_members for update to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace_members: admins remove"
  on public.workspace_members for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

-- Free plan: no member beyond the limit, whoever inserts.
create function public.enforce_member_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  -- Row lock: two invites accepted at the same time can't both squeeze in.
  select public.plan_member_limit(plan) into v_limit
  from public.workspaces where id = new.workspace_id
  for update;

  if v_limit is not null
    and (select count(*) from public.workspace_members where workspace_id = new.workspace_id) >= v_limit then
    raise exception 'plan_limit' using errcode = 'P0001', hint = 'The workspace plan member limit was reached.';
  end if;
  return new;
end;
$$;

create trigger workspace_members_enforce_limit
  before insert on public.workspace_members
  for each row execute function public.enforce_member_limit();

-- A workspace always keeps an admin. Skipped when the workspace or the user
-- itself is being deleted (the cascade removes the membership).
create function public.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin'
    and (tg_op = 'DELETE' or new.role <> 'admin')
    and exists (select 1 from public.workspaces where id = old.workspace_id)
    and exists (select 1 from public.profiles where id = old.user_id)
    and not exists (
      select 1 from public.workspace_members
      where workspace_id = old.workspace_id and role = 'admin' and user_id <> old.user_id
    ) then
    raise exception 'last_admin' using errcode = 'P0001', hint = 'A workspace needs at least one admin.';
  end if;
  return case tg_op when 'DELETE' then old else new end;
end;
$$;

create trigger workspace_members_protect_last_admin
  before update of role or delete on public.workspace_members
  for each row execute function public.protect_last_admin();

-- Leads and deals owned by a removed member become unassigned.
create function public.unassign_removed_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.leads set owner_id = null
  where workspace_id = old.workspace_id and owner_id = old.user_id;
  update public.deals set owner_id = null
  where workspace_id = old.workspace_id and owner_id = old.user_id;
  return old;
end;
$$;

create trigger workspace_members_unassign_removed
  after delete on public.workspace_members
  for each row execute function public.unassign_removed_member();

revoke execute on function public.enforce_member_limit() from public, anon, authenticated;
revoke execute on function public.protect_last_admin() from public, anon, authenticated;
revoke execute on function public.unassign_removed_member() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Members with e-mail (profiles don't hold it), for the admin settings page.
-- ---------------------------------------------------------------------------

create function public.list_workspace_members(p_workspace_id uuid)
returns table (user_id uuid, full_name text, email text, role public.workspace_role, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, p.full_name, u.email::text, m.role, m.created_at
  from public.workspace_members m
  join public.profiles p on p.id = m.user_id
  join auth.users u on u.id = m.user_id
  where m.workspace_id = p_workspace_id
    and public.is_workspace_admin(p_workspace_id)
  order by m.created_at;
$$;

-- ---------------------------------------------------------------------------
-- create_workspace_invite: admin only; rejects current members and invites
-- past the plan limit (members + open invites). Inviting the same e-mail again
-- replaces the open invite (new token, new expiry).
-- ---------------------------------------------------------------------------

create function public.create_workspace_invite(
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

  insert into public.workspace_invites (workspace_id, email, role, token_hash, invited_by)
  values (p_workspace_id, v_email, p_role, public.invite_token_hash(p_token), (select auth.uid()))
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_invite_preview: what /invite/[token] shows, also to visitors without an
-- account. Knowing the token is the permission; unknown token = no rows.
-- ---------------------------------------------------------------------------

create function public.get_invite_preview(p_token text)
returns table (workspace_name text, email text, role public.workspace_role, inviter_name text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    w.name,
    i.email,
    i.role,
    p.full_name,
    case
      when i.accepted_at is not null then 'accepted'
      when i.expires_at <= now() then 'expired'
      else 'pending'
    end
  from public.workspace_invites i
  join public.workspaces w on w.id = i.workspace_id
  left join public.profiles p on p.id = i.invited_by
  where i.token_hash = public.invite_token_hash(p_token);
$$;

-- ---------------------------------------------------------------------------
-- accept_workspace_invite: the signed-in user must be the invited e-mail.
-- Returns the workspace slug. Accepting twice is harmless.
-- ---------------------------------------------------------------------------

create function public.accept_workspace_invite(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_invite public.workspace_invites;
  v_slug text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_invite from public.workspace_invites
  where token_hash = public.invite_token_hash(p_token)
  for update;
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0001';
  end if;

  select slug into v_slug from public.workspaces where id = v_invite.workspace_id;

  if exists (select 1 from public.workspace_members where workspace_id = v_invite.workspace_id and user_id = v_uid) then
    if v_invite.accepted_at is null then
      update public.workspace_invites set accepted_at = now(), accepted_by = v_uid where id = v_invite.id;
    end if;
    return v_slug;
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'invite_used' using errcode = 'P0001';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;
  if (select lower(email) from auth.users where id = v_uid) is distinct from v_invite.email then
    raise exception 'invite_wrong_email' using errcode = 'P0001';
  end if;

  -- The member limit trigger can still raise plan_limit here.
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, v_uid, v_invite.role);

  update public.workspace_invites set accepted_at = now(), accepted_by = v_uid where id = v_invite.id;
  return v_slug;
end;
$$;

revoke execute on function public.list_workspace_members(uuid) from public, anon;
revoke execute on function public.create_workspace_invite(uuid, text, public.workspace_role, text) from public, anon;
revoke execute on function public.accept_workspace_invite(text) from public, anon;
revoke execute on function public.get_invite_preview(text) from public;
grant execute on function public.list_workspace_members(uuid) to authenticated;
grant execute on function public.create_workspace_invite(uuid, text, public.workspace_role, text) to authenticated;
grant execute on function public.accept_workspace_invite(text) to authenticated;
grant execute on function public.get_invite_preview(text) to anon, authenticated;
