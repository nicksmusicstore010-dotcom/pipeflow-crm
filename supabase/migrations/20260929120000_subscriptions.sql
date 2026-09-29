-- Aula 3.2: Stripe subscription state per workspace.
-- Written only by the Stripe webhook (service role); workspaces.plan stays the
-- single field the app reads for plan limits. Admins read it on the billing page.

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'paused'
);

create table public.subscriptions (
  -- Stripe subscription id (sub_...), so webhook events upsert by it.
  id text primary key check (id like 'sub\_%'),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  stripe_customer_id text not null check (stripe_customer_id like 'cus\_%'),
  stripe_price_id text,
  status public.subscription_status not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_workspace_created_idx
  on public.subscriptions (workspace_id, created_at desc);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges + RLS: clients only read; every write goes through the webhook.
-- ---------------------------------------------------------------------------

revoke all on public.subscriptions from anon, authenticated;
grant all on public.subscriptions to service_role;

grant select on public.subscriptions to authenticated;

alter table public.subscriptions enable row level security;

create policy "subscriptions: admins read"
  on public.subscriptions for select to authenticated
  using (public.is_workspace_admin(workspace_id));
