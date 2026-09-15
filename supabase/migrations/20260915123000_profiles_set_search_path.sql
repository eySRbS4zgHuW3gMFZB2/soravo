-- CLOUD-002 hardening: fix mutable search_path on the profiles timestamps
-- trigger function (Supabase security advisor 0011). Restrictive
-- `set search_path = pg_catalog` keeps object resolution independent of the
-- caller's session search_path; create or replace preserves the existing
-- EXECUTE ACL (run as invoker only). Applied as its own delta because
-- 20260915120000_establish_profiles_and_rls.sql is already recorded.

begin;

create or replace function public.profiles_set_timestamps()
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

commit;