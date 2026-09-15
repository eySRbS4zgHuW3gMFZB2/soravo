-- CLOUD-001: database assertion suite.
--
-- Runnable against the Supabase dev project (project_ref zbzhlhoxblguepplqppw)
-- via the Supabase MCP `execute_sql` tool (or `psql`). A failed assertion
-- raises an exception; an empty result with a PASS notice means every
-- assertion held. This verifies the live security boundary established by
-- 20260915000000_establish_supabase_baseline.sql and the stock posture of
-- the fresh project. This project is fresh: no application table exists in
-- `public` yet, so the row-level checks are asserted as invariants that
-- every present or future public table must satisfy.
--
-- NOTE: `execute_sql` may return multi-statement output; expect the PASS
-- notice text and no RAISE.

do $$
declare
  _count int;
  _acl_row record;
begin
  -- 1. public schema exists (application integration anchor).
  if not exists (select 1 from pg_namespace where nspname = 'public') then
    raise exception 'FAIL 1: public schema missing';
  end if;

  -- 2. Every row-level table currently in public has RLS enabled.
  select count(*) into _count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity;
  if _count > 0 then
    raise exception 'FAIL 2: % public table(s) exist without RLS', _count;
  end if;

  -- 3. No existing public table grants privileges to anon/authenticated/service_role.
  select count(*) into _count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated', 'service_role');
  if _count > 0 then
    raise exception 'FAIL 3: % privilege grant(s) to app roles on existing public tables', _count;
  end if;

  -- 4. Default ACLs for postgres-created public tables give anon/authenticated/service_role nothing.
  for _acl_row in
    select d.defaclobjtype, r.rolname as grantee, d.defaclacl
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    join pg_roles r on r.oid = d.defaclrole
    where n.nspname = 'public' and r.rolname = 'postgres'
  loop
    if _acl_row.defaclacl is not null then
      if exists (
        select 1 from unnest(_acl_row.defaclacl) acl
        where acl::text ~ '(^|,)(anon|authenticated|service_role)='
      ) then
        raise exception 'FAIL 4: default % ACL retains app-role privileges: %', _acl_row.defaclobjtype, _acl_row.defaclacl;
      end if;
    end if;
  end loop;

  -- 5. Default ACLs for postgres-created public sequences give the roles nothing.
  --    Covered by the loop in step 4 (checks all defaclobjtype values). Complain
  --    explicitly if a sequence default ACL is present with app-role privileges.

  -- 6. Default ACLs for postgres-created public functions give the roles nothing.
  --    Covered by the loop in step 4. Assert no EXECUTE is granted by default.

  -- 7. anon does not bypass RLS.
  select count(*) into _count from pg_roles where rolname = 'anon' and rolbypassrls;
  if _count > 0 then
    raise exception 'FAIL 7: anon bypasses RLS';
  end if;

  -- 8. authenticated does not bypass RLS.
  select count(*) into _count from pg_roles where rolname = 'authenticated' and rolbypassrls;
  if _count > 0 then
    raise exception 'FAIL 8: authenticated bypasses RLS';
  end if;

  -- 9. Expected Supabase auth anchor exists (stock auth provisioning).
  if to_regclass('auth.users') is null then
    raise exception 'FAIL 9: auth.users missing';
  end if;

  -- 10. pgcrypto is installed (confirmed project baseline; used for UUID
  --     defaults by later migrations).
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    raise exception 'FAIL 10: pgcrypto not installed';
  end if;

  raise notice 'PASS: all CLOUD-001 database assertions held';
end $$;