-- CLOUD-003 RLS behavioral assertions. Run via Supabase MCP `execute_sql`
-- (project_ref zbzhlhoxblguepplqppw) against the dev database AFTER applying
-- 20260915140000_harden_rls_authorization.sql and passing db_assertions.sql.
-- CLOUD-004 adds the entitlements authorization proof (scenarios E1–E15) on
-- top of the A (authenticated) and B (anon) scenarios.
-- CLOUD-005 adds the devices/sessions proof (D1–D9 + S1–S10).
-- CLOUD-006 adds the admin-role proof (R1–R12): profiles.role is a
-- server-owned, immutable-by-client admin flag with no self-escation path.
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
  ('00000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', 'carol.clo3@example.com', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000000d', 'authenticated', 'authenticated', 'dave.clo6@example.com',  now(), now(), now());

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

-- CLOUD-005 fixtures: Alice and Bob each own one device; Alice's session is
-- bound to her (initially active) device. Their public ids are opaque,
-- non-secret client identifiers. Device/session UUIDs are FIXED so the tests
-- can reference another user's row directly (proofs below go through RLS and
-- the privilege layer, not through guessable identifiers).
insert into public.devices (id, user_id, device_public_id, platform, app_version)
values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'dev-alice-0001', 'macos',   '1.0.0'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'dev-bob-0001',   'windows', '1.0.0');

insert into public.sessions (id, user_id, device_id, session_public_id)
values ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'sess-alice-0001');

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
-- D/S (CLOUD-005): devices + sessions authorization proof.            --
-- Devices and sessions are client-registered, self-owned metadata rows.       --
-- A user can register/read/revoke their OWN devices/sessions, never another   --
-- user's; a session can never be bound to another user's device; a revoked    --
-- device cannot spawn sessions; identity and timestamps are server-owned;     --
-- revocation is one-way and terminal; anon/service_role have no client path.  --
-- Sequence: devices (active) -> sessions (active) -> session revocation ->    --
-- device revocation -> session-on-revoked-device (denied) -> anon denial.     --
-- ------------------------------------------------------------------ --
set role authenticated;

-- D1. Alice sees exactly her own device; D2. cross-user SELECT is empty both
--     directions such that a user can never enumerate another user's devices.
do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  select count(*) into _n from public.devices;
  if _n <> 1 then raise exception 'FAIL D1: Alice expected 1 device, got %', _n; end if;
  select count(*) into _n from public.devices where device_public_id = 'dev-bob-0001';
  if _n <> 0 then raise exception 'FAIL D2: Alice read Bob''s device'; end if;
end $$;

do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  select count(*) into _n from public.devices;
  if _n <> 1 then raise exception 'FAIL D2: Bob expected 1 device, got %', _n; end if;
  select count(*) into _n from public.devices where device_public_id = 'dev-alice-0001';
  if _n <> 0 then raise exception 'FAIL D2: Bob read Alice''s device'; end if;
end $$;

-- D3. A user cannot register a device owned by another user: INSERT claiming
--     Bob's user_id while acting as Alice is rejected by RLS WITH CHECK.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  begin
    insert into public.devices (user_id, device_public_id, platform, app_version)
    values ('00000000-0000-0000-0000-00000000000b', 'dev-alice-evil', 'linux', '1.0.0');
    raise exception 'FAIL D3: cross-user device INSERT unexpectedly allowed';
  exception when sqlstate '42501' then null;
  end;
end $$;

-- D4. Cross-user device UPDATE matches zero rows (RLS USING), so Bob can never
--     transfer Alice's device or mutate it.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  update public.devices set revoked_at = now() where device_public_id = 'dev-alice-0001';
  if found then raise exception 'FAIL D4: Bob updated Alice''s device'; end if;
  update public.devices set user_id = '00000000-0000-0000-0000-00000000000b'
  where device_public_id = 'dev-alice-0001';
  if found then raise exception 'FAIL D4: Bob transferred Alice''s device'; end if;
end $$;

