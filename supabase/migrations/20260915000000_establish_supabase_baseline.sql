-- CLOUD-001: Supabase project integration - baseline migration.
--
-- Establishes the default-deny privilege boundary for the application
-- `public` schema (09_SECURITY_BASELINE.md S5, ADR-010). No tables,
-- sequences, functions, triggers, policies, or extension changes are made
-- here; future application objects are owned by their creating tasks
-- (CLOUD-002+) which must grant access explicitly and, for row-level
-- tables, enable RLS in the same migration.
--
-- Supabase's stock default ACLs grant anon/authenticated/service_role full
-- privileges on any table, sequence, or function created in `public` by
-- `postgres`. This migration revokes those defaults so no application role
-- inherits access merely because the object owner is `postgres`.

begin;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;

commit;