-- Milestone 3: leads (contacts) scoped to a workspace.
-- Any member can create, edit and delete leads; the owner must belong to the
-- same workspace. A lead can't be moved to another workspace.

create type public.lead_status as enum ('new', 'contacted', 'qualified', 'unqualified', 'customer');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 40),
  company text check (char_length(company) <= 120),
  position text check (char_length(position) <= 120),
  status public.lead_status not null default 'new',
  owner_id uuid references public.profiles (id) on delete set null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_workspace_created_idx on public.leads (workspace_id, created_at desc);
create index leads_workspace_status_idx on public.leads (workspace_id, status);
create index leads_workspace_owner_idx on public.leads (workspace_id, owner_id);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- True when p_user_id is a member of p_workspace_id (used to validate owners).
create function public.is_user_in_workspace(p_workspace_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = p_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Privileges + RLS
-- ---------------------------------------------------------------------------

revoke all on public.leads from anon, authenticated;
grant all on public.leads to service_role;

grant select, delete on public.leads to authenticated;
-- id, created_by and timestamps come from defaults; workspace_id is fixed after insert.
grant insert (workspace_id, name, email, phone, company, position, status, owner_id)
  on public.leads to authenticated;
grant update (name, email, phone, company, position, status, owner_id)
  on public.leads to authenticated;

alter table public.leads enable row level security;

create policy "leads: members read"
  on public.leads for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "leads: members insert"
  on public.leads for insert to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and (owner_id is null or public.is_user_in_workspace(workspace_id, owner_id))
  );

create policy "leads: members update"
  on public.leads for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (
    public.is_workspace_member(workspace_id)
    and (owner_id is null or public.is_user_in_workspace(workspace_id, owner_id))
  );

create policy "leads: members delete"
  on public.leads for delete to authenticated
  using (public.is_workspace_member(workspace_id));
