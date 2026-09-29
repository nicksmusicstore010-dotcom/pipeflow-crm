-- Aula 3.4 / milestone 6: dashboard aggregates computed in the database
-- instead of loading every deal into the app.
-- SECURITY INVOKER: runs as the caller, so the deals RLS still applies and a
-- foreign workspace id simply returns no rows.

create function public.deal_stage_totals(p_workspace_id uuid)
returns table (stage public.deal_stage, deal_count integer, value_cents bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select d.stage, count(*)::integer, coalesce(sum(d.value_cents), 0)::bigint
  from public.deals d
  where d.workspace_id = p_workspace_id
  group by d.stage;
$$;

revoke execute on function public.deal_stage_totals(uuid) from public, anon;
grant execute on function public.deal_stage_totals(uuid) to authenticated;
