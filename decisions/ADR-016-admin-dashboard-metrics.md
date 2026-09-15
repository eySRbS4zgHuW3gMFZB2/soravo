# ADR-016 — Admin dashboard product metrics queries

Status: Accepted
Date: 2026-09-15

Context: CLOUD-007 delivers the query surface the future admin dashboard (WEB-009) needs: read-only product metrics derived from user rows (`auth.users`), entitlement rows, device rows, and session rows (TDD §15; 02_TDD.md §15). ADR-010 establishes that `public` is default-deny and that no `SECURITY DEFINER` functions exist in `public` unless explicitly justified in a later ADR; ADR-022 establishes that `public.profiles.role` is the singular server-authoritative admin flag, immutable by every non-superuser session. CLOUD-006 fixed the authorization primitive but deliberately deferred metrics. Every authenticated session is RLS-scoped to its own rows, so a plain function (SECURITY INVOKER, or a view) can never aggregate across users even for an admin — the whole point of metrics is cross-user aggregation. The metrics layer must therefore be privileged (read across users) yet authorize each call to an actual admin (profiles.role = 'admin').

Decision: Expose exactly three SECURITY DEFINER functions in `public`, callable only by the `authenticated` role through PostgREST RPC, each performing its own server-side admin gate FIRST inside the function body:

- `admin_metrics_totals()` → `jsonb`: headline snapshot — registered users, paid users (ADR-012 validity predicate), monthly subscription state (active/cancelled/expired/total), lifetime state (active/revoked/total), device total/revoked/by-platform, and `generated_at`. Aggregates only; never raw rows, identifiers, provider references, payments, or PII.
- `admin_metrics_growth(p_bucket text, p_from timestamptz, p_to timestamptz)` → `table (bucket timestamptz, new_users bigint)`: UTC calendar-aligned new-user series from `auth.users.created_at`, day/week/month, half-open buckets `[lower, lower+step)`, leading bucket floored to a bucket boundary, bucket count hard-capped at 10000.
- `admin_metrics_active_users(p_from, p_to)` → `bigint`: distinct users with at least one non-revoked session whose `last_seen_at` lies in `[p_from, p_to)`. This is the only metric that reads `public.sessions`.

