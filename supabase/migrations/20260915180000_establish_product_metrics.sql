-- CLOUD-007: Product metrics queries (admin dashboard data layer).
--
-- Scope (TDD §14–15, ADR-016): the future admin dashboard (WEB-009) consumes
-- READ-ONLY product metrics derived from user, entitlement, device, and
-- session rows. This migration provides that server-side query surface as
-- exactly three SECURITY DEFINER functions in `public`, each gated on a live
-- `public.profiles.role = 'admin'` check evaluated inside the function body,
-- and each callable ONLY by the `authenticated` role (PostgREST RPC). Umami is
-- never a source of account/entitlement truth (TDD §15); these functions read
-- the authoritative application tables directly. Aggregates only — no raw user
-- rows, identifiers, provider references, payment data, or PII are returned.
--
-- Why SECURITY DEFINER (ADR-010 exception, sanctioned by ADR-016):
--   * RLS scopes every authenticated session to its OWN rows, so a plain
--     SECURITY INVOKER query can never aggregate across users — which is
--     precisely what a metrics layer must do. SECURITY DEFINER lets the
--     function read across users while the explicit admin gate
--     (auth.uid() + profiles.role) runs FIRST inside the body, so the
--     elevated privilege is unreachable by a non-admin session.
--   * Mitigations applied to every function:
--       - auth.uid() (server-derived from the verified JWT, never metadata)
--         is fetched first; a null uid (no/invalid claims) raises immediately.
--       - profiles.role = 'admin' is REQUIRED; a non-admin authenticated
--         caller raises. Claims injected via request.jwt.claims grant nothing.
--       - search_path pinned to pg_catalog (security advisor 0011).
--       - Every relation/function reference is schema-qualified.
--       - No dynamic SQL and no user-supplied identifiers: the bucket unit is
--         translated by a CASE over fixed literals before use.
--   * The DEFAULT-DENY boundary is preserved: no new tables, sequences,
--     grants-on-tables, or policies. Functions are revoked from
--     PUBLIC/anon/service_role and EXECUTE is granted to authenticated only.
--
-- Metric semantics:
--   * User counts derive from `auth.users` (registered accounts), NOT
--     `profiles`: profile rows are lazily self-INSERTed (CLOUD-002) and their
--     created_at is overwritten by a server trigger, so they under-count and
--     cannot be backdated. `auth.users` has no ts trigger. A row present in
--     auth.users is counted as a registered account regardless of profile.
--   * Paid access uses the ADR-012 validity predicate at READ time:
--       (plan = 'lifetime' AND status = 'active')
--       OR (plan = 'monthly' AND status IN ('active','cancelled')
--           AND now() <= expires_at)
--   * Growth buckets are UTC calendar-aligned. The leading bucket is the
--     bucket boundary at-or-before p_from (date_trunc floors), so it may
--     include registered users whose created_at precedes p_from; buckets whose
--     lower bound is >= p_to are excluded. Buckets are half-open
--     [lower, lower + step) and hard-capped at 10000.
--   * Active users = distinct users with a NON-revoked session whose
--     last_seen_at falls in the half-open window [p_from, p_to).
--
-- Performance: active_users filters sessions by last_seen_at; the new
-- `sessions_last_seen_at_idx` serves that range scan. Growth scans auth.users
-- per bucket (bounded by the 10000 cap); `auth` is a stock Supabase schema and
-- is deliberately not modified. Tables here hold licensing metadata only (no
-- audio, transcripts, keystrokes, clipboard contents, or history; ADR-010).

begin;

