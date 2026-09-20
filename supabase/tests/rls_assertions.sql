-- CLOUD-003 RLS behavioral assertions. Run via Supabase MCP `execute_sql`
-- (project_ref zbzhlhoxblguepplqppw) against the dev database AFTER applying
-- 20260915140000_harden_rls_authorization.sql and passing db_assertions.sql.
-- CLOUD-004 adds the entitlements authorization proof (scenarios E1–E15) on
-- top of the A (authenticated) and B (anon) scenarios.
-- CLOUD-005 adds the devices/sessions proof (D1–D9 + S1–S10).
-- CLOUD-006 adds the admin-role proof (R1–R12): profiles.role is a
-- server-owned, immutable-by-client admin flag with no self-escation path.
-- CLOUD-007 adds the product-metrics proof (M1–M10): three SECURITY DEFINER
-- functions (admin_metrics_totals / admin_metrics_growth /
-- admin_metrics_active_users) aggregate across users for an ADMIN only —
-- anon and service_role are denied at the privilege layer, non-admin
-- authenticated sessions and claim-tampered sessions are denied in-body, and
-- the aggregate counts plus bucket/window semantics are exact.
-- CLOUD-013 adds the admin user-directory proof (U1–U21): the new
-- `profiles.public_user_id` (server-generated, immutable) and the
-- `admin_users(p_search, p_offset)` SECURITY DEFINER RPC (ADR-025) which
-- serves the WEB-009 admin user directory across users for an ADMIN only.
-- The U-block proves: anon/service_role privilege denial, non-admin and
-- claim-tampered in-body denial with the CLOUD-013 gate error, admin allow
-- with the exact closed projection (search by email/public_user_id/
-- display_name; case-insensitivity), bounded search/pagination (25/page,
-- offset 0..100000, has_more, deterministic ORDER BY), account status
-- derivation (active/banned/deleted), entitlement/device/session summary
-- exactness, strict data minimization (no internal UUIDs, provider refs, or
-- sensitive fields), and the public_user_id server-owned + immutable
-- contract.
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
    values ('00000000-0000-0000-0000-00000000000c', 'soravo', 'monthly', 'weird', 'stripe', 'c', 'p', now() + interval '30 days');
    raise exception 'FAIL E12: status ''weird'' accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.entitlements (user_id, product, plan, status, provider, provider_customer_ref, provider_payment_ref, expires_at)
    values ('00000000-0000-0000-0000-00000000000c', 'soravo', 'monthly', 'active', '', 'c', 'p', now() + interval '30 days');
    raise exception 'FAIL E12: empty provider accepted';
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
-- M (CLOUD-007): product metrics authorization proof.                  --
-- The metrics functions (ADR-016) are SECURITY DEFINER because RLS can    --
-- never aggregate across users; each function gates on auth.uid() +       --
-- public.profiles.role = 'admin' FIRST. Anon/service_role hold no         --
-- EXECUTE; non-admin sessions are denied in-body; injected JWT claims     --
-- grant nothing. Proven here (admin = Erin, ordinary = Frank/Gina):       --
--   M1 anon denied (schema/privilege layer)                               --
--   M2 ordinary authenticated user denied (in-body gate)                  --
--   M3 admin allowed; totals() exact across the accumulated suite state   --
--   M4 tampered JWT claims (role/user_metadata) add no authority          --
--   M5 growth('day') exact UTC calendar buckets                           --
--   M6 invalid bucket rejected                                            --
--   M7 growth week/month buckets + 10000-bucket cap                       --
--   M8 active_users: half-open windows, lower-inclusive, upper-exclusive  --
--   M9 service_role denied (privilege layer)                              --
--   M10 postgres (owner) without claims denied by the in-body gate       --
-- ------------------------------------------------------------------ --
set role postgres;
select set_config('request.jwt.claims', '{}', false);

