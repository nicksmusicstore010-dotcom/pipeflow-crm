-- Milestone 4: deals (the pipeline Kanban).
-- Any member can create, edit, move and delete deals. The lead and the owner must
-- belong to the same workspace. `stage` and `position` only change through
-- move_deal(), which renumbers the affected columns atomically.

create type public.deal_stage as enum ('new_lead', 'contacted', 'proposal_sent', 'negotiation', 'won', 'lost');

-- Lets deals reference (lead_id, workspace_id): the lead is guaranteed to be in the
-- deal's workspace by a foreign key, not only by a policy.
alter table public.leads add constraint leads_id_workspace_key unique (id, workspace_id);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 120),
  -- Cents. Up to R$ 10 bilhões, well inside JavaScript's safe integer range.
  value_cents bigint not null default 0 check (value_cents between 0 and 1000000000000),
  stage public.deal_stage not null default 'new_lead',
  -- Order inside the column (0 = top). Set by the insert trigger and move_deal().
  position integer not null default 0,
  owner_id uuid references public.profiles (id) on delete set null,
  -- A calendar day, not an instant: "due on 30/09" means the same day for everyone.
  due_date date,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deleting the lead keeps the deal, just unlinked (only lead_id is nulled).
  foreign key (lead_id, workspace_id) references public.leads (id, workspace_id) on delete set null (lead_id)
);

create index deals_workspace_stage_position_idx on public.deals (workspace_id, stage, position);
create index deals_lead_idx on public.deals (lead_id) where lead_id is not null;
create index deals_workspace_owner_due_idx on public.deals (workspace_id, owner_id, due_date);

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- New deals go to the bottom of their column.
create function public.deals_set_initial_position()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.position := coalesce(
    (select max(position) + 1 from public.deals where workspace_id = new.workspace_id and stage = new.stage),
    0
  );
  return new;
end;
$$;

create trigger deals_set_initial_position
  before insert on public.deals
  for each row execute function public.deals_set_initial_position();

-- ---------------------------------------------------------------------------
-- move_deal: puts a deal at p_index (0-based) of p_stage and renumbers both the
-- column it left and the one it entered. Moves in the same workspace are
-- serialized, so two people dragging at once can't interleave positions.
-- ---------------------------------------------------------------------------

create function public.move_deal(p_deal_id uuid, p_stage public.deal_stage, p_index integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_from_stage public.deal_stage;
  v_count integer;
  v_index integer;
begin
  select workspace_id, stage into v_workspace_id, v_from_stage
  from public.deals where id = p_deal_id;

  -- Same error for "doesn't exist" and "not yours": don't reveal other workspaces' ids.
  if v_workspace_id is null or not public.is_workspace_member(v_workspace_id) then
    raise exception 'deal not found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('move_deal:' || v_workspace_id::text, 0));

  -- Column it leaves: close the gap.
  if v_from_stage <> p_stage then
    update public.deals d
    set position = o.rn
    from (
      select id, (row_number() over (order by position, created_at, id) - 1)::integer as rn
      from public.deals
      where workspace_id = v_workspace_id and stage = v_from_stage and id <> p_deal_id
    ) o
    where d.id = o.id and d.position <> o.rn;
  end if;

  -- Column it enters: 0..n-1 without the deal, leaving a hole at v_index.
  select count(*) into v_count
  from public.deals
  where workspace_id = v_workspace_id and stage = p_stage and id <> p_deal_id;
  v_index := greatest(0, least(coalesce(p_index, v_count), v_count));

  update public.deals d
  set position = o.new_position
  from (
    select id, rn + (rn >= v_index)::integer as new_position
    from (
      select id, (row_number() over (order by position, created_at, id) - 1)::integer as rn
      from public.deals
      where workspace_id = v_workspace_id and stage = p_stage and id <> p_deal_id
    ) numbered
  ) o
  where d.id = o.id and d.position <> o.new_position;

  update public.deals
  set stage = p_stage, position = v_index
  where id = p_deal_id and (stage <> p_stage or position <> v_index);
end;
$$;

revoke execute on function public.move_deal(uuid, public.deal_stage, integer) from public, anon;
grant execute on function public.move_deal(uuid, public.deal_stage, integer) to authenticated;
revoke execute on function public.deals_set_initial_position() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privileges + RLS
-- ---------------------------------------------------------------------------

revoke all on public.deals from anon, authenticated;
grant all on public.deals to service_role;

grant select, delete on public.deals to authenticated;
-- position comes from the trigger; created_by and timestamps from defaults.
grant insert (workspace_id, lead_id, title, value_cents, stage, owner_id, due_date)
  on public.deals to authenticated;
-- stage/position only through move_deal(); workspace_id is fixed after insert.
grant update (lead_id, title, value_cents, owner_id, due_date)
  on public.deals to authenticated;

alter table public.deals enable row level security;

create policy "deals: members read"
  on public.deals for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "deals: members insert"
  on public.deals for insert to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and (owner_id is null or public.is_user_in_workspace(workspace_id, owner_id))
  );

create policy "deals: members update"
  on public.deals for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (
    public.is_workspace_member(workspace_id)
    and (owner_id is null or public.is_user_in_workspace(workspace_id, owner_id))
  );

create policy "deals: members delete"
  on public.deals for delete to authenticated
  using (public.is_workspace_member(workspace_id));
