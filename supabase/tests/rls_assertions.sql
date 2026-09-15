-- CLOUD-003 RLS behavioral assertions. Run via Supabase MCP `execute_sql`
-- (project_ref zbzhlhoxblguepplqppw) against the dev database AFTER applying
-- 20260915140000_harden_rls_authorization.sql and passing db_assertions.sql.
--
-- The suite impersonates the app roles by lowering the session role
-- (SET ROLE authenticated / anon / service_role) and session-scoped
-- request.jwt.claims (`set_config(..., false)`), then probes privileges and
-- RLS predicates against REAL fixture rows. Fixtures are minimal auth.users
-- rows plus profiles rows for two users (A, B); user C exists in auth.users
-- but has no profile row, so a self-INSERT can be proven end-to-end.
--
-- The entire suite runs inside a single transaction that ROLLS BACK at the
-- end, so fixtures never persist; an early failure also rolls back — no
-- cleanup is required on error. Each scenario raises on FAIL; `set role
-- postgres` starts the run, `reset role` + cleared claims leave the session
-- clean.
--
-- Post-CLOUD-003 the anonymous role is denied at the SCHEMA privilege layer
-- (USAGE revoked from anon and PUBLIC); the B-scenarios accept any privilege
-- denial so the suite stays order-independent of the migration.

set role postgres;
select set_config('request.jwt.claims', '{}', false);

begin;

-- ------------------------------------------------------------------ --
-- Fixtures (postgres is superuser; RLS disabled for this session role).  --
-- ------------------------------------------------------------------ --

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'alice.clo3@example.com', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'bob.clo3@example.com',   now(), now(), now()),
  ('00000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', 'carol.clo3@example.com', now(), now(), now());

insert into public.profiles (id, display_name)
values
  ('00000000-0000-0000-0000-00000000000a', 'Alice'),
  ('00000000-0000-0000-0000-00000000000b', 'Bob');

-- ------------------------------------------------------------------ --
-- A (authenticated): self-access works, cross-user is isolated.        --
-- ------------------------------------------------------------------ --

set role authenticated;

-- A1. Alice sees exactly her own row.
do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  select count(*) into _n from public.profiles;
  if _n <> 1 then raise exception 'FAIL A1: expected 1 row for Alice, got %', _n; end if;
end $$;

-- A2. A claims-bearing session WITHOUT `sub` (auth.uid() = null) sees zero
--     rows, never all rows.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', false);
  if (select count(*) from public.profiles) <> 0 then
    raise exception 'FAIL A2: claim-less session saw rows';
  end if;
end $$;

-- A3. Cross-user SELECT is empty both directions.
do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  select count(*) into _n from public.profiles where id = '00000000-0000-0000-0000-00000000000b';
  if _n <> 0 then raise exception 'FAIL A3: Alice read Bob''s row'; end if;
end $$;

do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  select count(*) into _n from public.profiles where id = '00000000-0000-0000-0000-00000000000a';
  if _n <> 0 then raise exception 'FAIL A3: Bob read Alice''s row'; end if;
  select count(*) into _n from public.profiles;
  if _n <> 1 then raise exception 'FAIL A3: Bob expected exactly his own row, got %', _n; end if;
end $$;

-- A4. Cross-user UPDATE matches zero rows; forcing Bob's id on Alice stays put.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  update public.profiles set display_name = 'hijacked' where id = '00000000-0000-0000-0000-00000000000a';
  if found then raise exception 'FAIL A4: Bob updated Alice''s row'; end if;
end $$;

-- A5. Self-UPDATE works and persists (writer is Alice, row is Alice's).
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  update public.profiles set display_name = 'Bobby' where id = '00000000-0000-0000-0000-00000000000b';
  if found then null; else raise exception 'FAIL A5: Bob could not update his own row'; end if;
  if (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b') <> 'Bobby' then
    raise exception 'FAIL A5: own update did not persist';
  end if;
end $$;

-- A6. Ownership transfer is blocked twice over: INSERT claiming another uid
--     fails RLS WITH CHECK, and UPDATE that reassigns the row fails too.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', false);
  begin
    insert into public.profiles (id, display_name) values ('00000000-0000-0000-0000-00000000000b', 'spoofed');
    raise exception 'FAIL A6: cross-user INSERT unexpectedly succeeded';
  exception when sqlstate '42501' then null;
  end;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  begin
    update public.profiles set id = '00000000-0000-0000-0000-00000000000a' where id = '00000000-0000-0000-0000-00000000000b';
    raise exception 'FAIL A6: ownership-transfer UPDATE unexpectedly succeeded';
  exception when sqlstate '42501' then null;
  end;
end $$;

-- A7. First-time self-INSERT passes end-to-end (owner + real FK row), and the
--     timestamps trigger fires even though the invoker holds no EXECUTE on it
--     (explicit 2000-01-01 values must be overwritten by the trigger).
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', false);
  insert into public.profiles (id, display_name, created_at, updated_at)
  values ('00000000-0000-0000-0000-00000000000c', 'Carol', '2000-01-01', '2000-01-01');
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000c'
             and (created_at = '2000-01-01' or updated_at = '2000-01-01')) then
    raise exception 'FAIL A7: trigger did not overwrite explicit timestamps on INSERT';
  end if;
end $$;

-- A8. The trigger also owns timestamps on UPDATE even though every app role
--     lost direct EXECUTE on profiles_set_timestamps (CLOUD-003).
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', false);
  update public.profiles set created_at = '2000-01-01', updated_at = '2000-01-01' where id = '00000000-0000-0000-0000-00000000000c';
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000c'
             and (created_at = '2000-01-01' or updated_at = '2000-01-01')) then
    raise exception 'FAIL A8: trigger did not overwrite server-owned timestamps';
  end if;
end $$;

-- A9. Deletion is denied at the privilege layer (no DELETE grant/policy).
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  begin
    delete from public.profiles where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL A9: authenticated DELETE unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A10. service_role has no table privileges (no client path); superuser
--      bypass of RLS is irrelevant here because it still lacks grants.
set role service_role;
do $$
begin
  begin
    execute 'select count(*) from public.profiles';
    raise exception 'FAIL A10: service_role SELECT allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
set role postgres;

-- ------------------------------------------------------------------ --
-- B (anon): denied at the privilege layer. Post-CLOUD-003 this is the   --
-- schema USAGE boundary (permission denied for schema public); the       --
-- suite accepts any privilege denial so it runs pre/post-migration.      --
-- ------------------------------------------------------------------ --
set role anon;

do $$
begin
  begin
    execute 'select count(*) from public.profiles';
    raise exception 'FAIL B1: anon SELECT allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'insert into public.profiles (id) values (''00000000-0000-0000-0000-00000000000d'')';
    raise exception 'FAIL B2: anon INSERT allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'update public.profiles set display_name = ''x''';
    raise exception 'FAIL B3: anon UPDATE allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ------------------------------------------------------------------ --
-- Cleanup: the whole suite is rolled back regardless of path.           --
-- ------------------------------------------------------------------ --
reset role;
rollback;
select set_config('request.jwt.claims', '{}', false);