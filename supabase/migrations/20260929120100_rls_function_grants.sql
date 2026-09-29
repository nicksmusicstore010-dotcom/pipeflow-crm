-- Aula 3.2: RLS review (Supabase security advisors).
-- SECURITY DEFINER functions in `public` are callable through /rest/v1/rpc.
-- The RLS helpers are only needed by policies, which all target `authenticated`,
-- so anonymous callers lose EXECUTE; trigger functions lose it for everyone
-- (triggers keep firing: EXECUTE is only checked when the trigger is created).

revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.is_workspace_admin(uuid) from public, anon;
revoke execute on function public.shares_workspace_with(uuid) from public, anon;
revoke execute on function public.is_user_in_workspace(uuid, uuid) from public, anon;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_admin(uuid) to authenticated;
grant execute on function public.shares_workspace_with(uuid) to authenticated;
grant execute on function public.is_user_in_workspace(uuid, uuid) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- is_user_in_workspace(ws, user) let any signed-in user probe whether an
-- arbitrary user belongs to an arbitrary workspace. Now it only answers for
-- workspaces the caller is in. Policies already require that membership, so
-- they behave the same.
create or replace function public.is_user_in_workspace(p_workspace_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_workspace_member(p_workspace_id)
    and exists (
      select 1 from public.workspace_members
      where workspace_id = p_workspace_id and user_id = p_user_id
    );
$$;
