# ADR-022 — Supabase admin role / authorization model

Status: Accepted
Date: 2026-09-15

Context: CLOUD-006 establishes the admin-role primitive that admin-sensitive future tasks (admin dashboard metrics, content/account management) will build on. The account model (02_TDD.md §13–14) requires an authenticated user identity with a role and ownership semantics, plus an explicit admin authorization boundary: an ordinary user must never be able to self-promote, and frontend hiding alone is not authorization — the role must be server-authoritative. Following ADR-010, `public` is default-deny and authorization state lives in the database, never inferred from client-supplied claims. `public.profiles` (CLOUD-002) existed with only `id`, `display_name`, `created_at`, `updated_at`; it had no role column. The chosen posture must not regress the CLOUD-003 privilege-layer invariant (functions SECURITY INVOKER, `search_path` pinned, EXECUTE revoked from app roles) and must not add grants, policies, or any new table unless strictly required.

Decision: Add a single server-authoritative `role` column to `public.profiles` (`text NOT NULL DEFAULT 'user'`, CHECK `role in ('user','admin')`), and enforce that its value can be authored/changed ONLY by postgres via a widened SECURITY INVOKER trigger:

- Column + CHECK constraint in the originating migration, plus an UPDATE immutability trigger (`profiles_guard_role_immutable`, SECURITY INVOKER, `search_path = pg_catalog`) so a non-postgres session can never change `role`.
- Delta migration widening the guard to `BEFORE INSERT OR UPDATE`: on INSERT a non-postgres session must leave `role` at the safe default `'user'` (any explicit non-default value is REJECTED), closing the `profiles_insert_own` (CLOUD-002) column-escalation surface; on UPDATE any `new.role is distinct from old.role` is REJECTED (immutability). `current_user = 'postgres'` is the sole exempt role — postgres is the only role-authoring path.
- EXECUTE on the guard function revoked from `public`, `anon`, `authenticated`, `service_role` (CLOUD-003 invariant).
- No new table, no new grants, no new RLS policies, no `user_metadata`-derived authority: the JWT is validated to an identity (`auth.uid()`), but elevation comes only from the stored column.

Alternatives:
- A separate `admin_roles` table keyed by `user_id` (rejected: a single nullable boolean/role flag on the profile is the smallest sufficient primitive, avoids a join in every admin check, and the TDD §13 profile model anticipates a role column).
- Auth-style `app_metadata.role` / `raw_user_meta_data.role` claim (rejected twice: Supabase auth metadata is written by the auth service and is NOT enforceable as a pure DB invariant; ADR-010 pins authorization to `auth.uid()` + DB state, never `user_metadata`; R11 proves claim injection grants no authority).
- `createRole` / `isAdmin()` SECURITY DEFINER functions with `return query` (rejected: SECURITY DEFINER in `public` requires a later ADR per our guardrails, and a read helper adds a second enforcement surface when the immutable column already proves).
- Client-side role gating only (rejected: TDD §14 — frontend hiding is not authorization).
- Trusting `authenticated` to UPDATE `role` with a policy (rejected: self-promotion and demotion must both be impossible; a trigger is the only layer that survives RLS bypass vectors and keeps the column immutable for every non-superuser session).

Security impact:
- No self-service elevation: `UPDATE role` by any non-postgres session is rejected at the trigger layer; zero-rows RLS behavior for cross-user writes preserved (R2, R5).
- No injection-at-birth elevation: `INSERT` with `role <> 'user'` (including 'admin') is rejected even under a valid `auth.uid()` (R3); out-of-enum values are rejected by CHECK/trigger (R4).
- JWT-metadata injection grants no authority: claims carrying `role:admin`/`user_metadata.role` do not change `profiles.role` (R11).
- `postgres` (superuser) is the only role-authoring path (R7 promote, R8 demote) — human-authorized provisioning only.
- `anon` and `service_role` retain no read/write path to the role column (R9, privilege-layer denial).
- Ordinary users can still read their own `role` for UX (R10/R12) — display-only, never authoritative for writes.

Performance impact: One column addition and a trivial trigger on a per-row small table; no extra join, index, or policy. Negligible.

Operational impact: Two additive migrations, both applied to the dev project `zbzhlhoxblguepplqppw` (recorded `establish_admin_role_authorization` and `admin_role_insert_guard`). Existing tables, grants, policies, and triggers untouched. Roles are provisioned via a privileged SQL session (postgres). Verified via:
- `db_assertions.sql` checks 49–53 (role column, CHECK constraint, guard trigger attached/enabled, SECURITY INVOKER with no app-role EXECUTE, `search_path` pinned).
- `rls_assertions.sql` scenarios R1–R12 (behavioral: default role, self-promote/self-demote rejection, INSERT-with-admin rejection, out-of-enum rejection, cross-user role update isolation, non-role self-update preserved, postgres promote/demote, anon denial, own-role read, JWT-metadata non-authority, cross-user isolation intact).
- `migration-guard.test.mjs` 12/12 (no new grants/policies introduced, so no new guard case required).

Testing impact: 53 structural DB assertion checks, 12 migration-guard tests, and the full RLS behavioral suite (A/B/E/D/S + R1–R12) all pass against the dev project post-migration. Security advisors: 0 lints. Performance advisor: 1 INFO (`sessions_device_id_idx`, pre-existing from CLOUD-005, expected). No fixture residue — the behavioral suite rolls itself back.

Rollback: Both migrations are additive and reversible. To revert: `drop trigger profiles_guard_role_immutable on public.profiles; drop function public.profiles_guard_role_immutable(); alter table public.profiles drop column role;` (human-authorized). The previous state was a `profiles` table with no role column.

Consequences: `profiles.role` is the canonical admin-authoritative flag. Clients may READ it for UX but never WRITE it; all elevation flows are postgres-side. Admin-sensitive tasks (admin dashboard metrics, account/content management) consume this primitive for their server-side authorization checks. Nothing else in the auth stack changes. Storing audio, transcripts, keystrokes, clipboard, or history in Supabase remains prohibited (ADR-010, 01_PRD.md §10).