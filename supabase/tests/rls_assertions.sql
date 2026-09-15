-- CLOUD-003 RLS behavioral assertions. Run via Supabase MCP `execute_sql`
-- (project_ref zbzhlhoxblguepplqppw) against the dev database AFTER applying
-- 20260915140000_harden_rls_authorization.sql and passing db_assertions.sql.
-- CLOUD-004 adds the entitlements authorization proof (scenarios E1–E15) on
-- top of the A (authenticated) and B (anon) scenarios.
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

-- CLOUD-004 fixtures: Alice holds a monthly subscription (active, expiring in
-- the future); Bob holds a lifetime entitlement (expires_at NULL). A third
-- monthly row for Carol is introduced by the trigger scenario E15. A user with
-- NO entitlement row is the free state; there are no 'free' rows.
insert into public.entitlements (user_id, product, plan, status, provider, provider_customer_ref, provider_payment_ref, starts_at, expires_at)
values
  ('00000000-0000-0000-0000-00000000000a', 'soravo', 'monthly', 'active', 'razorpay', 'cus_alice_clo4', 'pay_alice_clo4', now() - interval '2 days', now() + interval '28 days'),
  ('00000000-0000-0000-0000-00000000000b', 'soravo', 'lifetime', 'active', 'razorpay', 'cus_bob_clo4',   'pay_bob_clo4',   now(),                    null);

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
-- E (CLOUD-004): entitlements authorization proof.                      --
-- The entitlements read path is a column-level SELECT grant for the safe  --
-- projection only + one self-owned RLS policy. Alice may read her own row  --
-- (plan/status/expiry), never identifiers or provider references, never   --
-- with SELECT *, and can never INSERT/UPDATE/DELETE. RLS + column         --
-- privileges together prove the CLOUD-004 objective: a client cannot      --
-- fabricate or transfer paid access.                                      --
-- ------------------------------------------------------------------ --
set role authenticated;

-- E1. Alice reads her own entitlement through the safe projection.
do $$
declare _n int; _p text; _s text;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  select count(*) into _n from public.entitlements;
  if _n <> 1 then raise exception 'FAIL E1: Alice expected exactly 1 entitlement, got %', _n; end if;
  select plan, status into _p, _s from public.entitlements;
  if _p <> 'monthly' or _s <> 'active' then
    raise exception 'FAIL E1: Alice entitlement mismatch plan=% status=%', _p, _s;
  end if;
end $$;

-- E2. Cross-user isolation: neither user can see the other's entitlement row
--     through the safe projection (RLS filters before column privileges).
do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  select count(*) into _n from public.entitlements;
  if _n <> 1 then raise exception 'FAIL E2: Alice saw % entitlements (Bob leaked?)', _n; end if;
end $$;

do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  select count(*) into _n from public.entitlements;
  if _n <> 1 then raise exception 'FAIL E2: Bob saw % entitlements (Alice leaked?)', _n; end if;
end $$;

