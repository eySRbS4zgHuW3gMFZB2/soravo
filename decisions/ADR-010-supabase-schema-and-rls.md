# ADR-010 — Supabase schema and RLS

Status: Accepted
Date: 2026-09-15

Context: Soravo requires a managed Postgres backend for account and licensing metadata: user profiles, entitlements, device registrations, and session state. A Supabase project (`project_ref zbzhlhoxblguepplqppw`) is provisioned as the development target. This repository's `supabase/migrations/` is the authoritative, reproducible source of truth for every schema change, keeping the database definition under review with the rest of the codebase rather than diverging through ad-hoc SQL.

Decision: Use Supabase/Postgres for account, auth, entitlement, device, and session metadata only. Migrations live in `supabase/migrations/` and are applied through authorized project tooling (the project-scoped Supabase MCP). The application `public` schema is default-deny: the baseline migration revokes Supabase's stock default privileges so that `anon`, `authenticated`, and `service_role` receive nothing on future tables, sequences, or functions created by `postgres`; future migrations must grant access explicitly.

Alternatives: A self-hosted Postgres instance; storing application metadata only client-side.

Security impact: The `public` default-deny boundary prevents accidental broad grants from Supabase's stock defaults. Row-level security becomes mandatory for any future table granted to `anon` or `authenticated`; RLS must be enabled in the same migration that grants access. Table ownership predicates are based on `auth.uid()`; grants to `authenticated` use `TO authenticated` with UPDATE `USING` and `WITH CHECK`. `anon` and `authenticated` never bypass RLS. Authorization must never come from `auth.users.user_metadata`. No `SECURITY DEFINER` functions in `public` unless explicitly justified in a later ADR. `service_role` is never used in a client path.

Performance impact: RLS predicates add per-query evaluation; indexes will be designed per table in later CLOUD tasks (CLOUD-003+) when the schema is introduced.

Operational impact: Migrations are reviewed like code, applied via authorized tooling, and verified behaviorally after each application. The baseline itself creates no tables and is non-destructive.

Testing impact: A database assertion suite (`supabase/tests/db_assertions.sql`) verifies the live boundary; migration structural invariants are enforced by vitest (`supabase/tests/migration-guard.test.mjs`) and run in CI.

Rollback: The baseline migration is additive and reversible; restoring Supabase's original default grants is a documented reverse procedure, executed only when an actual rollback is required.

Consequences: Per-table schema and RLS policy design is deferred to CLOUD-003+; nothing here creates application tables, policies, functions, triggers, or data. Audio, transcripts, keystrokes, clipboard, and history must never be stored in Supabase; those remain local-only or off-cloud per product constraints.