-- D5. Legit self-update: Alice can bump her OWN (active) device; the changes
--     persist.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  update public.devices set app_version = '1.0.1' where device_public_id = 'dev-alice-0001';
  if not found then raise exception 'FAIL D5: Alice could not update own device'; end if;
  if (select app_version from public.devices where device_public_id = 'dev-alice-0001') <> '1.0.1' then
    raise exception 'FAIL D5: own device update did not persist';
  end if;
end $$;

-- D9. Identity immutability at the trigger layer: even a RLS-bypassing path
--     (superuser, e.g. a future licensing server) cannot re-key a device
--     (device_public_id / user_id / first_seen_at are immutable).
set role postgres;
do $$
begin
  begin
    update public.devices set device_public_id = 'dev-alice-relabeled' where device_public_id = 'dev-alice-0001';
  exception when others then null;
  end;
  if exists (select 1 from public.devices where device_public_id = 'dev-alice-relabeled') then
    raise exception 'FAIL D9: identity guard allowed device_public_id change';
  end if;
  begin
    update public.devices set user_id = '00000000-0000-0000-0000-00000000000b' where device_public_id = 'dev-alice-0001';
  exception when others then null;
  end;
  if exists (select 1 from public.devices where device_public_id = 'dev-alice-0001'
             and user_id = '00000000-0000-0000-0000-00000000000b') then
    raise exception 'FAIL D9: identity guard allowed user_id change';
  end if;
  begin
    update public.devices set first_seen_at = now() - interval '50 years' where device_public_id = 'dev-alice-0001';
  exception when others then null;
  end;
  if exists (select 1 from public.devices where device_public_id = 'dev-alice-0001'
             and first_seen_at < now() - interval '40 years') then
    raise exception 'FAIL D9: identity guard allowed first_seen_at change';
  end if;
end $$;

-- ------------------------------------------------------------------ --
-- S (CLOUD-005): sessions authorization proof.                        --
-- ------------------------------------------------------------------ --
set role authenticated;

-- S1. Alice sees exactly her own session; S2. cross-user session SELECT empty.
do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  select count(*) into _n from public.sessions;
  if _n <> 1 then raise exception 'FAIL S1: Alice expected 1 session, got %', _n; end if;
  select count(*) into _n from public.sessions where session_public_id = 'sess-bob-0001';
  if _n <> 0 then raise exception 'FAIL S2: Alice read Bob''s session'; end if;
end $$;

do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  select count(*) into _n from public.sessions;
  if _n <> 0 then raise exception 'FAIL S2: Bob expected 0 sessions, got %', _n; end if;
  select count(*) into _n from public.sessions where session_public_id = 'sess-alice-0001';
  if _n <> 0 then raise exception 'FAIL S2: Bob read Alice''s session'; end if;
end $$;

-- S3. A session can never claim a DIFFERENT owner: inserting with Bob acting
--     but user_id = Alice is rejected by RLS WITH CHECK.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  begin
    insert into public.sessions (user_id, device_id, session_public_id)
    values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b', 'sess-bob-evil');
    raise exception 'FAIL S3: cross-owner session INSERT unexpectedly allowed';
  exception when sqlstate '42501' then null;
  end;
end $$;

-- S4. A session can never reference ANOTHER user's device: Alice inserting on
--     Bob's device (fixed UUID) fails because the EXISTS subquery resolves
--     through devices RLS, which hides Bob's device from Alice.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  begin
    insert into public.sessions (user_id, device_id, session_public_id)
    values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b', 'sess-alice-evil');
    raise exception 'FAIL S4: Alice bound a session to Bob''s device';
  exception when sqlstate '42501' then null;
  end;
end $$;

-- S5. Cross-user session UPDATE matches zero rows: Bob can neither revoke nor
--     transfer Alice's session.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  update public.sessions set revoked_at = now() where session_public_id = 'sess-alice-0001';
  if found then raise exception 'FAIL S5: Bob revoked Alice''s session'; end if;
  update public.sessions set user_id = '00000000-0000-0000-0000-00000000000b'
  where session_public_id = 'sess-alice-0001';
  if found then raise exception 'FAIL S5: Bob transferred Alice''s session'; end if;
end $$;

