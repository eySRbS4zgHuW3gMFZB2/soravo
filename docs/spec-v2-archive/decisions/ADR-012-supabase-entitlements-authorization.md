# ADR-012 — Supabase entitlements authorization model

Status: Accepted
Date: 2026-09-15

Context: Soravo needs a server-controlled entitlement state — per-user subscription lifecycle (monthly, lifetime, revoked, expired) — to gate feature access on the client. The entitlements record must be secure-by-construction: a normal authenticated client can never fabricate, escalate, or transfer its own paid status. The application handles feature access control; Supabase stores the canonical state and enforces that only the server (payment processing via service_role) can mutate it. No payment data, PII, or subscription history lives outside this row.

Decision: Establish `public.entitlements` with a single-row-per-user-per-product design (absence of a row = free; payment history belongs to future CLOUD-010/011). The table is accessed by authenticated users through a column-level SELECT grant covering only the safe projection; all identity and provider reference columns are un-granted. One RLS policy enforces self-scope (user_id = auth.uid()). There are no write policies — INSERT/UPDATE/DELETE are denied to authenticated and anon by default. Service_role (server only) performs writes; no service_role SELECT grant is established (CLOUD-009 will add it if needed). The DB enforces invariant states through CHECK constraints: plan ↔ expiry (lifetime ⇒ NULL, monthly ⇒ NOT NULL), status ↔ plan (only reachable states allowed), expiry ≥ starts_at, provider = 'razorpay', status in the allowed set. A UNIQUE(user_id, product) constraint enforces one active row per product per user.

Alternatives:
- Full-table SELECT with RLS-only filtering (rejected: provider/payment columns visible via SELECT *, client must never see them).
- A separate `is_free` boolean column (rejected: no row = free is the canonical model; the boolean adds no information).
- A `subscription_status` field on profiles (rejected: entitlements is a separate concern with its own CHECK invariants; coupling to profiles violates single responsibility).
- Granting SELECT on all columns and trusting the client to never read them (rejected: violates secure-by-construction; a misbehaving client reads everything).

Security impact:
- Authenticated users CANNOT see: `id`, `user_id`, `provider`, `provider_customer_ref`, `provider_payment_ref`. These columns are simply not granted; referencing them in SELECT or WHERE raises `42501`.
- `SELECT *` is denied because un-granted columns are in the result set.
- `WHERE user_id = ...` is denied because `user_id` is un-granted; RLS filters the row invisibly via the policy USING clause.
- INSERT, UPDATE, DELETE are denied by default (no policy, no grant). A client cannot self-provision, escalate plan/status, or remove its own record.
- CHECK constraints are enforced server-side even for the postgres superuser, so impossible plan/status/expires_at combinations are always rejected.
- The timestamps trigger (`entitlements_set_timestamps`, SECURITY INVOKER, search_path = pg_catalog) owns `created_at`/`updated_at`; EXECUTE revoked from all app roles (triggers invoke without an EXECUTE grant per CLOUD-003).
- `pg_graphql` is not installed, so no column-level grant lint (0026/0027) fires. This is intentional.

License validity predicate (server-side, for CLOUD-012):

```
(lifetime AND active) OR (monthly AND (active OR cancelled) AND now() <= expires_at)
```

A missing row is "free". The predicate is documented here for CLOUD-012 to reference.

Operational impact: The migration applies the table, constraints, RLS policy, trigger, and column-level grant in a single transaction. Verified via:
- `db_assertions.sql` checks 21–30 (DDL state: column grants, CHECK constraints, RLS policy, trigger, trigger ownership).
- `rls_assertions.sql` scenarios E1–E15 (behavioral: self-read, cross-user isolation, column denial, write denial, CHECK rejection, legitimate server transitions, trigger ownership).
- `migration-guard.test.mjs` tests 10–11 (no broad grants to any role; write-grant policy-pairing guard).

Testing impact: 30 structural DB assertion checks, 11 migration-guard tests, and 27 RLS behavioral scenarios (A1–A10 + B1–B3 + E1–E15) all pass against dev project `zbzhlhoxblguepplqppw` post-migration. Security and performance advisors report 0 lints.

Rollback: The migration is additive and reversible. Rollback is manual (human-authorized `DROP TABLE public.entitlements CASCADE`); the previous state was a `public` schema with only `profiles` and no entitlements objects.

Consequences: Service_role write operations (INSERT/UPDATE/DELETE on entitlements) are intentionally denied at the client role layer; only the server (payment processing, CLOUD-009) performs writes. CLOUD-010 (Razorpay webhook handler) and CLOUD-011 (payment provisioning) will execute writes via service_role. The `expires_at` column is nullable; the CHECK constraint ensures `plan = 'monthly'` ⇒ `expires_at IS NOT NULL` and `plan = 'lifetime'` ⇒ `expires_at IS NULL`. Payment history (cancelled/expired rows) is not modeled in this table — that belongs to a future orders/ledger table (CLOUD-010). The `product` column defaults to `'soravo'` but is not constrained to a single value, allowing future products without a migration.
