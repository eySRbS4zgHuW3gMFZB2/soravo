-- RAZORPAY-WEBHOOK-HARDENING-022: write path + idempotency state machine.
--
-- 021 (RAZORPAY-PAYMENT-ARCHITECTURE-021.md) showed the webhook could never
-- have written an entitlement: service_role held no privilege at all on
-- public.entitlements (finding F13), and the idempotency ledger recorded
-- "processed" BEFORE any work happened, so a failure was remembered as success
-- (finding F4). This migration fixes both server-side halves.
--
-- 1. webhook_events becomes a real claim ledger:
--      processing (claimed, lease-bounded) -> completed | failed
--    `processed_at` is written only on completion, and only an UPDATE grant
--    lets the handler flip state. service_role bypasses RLS; anon/authenticated
--    keep zero access (no grants, no policies).
-- 2. entitlements gets an explicit service_role INSERT/UPDATE/SELECT grant and
--    no DELETE — the ADR-012 "server writer grants its own write path" note.
--    authenticated keeps its exact column-level SELECT projection (its
--    privileges are untouched); the legacy `product` default goes away so no
--    future writer can author the pre-catalogue `soravo` value again, and any
--    such row is remapped to its catalogue id by plan.
-- 3. public.admin_users() stops looking up the removed `product = 'soravo'`
--    value: it now selects the catalogue rows and prefers lifetime over
--    monthly, matching the multi-product read model.
--
-- No payment credentials, webhook secrets, or provider payloads are stored
-- here: the ledger keeps opaque event identifiers only.

begin;

-- ------------------------------------------------------------------ --
-- 1. webhook_events: claim / complete / fail state machine.            --
-- ------------------------------------------------------------------ --

alter table public.webhook_events
  add column if not exists status text,
  add column if not exists claimed_at timestamptz,
  add column if not exists attempts integer not null default 0,
  add column if not exists last_error text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Backfill any row a previous deploy may have written: rows with a
-- processed_at were finished; the rest must become reclaimable failures.
update public.webhook_events
   set status = case when processed_at is null then 'failed' else 'completed' end,
       claimed_at = coalesce(claimed_at, processed_at, now()),
       updated_at = coalesce(updated_at, now());

alter table public.webhook_events
  alter column processed_at drop not null,
  alter column status set not null,
  alter column status set default 'processing',
  alter column claimed_at set not null,
  add constraint webhook_events_status_check
    check (status in ('processing', 'completed', 'failed'));

comment on column public.webhook_events.status is
  'Claim state: processing = leased by a handler, completed = work finished, '
  'failed = safe to reclaim on the next delivery. Nothing returns 2xx until '
  'the row is completed.';
comment on column public.webhook_events.claimed_at is
  'Start of the current claim. A processing row older than the 5 minute lease '
  'may be taken over compare-and-swap style by a retry.';
comment on column public.webhook_events.processed_at is
  'Set only when the event finished successfully; null while processing or '
  'after a failure.';
comment on column public.webhook_events.last_error is
  'Last processing failure reason (no secrets, no payload contents).';

-- The handler needs UPDATE to claim, complete and fail rows. select/insert
-- were granted when the table was created; repeating them is harmless.
-- anon/authenticated receive nothing.
grant select, insert, update on table public.webhook_events to service_role;

create index if not exists webhook_events_status_claimed_at_idx
  on public.webhook_events (status, claimed_at);

-- ------------------------------------------------------------------ --
-- 2. entitlements: service_role write path + product key alignment.    --
-- ------------------------------------------------------------------ --

-- No more implicit `product = 'soravo'`: every writer must name a catalogue
-- id (services/license-api/src/payment/catalog.ts).
alter table public.entitlements alter column product drop default;

-- Align any pre-catalogue row with its plan (ADR-012 validity is per product).
update public.entitlements
   set product = case when plan = 'lifetime' then 'soravo_lifetime'
                      else 'soravo_monthly' end
 where product = 'soravo';

-- ADR-012 (CLOUD-004 migration note): the payment server grants its own
-- service-role write path when it lands. Least privilege: write + read for the
-- webhook handler, no DELETE (reconciliation never destroys entitlements), no
-- grant option. RLS stays enabled; service_role bypasses it by role, and
-- authenticated keeps only its column-level SELECT — this grant adds nothing
-- for any client role.
grant insert, update, select on table public.entitlements to service_role;

-- Refund handling resolves an entitlement by the provider payment reference.
create index if not exists entitlements_provider_payment_ref_idx
  on public.entitlements (provider_payment_ref);

comment on column public.entitlements.product is
  'Catalogue product id (soravo_monthly | soravo_lifetime). One current row per '
  '(user_id, product), so a monthly renewal can never overwrite a lifetime row.';

