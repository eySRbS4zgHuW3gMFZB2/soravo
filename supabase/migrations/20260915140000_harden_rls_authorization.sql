-- CLOUD-003: RLS/authorization hardening.
--
-- Completes the default-deny boundary at the privilege layer (ADR-010).
-- CLOUD-001/002 set object-level default-deny and proved anon holds no table
-- privileges and never bypasses RLS, but the anonymous role still holds
-- schema-level USAGE on `public` — granted both explicitly (`anon=U`) and via
-- PUBLIC (`=U`, kept by Supabase's stock provisioning). The PUBLIC grant
-- would also leave objects auto-created under platform-owned `supabase_admin`
-- defaults (which cannot be revoked on hosted Supabase) reachable by anon.
--
-- This migration removes the anonymous role from the application schema at
-- the privilege layer, with no change to any policy, table, or grant:
--
--   * `anon` loses USAGE and CREATE on `public`;
--   * PUBLIC loses USAGE on `public`. anon and any future PUBLIC-inheriting
--     role are therefore denied at the schema boundary; `authenticated`,
--     `service_role`, and `postgres` keep working through their explicit
--     `=U` grants (verified behaviorally in `supabase/tests/rls_assertions.sql`).
--   * The Postgres built-in function `EXECUTE ... FROM PUBLIC` default is
--     revoked for future functions created by `postgres` (schema-less form;
--     the schema-scoped form cannot override the built-in default, issue
--     supabase#49338).
--   * Direct EXECUTE is revoked on `public.profiles_set_timestamps()` from
--     every app role; trigger invocation never needs an EXECUTE grant.
--
-- Non-destructive: additive revocation only. RLS behavior is unchanged.

begin;

revoke usage on schema public from anon;
revoke create on schema public from anon;
revoke usage on schema public from public;

alter default privileges for role postgres
  revoke execute on functions from public;

revoke all on function public.profiles_set_timestamps() from public, anon, authenticated, service_role;

commit;