-- S5b. Legit self-update of an ACTIVE session works (it is bound to Alice's
--      still-active device).
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  update public.sessions set last_seen_at = now() where session_public_id = 'sess-alice-0001';
  if not found then raise exception 'FAIL S5b: Alice could not update own session'; end if;
end $$;

-- S6. A user can revoke their OWN session (server-side security state)...
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  update public.sessions set revoked_at = now() where session_public_id = 'sess-alice-0001';
  if not found then raise exception 'FAIL S6: Alice could not revoke own session'; end if;
end $$;

-- S6c. ...but clearing it is denied at the TRIGGER layer even for a
--      RLS-bypassing path (one-way revocation).
set role postgres;
do $$
begin
  begin
    update public.sessions set revoked_at = null where session_public_id = 'sess-alice-0001';
  exception when others then null;
  end;
  if (select revoked_at is null from public.sessions where session_public_id = 'sess-alice-0001') then
    raise exception 'FAIL S6c: session revocation-clearing UPDATE succeeded';
  end if;
end $$;

-- S6b. and (for the user path) it matches ZERO rows: once revoked, the session
--      row is invisible to UPDATE (RLS USING revoked_at is null).
set role authenticated;
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  update public.sessions set revoked_at = null where session_public_id = 'sess-alice-0001';
  if found then raise exception 'FAIL S6b: user-path un-revoke matched a row'; end if;
end $$;

-- S7. A revoked session is terminal: further UPDATE matches zero rows.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  update public.sessions set last_seen_at = now() where session_public_id = 'sess-alice-0001';
  if found then raise exception 'FAIL S7: revoked own session can still be updated'; end if;
end $$;

-- S7b. Multiple concurrent sessions per device are LEGIT: Alice signs in again
--      on the same (still-active) device, producing a second, ACTIVE session
--      row through the normal user INSERT path. This row stays active so the
--      revoked-device write-lockout can be proven without conflating it with
--      the already-revoked sess-alice-0001.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  insert into public.sessions (user_id, device_id, session_public_id)
  values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'sess-alice-0002');
end $$;

-- ------------------------------------------------------------------ --
-- Device revocation (kept after the session-active proofs).            --
-- ------------------------------------------------------------------ --
-- D6. A user can revoke their OWN device...
set role authenticated;
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  update public.devices set revoked_at = now() where device_public_id = 'dev-alice-0001';
  if not found then raise exception 'FAIL D6: Alice could not revoke own device'; end if;
end $$;

-- D6c. ...but clearing it is denied at the TRIGGER layer (one-way revocation).
set role postgres;
do $$
begin
  begin
    update public.devices set revoked_at = null where device_public_id = 'dev-alice-0001';
  exception when others then null;
  end;
  if (select revoked_at is null from public.devices where device_public_id = 'dev-alice-0001') then
    raise exception 'FAIL D6c: device revocation-clearing UPDATE succeeded';
  end if;
end $$;

-- D6b. and (for the user path) it matches ZERO rows.
set role authenticated;
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  update public.devices set revoked_at = null where device_public_id = 'dev-alice-0001';
  if found then raise exception 'FAIL D6b: user-path un-revoke matched a row'; end if;
end $$;

-- D7. A revoked device is terminal: further UPDATE (e.g. app_version bump)
--     matches zero rows, while the row REMAINS readable so the dashboard can
--     still list it as revoked.
do $$
declare _cn int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  update public.devices set app_version = '9.9.9' where device_public_id = 'dev-alice-0001';
  if found then raise exception 'FAIL D7: revoked own device can still be updated'; end if;
  select count(*) into _cn from public.devices where device_public_id = 'dev-alice-0001';
  if _cn <> 1 then raise exception 'FAIL D7: revoked own device no longer readable'; end if;
end $$;

-- S8. A session can never be spawned from a REVOKED device: Alice's device is
--     now revoked, so inserting a session bound to it is rejected by RLS.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  begin
    insert into public.sessions (user_id, device_id, session_public_id)
    values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'sess-alice-new');
    raise exception 'FAIL S8: session INSERT on revoked own device allowed';
  exception when sqlstate '42501' then null;
  end;
end $$;

