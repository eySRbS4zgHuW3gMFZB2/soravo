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
-- CLOUD-005: `devices` and `sessions` tables exist with RLS enabled, self-owned
-- SELECT/INSERT/UPDATE policies bound to auth.uid() (sessions additionally
-- require a non-revoked device via EXISTS; revoked rows are terminal), friendly
-- public-id UNIQUE constraints and CHECK invariants, and SECURITY INVOKER
-- triggers (timestamps / identity-immutability / one-way revocation) with no
-- EXECUTE for any app role.
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

  -- ------------------------------------------------------------------ --
  -- CLOUD-005: devices / sessions security model                         --
  -- ------------------------------------------------------------------ --

  -- 31. devices exists and is a plain table.
  if to_regclass('public.devices') is null then
    raise exception 'FAIL 31: public.devices missing';
  end if;
  select count(*) into _count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'devices' and c.relkind = 'r';
  if _count <> 1 then
    raise exception 'FAIL 31: public.devices is not a plain table';
  end if;

  -- 32. devices has RLS enabled.
  select count(*) into _count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'devices' and not c.relrowsecurity;
  if _count > 0 then
    raise exception 'FAIL 32: public.devices has RLS disabled';
  end if;

  -- 33. devices.user_id references auth.users(id) ON DELETE CASCADE.
  select count(*) into _count
  from pg_constraint
  where conrelid = 'public.devices'::regclass
    and contype = 'f'
    and confrelid = 'auth.users'::regclass
    and confdeltype = 'c';
  if _count <> 1 then
    raise exception 'FAIL 33: devices lacks FK to auth.users(id) ON DELETE CASCADE';
  end if;

  -- 34. devices has CHECK constraints on platform, public_id length,
  --     app_version length, and revoked_at >= first_seen_at.
  select count(*) into _count
  from pg_constraint
  where conrelid = 'public.devices'::regclass and contype = 'c';
  if _count < 4 then
    raise exception 'FAIL 34: expected at least 4 CHECK constraints on devices, found %', _count;
  end if;

  for _acl_row in
    select conname
    from pg_constraint
    where conrelid = 'public.devices'::regclass and contype = 'c'
  loop
    if _acl_row.conname not in (
      'devices_platform_check',
      'devices_public_id_length',
      'devices_app_version_length',
      'devices_revoked_at_not_before_first_seen'
    ) then
      raise exception 'FAIL 34: unexpected CHECK constraint % on devices', _acl_row.conname;
    end if;
  end loop;

  -- 35. devices.device_public_id UNIQUE constraint exists.
  select count(*) into _count
  from pg_constraint
  where conrelid = 'public.devices'::regclass
    and contype = 'u';
  if _count < 1 then
    raise exception 'FAIL 35: devices missing UNIQUE constraint on device_public_id';
  end if;

  -- 36. Only authenticated has table-level SELECT/INSERT/UPDATE on devices;
  --     no anon, no service_role, no ALL, no DELETE.
  select count(*) into _count
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'devices'
    and grantee in ('anon', 'service_role');
  if _count > 0 then
    raise exception 'FAIL 36: anon/service_role granted privileges on devices';
  end if;

  select count(*) into _count
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'devices'
    and grantee = 'authenticated'
    and privilege_type not in ('SELECT', 'INSERT', 'UPDATE');
  if _count > 0 then
    raise exception 'FAIL 36: authenticated granted unexpected privilege on devices';
  end if;

  select count(*) into _count
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'devices'
    and grantee = 'authenticated';
  if _count <> 3 then
    raise exception 'FAIL 36: expected exactly SELECT/INSERT/UPDATE grants for authenticated on devices, found %', _count;
  end if;

  -- 37. devices RLS policies: self-owned SELECT/INSERT/UPDATE for authenticated,
  --     each bound to auth.uid(); no DELETE policy.
  select count(*) into _policies
  from pg_policies
  where schemaname = 'public' and tablename = 'devices' and cmd = 'DELETE';
  if _policies > 0 then
    raise exception 'FAIL 37: devices exposes a DELETE policy';
  end if;

  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'devices'
    and cmd = 'SELECT' and 'authenticated' = any(roles)
    and qual like '%auth.uid()%';
  if _count <> 1 then
    raise exception 'FAIL 37: devices missing self-owned SELECT policy for authenticated';
  end if;

  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'devices'
    and cmd = 'INSERT' and 'authenticated' = any(roles)
    and with_check like '%auth.uid()%';
  if _count <> 1 then
    raise exception 'FAIL 37: devices missing self-owned INSERT policy for authenticated';
  end if;

  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'devices'
    and cmd = 'UPDATE' and 'authenticated' = any(roles)
    and qual like '%auth.uid()%' and with_check like '%auth.uid()%';
  if _count <> 1 then
    raise exception 'FAIL 37: devices missing self-owned UPDATE policy for authenticated';
  end if;

  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'devices';
  if _count <> 3 then
    raise exception 'FAIL 37: expected exactly 3 RLS policies on devices, found %', _count;
  end if;

  -- 38. Devices triggers (set_timestamps, guard_identity, guard_revocation)
  --     are attached, enabled, and their trigger functions are SECURITY INVOKER
  --     with no EXECUTE grant for any app role / PUBLIC.
  for _acl_row in
    select unnest(array['devices_set_timestamps', 'devices_guard_identity', 'devices_guard_revocation']) as tgname
  loop
    select count(*) into _count
    from pg_trigger
    where tgrelid = 'public.devices'::regclass
      and not tgisinternal
      and tgenabled = 'O'
      and tgname = _acl_row.tgname;
    if _count <> 1 then
      raise exception 'FAIL 38: devices trigger % missing or disabled', _acl_row.tgname;
    end if;
  end loop;

  for _acl_row in
    select unnest(array['devices_set_timestamps', 'devices_guard_identity', 'devices_guard_revocation']) as proname
  loop
    select count(*) into _count
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = _acl_row.proname and p.prosecdef;
    if _count > 0 then
      raise exception 'FAIL 38: devices trigger function % is SECURITY DEFINER', _acl_row.proname;
    end if;

    select count(*) into _count
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where n.nspname = 'public'
      and p.proname = _acl_row.proname
      and (a.grantee = 0 or a.grantee in ('anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole));
    if _count > 0 then
      raise exception 'FAIL 38: % privilege grant(s) remain on devices trigger function %', _count, _acl_row.proname;
    end if;
  end loop;

  -- 39. sessions exists and is a plain table.
  if to_regclass('public.sessions') is null then
    raise exception 'FAIL 39: public.sessions missing';
  end if;
  select count(*) into _count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'sessions' and c.relkind = 'r';
  if _count <> 1 then
    raise exception 'FAIL 39: public.sessions is not a plain table';
  end if;

  -- 40. sessions has RLS enabled.
  select count(*) into _count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'sessions' and not c.relrowsecurity;
  if _count > 0 then
    raise exception 'FAIL 40: public.sessions has RLS disabled';
  end if;

  -- 41. sessions.user_id references auth.users(id) ON DELETE CASCADE.
  select count(*) into _count
  from pg_constraint
  where conrelid = 'public.sessions'::regclass
    and contype = 'f'
    and confrelid = 'auth.users'::regclass
    and confdeltype = 'c';
  if _count <> 1 then
    raise exception 'FAIL 41: sessions lacks FK to auth.users(id) ON DELETE CASCADE';
  end if;

  -- 42. sessions.device_id references public.devices(id) ON DELETE CASCADE.
  select count(*) into _count
  from pg_constraint
  where conrelid = 'public.sessions'::regclass
    and contype = 'f'
    and confrelid = 'public.devices'::regclass
    and confdeltype = 'c';
  if _count <> 1 then
    raise exception 'FAIL 42: sessions lacks FK to public.devices(id) ON DELETE CASCADE';
  end if;

  -- 43. sessions has CHECK constraints on session_public_id length and
  --     revoked_at >= created_at.
  select count(*) into _count
  from pg_constraint
  where conrelid = 'public.sessions'::regclass and contype = 'c';
  if _count < 2 then
    raise exception 'FAIL 43: expected at least 2 CHECK constraints on sessions, found %', _count;
  end if;

  for _acl_row in
    select conname
    from pg_constraint
    where conrelid = 'public.sessions'::regclass and contype = 'c'
  loop
    if _acl_row.conname not in (
      'sessions_public_id_length',
      'sessions_revoked_at_not_before_created'
    ) then
      raise exception 'FAIL 43: unexpected CHECK constraint % on sessions', _acl_row.conname;
    end if;
  end loop;

  -- 44. sessions.session_public_id UNIQUE constraint exists.
  select count(*) into _count
  from pg_constraint
  where conrelid = 'public.sessions'::regclass
    and contype = 'u';
  if _count < 1 then
    raise exception 'FAIL 44: sessions missing UNIQUE constraint on session_public_id';
  end if;

  -- 45. Only authenticated has table-level SELECT/INSERT/UPDATE on sessions;
  --     no anon, no service_role, no ALL, no DELETE.
  select count(*) into _count
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'sessions'
    and grantee in ('anon', 'service_role');
  if _count > 0 then
    raise exception 'FAIL 45: anon/service_role granted privileges on sessions';
  end if;

  select count(*) into _count
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'sessions'
    and grantee = 'authenticated'
    and privilege_type not in ('SELECT', 'INSERT', 'UPDATE');
  if _count > 0 then
    raise exception 'FAIL 45: authenticated granted unexpected privilege on sessions';
  end if;

  select count(*) into _count
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'sessions'
    and grantee = 'authenticated';
  if _count <> 3 then
    raise exception 'FAIL 45: expected exactly SELECT/INSERT/UPDATE grants for authenticated on sessions, found %', _count;
  end if;

  -- 46. sessions RLS policies: self-owned SELECT/INSERT/UPDATE for
  --     authenticated, each bound to auth.uid(); no DELETE policy.
  --     INSERT/UPDATE additionally require a non-revoked device via EXISTS.
  select count(*) into _policies
  from pg_policies
  where schemaname = 'public' and tablename = 'sessions' and cmd = 'DELETE';
  if _policies > 0 then
    raise exception 'FAIL 46: sessions exposes a DELETE policy';
  end if;

  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'sessions'
    and cmd = 'SELECT' and 'authenticated' = any(roles)
    and qual like '%auth.uid()%';
  if _count <> 1 then
    raise exception 'FAIL 46: sessions missing self-owned SELECT policy for authenticated';
  end if;

  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'sessions'
    and cmd = 'INSERT' and 'authenticated' = any(roles)
    and with_check like '%auth.uid()%'
    and with_check ~* 'devices.*revoked_at is null';
  if _count <> 1 then
    raise exception 'FAIL 46: sessions INSERT policy must require non-revoked device via EXISTS';
  end if;

  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'sessions'
    and cmd = 'UPDATE' and 'authenticated' = any(roles)
    and qual ~* 'revoked_at is null'
    and with_check like '%auth.uid()%'
    and with_check ~* 'devices.*revoked_at is null';
  if _count <> 1 then
    raise exception 'FAIL 46: sessions UPDATE policy must use revoked_at is null in USING and require non-revoked device in WITH CHECK';
  end if;

  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'sessions';
  if _count <> 3 then
    raise exception 'FAIL 46: expected exactly 3 RLS policies on sessions, found %', _count;
  end if;

  -- 47. Sessions triggers (set_timestamps, guard_identity, guard_revocation)
  --     are attached, enabled, and their trigger functions are SECURITY INVOKER
  --     with no EXECUTE grant for any app role / PUBLIC.
  for _acl_row in
    select unnest(array['sessions_set_timestamps', 'sessions_guard_identity', 'sessions_guard_revocation']) as tgname
  loop
    select count(*) into _count
    from pg_trigger
    where tgrelid = 'public.sessions'::regclass
      and not tgisinternal
      and tgenabled = 'O'
      and tgname = _acl_row.tgname;
    if _count <> 1 then
      raise exception 'FAIL 47: sessions trigger % missing or disabled', _acl_row.tgname;
    end if;
  end loop;

  for _acl_row in
    select unnest(array['sessions_set_timestamps', 'sessions_guard_identity', 'sessions_guard_revocation']) as proname
  loop
    select count(*) into _count
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = _acl_row.proname and p.prosecdef;
    if _count > 0 then
      raise exception 'FAIL 47: sessions trigger function % is SECURITY DEFINER', _acl_row.proname;
    end if;

    select count(*) into _count
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where n.nspname = 'public'
      and p.proname = _acl_row.proname
      and (a.grantee = 0 or a.grantee in ('anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole));
    if _count > 0 then
      raise exception 'FAIL 47: % privilege grant(s) remain on sessions trigger function %', _count, _acl_row.proname;
    end if;
  end loop;

  -- 48. devices UPDATE policy requires revoked_at is null in USING (a revoked
  --     device cannot mutate its row; the one-time revocation still passes
  --     because USING evaluates the pre-update row).
  select count(*) into _count
  from pg_policies
  where schemaname = 'public' and tablename = 'devices'
    and cmd = 'UPDATE' and 'authenticated' = any(roles)
    and qual like '%auth.uid()%' and qual ~* 'revoked_at is null';
  if _count <> 1 then
    raise exception 'FAIL 48: devices UPDATE USING must include revoked_at is null';
  end if;

  raise notice 'PASS: all CLOUD-001..CLOUD-005 database assertions held';
end $$;