-- Milestone 5: activities (calls, e-mails, meetings, notes) on a lead's timeline.
-- Any member can log an activity; only its author or a workspace admin can edit or
-- delete it. The author is always the logged-in user (not settable by clients).

create type public.activity_type as enum ('call', 'email', 'meeting', 'note');

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  type public.activity_type not null,
  description text not null check (char_length(trim(description)) between 1 and 2000),
  -- When it happened (or will happen, for a scheduled meeting); defaults to now.
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Same workspace as the lead, enforced by the key; deleting the lead deletes its history.
  foreign key (lead_id, workspace_id) references public.leads (id, workspace_id) on delete cascade
);

create index activities_lead_occurred_idx on public.activities (lead_id, occurred_at desc);
create index activities_workspace_occurred_idx on public.activities (workspace_id, occurred_at desc);

create trigger activities_set_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges + RLS
-- ---------------------------------------------------------------------------

revoke all on public.activities from anon, authenticated;
grant all on public.activities to service_role;

grant select, delete on public.activities to authenticated;
-- author_id comes from auth.uid(); lead/workspace are fixed after insert.
grant insert (workspace_id, lead_id, type, description, occurred_at) on public.activities to authenticated;
grant update (type, description, occurred_at) on public.activities to authenticated;

alter table public.activities enable row level security;

create policy "activities: members read"
  on public.activities for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "activities: members insert as themselves"
  on public.activities for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and author_id = (select auth.uid()));

create policy "activities: author or admin update"
  on public.activities for update to authenticated
  using (
    public.is_workspace_member(workspace_id)
    and (author_id = (select auth.uid()) or public.is_workspace_admin(workspace_id))
  )
  with check (public.is_workspace_member(workspace_id));

create policy "activities: author or admin delete"
  on public.activities for delete to authenticated
  using (
    public.is_workspace_member(workspace_id)
    and (author_id = (select auth.uid()) or public.is_workspace_admin(workspace_id))
  );
