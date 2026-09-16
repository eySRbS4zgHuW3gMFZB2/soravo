-- CLOUD-013: Admin user-directory query surface (unblocks WEB-009 PRD §7).
--
-- Additive directory capability for the admin dashboard (WEB-009): PRD §7
-- requires the dashboard's admin-only user directory to show, per user, the
-- user's unique ID, email/account identity, subscription (entitlement)
-- status, device/session information, account status, and relevant
-- timestamps. Authorization is server-side role-based (TDD §14, ADR-022),
-- and admin queries expose only the necessary fields (TDD §14). The
-- minimal, closed field set chosen here enables exactly that directory —
-- nothing else is returned, and internal identifiers/payment references are
-- never exposed. This deliberately stays a SMALL, bounded query surface
-- ("Do not build a large enterprise admin platform", PRD §7).
--
-- Two changes:
--
--   1. `public.profiles.public_user_id` — the PRD §7 / TDD §13 "user unique
--   ID": an opaque, server-generated, immutable PUBLIC identifier
--   (format `user-` + 32 hex chars, from gen_random_uuid(), length 37).
--   It follows the established `*_public_id` pattern (CLOUD-005) and is the
--   external identity the directory (and future drill-down RPCs) can use —
--   the internal auth.users UUID is never exposed to any app role. The
--   column is surfaced on the CLOUD-002 profiles table, so the existing
--   profiles SELECT grant already exposes it to the owning user (a public
--   id, like device/session public ids, is not a secret). Server-owned on
--   INSERT (a SECURITY INVOKER trigger overwrites any client-supplied
--   value) and immutable on UPDATE for EVERY session, including postgres
--   (mirrors the CLOUD-005 identity guards): a profile's public identity
--   can never be re-keyed in place.
--
--   2. `public.admin_users(p_search text default null, p_offset integer
--   default 0) returns jsonb` — the directory query. Like the CLOUD-007
--   metrics functions, it is SECURITY DEFINER (ADR-016's sanctions, now
--   extended by ADR-025: the directory, like metrics, must read across
--   users, which RLS cannot do) and gated FIRST in-body on auth.uid() +
--   `public.profiles.role = 'admin'`. Mitigations identical to CLOUD-007:
--       - gate runs first; null uid or non-admin raises
--         `CLOUD-013: admin access required` (claims injected via
--         request.jwt.claims grant nothing; stored-column authority,
--         ADR-022);
--       - EXECUTE revoked from public/anon/service_role, granted to
--         authenticated ONLY (anon additionally lacks schema USAGE,
--         CLOUD-003);
--       - search_path pinned to pg_catalog; every relation/function
--         reference schema-qualified; no dynamic SQL.
--
--   Contract (documented, deterministic, minimal):
--       * Search: `position(lower(search) in lower(col)) > 0` — literal
--         case-insensitive substring over email, public_user_id,
--         display_name. Input is trimmed, emptied to NULL, and truncated to
--         100 chars (bounded): attacker-supplied megabytes are impossible.
--       * Pagination: fixed page_size = 25 (bounded result count), fetched
--         as limit 26 + has_more slicing; offset must be >= 0 and <= 100000
--         (raises otherwise) — bounded work, fully deterministic.
--       * Ordering: `lower(email) COLLATE "C", id` — total, byte-stable
--         order so pages never drift; the response echoes page_size/offset/
--         normalized search for stateless paging clients.
--       * Per-user projection (the closed field set):
--           public_user_id, email, display_name, role, account_status
--           ('active' | 'banned' | 'deleted' derived from auth.users),
--           created_at, updated_at, last_sign_in_at, and summaries:
--           entitlement (plan/status/starts_at/expires_at for
--           product='soravo', null when absent), devices
--           (count/active/platforms/last_seen_at — platforms never contain
--           a null label), sessions (count/active/last_seen_at).
--       * NEVER returned: auth.users.id / profile ids / device/session ids
--         (internal UUIDs), provider or payment references, session hashes,
--         tokens, passwords, or raw user_metadata.
--
-- Default-deny and ADR-016 standing guards:
--   * No new tables, sequences, table grants, or policies are added.
--   * The migration adds one table COLUMN (public_user_id) to an existing
--     granted+RLS'd table and two trigger functions (SECURITY INVOKER,
--     EXECUTE revoked from every app role, search_path pinned).
--   * The single new SECURITY DEFINER function is deliberately admitted to
--     the db_assertions.sql check-16 whitelist (3 -> 4) by ADR-025.
--
-- Backfill: existing rows (fixtures only in dev) receive a generated
-- public_user_id before the NOT NULL / UNIQUE / length constraints are
-- added and before the triggers exist (so the backfill UPDATE is not
-- blocked by the immutability guard).

