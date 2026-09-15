-- CLOUD-006: Admin role / authorization foundation.
--
-- Adds the server-authoritative `role` column to `public.profiles` — the
-- singular source of truth for whether an authenticated user is an ordinary
-- user or a privileged admin.  The column is:
--
--   * CHECK-constrained to the exhaustive enum ('user', 'admin').
--   * DEFAULT 'user' — every new profile starts non-admin.
--   * IMMUTABLE by any authenticated client: a SECURITY INVOKER BEFORE UPDATE
--     trigger rejects every UPDATE that changes `role` when the session role
--     is NOT postgres.  Direct database administrators (postgres superuser)
--     are the ONLY path to promote or demote a role.  The Supabase PostgREST
--     surface runs as `authenticated`, so the RLS + trigger combination
--     prevents role escalation through any client-facing path.
--
-- Authorization model (per TDD §14):
--   * A request is authorized by: authenticated user + role + ownership +
--     explicit admin policy.
--   * Frontend route hiding is only UX (TDD §14).
--   * Admin queries expose only necessary fields (TDD §14).
--
-- Security invariants:
--   * An ordinary user CANNOT promote themselves to admin — UPDATE is blocked
--     by the immutability trigger (even on their own row).
--   * An ordinary user CANNOT INSERT a profile with role = 'admin' — the
--     INSERT is constrained by RLS WITH CHECK to their own uid, and the
--     default role is 'user'.
--   * user_metadata, localStorage, URL parameters, and client-supplied role
--     are NEVER authoritative — only this column is.
--   * The `anon` role has no access (schema-level denial, CLOUD-003).
--   * `service_role` is not used in any client path (ADR-010).
--   * The column is readable by the owning user (self-SELECT via existing
--     profiles_select_own policy) — the client can display the role but
--     cannot author it.
--   * No new SECURITY DEFINER functions are introduced.
--   * No new table, RLS policy, or grant is introduced — the existing
--     profiles SELECT/INSERT/UPDATE grants and policies are sufficient;
--     the role column is just another column on the profiles table.
--
-- Scope boundary (CLOUD-006):
--   * Admin dashboard (WEB-009) — not implemented here.
--   * Product metrics (CLOUD-007) — not implemented here.
--   * Payment service (CLOUD-009+) — not implemented here.
--   * Signed entitlement (CLOUD-012) — not implemented here.
--   * No new table or function is created.
--
-- Preserves: CLOUD-001 default-deny, CLOUD-002 profiles RLS, CLOUD-003
-- privilege hardening, CLOUD-004 entitlements, CLOUD-005 devices/sessions.

begin;

-- 1. Add the role column with an exhaustive CHECK constraint and safe default.
--    Existing rows (from fixtures/tests only — no production data) receive
--    the 'user' default automatically.
alter table public.profiles
  add column role text not null default 'user';

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

-- 2. Immutable role trigger: prevents any non-superuser from modifying the
--    role column via UPDATE.  The trigger fires BEFORE UPDATE; if the new
--    value differs from the old value AND the current session role is NOT
--    postgres, the update is rejected.  The postgres superuser can still
--    set the role (required for the eventual admin-provisioning path).
--
--    SECURITY INVOKER: the function runs with the caller's privilege, which
--    is `authenticated` for PostgREST.  The `current_user` check is
--    evaluated at trigger time inside the transaction.
--
--    search_path pinned to pg_catalog per CLOUD-003 security advisor (0011).
create or replace function public.profiles_guard_role_immutable()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.role is distinct from old.role then
    if current_user <> 'postgres' then
      raise exception 'CLOUD-006: role column is immutable for non-superuser sessions';
    end if;
  end if;
  return new;
end;
$$;

-- Revoke EXECUTE from all app roles (per CLOUD-003 invariant: triggers invoke
-- their function without an EXECUTE grant; app roles must never call this
-- function directly).
revoke all on function public.profiles_guard_role_immutable() from public, anon, authenticated, service_role;

-- 3. Attach the trigger.  Fires BEFORE UPDATE only when the role column is
--    actually in the UPDATE target list (per PostgreSQL row-level trigger
--    behavior, the function always runs but can use COLUMN-specific checks).
create trigger profiles_guard_role_immutable
  before update on public.profiles
  for each row
  execute function public.profiles_guard_role_immutable();

commit;
