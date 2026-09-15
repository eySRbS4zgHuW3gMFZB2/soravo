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

## Devices and sessions authorization (CLOUD-005)

`20260915160000_establish_devices_and_sessions.sql` introduces the per-user device/session ledger. See ADR-013 for the full decision; highlights:

- `public.devices`: one row per installed desktop install (user-owned; `user_id` FK → `auth.users(id)` `ON DELETE CASCADE`), `platform` (CHECK-enumerated), `app_version` (≤32), `first_seen_at`/`last_seen_at`, and one-way `revoked_at` (CHECK `revoked_at >= first_seen_at`). Friendly, opaque, non-secret `device_public_id` (8–200, UNIQUE) for client-facing addressing.
- `public.sessions`: one row per active run, bound to a device (`device_id` FK → `public.devices(id)` `ON DELETE CASCADE`), `last_seen_at`, one-way `revoked_at` (CHECK `revoked_at >= created_at`), and UNIQUE `session_public_id`.
- RLS enabled in the same migration with three self-owned policies per table (`select_own`/`insert_own`/`update_own`), all bound to `user_id = (select auth.uid())` (USING + WITH CHECK). `sessions` INSERT/UPDATE WITH CHECK additionally requires `exists(select 1 from devices d where d.id = device_id and d.user_id = auth.uid() and d.revoked_at is null)` — a session can only bind to a live, owned device. No DELETE policy/grant.
- Revocation is terminal: `update_own` USING is `user_id = auth.uid() AND revoked_at IS NULL` (a revoked row cannot be mutated; the one-time revoke passes because USING sees the pre-update row), and a `guard_revocation` trigger rejects clearing `revoked_at` even for postgres. `guard_identity` triggers make `user_id`, public ids, and `first_seen_at`/`created_at` immutable via UPDATE.
- Three triggers per table (set_timestamps, guard_identity, guard_revocation), all SECURITY INVOKER with `search_path = pg_catalog` and EXECUTE revoked from every app role. Only `authenticated` is granted `select, insert, update`; `anon` and `service_role` have no privileges.

Verification: `db_assertions.sql` checks 31–48 (RLS, FKs, CHECK/UNIQUE constraints, exact grants, policy expressions, trigger attachment/EXECUTE deny); `rls_assertions.sql` scenarios D1–D9 + S1–S10 (self-scope, cross-user isolation, terminal revocation at RLS/trigger/postgres levels, revoked-device session bind AND revoked-device session-write denial, anon denial); `migration-guard.test.mjs` 12/12. All pass post-migration on dev project `zbzhlhoxblguepplqppw`; security advisors clean (0 lints); performance advisor reports one expected INFO for the fresh `sessions_device_id_idx`.

## Admin role / authorization (CLOUD-006)

`20260915170000_establish_admin_role_authorization.sql` + delta `20260915171000_admin_role_insert_guard.sql` add the server-authoritative admin flag. See ADR-022 for the full decision; highlights:

- `public.profiles.role` is `text NOT NULL DEFAULT 'user'` with CHECK `role in ('user','admin')`. It is the ONLY source of admin authority; frontend hiding is not authorization (TDD §14).
- `profiles_guard_role_immutable` trigger (SECURITY INVOKER, `search_path = pg_catalog`, EXECUTE revoked from every app role) fires `BEFORE INSERT OR UPDATE`: non-postgres sessions can never write a `role` other than the `'user'` default on INSERT, and can never change `role` on UPDATE. `postgres` (superuser) is the ONLY role-authoring path — promotion/demotion is human-authorized, privileged SQL.
- No new table, no new grants, no new RLS policies. Claims injected via `request.jwt.claims` (even `user_metadata.role`/`role: admin`) grant no authority — authorization state lives in the stored column, not the JWT.
- Nor is any behavior regressed: users still read their own `role` for UX and update non-role columns freely; cross-user isolation, anon denial, and self-ownership semantics are unchanged.

Verification: `db_assertions.sql` checks 49–53 (role column, CHECK, guard trigger attached/enabled, SECURITY INVOKER + no app-role EXECUTE, `search_path` pinned); `rls_assertions.sql` scenarios R1–R12 (default role, self-promote/demote rejection, INSERT-with-admin rejection, out-of-enum rejection, cross-user role-update isolation, non-role self-update preserved, postgres promote/demote, anon denial, own-role read, JWT-metadata non-authority, cross-user isolation intact); `migration-guard.test.mjs` 12/12 (no grants/policies added). All pass post-migration on dev project `zbzhlhoxblguepplqppw`; security advisors clean (0 lints); performance advisor unchanged (1 pre-existing INFO).

## Product metrics queries (CLOUD-007)

`20260915180000_establish_product_metrics.sql` adds the admin-dashboard read surface for product metrics (TDD §15). See ADR-016 for the full decision; highlights:

