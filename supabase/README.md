# Supabase

Soravo's managed Postgres backend (Supabase project, `project_ref zbzhlhoxblguepplqppw`) holds **account and licensing metadata only**: user profiles, entitlements, device registrations, and session state. It must never store audio, transcripts, keystrokes, clipboard contents, or history.

## Project integration

- This repository's `supabase/migrations/` is the **authoritative source of truth** for the database schema. No ad-hoc SQL changes the remote database.
- The live development project is `zbzhlhoxblguepplqppw` (Apne2 region, Postgres 17). All remote license application works against this project. Stock Supabase schemas (`auth`, `storage`, `realtime`, `vault`, `graphql*`) are infrastructure and are not modified by this repository.
- Connectors use the project-scoped Supabase MCP (OAuth-authenticated). Migrations are applied with the MCP's migration tool; verification and assertions use read-only SQL.

## Migration workflow

1. Commit a new timestamped file `supabase/migrations/<version>_<name>.sql` (e.g. `20260915000000_establish_supabase_baseline.sql`). Version is the 14-digit UTC timestamp; names are `snake_case`.
2. Structural invariants are enforced by `supabase/tests/migration-guard.test.mjs` (`pnpm test:supabase`, runs in CI): timestamped naming, increasing unique versions, no destructive statements, no secrets/JWTs/private keys, no anonymous write grants, and any grant to `anon`/`authenticated` requires RLS enabled on the same table in the same migration.
3. Apply the migration through authorized tooling, then verify with `supabase/tests/db_assertions.sql` and the Supabase security/performance advisors.

## Default-deny boundary (CLOUD-001 baseline)

Supabase's stock default ACLs grant `anon`, `authenticated`, and `service_role` full privileges on any object `postgres` creates in `public`. The baseline migration (`20260915000000_establish_supabase_baseline.sql`) revokes those defaults for tables, sequences, and functions.

Consequences, binding on all future migrations:

- Nothing in `public` is accessible to any app role unless a future migration **explicitly** grants it.
- Any grant to `anon` or `authenticated` must be paired with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in the same migration.
- No anonymous write grants. No `service_role` in any client path.
- `anon`/`authenticated` never bypass RLS.
- No `SECURITY DEFINER` functions in `public` unless justified in a later ADR.
- Never authorize using `auth.users.user_metadata`.

## Authentication and profiles (CLOUD-002)

`20260915120000_establish_profiles_and_rls.sql` introduces the first application table. See ADR-011 for the full decision; highlights:

- `public.profiles`: one row per user (`id` = `auth.users(id)` `ON DELETE CASCADE`), `display_name` (≤80) and server-owned timestamps maintained by a `SECURITY INVOKER` trigger (`profiles_set_timestamps`). `20260915123000_profiles_set_search_path.sql` pins that function's `search_path` to `pg_catalog` (security advisor 0011); it is a `create or replace` delta because the originating migration was already recorded.
- RLS enabled in the same migration as the grants; three self-owned policies (`select_own`, `insert_own`, `update_own`) all bound to `auth.uid()` — insert/update `WITH CHECK` prevents claiming another user's id. No DELETE policy/grant. Only `authenticated` is granted `select, insert, update`; `anon` and `service_role` have no privileges and no RLS bypass.
- Website integration: PKCE flow, persisted `localStorage` session, `/login` and `/account` pages, generic (enumeration-safe) auth error messages. Client modules are `apps/website/src/lib/{supabase,auth-service,auth-context}.*`.
- Behavioral verification lives in `supabase/tests/rls_assertions.sql` (role-impersonation: cross-user isolation + anon default-deny); structural invariants in `db_assertions.sql` (16 checks) and the migration-guard suite (7/7).

## Authorization hardening (CLOUD-003)

`20260915140000_harden_rls_authorization.sql` completes the default-deny boundary at the privilege layer. See ADR-010 addendum; highlights:

- `anon` loses `USAGE`/`CREATE` on schema `public`, and the anonymous role is removed entirely via `revoke usage on schema public from public`. `authenticated`/`service_role`/`postgres` are unaffected (explicit `=U` grants, verified behaviorally). Anonymous access is now denied at the schema boundary, not just by RLS.
- The built-in schema-less Postgres function default `EXECUTE ... FROM PUBLIC` is revoked for future `postgres`-created functions (schema-scoped revokes cannot override it, issue supabase#49338).
- Direct `EXECUTE` on `public.profiles_set_timestamps()` is revoked from every app role; triggers still fire (verified with real fixtures).
- `supabase/tests/db_assertions.sql` extended to 20 checks (anon/PUBLIC schema lockout, schema-less function default, trigger-function EXECUTE deny); `rls_assertions.sql` upgraded to real fixture rows (users A/B/C, cross-user isolation, ownership transfer blocked, owner self-insert/update, trigger fired under reduced EXECUTE, anon + service_role denial, self-contained rollback); migration-guard suite now 9 tests (no broad `USING (true)`/`WITH CHECK (true)` policies, no authorization via `user_metadata`).

## Entitlements authorization (CLOUD-004)

`20260915150000_establish_entitlements.sql` introduces the entitlement state table. See ADR-012 for the full decision; highlights:

- `public.entitlements`: one row per user per product (UNIQUE constraint), 12 columns. Key identity/provider columns (`id`, `user_id`, `provider`, `provider_customer_ref`, `provider_payment_ref`) are un-granted — a client cannot see them. The safe projection (`product`, `plan`, `status`, `starts_at`, `expires_at`, `updated_at`) is granted as column-level SELECT only. No INSERT/UPDATE/DELETE grant — authenticated users cannot mutate entitlements by default; service_role performs writes (CLOUD-009).
- 6 CHECK constraints enforce invariant states: plan ↔ expiry (lifetime ⇒ NULL, monthly ⇒ NOT NULL), status ↔ plan (only reachable states), expiry ≥ starts_at, provider = 'razorpay', status ∈ {active, cancelled, expired, revoked}.
- RLS enabled in the same migration; one policy `entitlements_select_own` (SELECT, USING `user_id = (select auth.uid())`). No write policies — absence of policy = no INSERT/UPDATE/DELETE for any app role.
- Timestamps trigger `entitlements_set_timestamps` (SECURITY INVOKER, search_path = pg_catalog) owns created_at/updated_at only; EXECUTE revoked from all app roles.
- `pg_graphql` not installed: column-level grant advisor lints (0026/0027) will not fire for authenticated on this table (intentional).

Verification: `db_assertions.sql` checks 21–30 (column grants, CHECKs, RLS, trigger); `rls_assertions.sql` scenarios E1–E15 (self-read, isolation, column denial, write denial, CHECK enforcement, legitimate server transitions, trigger ownership); `migration-guard.test.mjs` tests 10–11 (no broad grants, write-grant policy-pairing guard). All pass post-migration; security and performance advisors both clean (0 lints).

## Client-safe configuration

Client bundles may only consume the publishable, client-safe variables documented in `apps/*/.env.example` (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Secrets — service-role keys, database passwords, MCP credentials — never enter the repository, generated bundles, progress records, or screenshots. See `14_ENVIRONMENT_AND_SECRETS.md` and `09_SECURITY_BASELINE.md`.