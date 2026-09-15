-- Runnable against the Supabase dev project (project_ref zbzhlhoxblguepplqppw)
-- via the Supabase MCP `execute_sql` tool (or `psql`). A failed assertion
-- raises an exception; an empty result with a PASS notice means every
-- assertion held.
--
-- CLOUD-001: public default-deny boundary (postgres-owned default ACLs deny
-- anon/authenticated/service_role; roles never bypass RLS).
-- CLOUD-002: `profiles` table exists with RLS enabled, self-owned policies,
-- timestamps trigger, and least-privilege grants to `authenticated` only.
-- CLOUD-003: anonymous role removed from `public` at the privilege layer
-- (anon/PUBLIC USAGE revoked), schema-less postgres function defaults revoke
-- the built-in EXECUTE-to-PUBLIC, and the timestamps trigger function has no
-- EXECUTE grant for any app role.
-- CLOUD-004: `entitlements` table exists with RLS enabled, a single self-owned
-- SELECT policy bound to auth.uid(), column-level SELECT grants limited to the
-- safe projection (identity and provider/payment columns granted to nobody),
-- invariant CHECK constraints, one (user_id, product) current row, and the
-- timestamps trigger with no EXECUTE for any app role.
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

  -- ------------------------------------------------------------------ --
  -- CLOUD-003: privilege-layer authorization hardening                  --
  -- ------------------------------------------------------------------ --

  -- 17. anon has no USAGE on the public schema (revoked explicitly and the
  --     PUBLIC grant that used to cover it is gone).
  if has_schema_privilege('anon', 'public', 'usage') then
    raise exception 'FAIL 17: anon still holds USAGE on schema public';
  end if;

  -- 18. No PUBLIC schema USAGE remains (nspacl carries no `=U` entry): the
  --     anonymous role is denied at the schema boundary, not just by RLS.
  select count(*) into _count
  from pg_namespace
  where nspname = 'public' and nspacl::text ~ '(^|[,{])=U/';
  if _count > 0 then
    raise exception 'FAIL 18: PUBLIC retains USAGE on schema public';
  end if;

  -- 19. The schema-less postgres function default carries no PUBLIC EXECUTE:
  --     future postgres-created functions do not inherit the built-in
  --     EXECUTE-to-PUBLIC (issue supabase#49338).
  select count(*) into _count
  from pg_default_acl d
  join pg_roles r on r.oid = d.defaclrole
  where r.rolname = 'postgres'
    and d.defaclnamespace = 0
    and d.defaclobjtype = 'f'
    and d.defaclacl is not null
    and d.defaclacl::text ~ '(^|,)=X/';
  if _count > 0 then
    raise exception 'FAIL 19: postgres function default still grants PUBLIC EXECUTE';
  end if;

  -- 20. profiles_set_timestamps() has no EXECUTE for anon/authenticated/
  --     service_role/PUBLIC (privileges revoked in CLOUD-003; trigger
  --     invocation does not require EXECUTE). grantee oid 0 = PUBLIC.
  select count(*) into _count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  where n.nspname = 'public'
    and p.proname = 'profiles_set_timestamps'
    and (a.grantee = 0 or a.grantee in ('anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole));
  if _count > 0 then
    raise exception 'FAIL 20: % privilege grant(s) remain on profiles_set_timestamps', _count;
  end if;

  -- ------------------------------------------------------------------ --
  -- CLOUD-004: entitlements authorization foundation                     --
  -- ------------------------------------------------------------------ --

  -- 21. entitlements exists and is a plain table.
  if to_regclass('public.entitlements') is null then
    raise exception 'FAIL 21: public.entitlements missing';
  end if;

  -- 22. entitlements has RLS enabled (implied by FAIL 2, asserted loudly).
  select count(*) into _count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'entitlements' and not c.relrowsecurity;
  if _count > 0 then
    raise exception 'FAIL 22: public.entitlements has RLS disabled';
  end if;

  -- 23. entitlements.user_id references auth.users(id) ON DELETE CASCADE.
  select count(*) into _count
  from pg_constraint
  where conrelid = 'public.entitlements'::regclass
    and contype = 'f'
    and confrelid = 'auth.users'::regclass
    and confdeltype = 'c';
  if _count <> 1 then
    raise exception 'FAIL 23: entitlements lacks FK to auth.users(id) ON DELETE CASCADE';
  end if;

  -- 24. Exactly one unique constraint on entitlements, on (user_id, product):
  --     one current entitlement per user per product.
  select count(*) into _count
  from pg_constraint
  where conrelid = 'public.entitlements'::regclass and contype = 'u';
  if _count <> 1 then
    raise exception 'FAIL 24: expected exactly 1 unique constraint on entitlements, found %', _count;
  end if;

  select count(*) into _count
  from pg_constraint c
  join unnest(c.conkey) k on true
  join pg_attribute col on col.attrelid = c.conrelid and col.attnum = k
  where c.conrelid = 'public.entitlements'::regclass and c.contype = 'u'
    and (col.attname = 'user_id' or col.attname = 'product');
  if _count <> 2 then
    raise exception 'FAIL 24: unique constraint is not on exactly (user_id, product)';
  end if;

  -- 25. All invariant CHECK constraints exist (plan type, status, provider,
  --     plan/expiry consistency, status/plan consistency, expiry >= start).
  for _acl_row in
    select conname
    from pg_constraint
    where conrelid = 'public.entitlements'::regclass and contype = 'c'
  loop
    if _acl_row.conname not in (
      'entitlements_plan_type',
      'entitlements_status_check',
      'entitlements_provider_check',
      'entitlements_plan_expiry_consistency',
      'entitlements_status_plan_consistency',
      'entitlements_expiry_not_before_start'
    ) then
      raise exception 'FAIL 25: unexpected CHECK constraint % on entitlements', _acl_row.conname;
    end if;
  end loop;
  select count(*) into _count
  from pg_constraint
  where conrelid = 'public.entitlements'::regclass and contype = 'c';
  if _count < 6 then
    raise exception 'FAIL 25: expected at least 6 CHECK constraints on entitlements, found %', _count;
  end if;

  -- 26. Privileges on entitlements are COLUMN-LEVEL only: the table's own ACL
  --     (relacl) is empty while column (attacl) privileges exist, and ONLY
  --     authenticated holds them, each exactly SELECT on the safe projection.
  --     (information_schema.role_table_grants cannot be used for the
  --     table-vs-column distinction: it also reports column grants, via
  --     has_table_privilege().)
  select count(*) into _count
  from pg_class c
  where c.oid = 'public.entitlements'::regclass and c.relacl is not null;
  if _count > 0 then
    raise exception 'FAIL 26: entitlements has table-level ACL entries (must be column-level only)';
  end if;

  select count(*) into _count
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'entitlements'
    and grantee <> current_user
    and grantee not in ('authenticated');
  if _count > 0 then
    raise exception 'FAIL 26: non-owner, non-authenticated grantee holds a column privilege on entitlements';
  end if;

  select count(*) into _count
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'entitlements'
    and grantee = 'authenticated' and privilege_type <> 'SELECT';
  if _count > 0 then
    raise exception 'FAIL 26: authenticated holds a non-SELECT column privilege on entitlements';
  end if;

  select count(*) into _count
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'entitlements'
    and grantee = 'authenticated';
  if _count <> 6 then
    raise exception 'FAIL 26: expected exactly 6 column grants for authenticated, found %', _count;
  end if;

  -- 27. The granted projection is exactly the closed safe set; identity and
  --     provider/payment columns are granted to no one (owner excluded).
  select count(*) into _count
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'entitlements'
    and grantee <> current_user
    and column_name not in ('product', 'plan', 'status', 'starts_at', 'expires_at', 'updated_at');
  if _count > 0 then
    raise exception 'FAIL 27: privilege granted on an unexpected entitlements column';
  end if;

  -- 28. Exactly one policy on entitlements: a self-owned SELECT for
  --     authenticated bound to auth.uid(); no INSERT/UPDATE/DELETE policies.
  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'entitlements';
  if _count <> 1 then
    raise exception 'FAIL 28: expected exactly 1 policy on entitlements, found %', _count;
  end if;

  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'entitlements'
    and cmd = 'SELECT' and 'authenticated' = any(roles)
    and qual like '%auth.uid()%';
  if _count <> 1 then
    raise exception 'FAIL 28: entitlements missing self-owned SELECT policy for authenticated';
  end if;

  -- 29. Timestamps trigger attached + enabled; trigger function is SECURITY
  --     INVOKER with no EXECUTE for any app role / PUBLIC.
  select count(*) into _count
  from pg_trigger
  where tgrelid = 'public.entitlements'::regclass
    and not tgisinternal
    and tgenabled = 'O'
    and tgname = 'entitlements_set_timestamps';
  if _count <> 1 then
    raise exception 'FAIL 29: entitlements timestamps trigger missing or disabled';
  end if;

  select count(*) into _count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'entitlements_set_timestamps' and p.prosecdef;
  if _count > 0 then
    raise exception 'FAIL 29: entitlements trigger function is SECURITY DEFINER';
  end if;

  select count(*) into _count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  where n.nspname = 'public'
    and p.proname = 'entitlements_set_timestamps'
    and (a.grantee = 0 or a.grantee in ('anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole));
  if _count > 0 then
    raise exception 'FAIL 29: % privilege grant(s) remain on entitlements_set_timestamps', _count;
  end if;

  -- 30. Core column type/nullability contract.
  select count(*) into _count
  from information_schema.columns
  where table_schema = 'public' and table_name = 'entitlements'
    and (
      (column_name = 'id'         and data_type = 'uuid' and is_nullable = 'NO') or
      (column_name = 'user_id'    and data_type = 'uuid' and is_nullable = 'NO') or
      (column_name = 'product'    and data_type = 'text' and is_nullable = 'NO') or
      (column_name = 'plan'       and data_type = 'text' and is_nullable = 'NO') or
      (column_name = 'status'     and data_type = 'text' and is_nullable = 'NO') or
      (column_name = 'provider'   and data_type = 'text' and is_nullable = 'NO') or
      (column_name = 'starts_at'  and data_type = 'timestamp with time zone' and is_nullable = 'NO')
    );
  if _count <> 7 then
    raise exception 'FAIL 30: entitlements core column type/nullability contract violated';
  end if;
  select count(*) into _count
  from information_schema.columns
  where table_schema = 'public' and table_name = 'entitlements'
    and column_name = 'expires_at' and data_type = 'timestamp with time zone' and is_nullable = 'YES';
  if _count <> 1 then
    raise exception 'FAIL 30: entitlements.expires_at must be a nullable timestamptz';
  end if;

  raise notice 'PASS: all CLOUD-001..CLOUD-004 database assertions held';
end $$;