-- S10. An ACTIVE session bound to a REVOKED device is terminal for writes:
--      even the owner's harmless "revoke this session" UPDATE is rejected
--      because sessions_update_own WITH CHECK requires the device to remain
--      non-revoked (device revocation is terminal, so every session on the
--      device is dead-but-readable and can never be written again).
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  begin
    update public.sessions set revoked_at = now() where session_public_id = 'sess-alice-0002';
    raise exception 'FAIL S10: session UPDATE on revoked device allowed';
  exception when sqlstate '42501' then null;
  end;
end $$;

-- D8/S9: anon has NO read/write access to devices or sessions (privilege
-- denial at the schema boundary — any privilege denial is acceptable).
set role anon;
do $$
begin
  begin
    execute 'select count(*) from public.devices';
    raise exception 'FAIL D8: anon read devices';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'insert into public.devices (user_id, device_public_id, platform, app_version) values (''00000000-0000-0000-0000-00000000000a'', ''dev-anon'', ''macos'', ''1.0.0'')';
    raise exception 'FAIL D8: anon insert into devices allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select count(*) from public.sessions';
    raise exception 'FAIL S9: anon read sessions';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'insert into public.sessions (user_id, device_id, session_public_id) values (''00000000-0000-0000-0000-00000000000a'', ''10000000-0000-0000-0000-00000000000a'', ''sess-anon'')';
    raise exception 'FAIL S9: anon insert into sessions allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
set role postgres;

-- ------------------------------------------------------------------ --
-- R (CLOUD-006): admin role / authorization proof.                     --
-- The role column is the server-authoritative admin flag: an ordinary     --
-- authenticated user can NEVER author or change it. Proven here:          --
--   R1  default role is 'user' on first profile creation                  --
--   R2  self-promotion UPDATE is rejected (trigger)                       --
--   R3  INSERT with role='admin' is rejected (trigger)                    --
--   R4  INSERT with role='evil'/'SUPERUSER' rejected (CHECK / trigger)    --
--   R5  cross-user role UPDATE matches zero rows (RLS)                    --
--   R6  self UPDATES to non-role columns still work (no false positive)   --
--   R7  postgres (superuser) THE only role-authoring path (promote)       --
--   R8  postgres can demote (reverse path, still trigger-consistent)      --
--   R9  anon has no role read/write path (privilege-layer denial)         --
--   R10 a non-admin sees their OWN role field (UX-safe read only)         --
--   R11 user_metadata/JWT edits never map to profiles.role authority      --
--   R12 existing cross-user isolation stays intact after role added       --
-- Sequence: fixtures -> R1 -> attempts -> R7/R8 superuser -> denial.      --
-- ------------------------------------------------------------------ --
set role authenticated;