-- Fixtures: backdated auth.users.created_at drives growth; Frank's device
-- and session are backdated with their timestamp triggers DISABLED because
-- devices_set_timestamps/sessions_set_timestamps overwrite (profiles rows
-- only need now(), so their triggers stay enabled). Dave is re-dated into a
-- later week to give the week-bucket test a second bucket.
insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-00000000000e', 'authenticated', 'authenticated', 'erin.clo7@example.com', now(), '2026-01-01 09:00:00+00', '2026-01-01 09:00:00+00'),
  ('00000000-0000-0000-0000-00000000000f', 'authenticated', 'authenticated', 'frank.clo7@example.com', now(), '2026-01-01 22:00:00+00', '2026-01-01 22:00:00+00'),
  ('00000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'gina.clo7@example.com',  now(), '2026-01-02 05:00:00+00', '2026-01-02 05:00:00+00');

insert into public.profiles (id, display_name, role)
values
  ('00000000-0000-0000-0000-00000000000e', 'Erin',  'admin'),
  ('00000000-0000-0000-0000-00000000000f', 'Frank', 'user'),
  ('00000000-0000-0000-0000-000000000010', 'Gina',  'user');

update auth.users
set created_at = '2026-01-06 00:00:00+00', updated_at = '2026-01-06 00:00:00+00'
where id = '00000000-0000-0000-0000-00000000000d';

alter table public.devices disable trigger devices_set_timestamps;
insert into public.devices (id, user_id, device_public_id, platform, app_version, first_seen_at, last_seen_at)
values ('10000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000f', 'dev-frank-0001', 'linux', '1.0.0', '2026-01-01 11:00:00+00', '2026-01-01 11:00:00+00');
alter table public.devices enable trigger devices_set_timestamps;

alter table public.sessions disable trigger sessions_set_timestamps;
insert into public.sessions (id, user_id, device_id, session_public_id, created_at, last_seen_at)
values ('20000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000f', '10000000-0000-0000-0000-00000000000f', 'sess-frank-0001', '2026-01-01 11:30:00+00', '2026-01-01 12:00:00+00');
alter table public.sessions enable trigger sessions_set_timestamps;

-- M1. anon cannot invoke any metrics function (schema privilege layer).
set role anon;
do $$
begin
  begin
    execute 'select public.admin_metrics_totals()';
    raise exception 'FAIL M1: anon called totals';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.admin_metrics_growth(''day''::text, ''2026-01-01''::timestamptz, ''2026-01-03''::timestamptz)';
    raise exception 'FAIL M1: anon called growth';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.admin_metrics_active_users(''2026-01-01''::timestamptz, ''2026-01-02''::timestamptz)';
    raise exception 'FAIL M1: anon called active_users';
  exception when insufficient_privilege then null;
  end;
end $$;
set role postgres;

-- M2. An ordinary authenticated user (Frank, profiles.role = 'user') holds
--      EXECUTE but is denied IN-BODY with the CLOUD-007 gate error.
set role authenticated;
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000f"}', false);
  begin
    perform public.admin_metrics_totals();
    raise exception 'FAIL M2: non-admin called totals';
  exception when others then
    if sqlerrm not like '%CLOUD-007%' then raise exception 'FAIL M2: unexpected error %', sqlerrm; end if;
  end;
  begin
    perform public.admin_metrics_growth('day', '2026-01-01', '2026-01-03');
    raise exception 'FAIL M2: non-admin called growth';
  exception when others then
    if sqlerrm not like '%CLOUD-007%' then raise exception 'FAIL M2: unexpected error %', sqlerrm; end if;
  end;
  begin
    perform public.admin_metrics_active_users('2026-01-01', '2026-01-02');
    raise exception 'FAIL M2: non-admin called active_users';
  exception when others then
    if sqlerrm not like '%CLOUD-007%' then raise exception 'FAIL M2: unexpected error %', sqlerrm; end if;
  end;
end $$;

-- M3. An admin (Erin) is allowed; totals() reflects the accumulated suite
--      state exactly: alice was E14-upgraded to a lifetime-active license,
--      bob's lifetime was revoked (E14), carol holds an active monthly
--      (E15); alice's device is revoked (D6), bob's and frank's are active.
do $$
declare _j jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j := public.admin_metrics_totals();

  if (_j->>'total_users')::int <> 7 then raise exception 'FAIL M3: total_users=%, want 7', _j->>'total_users'; end if;
  if (_j->>'paid_users')::int  <> 2 then raise exception 'FAIL M3: paid_users=%, want 2', _j->>'paid_users'; end if;

  if (_j#>>'{subscriptions,active}')::int    <> 1 then raise exception 'FAIL M3: subscriptions.active wrong'; end if;
  if (_j#>>'{subscriptions,cancelled}')::int <> 0 then raise exception 'FAIL M3: subscriptions.cancelled wrong'; end if;
  if (_j#>>'{subscriptions,expired}')::int   <> 0 then raise exception 'FAIL M3: subscriptions.expired wrong'; end if;
  if (_j#>>'{subscriptions,total}')::int     <> 1 then raise exception 'FAIL M3: subscriptions.total wrong'; end if;

  if (_j#>>'{lifetime,active}')::int  <> 1 then raise exception 'FAIL M3: lifetime.active wrong'; end if;
  if (_j#>>'{lifetime,revoked}')::int <> 1 then raise exception 'FAIL M3: lifetime.revoked wrong'; end if;
  if (_j#>>'{lifetime,total}')::int   <> 2 then raise exception 'FAIL M3: lifetime.total wrong'; end if;

  if (_j#>>'{devices,total}')::int   <> 3 then raise exception 'FAIL M3: devices.total wrong'; end if;
  if (_j#>>'{devices,revoked}')::int <> 1 then raise exception 'FAIL M3: devices.revoked wrong'; end if;
  if (_j#>>'{devices,by_platform,macos}')::int   <> 1 then raise exception 'FAIL M3: platform macos wrong'; end if;
  if (_j#>>'{devices,by_platform,windows}')::int <> 1 then raise exception 'FAIL M3: platform windows wrong'; end if;
  if (_j#>>'{devices,by_platform,linux}')::int   <> 1 then raise exception 'FAIL M3: platform linux wrong'; end if;
end $$;

-- M4. JWT claims (role:admin / user_metadata.role) never map to authority:
--      Frank with admin-looking claims is still denied because the stored
--      profiles.role is 'user'.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000f","role":"admin","user_metadata":{"role":"admin"}}', false);
  begin
    perform public.admin_metrics_totals();
    raise exception 'FAIL M4: tampered JWT claims authorized';
  exception when others then
    if sqlerrm not like '%CLOUD-007%' then raise exception 'FAIL M4: unexpected error %', sqlerrm; end if;
  end;
end $$;

-- M5. growth('day') over [2026-01-01, 2026-01-03): calendar-aligned UTC
--      buckets -> 01-01 = Erin+Frank = 2; 01-02 = Gina = 1; nothing else.
do $$
declare _b timestamptz; _n bigint; _rows int := 0;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  for _b, _n in
    select * from public.admin_metrics_growth('day', '2026-01-01'::timestamptz, '2026-01-03'::timestamptz)
  loop
    _rows := _rows + 1;
    if _b = '2026-01-01 00:00:00+00'::timestamptz and _n <> 2 then
      raise exception 'FAIL M5: day bucket 01-01 = %, want 2', _n;
    end if;
    if _b = '2026-01-02 00:00:00+00'::timestamptz and _n <> 1 then
      raise exception 'FAIL M5: day bucket 01-02 = %, want 1', _n;
    end if;
    if _b not in ('2026-01-01 00:00:00+00'::timestamptz, '2026-01-02 00:00:00+00'::timestamptz) then
      raise exception 'FAIL M5: unexpected bucket %', _b;
    end if;
  end loop;
  if _rows <> 2 then raise exception 'FAIL M5: expected 2 buckets, got %', _rows; end if;
end $$;

-- M6. An invalid bucket is rejected with the CLOUD-007 bucket error.
do $$
declare _n bigint;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  begin
    select count(*) into _n from public.admin_metrics_growth('hour', '2026-01-01'::timestamptz, '2026-01-03'::timestamptz);
    raise exception 'FAIL M6: invalid bucket accepted';
  exception when others then
    if sqlerrm not like '%invalid bucket%' then raise exception 'FAIL M6: unexpected error %', sqlerrm; end if;
  end;
end $$;

-- M7. growth('week') and growth('month') are exact, and the 10000-bucket cap
--      holds under a pathological window.
do $$
declare _b timestamptz; _n bigint; _rows int := 0; _cap int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);

  -- Week buckets (Mondays): 2025-12-29 = Erin+Frank+Gina = 3; 2026-01-05 = Dave = 1.
  for _b, _n in
    select * from public.admin_metrics_growth('week', '2025-12-29'::timestamptz, '2026-01-12'::timestamptz)
  loop
    _rows := _rows + 1;
    if _b = '2025-12-29 00:00:00+00'::timestamptz and _n <> 3 then
      raise exception 'FAIL M7: week bucket 12-29 = %, want 3', _n;
    end if;
    if _b = '2026-01-05 00:00:00+00'::timestamptz and _n <> 1 then
      raise exception 'FAIL M7: week bucket 01-05 = %, want 1', _n;
    end if;
  end loop;
  if _rows <> 2 then raise exception 'FAIL M7: week expected 2 buckets, got %', _rows; end if;

  -- Month bucket: 2026-01-01 = Erin+Frank+Gina+Dave = 4.
  _rows := 0;
  for _b, _n in
    select * from public.admin_metrics_growth('month', '2026-01-01'::timestamptz, '2026-02-01'::timestamptz)
  loop
    _rows := _rows + 1;
    if _b = '2026-01-01 00:00:00+00'::timestamptz and _n <> 4 then
      raise exception 'FAIL M7: month bucket = %, want 4', _n;
    end if;
  end loop;
  if _rows <> 1 then raise exception 'FAIL M7: month expected 1 bucket, got %', _rows; end if;

  -- Cap: 2000-01-01..2100-01-01 in day buckets is 36525 > 10000 -> exactly 10000.
  select count(*) into _cap
  from public.admin_metrics_growth('day', '2000-01-01'::timestamptz, '2100-01-01'::timestamptz);
  if _cap <> 10000 then raise exception 'FAIL M7: bucket cap not enforced, got %', _cap; end if;
end $$;

-- M8. active_users half-open window semantics: [p_from, p_to), lower bound
--      inclusive, upper bound exclusive; revoked sessions never counted.
do $$
declare _n bigint;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);

  -- Frank's live (non-revoked) session last_seen 2026-01-01 12:00 UTC.
  select public.admin_metrics_active_users('2026-01-01'::timestamptz, '2026-01-02'::timestamptz) into _n;
  if _n <> 1 then raise exception 'FAIL M8: backdated window = %, want 1', _n; end if;

  -- Alice's live session (sess-alice-0002, last_seen now) in the today window.
  select public.admin_metrics_active_users(now() - interval '1 day', now() + interval '1 day') into _n;
  if _n <> 1 then raise exception 'FAIL M8: today window = %, want 1', _n; end if;

  -- Upper bound exclusive: ending exactly at 12:00 excludes Frank.
  select public.admin_metrics_active_users('2026-01-01'::timestamptz, '2026-01-01 12:00:00+00'::timestamptz) into _n;
  if _n <> 0 then raise exception 'FAIL M8: upper-exclusive violated (=%)', _n; end if;

  -- Lower bound inclusive: starting exactly at 12:00 includes Frank.
  select public.admin_metrics_active_users('2026-01-01 12:00:00+00'::timestamptz, '2026-01-02'::timestamptz) into _n;
  if _n <> 1 then raise exception 'FAIL M8: lower-inclusive violated (=%)', _n; end if;
end $$;

-- M9. service_role has no EXECUTE (privilege layer; no privileged client path).
set role service_role;
do $$
begin
  begin
    execute 'select public.admin_metrics_totals()';
    raise exception 'FAIL M9: service_role called totals';
  exception when insufficient_privilege then null;
  end;
end $$;
set role postgres;

-- M10. Even the function owner (postgres) is denied by the in-body gate when
--      no request identity is present — the gate is authorization, not ACL.
do $$
begin
  perform set_config('request.jwt.claims', '{}', false);
  begin
    perform public.admin_metrics_totals();
    raise exception 'FAIL M10: postgres without claims called totals';
  exception when others then
    if sqlerrm not like '%CLOUD-007%' then raise exception 'FAIL M10: unexpected error %', sqlerrm; end if;
  end;
end $$;

-- ------------------------------------------------------------------ --
-- U (CLOUD-013): admin user-directory authorization + contract proof.  --
-- The directory is served by admin_users(p_search, p_offset) (SECURITY    --
-- DEFINER, ADR-025), gated in-body on auth.uid() + profiles.role. A        --
-- separate immutable, server-generated public user ID (public_user_id)     --
-- backs the PRD §7 unique-user-ID column. Proven here:                    --
--   U1  anon has no EXECUTE (privilege/schema layer)                      --
--   U2  ordinary authenticated user denied in-body (CLOUD-013)            --
--   U3  admin allowed; exact single-row projection + envelope             --
--   U4  tampered JWT claims (role/user_metadata) add no authority         --
--   U5  postgres (owner) without claims denied by the in-body gate        --
--   U6  service_role denied (privilege layer)                             --
--   U7  search by public_user_id matches the owning user                  --
--   U8  search by display_name works (case-insensitive)                   --
--   U9  search by email is case-insensitive                               --
--   U10 no-match search -> empty result, has_more false                   --
--   U11 oversized search is bounded (truncated to 100), never errors      --
--   U12 negative offset rejected (CLOUD-013)                              --
--   U13 oversized offset rejected (CLOUD-013)                             --
--   U14 pagination: page_size 25, has_more, pages cover all rows in      --
--       deterministic ORDER BY (no gaps/dupes)                            --
--   U15 repeated identical calls are byte-identical (determinism)         --
--   U16 data minimization: closed key set; no internal UUID/provider/     --
--       sensitive fields in the payload                                   --
--   U17 entitlement summary exact (monthly active / null for free)        --
--   U18 device summary exact (count/active/platforms/last_seen)           --
--   U19 session summary exact (count/active/last_seen)                    --
--   U20 account_status derived (banned / deleted / active)                --
--   U21 public_user_id server-owned on INSERT + immutable on UPDATE       --
--       (client AND postgres paths)                                       --
-- Sequence: fixtures -> privilege denials -> gate denials -> admin        --
-- contract -> public_user_id immutability.                                --
-- ------------------------------------------------------------------ --
set role postgres;
select set_config('request.jwt.claims', '{}', false);

-- Richter fixture: a registered user with a server-generated public_user_id
-- (produced by the NEW profiles_set_public_user_id trigger), an active
-- monthly entitlement, one active device, and one active session.
insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000021', 'authenticated', 'authenticated', 'ulrich.clo13@example.com', now(), now(), now());

insert into public.profiles (id, display_name)
values ('00000000-0000-0000-0000-000000000021', 'Ulrich');

insert into public.entitlements (user_id, product, plan, status, provider, provider_customer_ref, provider_payment_ref, starts_at, expires_at)
values ('00000000-0000-0000-0000-000000000021', 'soravo', 'monthly', 'active', 'razorpay', 'cus_ulrich_clo13', 'pay_ulrich_clo13', now() - interval '2 days', now() + interval '28 days');

insert into public.devices (id, user_id, device_public_id, platform, app_version)
values ('10000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021', 'dev-ulrich-0001', 'linux', '1.0.0');

insert into public.sessions (id, user_id, device_id, session_public_id)
values ('20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000021', 'sess-ulrich-0001');

-- Account-status fixtures: banned vs deleted vs active (no profiles needed).
insert into auth.users (id, aud, role, email, email_confirmed_at, banned_until, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000022', 'authenticated', 'authenticated', 'ursula.clo13@example.com', now(), now() + interval '1 day', now(), now());

insert into auth.users (id, aud, role, email, email_confirmed_at, deleted_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000023', 'authenticated', 'authenticated', 'mauro.clo13@example.com', now(), now(), now(), now());

-- Hugo: needed for the client-path public_user_id server-ownership/immutability
-- proof (U21); his profile is self-INSERTed by the authenticated session.
insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000030', 'authenticated', 'authenticated', 'hugo.clo13@example.com', now(), now(), now());

-- Pagination batch: 22 extra registered accounts -> 33 total directory rows
-- (> the 25/page_size bound, so has_more is genuinely exercised).
insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
select
  ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
  'authenticated', 'authenticated',
  format('bulk.clo13-%s@example.com', g),
  now(), '2026-01-06 00:00:00+00', '2026-01-06 00:00:00+00'
from generate_series(101, 122) g;

-- U1. anon cannot invoke admin_users (schema privilege layer, like M1).
set role anon;
do $$
begin
  begin
    execute 'select public.admin_users()';
    raise exception 'FAIL U1: anon called admin_users';
  exception when insufficient_privilege then null;
  end;
end $$;
set role postgres;

-- U2. An ordinary authenticated user (Frank, profiles.role = 'user') holds
--      EXECUTE but is denied IN-BODY with the CLOUD-013 gate error.
set role authenticated;
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000f"}', false);
  begin
    perform public.admin_users();
    raise exception 'FAIL U2: non-admin called admin_users';
  exception when others then
    if sqlerrm not like '%CLOUD-013%' then raise exception 'FAIL U2: unexpected error %', sqlerrm; end if;
  end;
end $$;

-- U3. An admin (Erin) is allowed; a single-row search returns the exact
--      projection and a correct envelope.
do $$
declare _j jsonb; _u jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j := public.admin_users('ulrich');
  if (_j->>'has_more')::boolean then raise exception 'FAIL U3: has_more true on single row'; end if;
  if (_j->>'page_size')::int <> 25 then raise exception 'FAIL U3: page_size=%', _j->>'page_size'; end if;
  if (_j->>'offset')::int <> 0 then raise exception 'FAIL U3: offset echo wrong'; end if;
  if _j->>'search' <> 'ulrich' then raise exception 'FAIL U3: search echo %', _j->>'search'; end if;
  if _j->>'generated_at' is null then raise exception 'FAIL U3: generated_at missing'; end if;
  if jsonb_array_length(_j->'users') <> 1 then
    raise exception 'FAIL U3: expected 1 user, got %', jsonb_array_length(_j->'users');
  end if;
  _u := _j->'users'->0;
  if _u->>'email' <> 'ulrich.clo13@example.com' then raise exception 'FAIL U3: email %', _u->>'email'; end if;
  if _u->>'display_name' <> 'Ulrich' then raise exception 'FAIL U3: display_name'; end if;
  if _u->>'role' <> 'user' then raise exception 'FAIL U3: role'; end if;
  if _u->>'account_status' <> 'active' then raise exception 'FAIL U3: account_status'; end if;
  if _u->>'public_user_id' !~ '^user-[0-9a-f]{32}$' then
    raise exception 'FAIL U3: public_user_id format %', _u->>'public_user_id';
  end if;
end $$;

-- U4. JWT claims (role:admin / user_metadata.role) never map to authority.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000f","role":"admin","user_metadata":{"role":"admin"}}', false);
  begin
    perform public.admin_users();
    raise exception 'FAIL U4: tampered JWT claims authorized';
  exception when others then
    if sqlerrm not like '%CLOUD-013%' then raise exception 'FAIL U4: unexpected error %', sqlerrm; end if;
  end;
end $$;

-- U5. Even the function owner (postgres) is denied by the in-body gate when
--      no request identity is present — the gate is authorization, not ACL.
set role postgres;
do $$
begin
  perform set_config('request.jwt.claims', '{}', false);
  begin
    perform public.admin_users();
    raise exception 'FAIL U5: postgres without claims called admin_users';
  exception when others then
    if sqlerrm not like '%CLOUD-013%' then raise exception 'FAIL U5: unexpected error %', sqlerrm; end if;
  end;
end $$;

-- U6. service_role has no EXECUTE (privilege layer; no privileged client path).
set role service_role;
do $$
begin
  begin
    execute 'select public.admin_users()';
    raise exception 'FAIL U6: service_role called admin_users';
  exception when insufficient_privilege then null;
  end;
end $$;
set role postgres;

-- U7. Search by public_user_id addresses exactly the owning user. (Read the
--      server-generated value as postgres, then call as the admin identity;
--      the gate is in-body, so the session role is not the boundary.)
do $$
declare _pid text; _j jsonb;
begin
  select public_user_id into _pid from public.profiles where id = '00000000-0000-0000-0000-000000000021';
  if _pid is null then raise exception 'FAIL U7: fixture missing public_user_id'; end if;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j := public.admin_users(_pid);
  if jsonb_array_length(_j->'users') <> 1 then
    raise exception 'FAIL U7: public_id search expected 1, got %', jsonb_array_length(_j->'users');
  end if;
  if (_j->'users'->0->>'email') <> 'ulrich.clo13@example.com' then
    raise exception 'FAIL U7: public_id search returned wrong row';
  end if;
end $$;

-- U8. Search by display_name matches (partial, case-insensitive).
--      (Use 'lrich' -> 'Ulrich'; a term like 'er' would collide with the
--      literal 'user-' prefix of every public_user_id and match that column.)
do $$
declare _j jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j := public.admin_users('lrich');   -- 'Ulrich' display_name + ulrich email
  if jsonb_array_length(_j->'users') <> 1 then
    raise exception 'FAIL U8: display_name/email search expected 1, got %', jsonb_array_length(_j->'users');
  end if;
  if (_j->'users'->0->>'email') <> 'ulrich.clo13@example.com' then
    raise exception 'FAIL U8: search returned wrong row';
  end if;
end $$;

-- U9. Email search is case-insensitive (and echoes the caller's casing).
do $$
declare _j jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j := public.admin_users('ERIN.CLO7');
  if jsonb_array_length(_j->'users') <> 1 then
    raise exception 'FAIL U9: case-insensitive search expected 1, got %', jsonb_array_length(_j->'users');
  end if;
  if _j->>'search' <> 'ERIN.CLO7' then raise exception 'FAIL U9: search echo %', _j->>'search'; end if;
end $$;

-- U10. A no-match search returns an empty page with has_more = false.
do $$
declare _j jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j := public.admin_users('zzz-no-such-user');
  if jsonb_array_length(_j->'users') <> 0 then raise exception 'FAIL U10: no-match returned rows'; end if;
  if (_j->>'has_more')::boolean then raise exception 'FAIL U10: has_more on empty page'; end if;
end $$;

-- U11. An oversized search string is truncated to 100 chars and never errors.
do $$
declare _j jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j := public.admin_users(repeat('a', 400));
  if (_j->>'has_more')::boolean then raise exception 'FAIL U11: has_more on no-match'; end if;
  if jsonb_array_length(_j->'users') <> 0 then raise exception 'FAIL U11: oversized search matched'; end if;
  if octet_length(_j->>'search') <> 100 then raise exception 'FAIL U11: search not bounded to 100'; end if;
end $$;

-- U12/U13. Out-of-range offsets are rejected with the CLOUD-013 gate prefix.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  begin
    perform public.admin_users(null, -1);
    raise exception 'FAIL U12: negative offset accepted';
  exception when others then
    if sqlerrm not like '%CLOUD-013%' then raise exception 'FAIL U12: unexpected error %', sqlerrm; end if;
  end;
  begin
    perform public.admin_users(null, 100001);
    raise exception 'FAIL U13: oversized offset accepted';
  exception when others then
    if sqlerrm not like '%CLOUD-013%' then raise exception 'FAIL U13: unexpected error %', sqlerrm; end if;
  end;
end $$;

-- U14. Pagination: page_size 25, offset 0/25, has_more transitions, and the
--      concatenated pages exactly reconstruct the fully-ordered directory.
do $$
declare _j0 jsonb; _j1 jsonb; _a0 jsonb; _a1 jsonb; _expected jsonb; _total int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j0 := public.admin_users(null, 0);
  _j1 := public.admin_users(null, 25);

  if (_j0->>'has_more')::boolean is distinct from true then raise exception 'FAIL U14: page0 has_more false'; end if;
  if (_j1->>'has_more')::boolean is distinct from false then raise exception 'FAIL U14: page1 has_more true'; end if;
  if jsonb_array_length(_j0->'users') <> 25 then raise exception 'FAIL U14: page0 len=%', jsonb_array_length(_j0->'users'); end if;
  if jsonb_array_length(_j1->'users') <> 8 then raise exception 'FAIL U14: page1 len=%', jsonb_array_length(_j1->'users'); end if;

  select count(*) into _total from auth.users;
  if _total <> 33 then raise exception 'FAIL U14: expected 33 users, got %', _total; end if;

  select jsonb_agg(x.email) into _a0 from (select (u->>'email') as email from jsonb_array_elements(_j0->'users') u) x;
  select jsonb_agg(x.email) into _a1 from (select (u->>'email') as email from jsonb_array_elements(_j1->'users') u) x;
  select jsonb_agg(email order by lower(email) collate "C", id) into _expected from auth.users;

  if _a0 || _a1 <> _expected then
    raise exception 'FAIL U14: pages do not reconstruct the deterministic directory order';
  end if;
end $$;

-- U15. Determinism: two identical calls produce byte-identical responses
--      (ignoring the generated_at timestamp, which is wall-clock).
do $$
declare _a jsonb; _b jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _a := public.admin_users(null, 0) - 'generated_at';
  _b := public.admin_users(null, 0) - 'generated_at';
  if _a is distinct from _b then raise exception 'FAIL U15: non-deterministic response'; end if;
end $$;

-- U16. Data minimization: the per-user object carries EXACTLY the closed key
--      set, and the payload never contains internal UUIDs, provider/payment
--      references, or sensitive fields.
do $$
declare _j jsonb; _u jsonb; _key text;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j := public.admin_users('ulrich');
  _u := _j->'users'->0;
  for _key in select jsonb_object_keys(_u) loop
    if _key not in (
      'public_user_id','email','display_name','role','account_status',
      'created_at','updated_at','last_sign_in_at','entitlement','devices','sessions'
    ) then
      raise exception 'FAIL U16: unexpected user key %', _key;
    end if;
  end loop;
  if _j::text ~ '00000000-0000-0000' then raise exception 'FAIL U16: internal uuid leaked'; end if;
  if _j::text ~ '"(id|user_id|device_id|session_id|provider|customer_ref|payment_ref|password)"' then
    raise exception 'FAIL U16: forbidden field present in payload';
  end if;
end $$;

-- U17. Entitlement summary is the safe closed projection (monthly active);
--      a free user (Gina) has entitlement = null.
do $$
declare _j jsonb; _e jsonb; _key text;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j := public.admin_users('ulrich');
  _e := _j->'users'->0->'entitlement';
  if _e->>'plan' <> 'monthly' or _e->>'status' <> 'active' then
    raise exception 'FAIL U17: entitlement plan/status mismatch';
  end if;
  for _key in select jsonb_object_keys(_e) loop
    if _key not in ('plan','status','starts_at','expires_at') then
      raise exception 'FAIL U17: entitlement key %', _key;
    end if;
  end loop;
  _j := public.admin_users('gina.clo7');
  if jsonb_typeof(_j->'users'->0->'entitlement') is distinct from 'null' then
    raise exception 'FAIL U17: free user entitlement not json-null';
  end if;
end $$;

-- U18. Device summary is exact: count/active/platforms/last_seen_at.
do $$
declare _j jsonb; _d jsonb; _key text;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j := public.admin_users('ulrich');
  _d := _j->'users'->0->'devices';
  if (_d->>'count')::int <> 1 or (_d->>'active')::int <> 1 then
    raise exception 'FAIL U18: device counts=%/%', _d->>'count', _d->>'active';
  end if;
  if _d->'platforms' <> '{"linux": 1}'::jsonb then raise exception 'FAIL U18: platforms %', _d->'platforms'; end if;
  if _d->>'last_seen_at' is null then raise exception 'FAIL U18: last_seen_at missing'; end if;
  for _key in select jsonb_object_keys(_d) loop
    if _key not in ('count','active','platforms','last_seen_at') then
      raise exception 'FAIL U18: devices key %', _key;
    end if;
  end loop;
end $$;

-- U19. Session summary is exact: count/active/last_seen_at.
do $$
declare _j jsonb; _s jsonb; _key text;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j := public.admin_users('ulrich');
  _s := _j->'users'->0->'sessions';
  if (_s->>'count')::int <> 1 or (_s->>'active')::int <> 1 then
    raise exception 'FAIL U19: session counts=%/%', _s->>'count', _s->>'active';
  end if;
  if _s->>'last_seen_at' is null then raise exception 'FAIL U19: session last_seen_at missing'; end if;
  for _key in select jsonb_object_keys(_s) loop
    if _key not in ('count','active','last_seen_at') then
      raise exception 'FAIL U19: sessions key %', _key;
    end if;
  end loop;
end $$;

-- U20. account_status is derived from auth.users: banned / deleted / active.
do $$
declare _j jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false);
  _j := public.admin_users('ursula');
  if (_j->'users'->0->>'account_status') <> 'banned' then raise exception 'FAIL U20: ursula %', _j->'users'->0->>'account_status'; end if;
  _j := public.admin_users('mauro');
  if (_j->'users'->0->>'account_status') <> 'deleted' then raise exception 'FAIL U20: mauro %', _j->'users'->0->>'account_status'; end if;
  _j := public.admin_users('ulrich');
  if (_j->'users'->0->>'account_status') <> 'active' then raise exception 'FAIL U20: ulrich %', _j->'users'->0->>'account_status'; end if;
end $$;

-- U21. public_user_id is server-owned and immutable: a client-supplied value
--      is overwritten on INSERT, and every UPDATE path (client and postgres)
--      is rejected.
set role authenticated;
do $$
declare _pid text; _pid_after text;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000030"}', false);
  insert into public.profiles (id, display_name, public_user_id)
  values ('00000000-0000-0000-0000-000000000030', 'Hugo', 'spoofed-0000');

  select public_user_id into _pid from public.profiles where id = '00000000-0000-0000-0000-000000000030';
  if _pid = 'spoofed-0000' or _pid !~ '^user-[0-9a-f]{32}$' then
    raise exception 'FAIL U21: client-supplied public_user_id persisted (%)', _pid;
  end if;

  begin
    update public.profiles set public_user_id = 'changed' where id = '00000000-0000-0000-0000-000000000030';
    raise exception 'FAIL U21: public_user_id UPDATE allowed';
  exception when others then
    if sqlerrm not like '%CLOUD-013%' then raise exception 'FAIL U21: unexpected error %', sqlerrm; end if;
  end;

  select public_user_id into _pid_after from public.profiles where id = '00000000-0000-0000-0000-000000000030';
  if _pid_after is distinct from _pid then raise exception 'FAIL U21: public_user_id changed despite rejection'; end if;
end $$;

-- U21c. Even the superuser path cannot re-key the public user ID.
set role postgres;
do $$
begin
  begin
    update public.profiles set public_user_id = 'postgres-override'
    where id = '00000000-0000-0000-0000-000000000030';
  exception when others then null;
  end;
  if exists (
    select 1 from public.profiles
    where id = '00000000-0000-0000-0000-000000000030' and public_user_id = 'postgres-override'
  ) then
    raise exception 'FAIL U21c: postgres re-keyed public_user_id';
  end if;
end $$;

-- ------------------------------------------------------------------ --
-- Cleanup: the whole suite is rolled back regardless of path.           --
-- ------------------------------------------------------------------ --
reset role;
rollback;
select set_config('request.jwt.claims', '{}', false);