-- ------------------------------------------------------------------ --
-- admin_metrics_totals() — jsonb headline snapshot.                   --
-- ------------------------------------------------------------------ --
create or replace function public.admin_metrics_totals()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid;
  v_total_users bigint;
  v_paid_users bigint;
  v_sub_active bigint;
  v_sub_cancelled bigint;
  v_sub_expired bigint;
  v_ltime_active bigint;
  v_ltime_revoked bigint;
  v_devices_total bigint;
  v_devices_revoked bigint;
  v_macos bigint;
  v_windows bigint;
  v_linux bigint;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'CLOUD-007: admin access required';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = v_uid and role = 'admin'
  ) then
    raise exception 'CLOUD-007: admin access required';
  end if;

  select count(*) into v_total_users from auth.users;

  select count(*) into v_paid_users from public.entitlements
  where (plan = 'lifetime' and status = 'active')
     or (plan = 'monthly' and status in ('active', 'cancelled') and now() <= expires_at);

  select count(*) into v_sub_active    from public.entitlements where plan = 'monthly'   and status = 'active';
  select count(*) into v_sub_cancelled from public.entitlements where plan = 'monthly'   and status = 'cancelled';
  select count(*) into v_sub_expired   from public.entitlements where plan = 'monthly'   and status = 'expired';
  select count(*) into v_ltime_active  from public.entitlements where plan = 'lifetime'  and status = 'active';
  select count(*) into v_ltime_revoked from public.entitlements where plan = 'lifetime'  and status = 'revoked';

  select count(*) into v_devices_total  from public.devices;
  select count(*) into v_devices_revoked from public.devices where revoked_at is not null;
  select count(*) into v_macos   from public.devices where platform = 'macos';
  select count(*) into v_windows from public.devices where platform = 'windows';
  select count(*) into v_linux   from public.devices where platform = 'linux';

  return jsonb_build_object(
    'total_users', v_total_users,
    'paid_users', v_paid_users,
    'subscriptions', jsonb_build_object(
      'active', v_sub_active,
      'cancelled', v_sub_cancelled,
      'expired', v_sub_expired,
      'total', v_sub_active + v_sub_cancelled + v_sub_expired
    ),
    'lifetime', jsonb_build_object(
      'active', v_ltime_active,
      'revoked', v_ltime_revoked,
      'total', v_ltime_active + v_ltime_revoked
    ),
    'devices', jsonb_build_object(
      'total', v_devices_total,
      'revoked', v_devices_revoked,
      'by_platform', jsonb_build_object(
        'macos', v_macos,
        'windows', v_windows,
        'linux', v_linux
      )
    ),
    'generated_at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
end;
$$;

comment on function public.admin_metrics_totals() is
  'CLOUD-007: admin-only jsonb snapshot of product metrics (registered users, '
  'paid access per ADR-012, subscription/lifetime state, device counts by '
  'platform). SECURITY DEFINER per ADR-016; gate: authenticated + '
  'profiles.role = admin. Returns aggregates only — never raw user rows, '
  'identifiers, provider references, payment data, or PII.';

-- ------------------------------------------------------------------ --
-- admin_metrics_growth() — UTC-bucketized new-user series.            --
-- ------------------------------------------------------------------ --
create or replace function public.admin_metrics_growth(
  p_bucket text,
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
)
returns table (bucket timestamptz, new_users bigint)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid;
  v_unit text;
  v_step interval;
  v_start timestamptz;
  v_ts timestamptz;
  v_next timestamptz;
  v_buckets int := 0;
  v_count bigint;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'CLOUD-007: admin access required';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = v_uid and role = 'admin'
  ) then
    raise exception 'CLOUD-007: admin access required';
  end if;

  -- Fixed-literal translation only: no dynamic SQL, no user identifiers.
  case lower(p_bucket)
    when 'day'   then v_unit := 'day';   v_step := interval '1 day';
    when 'week'  then v_unit := 'week';  v_step := interval '1 week';
    when 'month' then v_unit := 'month'; v_step := interval '1 month';
    else raise exception 'CLOUD-007: invalid bucket % (expected day|week|month)', p_bucket;
  end case;

  -- First UTC calendar-aligned boundary at-or-before p_from.
  v_start := date_trunc(v_unit, p_from at time zone 'UTC') at time zone 'UTC';
  v_ts := v_start;

  while v_ts < p_to and v_buckets < 10000 loop
    v_next := v_start + ((v_buckets + 1) * v_step);

    select count(*) into v_count
    from auth.users u
    where u.created_at >= v_ts
      and u.created_at < v_next;

    bucket := v_ts;
    new_users := v_count;
    return next;

    v_ts := v_next;
    v_buckets := v_buckets + 1;
  end loop;

  return;
end;
$$;

comment on function public.admin_metrics_growth(text, timestamptz, timestamptz) is
  'CLOUD-007: admin-only UTC calendar-aligned new-user series derived from '
  'auth.users.created_at. Bucket is day|week|month; window [p_from, p_to) is '
  'half-open; leading bucket may start before p_from (date_trunc floors); '
  'bucket count capped at 10000. SECURITY DEFINER per ADR-016; gate: '
  'authenticated + profiles.role = admin.';

-- ------------------------------------------------------------------ --
-- admin_metrics_active_users() — distinct live-session users.         --
-- ------------------------------------------------------------------ --
create or replace function public.admin_metrics_active_users(
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid;
  v_count bigint;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'CLOUD-007: admin access required';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = v_uid and role = 'admin'
  ) then
    raise exception 'CLOUD-007: admin access required';
  end if;

  select count(distinct user_id) into v_count
  from public.sessions
  where revoked_at is null
    and last_seen_at >= p_from
    and last_seen_at < p_to;

  return v_count;
end;
$$;

comment on function public.admin_metrics_active_users(timestamptz, timestamptz) is
  'CLOUD-007: admin-only count of distinct users with a NON-revoked session '
  'whose last_seen_at is in the half-open window [p_from, p_to). SECURITY '
  'DEFINER per ADR-016; gate: authenticated + profiles.role = admin.';

-- ------------------------------------------------------------------ --
-- Privilege layer (CLOUD-001/003 invariants).                         --
-- Revoke the Postgres function-default PUBLIC EXECUTE and every app    --
-- role, then grant EXECUTE to authenticated ONLY. SECURITY DEFINER      --
-- functions are callable by the authenticated role through PostgREST     --
-- RPC; the body's admin gate is the authorization boundary. service_role --
-- (non-client) and anon retain no path.                                 --
-- ------------------------------------------------------------------ --
revoke all on function public.admin_metrics_totals() from public, anon, authenticated, service_role;
revoke all on function public.admin_metrics_growth(text, timestamptz, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.admin_metrics_active_users(timestamptz, timestamptz) from public, anon, authenticated, service_role;

grant execute on function public.admin_metrics_totals() to authenticated;
grant execute on function public.admin_metrics_growth(text, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_metrics_active_users(timestamptz, timestamptz) to authenticated;

-- Range scan for admin_metrics_active_users (last_seen_at window).
create index sessions_last_seen_at_idx on public.sessions (last_seen_at);

commit;