-- CLOUD-006: Admin role / authorization foundation — INSERT-path guard.
--
-- Delta migration: the originating migration (20260915170000) established the
-- `role` column, its CHECK constraint, and the UPDATE immutability trigger.
-- Review of the INSERT path revealed an escalation surface: `profiles_insert_own`
-- (CLOUD-002) bounds the row to `auth.uid()` but does not restrict COLUMNS, so
-- an authenticated client could INSERT a fresh row with `role = 'admin'` (the
-- CHECK constraint permits 'admin', so it would succeed). This delta widens the
-- guard trigger to BEFORE INSERT OR UPDATE:
--
--   * INSERT: a non-postgres session that explicitly supplies a `role` value
--     other than the safe default 'user' is REJECTED (escalation attempt).
--   * UPDATE: a non-postgres session that changes `role` is REJECTED
--     (immutability, as before).
--
-- postgres (superuser) remains the only role that can author or change roles.
-- SECURITY INVOKER, search_path pinned, EXECUTE revoked from all app roles —
-- unchanged invariants.

begin;

create or replace function public.profiles_guard_role_immutable()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if current_user <> 'postgres' then
    if tg_op = 'INSERT' and new.role is distinct from 'user' then
      raise exception 'CLOUD-006: role must default to user on INSERT';
    end if;
    if tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'CLOUD-006: role column is immutable for non-superuser sessions';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.profiles_guard_role_immutable() from public, anon, authenticated, service_role;

drop trigger if exists profiles_guard_role_immutable on public.profiles;

create trigger profiles_guard_role_immutable
  before insert or update on public.profiles
  for each row
  execute function public.profiles_guard_role_immutable();

commit;