begin;

-- ------------------------------------------------------------------ --
-- 1. public.profiles.public_user_id (PRD §7 unique user ID).           --
-- ------------------------------------------------------------------ --

alter table public.profiles add column public_user_id text;

-- Backfill existing rows with generated opaque public ids (before NOT NULL
-- and before the triggers, so this postgres UPDATE is unblocked). Each row
-- evaluates gen_random_uuid() independently (volatile), guaranteeing a
-- distinct value; UNIQUE below enforces it regardless.
update public.profiles
set public_user_id = 'user-' || replace(gen_random_uuid()::text, '-', '')
where public_user_id is null;

alter table public.profiles alter column public_user_id set not null;

alter table public.profiles
  add constraint profiles_public_user_id_length check (char_length(public_user_id) between 8 and 200);

alter table public.profiles
  add constraint profiles_public_user_id_unique unique (public_user_id);

comment on column public.profiles.public_user_id is
  'Opaque PUBLIC account identifier (PRD §7 user unique ID), server-generated '
  'and immutable for every session. Format ''user-'' + 32 hex from '
  'gen_random_uuid(). Never an authentication secret and never an internal '
  'auth.users UUID.';

-- Server-owned on INSERT: overwrites any client-supplied value so the
-- directory identity can never be forged by a writer.
create or replace function public.profiles_set_public_user_id()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.public_user_id := 'user-' || replace(gen_random_uuid()::text, '-', '');
  return new;
end;
$$;

-- Immutable on UPDATE for EVERY session (including postgres): a profile's
-- public identity is permanent, mirroring the CLOUD-005 identity guards.
create or replace function public.profiles_guard_public_user_id_immutable()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.public_user_id is distinct from old.public_user_id then
    raise exception 'CLOUD-013: public_user_id is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.profiles_set_public_user_id() from public, anon, authenticated, service_role;
revoke all on function public.profiles_guard_public_user_id_immutable() from public, anon, authenticated, service_role;

create trigger profiles_set_public_user_id
  before insert on public.profiles
  for each row
  execute function public.profiles_set_public_user_id();

create trigger profiles_guard_public_user_id_immutable
  before update on public.profiles
  for each row
  execute function public.profiles_guard_public_user_id_immutable();

-- ------------------------------------------------------------------ --
-- 2. public.admin_users() — the admin-only directory query.            --
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
          where e.user_id = u.id and e.product = 'soravo'
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
  'deterministic ORDER BY lower(email) COLLATE "C", id. Returns only the '
  'closed field set: public_user_id/email/display_name/role/account_status/'
  'timestamps + entitlement/device/session summaries. Never internal UUIDs, '
  'provider/payment references, hashes, tokens, passwords, or metadata.';

-- ------------------------------------------------------------------ --
-- Privilege layer (CLOUD-001/003 invariants).                         --
-- Revoke the Postgres function-default PUBLIC EXECUTE and every app    --
-- role, then grant EXECUTE to authenticated ONLY (PostgREST RPC).      --
-- service_role (non-client) and anon retain no path.                  --
-- ------------------------------------------------------------------ --
revoke all on function public.admin_users(text, integer) from public, anon, authenticated, service_role;

grant execute on function public.admin_users(text, integer) to authenticated;

commit;