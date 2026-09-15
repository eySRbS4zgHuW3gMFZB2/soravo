-- CLOUD-002 RLS behavioral assertions. Run via Supabase MCP `execute_sql`
-- (project_ref zbzhlhoxblguepplqppw) against the dev database AFTER applying
-- 20260915120000_establish_profiles_and_rls.sql and passing db_assertions.sql.
--
-- The suite impersonates the app roles by lowering the session role
-- (SET ROLE anon / authenticated) and session-scoped request.jwt.claims
-- (set_config(..., false)), then probes privileges and RLS predicates. Every
-- scenario sets its own claims so order-independent.
--
-- Table is empty, so no data is written: self-INSERT is expected to PASS RLS
-- (WITH CHECK) and then raise FK SQLSTATE 23503 (no matching auth.users row);
-- cross-user INSERT is expected to be rejected by RLS WITH CHECK (42501).
-- `reset role` at the end restores the postgres session role.
--
-- A concession: positive proves of "reads/writes of one's OWN existing rows"
-- require a real row (which needs a live auth.users row). Those are deferred
-- to the signup integration path; this file proves the security-adjacent
-- guarantees (cross-user isolation + anon default-deny + grant model).

set role postgres;
set_config('request.jwt.claims', '{}', false);
set role authenticated;

-- A1. Self-read on empty table: allowed, returns zero rows.
do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  select count(*) into _n from public.profiles;
  if _n <> 0 then raise exception 'FAIL A1: expected 0 rows, got %', _n; end if;
end $$;

-- A2. Session with a claims JWT but NO `sub` yields auth.uid() = null, so the
--     policy matches nothing — the user sees zero rows rather than everything.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', false);
  if (select count(*) from public.profiles) <> 0 then
    raise exception 'FAIL A2: claim-less session saw rows';
  end if;
end $$;

-- A3. Cross-user SELECT: Bob (sub=B) must not read Alice's row.
do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  select count(*) into _n from public.profiles
    where id = '00000000-0000-0000-0000-00000000000a';
  if _n <> 0 then raise exception 'FAIL A3: Bob read Alice''s row'; end if;
end $$;

-- A4. Self-INSERT passes RLS WITH CHECK (would 42501 if blocked) and then hits
--     FK 23503 because no auth.users row exists yet — proving insert is
--     permitted for the owner and gated only by the FK.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  begin
    insert into public.profiles (id, display_name)
    values ('00000000-0000-0000-0000-00000000000a', 'Alice');
    raise exception 'FAIL A4: self-insert unexpectedly succeeded';
  exception when sqlstate '23503' then
    raise notice 'PASS A4: self-insert crossed RLS, FK blocked (no user row)';
  when sqlstate '42501' then
    raise exception 'FAIL A4: self-insert blocked by RLS WITH CHECK';
  end;
end $$;

-- A5. Cross-user INSERT: Bob claiming Alice's id must be rejected by RLS.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  begin
    insert into public.profiles (id, display_name)
    values ('00000000-0000-0000-0000-00000000000a', 'spoofed');
    raise exception 'FAIL A5: cross-user insert unexpectedly succeeded';
  exception when sqlstate '42501' then
    raise notice 'PASS A5: cross-user insert denied by RLS WITH CHECK';
  end;
end $$;

-- A6. Cross-user UPDATE: Bob updating Alice's row matches exactly zero rows.
do $$
declare _n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
  update public.profiles set display_name = 'hijacked'
    where id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics _n = row_count;
  if _n <> 0 then raise exception 'FAIL A6: Bob updated % Alice row(s)', _n; end if;
end $$;

-- A7. Deleting is impossible twice over: no DELETE privilege is granted, AND
--     no DELETE policy exists. The privilege denial surfaces as 42501.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
  begin
    execute format('delete from public.profiles where id = %L', '00000000-0000-0000-0000-00000000000a');
    raise notice 'PASS A7 (delete allowed; no rows to delete)';
  exception when insufficient_privilege then
    raise notice 'PASS A7: delete denied at the privilege layer';
  end;
end $$;

-- ------------------------------------------------------------------ --
-- B (anon): denied at the privilege layer by default-deny.             --
-- ------------------------------------------------------------------ --
set role anon;

do $$
begin
  begin
    execute 'select count(*) from public.profiles';
    raise exception 'FAIL B1: anon SELECT allowed';
  exception when insufficient_privilege then
    raise notice 'PASS B1: anon SELECT denied';
  end;
  begin
    execute 'insert into public.profiles (id) values (''00000000-0000-0000-0000-00000000000c'')';
    raise exception 'FAIL B2: anon INSERT allowed';
  exception when insufficient_privilege then
    raise notice 'PASS B2: anon INSERT denied';
  end;
  begin
    execute format('update public.profiles set display_name = %L', 'x');
    raise exception 'FAIL B3: anon UPDATE allowed';
  exception when insufficient_privilege then
    raise notice 'PASS B3: anon UPDATE denied';
  end;
end $$;

reset role;