The SECURITY DEFINER exception is justified here (ADR-010's escape hatch) for a single, narrow reason: cross-user aggregation cannot be expressed under RLS. The privilege elevation is contained by construction:

- The gate runs FIRST: `auth.uid()` is fetched (null claims raise immediately), then `public.profiles.role = 'admin'` must hold. Claims injected via `request.jwt.claims` (including `role:admin`, `user_metadata.role`) grant nothing — the stored `profiles.role` column is the only authority (ADR-022, verified behaviorally for the R1–R12 pattern).
- EXECUTE is revoked from `public`, `anon`, `service_role` and granted to `authenticated` only. `anon` additionally has no `USAGE` on `public` (CLOUD-003). `service_role` is not a client path (ADR-010).
- Every function pins `search_path = pg_catalog` (security advisor 0011) and references every object schema-qualified (`auth.uid()`, `auth.users`, `public.profiles`, `public.entitlements`, `public.devices`, `public.sessions`).
- No dynamic SQL: the bucket unit is translated by a `CASE` over fixed literals; user-provided strings never reach query text.
- Return payloads are aggregates (counts). No raw user identifiable data is exposed; Umami remains website-behavior analytics only and is never consulted (TDD §15).
- No new tables, sequences, table grants, or policies: the default-deny, RLS-paired-grant, and no-self-service-elevation invariants are unchanged.

User counts deliberately derive from `auth.users` (all registered accounts) rather than `public.profiles`, because profile rows are lazily self-INSERTed (CLOUD-002) and their `created_at`/`updated_at` are overwritten by a server trigger — they would under-count and defeat deterministic backdating in verification fixtures. `auth.users` carries no application timestamp trigger and is the authoritative registration ledger.

Alternatives:
- SECURITY INVOKER functions + temporary RLS bypass via `SET row_security = off` (rejected: requires superuser and bypasses the whole policy layer per-session; the admin gate would live outside the object).
- `security_invoker = true` VIEWs over `public` tables (rejected: views resolve through caller RLS too, so an admin still sees only own rows; with `security_invoker = false` the view owner privilege bypass is implicit and ungated, worse than a gated function).
- SECURITY DEFINER functions in a separate `admin`/`metrics` schema (rejected: PostgREST only exposes the `public` schema; exposing another schema broadens attack surface, and the project keeps all application objects in `public` per the established pattern; the gate, not the schema, is the boundary).
- A single monolith RPC returning a giant payload (rejected: separate functions keep the PostgREST surface minimal, type-checked, and independently grantable; requests remain small).
- Granting `service_role` EXECUTE as the dashboard's call path (rejected twice: `service_role` must never appear in a client path, ADR-010; and the dashboard is an authenticated admin browser session, not a privileged server).

Security impact:
- Non-admin authenticated sessions are denied by the in-body gate (raise `CLOUD-007: admin access required`), even when the JWT carries admin-looking claims (`user_metadata.role`, `role:admin`) — stored-column authority only.
- `anon` and `service_role` hold no EXECUTE (and `anon` has no schema `USAGE`), so neither can invoke any function at any privilege level.
- Postgres (owner) can invoke, but without `request.jwt.claims` the gate still raises — even the superuser path requires a real admin identity, proving the gate is not merely an EXECUTE-level check.
- The SECURITY DEFINER surface is 100% read-only: the body contains only `SELECT count(*)`/`count(distinct)`/`return jsonb`; no DML, no `dblink`, no file/URL access.
- No new data stored; no PII aggregated beyond counts; Umami not involved.

Performance impact: `sessions_last_seen_at_idx` on `public.sessions(last_seen_at)` serves the active-users range scan (one new index). `admin_metrics_growth` scans `auth.users` per bucket (capped at 10000 buckets); `auth` is a stock Supabase schema and is deliberately not modified. At Soravo's scale these are cheap aggregate counts over small metadata tables.

Operational impact: One additive migration `20260915180000_establish_product_metrics.sql` to be applied to dev project `zbzhlhoxblguepplqppw` via Supabase MCP, then verified with `db_assertions.sql` and `rls_assertions.sql` and the security/performance advisors. Individual metrics functions can be revoked (`revoke execute ... from authenticated`) without touching the rest; the whole surface can be dropped as a unit.

Testing impact: `db_assertions.sql` grows from 53 to 57 checks — check 16 (previously "zero SECURITY DEFINER in public") becomes a whitelist of exactly the three metrics functions; checks 54–57 assert signatures exist, ACLs (authenticated EXECUTE yes; anon/service_role/PUBLIC no), `SECURITY DEFINER` + pinned `search_path`, and the `sessions_last_seen_at_idx` index. `rls_assertions.sql` gains the M-block (admin Erin; ordinary users Frank/Gina; backdated `auth.users.created_at`; backdated Frank device/session inserted with timestamp triggers disabled) proving: anon denied, non-admin denied, admin allowed with exact counts, JWT-claim tampering denied, day/week/month bucket correctness, 10000-bucket cap, invalid-bucket rejection, active-users half-open boundaries, service_role denied, superuser-without-claims denied. `migration-guard.test.mjs` stays 12/12 (the migration adds no table grants, so no new guard case is required).

Rollback: Additive and reversible. To revert: `revoke execute on function ... from authenticated; drop function public.admin_metrics_totals(); drop function public.admin_metrics_growth(text, timestamptz, timestamptz); drop function public.admin_metrics_active_users(timestamptz, timestamptz); drop index public.sessions_last_seen_at_idx;` (human-authorized). Prior state: CLOUD-006 baseline with no metrics functions.

Consequences: WEB-009 (admin dashboard) and any future admin analytics consume these functions through the PostgREST RPC as an authenticated admin; no other write path exists. The SECURITY DEFINER whitelist in `db_assertions.sql` check 16 is the standing guard: any future privileged function must be deliberately added there with its own ADR justification. Audio, transcripts, keystrokes, clipboard, and history remain prohibited in Supabase (ADR-010, 01_PRD.md §10).