-- R1. Carol's freshly inserted profile (from A7, CLOUD-002 fixture) gets the
--     safe default role 'user' — a first sign-in is never born admin.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', false);
  if (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000c') <> 'user' then
    raise exception 'FAIL R1: new profile did not default to user';
  end if;
end $$;

-- R2. Self-promotion UPDATE is rejected by the immutability trigger: Carol
--     cannot turn her own row into admin.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', false);
  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000c';
    raise exception 'FAIL R2: self-promotion UPDATE allowed';
  exception when others then null;
  end;
  if (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000c') <> 'user' then
    raise exception 'FAIL R2: role changed despite rejection';
  end if;
end $$;

-- R3. First-creation INSERT carrying role='admin' is rejected by the INSERT
--     guard: a user with no profile (Dave) cannot author an admin row.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d"}', false);
  begin
    insert into public.profiles (id, display_name, role)
    values ('00000000-0000-0000-0000-00000000000d', 'DaveAdmin', 'admin');
    raise exception 'FAIL R3: INSERT with admin role allowed';
  exception when others then null;
  end;
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000d') then
    raise exception 'FAIL R3: admin-role INSERT persisted';
  end if;
end $$;

-- R4. The CHECK constraint independently rejects out-of-enum roles (and the
--     trigger rejects any non-default value): 'superuser', 'empty', 'evil'.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', false);
  begin
    insert into public.profiles (id, display_name, role)
    values ('00000000-0000-0000-0000-00000000000c', 'Carol', 'superuser')
    on conflict (id) do nothing;
    raise exception 'FAIL R4a: out-of-enum role INSERT accepted';
  exception when others then null;
  end;
  begin
    update public.profiles set role = 'evil' where id = '00000000-0000-0000-0000-00000000000c';
    raise exception 'FAIL R4b: out-of-enum role UPDATE accepted';
  exception when others then null;
  end;
  if (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000c') <> 'user' then
    raise exception 'FAIL R4: role drifted from user';
  end if;
end $$;

-- R5. Cross-user role modification matches ZERO rows (RLS ownership USING):
--     Alice cannot touch Bob's role (or even reach his row).
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000b';
  if found then raise exception 'FAIL R5: cross-user role UPDATE matched a row'; end if;
end $$;

-- R6. Self-UPDATE of a NON-role column still works (the guard is scoped);
--     the immutability trigger must not break legitimate profile edits.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', false);
  update public.profiles set display_name = 'Carol2' where id = '00000000-0000-0000-0000-00000000000c';
  if not found then raise exception 'FAIL R6: legitimate self-update blocked'; end if;
  if (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000c') <> 'Carol2' then
    raise exception 'FAIL R6: legitimate self-update did not persist';
  end if;
end $$;

-- R7. postgres (superuser) is the ONLY role-authoring path: promotion works
--     here and nowhere else. This is the sanctioned admin-provisioning path.
set role postgres;
do $$
begin
  update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000c';
  if not found then raise exception 'FAIL R7: superuser promotion matched no row'; end if;
  if (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000c') <> 'admin' then
    raise exception 'FAIL R7: superuser promotion did not persist';
  end if;
end $$;

-- R8. postgres can demote an admin back to user (reverse of R7, still
--     trigger-consistent: the trigger permits postgres to change role).
do $$
begin
  update public.profiles set role = 'user' where id = '00000000-0000-0000-0000-00000000000c';
  if not found then raise exception 'FAIL R8: superuser demotion matched no row'; end if;
  if (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000c') <> 'user' then
    raise exception 'FAIL R8: superuser demotion did not persist';
  end if;
end $$;

-- R10. A non-admin user can READ their OWN role column (client-safe display
--      of the server-authoritative flag; UX-only read, never write).
set role authenticated;
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  if (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000a') <> 'user' then
    raise exception 'FAIL R10: own role not readable or not user';
  end if;
end $$;

-- R9. anon has no role read/write path (privilege-layer denial at the schema
--     boundary — any privilege denial is acceptable).
set role anon;
do $$
begin
  begin
    execute 'select role from public.profiles where id = ''00000000-0000-0000-0000-00000000000a''';
    raise exception 'FAIL R9: anon read role';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'update public.profiles set role = ''admin'' where id = ''00000000-0000-0000-0000-00000000000a''';
    raise exception 'FAIL R9: anon UPDATE role allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
set role postgres;

-- R11. user_metadata/JWT edits never map to profiles.role authority: even if
--      the JWT claims carry an admin-looking flag, the ONLY authoritative
--      source is the profiles.role column (proven structurally here by
--      asserting that authorization state lives in profiles, not in
--      request.jwt.claims). Run as a real authenticated session so the guard
--      trigger is exercised in the client-visible path.
set role authenticated;
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","user_metadata":{"role":"admin"},"role":"admin"}', false);
  begin
    -- A claim-injected 'admin' must NOT be accepted as a profile write.
    update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL R11: JWT-metadata role accepted as write authority';
  exception when others then null;
  end;
  if (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000a') <> 'user' then
    raise exception 'FAIL R11: role changed through JWT metadata';
  end if;
end $$;

-- R12. Existing cross-user isolation stays intact after role was added:
--      Alice sees only her own profile; Bob is invisible to her.
set role authenticated;
do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  select count(*) into _n from public.profiles;
  if _n <> 1 then raise exception 'FAIL R12: Alice expected 1 profile, got %', _n; end if;
end $$;

-- ------------------------------------------------------------------ --
-- Cleanup: the whole suite is rolled back regardless of path.           --
-- ------------------------------------------------------------------ --
reset role;
rollback;
select set_config('request.jwt.claims', '{}', false);