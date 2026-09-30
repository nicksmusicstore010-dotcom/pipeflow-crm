-- Pro prepaid with Pix.
-- Stripe accounts in Brazil only take one-off Pix payments (no Pix Automático),
-- so Pix doesn't create a subscription: each payment buys N months of Pro. The
-- workspace is Pro while it has a live card subscription OR pro_until is ahead.
-- Written only by the Stripe webhook (service role), like subscriptions.

alter table public.workspaces add column pro_until timestamptz;

comment on column public.workspaces.pro_until is
  'Pro paid in advance with Pix is valid until this instant (null = never paid with Pix). Set only by apply_pix_payment().';

-- One row per paid Checkout Session: the id makes a retried webhook a no-op.
create table public.pix_payments (
  id text primary key check (id like 'cs\_%'),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  months integer not null check (months between 1 and 12),
  amount_cents integer not null check (amount_cents > 0),
  payment_intent_id text,
  paid_by uuid references public.profiles (id) on delete set null,
  period_start timestamptz not null,
  period_end timestamptz not null check (period_end > period_start),
  created_at timestamptz not null default now()
);

create index pix_payments_workspace_created_idx on public.pix_payments (workspace_id, created_at desc);

revoke all on public.pix_payments from anon, authenticated;
grant all on public.pix_payments to service_role;
grant select on public.pix_payments to authenticated;

alter table public.pix_payments enable row level security;

create policy "pix_payments: admins read"
  on public.pix_payments for select to authenticated
  using (public.is_workspace_admin(workspace_id));

-- ---------------------------------------------------------------------------
-- apply_pix_payment: adds the months after whatever is left (renewing early
-- doesn't waste days) and turns the workspace Pro. Idempotent per session.
-- ---------------------------------------------------------------------------

create function public.apply_pix_payment(
  p_session_id text,
  p_workspace_id uuid,
  p_months integer,
  p_amount_cents integer,
  p_payment_intent_id text,
  p_paid_by uuid,
  p_customer_id text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current timestamptz;
  v_start timestamptz;
  v_end timestamptz;
begin
  -- Row lock: two payments confirmed at once are applied one after the other.
  select pro_until into v_current from public.workspaces where id = p_workspace_id for update;
  if not found then
    raise exception 'workspace_not_found' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.pix_payments where id = p_session_id) then
    return v_current; -- already applied (webhook retried)
  end if;

  v_start := greatest(now(), coalesce(v_current, now()));
  v_end := v_start + make_interval(months => p_months);

  insert into public.pix_payments (id, workspace_id, months, amount_cents, payment_intent_id, paid_by, period_start, period_end)
  values (
    p_session_id, p_workspace_id, p_months, p_amount_cents, p_payment_intent_id,
    (select id from public.profiles where id = p_paid_by), v_start, v_end
  );

  update public.workspaces
  set pro_until = v_end,
      plan = 'pro',
      stripe_customer_id = coalesce(stripe_customer_id, p_customer_id)
  where id = p_workspace_id;

  return v_end;
end;
$$;

revoke execute on function public.apply_pix_payment(text, uuid, integer, integer, text, uuid, text) from public, anon, authenticated;
grant execute on function public.apply_pix_payment(text, uuid, integer, integer, text, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Expiry: Pix Pro that ran out, with no live card subscription, goes back to Free.
-- ---------------------------------------------------------------------------

create function private.expire_prepaid_pro()
returns integer
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.workspaces w
    set plan = 'free'
    where w.plan = 'pro'
      and w.pro_until is not null
      and w.pro_until <= now()
      and not exists (
        select 1 from public.subscriptions s
        where s.workspace_id = w.id and s.status in ('trialing', 'active', 'past_due')
      )
    returning 1
  )
  select count(*)::integer from expired;
$$;

revoke execute on function private.expire_prepaid_pro() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

-- Every 15 minutes: at most a quarter of an hour of Pro past the paid date.
select cron.schedule('expire-prepaid-pro', '*/15 * * * *', 'select private.expire_prepaid_pro()');
