-- CLOUD-004: Entitlements / subscription authorization foundation.
--
-- Introduces the application `entitlements` table — the server-authoritative
-- record of a user's paid Soravo access (02_TDD.md §12–13; ADR-012). The
-- customer dashboard (WEB-008), device licensing, and download authorization
-- (DESKTOP-006 / CLOUD-012) all DERIVE from this table; clients never assert
-- their own access.
--
-- Model (ADR-012):
--   * one CURRENT row per user per product: unique (user_id, product). Payment
--     / purchase history is deliberately NOT stored here — the future
--     webhook/idempotency records (CLOUD-010/011) own that. This table's row is
--     a single, current authorization state, not an append-only log.
--   * `plan` is the entitlement TYPE ('monthly' subscription | 'lifetime' paid
--     tier, 02_TDD.md §2); `status` is the lifecycle state, 'active' = in
--     force. There is no 'free' row: ABSENCE of a row IS the free state.
--   * lifetime entitlements never expire (expires_at IS NULL); monthly ones
--     always carry an expiry (expires_at NOT NULL). CHECK constraints reject
--     impossible (plan, status, expires_at) combinations at the database
--     boundary; expired/cancelled/revoked states can never be authored into a
--     paying shape because the plan/expiry invariants are structural.
--   * provider references are opaque provider identifiers (Razorpay customer /
--     payment ids) kept only for later reconciliation (CLOUD-010). No card
--     data, CVV, raw payment credentials, or secrets are ever stored
--     (01_PRD.md §10; 02_TDD.md §13).
--   * entitlement VALIDITY for licensing (CLOUD-012) is derived at READ time:
--       valid := (plan = 'lifetime' AND status = 'active')
--             OR (plan = 'monthly'  AND status IN ('active','cancelled')
--                                     AND now() <= expires_at)
--     'cancelled' keeps access until the paid period ends; 'expired'/'revoked'
--     never grant access. The DB guarantees reachability of every state; the
--     time dimension is enforced at read time by the license authority.
--
-- Authorization model (CLOUD-004 security objective):
--   * authenticated users may READ only their OWN entitlement, and only the
--     client-safe projection (product, plan, status, starts_at, expires_at,
--     updated_at) via a column-level SELECT grant. Identity and provider/
--     payment identifiers are never exposed to any app role (SELECT * and
--     unprivileged column access are denied; verified behaviorally). Row
--     scoping is enforced by RLS: one self-owned SELECT policy bound to the
--     server-derived auth.uid(), never user metadata.
--   * users have NO write authority — no INSERT/UPDATE/DELETE grants and no
--     INSERT/UPDATE/DELETE RLS policies exist for any role. A client cannot
--     turn free -> lifetime, free -> active, expired -> active, cancelled ->
--     active, or another user's entitlement into their own.
--   * service_role receives nothing in this migration: no server-side writer
--     exists yet. The Razorpay payment server (CLOUD-009/010/011) must grant
--     its own service-role write path explicitly when it lands and must hold
--     credentials server-side only. `authenticated` never bypasses RLS.
--   * server-owned timestamps are enforced by a SECURITY INVOKER trigger
--     (search_path pinned to pg_catalog per security advisor 0011); users
--     cannot author created_at/updated_at, and the future server path can set
--     starts_at/expires_at without fighting the trigger.
--
-- Scope boundary (CLOUD-004): no device/session records (CLOUD-005), no admin
-- roles or metrics endpoints (CLOUD-006), no Razorpay/webhook/idempotency
-- (CLOUD-009/010/011), no signed entitlement or download authorization
-- (CLOUD-012), no website changes (WEB-008 owns the dashboard). No audio,
-- transcripts, keystrokes, clipboard, or history is ever stored.

begin;

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product text not null default 'soravo',
  plan text not null,
  status text not null default 'active',
  provider text not null,
  provider_customer_ref text not null,
  provider_payment_ref text not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entitlements_plan_type check (plan in ('monthly', 'lifetime')),
  constraint entitlements_status_check check (status in ('active', 'cancelled', 'expired', 'revoked')),
  constraint entitlements_provider_check check (provider = 'razorpay'),
  constraint entitlements_plan_expiry_consistency check (
    (plan = 'lifetime' and expires_at is null) or
    (plan = 'monthly' and expires_at is not null)
  ),
  constraint entitlements_status_plan_consistency check (
    (plan = 'lifetime' and status in ('active', 'revoked')) or
    (plan = 'monthly' and status in ('active', 'cancelled', 'expired'))
  ),
  constraint entitlements_expiry_not_before_start check (
    expires_at is null or expires_at >= starts_at
  ),
  constraint entitlements_one_current_per_user_product unique (user_id, product)
);

comment on table public.entitlements is
  'Server-authoritative paid-access entitlements for Soravo users. Users may '
  'read their own row (safe projection only) and never write. Stores no audio, '
  'transcripts, keystrokes, clipboard contents, or history.';

alter table public.entitlements enable row level security;

create or replace function public.entitlements_set_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.entitlements_set_timestamps() from public, anon, authenticated, service_role;

create trigger entitlements_set_timestamps
  before insert or update on public.entitlements
  for each row
  execute function public.entitlements_set_timestamps();

-- A user may read only their own current entitlement row. auth.uid() is
-- server-derived from the verified access token JWT, never user metadata.
create policy "entitlements_select_own" on public.entitlements
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Column-level SELECT grant: the client-safe projection ONLY. Identifiers
-- (id, user_id) and provider/payment references are not granted to any role,
-- so SELECT * and those column references are denied. RLS still scopes the
-- granted columns to the caller's own row. No write grants exist — users
-- cannot create, mutate, revoke, or transfer entitlements.
grant select (product, plan, status, starts_at, expires_at, updated_at)
  on table public.entitlements to authenticated;

commit;