-- E3. Identity and provider/payment columns are NOT granted; referencing them
--     (directly, or in a WHERE) is denied at the column-privilege layer.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  begin
    execute 'select provider from public.entitlements';
    raise exception 'FAIL E3: Alice read provider';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select provider_customer_ref from public.entitlements';
    raise exception 'FAIL E3: Alice read provider_customer_ref';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select provider_payment_ref from public.entitlements';
    raise exception 'FAIL E3: Alice read provider_payment_ref';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select id from public.entitlements';
    raise exception 'FAIL E3: Alice read id';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select user_id from public.entitlements';
    raise exception 'FAIL E3: Alice read user_id';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select plan from public.entitlements where user_id = ''00000000-0000-0000-0000-00000000000b''';
    raise exception 'FAIL E3: Alice referenced user_id in WHERE';
  exception when insufficient_privilege then null;
  end;
end $$;

-- E4. SELECT * is denied while restricted to column privileges.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  begin
    execute 'select * from public.entitlements';
    raise exception 'FAIL E4: SELECT * allowed on entitlements';
  exception when insufficient_privilege then null;
  end;
end $$;

-- E5. A user cannot INSERT an entitlement (free -> paid escalation blocked).
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  begin
    insert into public.entitlements (user_id, product, plan, provider, provider_customer_ref, provider_payment_ref)
    values ('00000000-0000-0000-0000-00000000000a', 'soravo', 'lifetime', 'razorpay', 'x', 'y');
    raise exception 'FAIL E5: Alice self-INSERT allowed (free->lifetime)';
  exception when insufficient_privilege then null;
  end;
end $$;

-- E6. A user cannot UPDATE (escalate a row, or steal another user's row).
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  begin
    update public.entitlements
      set plan = 'lifetime', status = 'active', expires_at = null
      where user_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL E6: Alice UPDATE allowed (escalation)';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.entitlements
      set user_id = '00000000-0000-0000-0000-00000000000a'
      where user_id = '00000000-0000-0000-0000-00000000000b';
    raise exception 'FAIL E6: ownership-transfer UPDATE allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- E7. A user cannot DELETE an entitlement row.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  begin
    delete from public.entitlements;
    raise exception 'FAIL E7: authenticated DELETE allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- E8. Bob reads his own lifetime entitlement (expires_at NULL) safely.
do $$
declare _p text; _e timestamptz;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  select plan, expires_at into _p, _e from public.entitlements;
  if _p <> 'lifetime' or _e is not null then
    raise exception 'FAIL E8: Bob lifetime mismatch plan=% expires_at=%', _p, _e;
  end if;
end $$;

-- E9. A claims-bearing authenticated session WITHOUT sub (auth.uid() = null)
--     sees zero entitlement rows, never all rows.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', false);
  if (select count(*) from public.entitlements) <> 0 then
    raise exception 'FAIL E9: claim-less session saw entitlement rows';
  end if;
end $$;

-- E10. anon is denied entitlements access (any privilege denial, per
--      CLOUD-003's schema-boundary lockout).
set role anon;
do $$
begin
  begin
    execute 'select count(*) from public.entitlements';
    raise exception 'FAIL E10: anon accessed entitlements';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'insert into public.entitlements (user_id, product, plan, provider, provider_customer_ref, provider_payment_ref) values (''00000000-0000-0000-0000-00000000000d'',''soravo'',''lifetime'',''razorpay'',''x'',''y'')';
    raise exception 'FAIL E10: anon INSERT into entitlements allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
set role postgres;

-- E11. service_role has no entitlements privileges (no client path).
set role service_role;
do $$
begin
  begin
    execute 'select count(*) from public.entitlements';
    raise exception 'FAIL E11: service_role accessed entitlements';
  exception when insufficient_privilege then null;
  end;
end $$;
set role postgres;

-- E12. CHECK constraints reject impossible (plan, status, expires_at) states
--      even for the server role — the DB, not the payment client, is the
--      invariant boundary.
do $$
begin
  begin
    insert into public.entitlements (user_id, product, plan, status, provider, provider_customer_ref, provider_payment_ref, expires_at)
    values ('00000000-0000-0000-0000-00000000000c', 'soravo', 'lifetime', 'active', 'razorpay', 'c', 'p', now());
    raise exception 'FAIL E12: lifetime with expires_at accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.entitlements (user_id, product, plan, status, provider, provider_customer_ref, provider_payment_ref)
    values ('00000000-0000-0000-0000-00000000000c', 'soravo', 'monthly', 'active', 'razorpay', 'c', 'p');
    raise exception 'FAIL E12: monthly without expires_at accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.entitlements (user_id, product, plan, status, provider, provider_customer_ref, provider_payment_ref)
    values ('00000000-0000-0000-0000-00000000000c', 'soravo', 'lifetime', 'expired', 'razorpay', 'c', 'p');
    raise exception 'FAIL E12: lifetime+expired accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.entitlements (user_id, product, plan, status, provider, provider_customer_ref, provider_payment_ref)
    values ('00000000-0000-0000-0000-00000000000c', 'soravo', 'free', 'active', 'razorpay', 'c', 'p');
    raise exception 'FAIL E12: plan ''free'' accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.entitlements (user_id, product, plan, status, provider, provider_customer_ref, provider_payment_ref, expires_at)
    values ('00000000-0000-0000-0000-00000000000c', 'soravo', 'monthly', 'expired', 'razorpay', 'c', 'p', now() - interval '1 day');
    raise exception 'FAIL E12: expires_at before starts_at accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.entitlements (user_id, product, plan, status, provider, provider_customer_ref, provider_payment_ref, expires_at)
    values ('00000000-0000-0000-0000-00000000000c', 'soravo', 'monthly', 'active', 'stripe', 'c', 'p', now() + interval '30 days');
    raise exception 'FAIL E12: provider ''stripe'' accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.entitlements (user_id, product, plan, status, provider, provider_customer_ref, provider_payment_ref, expires_at)
    values ('00000000-0000-0000-0000-00000000000c', 'soravo', 'monthly', 'weird', 'razorpay', 'c', 'p', now() + interval '30 days');
    raise exception 'FAIL E12: status ''weird'' accepted';
  exception when check_violation then null;
  end;
end $$;

-- E13. One current entitlement per user per product: a duplicate is rejected.
do $$
begin
  begin
    insert into public.entitlements (user_id, product, plan, status, provider, provider_customer_ref, provider_payment_ref, expires_at)
    values ('00000000-0000-0000-0000-00000000000a', 'soravo', 'monthly', 'active', 'razorpay', 'c2', 'p2', now() + interval '30 days');
    raise exception 'FAIL E13: duplicate (user_id, product) entitlement accepted';
  exception when unique_violation then null;
  end;
end $$;

-- E14. The DB still permits the LEGITIMATE server-owned transitions (applied
--      as postgres): monthly renewal extends the expiry; a monthly entitlement
--      can be upgraded to lifetime; a lifetime can be revoked. The CHECK model
--      guards reachable states without blocking the sanctioned payment path.
do $$
begin
  update public.entitlements
    set expires_at = now() + interval '30 days'
    where user_id = '00000000-0000-0000-0000-00000000000a' and product = 'soravo';
  if not found then raise exception 'FAIL E14: monthly renewal updated no row'; end if;

  update public.entitlements
    set plan = 'lifetime', status = 'active', expires_at = null
    where user_id = '00000000-0000-0000-0000-00000000000a' and product = 'soravo';
  if not found then raise exception 'FAIL E14: monthly->lifetime upgrade updated no row'; end if;

  update public.entitlements
    set status = 'revoked'
    where user_id = '00000000-0000-0000-0000-00000000000b' and product = 'soravo';
  if not found then raise exception 'FAIL E14: lifetime revocation updated no row'; end if;

  if not exists (
    select 1 from public.entitlements
    where user_id = '00000000-0000-0000-0000-00000000000a'
      and plan = 'lifetime' and status = 'active' and expires_at is null
  ) then
    raise exception 'FAIL E14: upgraded entitlement state unexpected';
  end if;
end $$;

-- E15. The timestamps trigger owns created_at/updated_at on INSERT and UPDATE
--      even though every app role lost direct EXECUTE (CLOUD-003/004). Carol
--      (no entitlement yet) receives her row with spoofed timestamps, which
--      must be overwritten.
do $$
begin
  insert into public.entitlements (user_id, product, plan, status, provider, provider_customer_ref, provider_payment_ref, starts_at, expires_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-00000000000c', 'soravo', 'monthly', 'active', 'razorpay', 'cus_carol_clo4', 'pay_carol_clo4', now() - interval '1 day', now() + interval '30 days', '2000-01-01', '2000-01-01');

  if exists (select 1 from public.entitlements where user_id = '00000000-0000-0000-0000-00000000000c'
             and (created_at = '2000-01-01' or updated_at = '2000-01-01')) then
    raise exception 'FAIL E15: trigger did not overwrite timestamps on INSERT';
  end if;

  update public.entitlements set created_at = '2000-01-01', updated_at = '2000-01-01'
  where user_id = '00000000-0000-0000-0000-00000000000c';

  if exists (select 1 from public.entitlements where user_id = '00000000-0000-0000-0000-00000000000c'
             and (created_at = '2000-01-01' or updated_at = '2000-01-01')) then
    raise exception 'FAIL E15: trigger did not overwrite timestamps on UPDATE';
  end if;
end $$;

-- ------------------------------------------------------------------ --
-- Cleanup: the whole suite is rolled back regardless of path.           --
-- ------------------------------------------------------------------ --
reset role;
rollback;
select set_config('request.jwt.claims', '{}', false);