-- ------------------------------------------------------------------ --
-- 3. public.admin_users(): catalogue-aware entitlement summary.        --
-- ------------------------------------------------------------------ --

create or replace function public.admin_users(
  p_search text default null,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid;
  v_page_size int := 25;
  v_max_offset int := 100000;
  v_search text;
  v_offset int;
  v_users jsonb;
  v_has_more boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'CLOUD-013: admin access required';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = v_uid and role = 'admin'
  ) then
    raise exception 'CLOUD-013: admin access required';
  end if;

  -- Normalize + bound the search input: trim, empty->NULL, truncate to a
  -- fixed 100 chars. Never echoes or interpolates beyond this.
  v_search := nullif(btrim(coalesce(p_search, '')), '');
  v_search := left(v_search, 100);

  -- Bound the offset: only non-negative, capped values are accepted so a
  -- caller cannot force an unbounded OFFSET scan.
  v_offset := coalesce(p_offset, 0);
  if v_offset < 0 then
    raise exception 'CLOUD-013: p_offset must be non-negative';
  end if;
  if v_offset > v_max_offset then
    raise exception 'CLOUD-013: p_offset may not exceed %', v_max_offset;
  end if;

  select coalesce(jsonb_agg(t.u), '[]'::jsonb) into v_users
  from (
    select
      jsonb_build_object(
        'public_user_id', p.public_user_id,
        'email', u.email,
        'display_name', p.display_name,
        'role', coalesce(p.role, 'user'),
        'account_status', case
          when u.deleted_at is not null then 'deleted'
          when u.banned_until is not null then 'banned'
          else 'active'
        end,
        'created_at', to_char(u.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'updated_at', to_char(u.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'last_sign_in_at', to_char(u.last_sign_in_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'entitlement', (
          select jsonb_build_object(
            'plan', e.plan,
            'status', e.status,
            'starts_at', to_char(e.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'expires_at', to_char(e.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          )
          from public.entitlements e
          where e.user_id = u.id
            and e.product in ('soravo_monthly', 'soravo_lifetime')
          order by (case when e.plan = 'lifetime' then 0 else 1 end), e.updated_at desc
          limit 1
        ),
        'devices', (
          select jsonb_build_object(
            'count', count(*),
            'active', count(*) filter (where d.revoked_at is null),
            'platforms', coalesce(
              (select jsonb_object_agg(p.platform, p.cnt)
               from (
                 select platform, count(*) as cnt
                 from public.devices
                 where user_id = u.id
                 group by platform
               ) p),
              '{}'::jsonb),
            'last_seen_at', to_char(max(d.last_seen_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          )
          from public.devices d
          where d.user_id = u.id
        ),
        'sessions', (
          select jsonb_build_object(
            'count', count(*),
            'active', count(*) filter (where s.revoked_at is null),
            'last_seen_at', to_char(max(s.last_seen_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          )
          from public.sessions s
          where s.user_id = u.id
        )
      ) as u
    from auth.users u
    left join public.profiles p on p.id = u.id
    where v_search is null
       or position(lower(v_search) in lower(u.email)) > 0
       or position(lower(v_search) in lower(p.public_user_id)) > 0
       or position(lower(v_search) in lower(p.display_name)) > 0
    order by lower(u.email) collate "C", u.id
    limit v_page_size + 1
    offset v_offset
  ) t;

  -- Fetch limit+1 to detect overflow; slice the extra row off when present.
  v_has_more := jsonb_array_length(v_users) > v_page_size;
  if v_has_more then
    v_users := v_users - (jsonb_array_length(v_users) - 1);
  end if;

  return jsonb_build_object(
    'users', v_users,
    'has_more', v_has_more,
    'page_size', v_page_size,
    'offset', v_offset,
    'search', v_search,
    'generated_at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
end;
$$;

comment on function public.admin_users(text, integer) is
  'CLOUD-013: admin-only jsonb user directory (WEB-009 PRD §7). Gated on '
  'authenticated + profiles.role = admin (SECURITY DEFINER per ADR-025). '
  'Literal case-insensitive substring search over email/public_user_id/'
  'display_name (bounded to 100 chars); fixed page_size 25; offset 0..100000; '
  'deterministic ORDER BY lower(email) COLLATE "C", id. Entitlement summary '
  'reads the catalogue rows (soravo_monthly / soravo_lifetime) and prefers the '
  'lifetime row. Returns only the closed field set: public_user_id/email/'
  'display_name/role/account_status/timestamps + entitlement/device/session '
  'summaries. Never internal UUIDs, provider/payment references, hashes, '
  'tokens, passwords, or metadata.';

commit;
