-- Runnable against the Supabase dev project (project_ref zbzhlhoxblguepplqppw)
-- via the Supabase MCP `execute_sql` tool (or `psql`). A failed assertion
-- raises an exception; an empty result with a PASS notice means every
-- assertion held.
--
-- CLOUD-001: public default-deny boundary (postgres-owned default ACLs deny
-- anon/authenticated/service_role; roles never bypass RLS).
-- CLOUD-002: `profiles` table exists with RLS enabled, self-owned policies,
-- timestamps trigger, and least-privilege grants to `authenticated` only.
--
-- NOTE: `execute_sql` may return multi-statement output; expect the PASS
-- notice text and no RAISE.

do $$
declare
  _count int;
  _acl_row record;
  _role_grants record;
  _policies int;
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

  -- 3. Public tables grant NOTHING to anon (anonymous access stays denied).
  select count(*) into _count
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon';
  if _count > 0 then
    raise exception 'FAIL 3: % privilege grant(s) to anon on public tables', _count;
  end if;

  -- 4. Any public table granted to authenticated has RLS enabled.
  for _role_grants in
    select distinct g.table_name
    from information_schema.role_table_grants g
    where g.table_schema = 'public' and g.grantee = 'authenticated'
  loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = _role_grants.table_name
        and c.relrowsecurity
    ) then
      raise exception 'FAIL 4: % granted to authenticated without RLS', _role_grants.table_name;
    end if;
  end loop;

  -- 5. Default ACLs for postgres-created public objects retain the app-role deny.
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
        raise exception 'FAIL 5: default % ACL retains app-role privileges: %', _acl_row.defaclobjtype, _acl_row.defaclacl;
      end if;
    end if;
  end loop;

  -- 6. anon does not bypass RLS.
  select count(*) into _count from pg_roles where rolname = 'anon' and rolbypassrls;
  if _count > 0 then
    raise exception 'FAIL 6: anon bypasses RLS';
  end if;

  -- 7. authenticated does not bypass RLS.
  select count(*) into _count from pg_roles where rolname = 'authenticated' and rolbypassrls;
  if _count > 0 then
    raise exception 'FAIL 7: authenticated bypasses RLS';
  end if;

  -- 8. Expected Supabase auth anchor exists (stock auth provisioning).
  if to_regclass('auth.users') is null then
    raise exception 'FAIL 8: auth.users missing';
  end if;

  -- 9. pgcrypto is installed (UUID defaults for later migrations).
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    raise exception 'FAIL 9: pgcrypto not installed';
  end if;

  -- ------------------------------------------------------------------ --
  -- CLOUD-002: profiles account foundation and RLS model                --
  -- ------------------------------------------------------------------ --

  -- 10. profiles exists and is a regular table.
  if to_regclass('public.profiles') is null then
    raise exception 'FAIL 10: public.profiles missing';
  end if;
  select count(*) into _count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'profiles' and c.relkind = 'r';
  if _count <> 1 then
    raise exception 'FAIL 10: public.profiles is not a plain table';
  end if;

  -- 11. profiles has RLS enabled (already implied by FAIL 2, asserted loudly).
  select count(*) into _count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'profiles' and not c.relrowsecurity;
  if _count > 0 then
    raise exception 'FAIL 11: public.profiles has RLS disabled';
  end if;

  -- 12. profiles id references auth.users(id) with ON DELETE CASCADE.
  select count(*) into _count
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'f'
    and confrelid = 'auth.users'::regclass
    and confdeltype = 'c';
  if _count <> 1 then
    raise exception 'FAIL 12: profiles lacks FK to auth.users(id) ON DELETE CASCADE';
  end if;

  -- 13. Only authenticated has privileges on profiles, and exactly
  --     {SELECT, INSERT, UPDATE} — no anon, no service_role, no ALL.
  select count(*) into _count
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'profiles'
    and grantee in ('anon', 'service_role');
  if _count > 0 then
    raise exception 'FAIL 13: anon/service_role granted privileges on profiles';
  end if;

  select count(*) into _count
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'profiles'
    and grantee = 'authenticated'
    and privilege_type not in ('SELECT', 'INSERT', 'UPDATE');
  if _count > 0 then
    raise exception 'FAIL 13: authenticated granted unexpected privilege on profiles';
  end if;

  select count(*) into _count
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'profiles'
    and grantee = 'authenticated';
  if _count <> 3 then
    raise exception 'FAIL 13: expected exactly SELECT/INSERT/UPDATE grants for authenticated, found %', _count;
  end if;

  -- 14. Profiles policies: self-owned SELECT (using auth.uid()), self-owned
  --     INSERT (WITH CHECK auth.uid()), self-owned UPDATE (USING + WITH CHECK),
  --     and NO DELETE policy.
  select count(*) into _policies
  from pg_policies
  where schemaname = 'public' and tablename = 'profiles' and cmd = 'DELETE';
  if _policies > 0 then
    raise exception 'FAIL 14: profiles exposes a DELETE policy';
  end if;

  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'profiles'
    and cmd = 'SELECT' and 'authenticated' = any(roles)
    and qual like '%auth.uid()%';
  if _count <> 1 then
    raise exception 'FAIL 14: profiles missing self-owned SELECT policy for authenticated';
  end if;

  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'profiles'
    and cmd = 'INSERT' and 'authenticated' = any(roles)
    and with_check like '%auth.uid()%';
  if _count <> 1 then
    raise exception 'FAIL 14: profiles missing self-owned INSERT policy for authenticated';
  end if;

  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'profiles'
    and cmd = 'UPDATE' and 'authenticated' = any(roles)
    and qual like '%auth.uid()%' and with_check like '%auth.uid()%';
  if _count <> 1 then
    raise exception 'FAIL 14: profiles missing self-owned UPDATE policy for authenticated';
  end if;

  -- 15. Timestamps trigger is attached and enabled on profiles.
  select count(*) into _count
  from pg_trigger
  where tgrelid = 'public.profiles'::regclass
    and not tgisinternal
    and tgenabled = 'O'
    and tgname = 'profiles_set_timestamps';
  if _count <> 1 then
    raise exception 'FAIL 15: profiles timestamps trigger missing or disabled';
  end if;

  -- 16. No SECURITY DEFINER functions exist in public (invariant).
  select count(*) into _count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef;
  if _count > 0 then
    raise exception 'FAIL 16: % SECURITY DEFINER function(s) in public', _count;
  end if;

  raise notice 'PASS: all CLOUD-002 database assertions held';
end $$;