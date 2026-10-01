-- protect_last_admin had a race: two admins demoting (or removing) each other at
-- the same time each still saw the other as admin, both changes went through and
-- the workspace was left with no admin (reproduced: 3 in 30 concurrent attempts).
-- Lock the workspace row first, like enforce_member_limit does: the second change
-- waits for the first and, with a fresh snapshot, sees it.

create or replace function public.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') then
    -- No row when the workspace itself is being deleted (cascade): nothing to lock.
    perform 1 from public.workspaces where id = old.workspace_id for update;

    if exists (select 1 from public.workspaces where id = old.workspace_id)
      and exists (select 1 from public.profiles where id = old.user_id)
      and not exists (
        select 1 from public.workspace_members
        where workspace_id = old.workspace_id and role = 'admin' and user_id <> old.user_id
      ) then
      raise exception 'last_admin' using errcode = 'P0001', hint = 'A workspace needs at least one admin.';
    end if;
  end if;
  return case tg_op when 'DELETE' then old else new end;
end;
$$;