- EXACTLY three SECURITY DEFINER functions in `public`, callable only by `authenticated` via PostgREST RPC. SECURITY DEFINER is the ADR-016-sanctioned exception (ADR-010's escape hatch): RLS cannot aggregate across users, which is the entire purpose of a metrics layer. Privilege containment is by construction:
  - every function gates FIRST on `auth.uid()` (non-null) AND `public.profiles.role = 'admin'` — a null uid or non-admin profile raises `CLOUD-007: admin access required`; claims injected via `request.jwt.claims` (incl. `user_metadata.role`, `role:admin`) grant nothing (stored-column authority, ADR-022);
  - EXECUTE revoked from `public`, `anon`, `service_role`; granted to `authenticated` only (`anon` also lacks schema `USAGE`, CLOUD-003);
  - `search_path = pg_catalog` on every function, all references schema-qualified, no dynamic SQL (bucket unit translated by fixed-literal CASE);
  - read-only bodies: `count`/`count(distinct)` aggregates only — no raw user rows, identifiers, provider refs, or PII ever returned; Umami is never a metrics source.
- `admin_metrics_totals()` → `jsonb`: registered users (from `auth.users`, the authoritative ledger — profiles lazily self-created and trigger-stamped would under-count), paid users (ADR-012 validity predicate read at query time), monthly subscription state (active/cancelled/expired/total), lifetime state (active/revoked/total), device total/revoked/by-platform, `generated_at`.
- `admin_metrics_growth(p_bucket, p_from, p_to)` → `table (bucket, new_users)`: UTC calendar-aligned new-user series from `auth.users.created_at` in `day|week|month`; half-open buckets `[lower, lower+step)`; the leading bucket is floored to a bucket boundary (may precede `p_from`); bucket count hard-capped at 10000.
- `admin_metrics_active_users(p_from, p_to)` → `bigint`: distinct users with a non-revoked session in the half-open window `[p_from, p_to)`. New index `sessions_last_seen_at_idx` serves the range scan.
- No new tables, sequences, table grants, or policies: the CLOUD-001 default-deny, RLS-paired-grant, and no-self-service-elevation invariants are unchanged.

Verification: `db_assertions.sql` grows to 57 checks — check 16 is now a SECURITY DEFINER whitelist (exactly the three metrics functions), checks 54–57 pin signatures, ACLs (authenticated EXECUTE yes; anon/service_role/PUBLIC no), `SECURITY DEFINER` + pinned `search_path`, and the index; `rls_assertions.sql` scenarios M1–M10 (anon denied, non-admin denied in-body, admin allowed with exact totals across the accumulated suite state, JWT-tamper denied, day/week/month bucket exactness, 10000-bucket cap, invalid-bucket rejection, active-users half-open boundaries, service_role denied, postgres-without-claims denied); `migration-guard.test.mjs` unchanged at 12/12 (no table grants added).

## Session/password flows (CLOUD-008)

`CLOUD-008` completes the website's active-session and password-management primitives (PRD §4.9/§6). See ADR-023 for the full decision; highlights:

- **No new SQL, no new migration, no new SECURITY DEFINER.** The existing CLOUD-005 `public.sessions`/`public.devices` ledger and its one-way `revoked_at` latch remain the app-layer session registry; actual credential revocation is handled by GoTrue server-side via scoped `signOut` (`/logout?scope=local|others|global`), which deletes the matching `auth.sessions` rows.
- The account page's "Sign out" now uses `scope: "local"` (current session only — the previous default-less call silently terminated every session); a new "Sign out other sessions" control uses `scope: "others"` (no `SIGNED_OUT` event fires, so the UI reports success without unmounting).
- Password change is reauthentication-aware: `updatePassword` detects `reauthentication_needed` and presents a code-entry flow; the OTP is sent via `requestReauthentication` (GoTrue) and finalized as a `nonce` on `updateUser`.
- `db_assertions.sql` check-16 SECURITY DEFINER whitelist remains at exactly the three ADR-016 metrics functions. All repo gates + 12/12 migration-guard tests pass; no assertion suite changes required for this task.

Verification: website gates (`pnpm lint`, `pnpm typecheck`, `pnpm test` — 84 website tests incl. scoped signOut, reauth flow, other-sessions signOut, code-entry tests, `pnpm build`, `pnpm audit --prod`) all pass; `pnpm test:supabase` 12/12 migration-guard tests pass; no DB assertions re-run needed (no schema change).

## Client-safe configuration

Client bundles may only consume the publishable, client-safe variables documented in `apps/*/.env.example` (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Secrets — service-role keys, database passwords, MCP credentials — never enter the repository, generated bundles, progress records, or screenshots. See `14_ENVIRONMENT_AND_SECRETS.md` and `09_SECURITY_BASELINE.md`.