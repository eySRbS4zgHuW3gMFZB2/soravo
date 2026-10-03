# T08 — Supabase Live Verification Report

**Task:** T08-SUPABASE-LIVE-VERIFICATION
**Date (UTC):** 2026-09-28
**Mode:** Read-only live inspection. No migrations applied. No schema modified. No data created/deleted. No secrets exposed.
**Project:** Soravo (`project_id = "soravo"` in `supabase/config.toml`)

## Skill-selection gate (FIRST, per v6 §10)

Narrowest relevant skills for a Supabase live-verification task:

1. `supabase` — loaded. Applied: MCP-first read-only inspection (`list_tables`, `list_migrations`, `execute_sql`, `get_advisors`, `get_project_url`); RLS/security checklist (RLS on all `public` tables, no `user_metadata` authorization, `SECURITY DEFINER` scrutiny, least-privilege grants); no schema change committed via `execute_sql`.
2. `supabase-postgres-best-practices` — loaded. Applied: read-only catalog queries (`pg_indexes`, `pg_constraint`, `pg_policies`, `information_schema` grants, `pg_proc`/`pg_trigger`); aggregate-only state queries (no PII); advisor review (security + performance).
3. `security-guidance` — inspected. Applied: no secret extraction, no credential storage assertions, aggregate counts only.

No skill conflicted with the v6 pack; the pack governs on conflict (v6 §10).

## Authoritative sources used (v6 completion matrix + docs)

- Completion matrix: `docs/Soravo_Engineering_Docs_v6/22_IMPLEMENTATION_COMPLETION_MATRIX.md` (HEAD `ede495b5`, branch `main`).
- Authority Ladder / evidence vocabulary: `Soravo_Engineering_Docs_v6/00_README.md`, `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md`.
- Contracts: `03_TECHNICAL_DESIGN.md` (payment/entitlement flow), `06_WEB_CLOUD_PAYMENT.md` (auth, RLS, checkout, webhook ledger, entitlement semantics).
- Repo source of truth for schema: `supabase/migrations/` (14 files), `supabase/config.toml`, `supabase/README.md`, `supabase/functions/{payment-checkout,razorpay-webhook}/`.
- Live source: Supabase MCP read-only tools against the linked project (no CLI, no local stack per `supabase/README.md` scope note).

## 1. Project identity — CONFIRMED

| Source | Value |
|---|---|
| `supabase/config.toml` `project_id` | `soravo` |
| `supabase/README.md` documented `project_ref` | `zbzhlhoxblguepplqppw` |
| Live `get_project_url` | `https://zbzhlhoxblguepplqppw.supabase.co` |
| `supabase/README.md` region/PG | Apne2 region, Postgres 17 (documented; not re-probed — no version query issued) |

Identity is consistent across repo declaration and live endpoint. **CONFIRMED.**

## 2. Database connectivity — CONFIRMED

All of the following succeeded read-only in this session: `list_tables(public, verbose)`, `list_migrations`, `get_project_url`, `get_advisors(security)`, `get_advisors(performance)`, and 10 scoped `execute_sql` SELECTs against catalog views (`pg_indexes`, `pg_constraint`, `pg_policies`, `information_schema.*`, `pg_proc`, `pg_class`) plus aggregate counts. No timeout, no auth failure. **Connectivity CONFIRMED.**

## 3. Applied migration history (remote, read-only)

Remote `list_migrations` returned 14 entries, in version order:

| # | Remote version | Remote name |
|---|---|---|
| 1 | 20260915050920 | establish_supabase_baseline |
| 2 | 20260915062310 | establish_profiles_and_rls |
| 3 | 20260915062707 | profiles_set_search_path |
| 4 | 20260915094537 | harden_rls_authorization |
| 5 | 20260915102139 | 20260915150000_establish_entitlements |
| 6 | 20260915111100 | establish_devices_and_sessions |
| 7 | 20260915114327 | establish_admin_role_authorization |
| 8 | 20260915114529 | admin_role_insert_guard |
| 9 | 20260915130217 | establish_product_metrics |
| 10 | 20260916052432 | establish_admin_user_directory |
| 11 | 20260926173530 | entitlements_provider_neutral |
| 12 | 20260926173539 | establish_webhook_events |
| 13 | 20260926173605 | razorpay_webhook_hardening_022 |
| 14 | 20260926193817 | entitlements_provider_refs |

Repo `supabase/migrations/` holds 14 files. Semantic 1:1 correspondence holds for all 14 (see §17). **Applied history CONFIRMED present (14/14 semantic match); version-string divergence noted in §17 (UNKNOWN cause, no semantic effect observed).**

## 4. Current schema (live) — CONFIRMED

`information_schema.tables WHERE table_schema='public'` returns exactly 5 `BASE TABLE`s; `pg_class` in `public` returns the same 5 relations plus their indexes, and **no views, no materialized views, no additional relations**:

- `public.profiles`
- `public.entitlements`
- `public.devices`
- `public.sessions`
- `public.webhook_events`

All five carry `rls_enabled = true` (via `list_tables verbose`). No `product_metrics` table and no `admin_*` view exist in `public` — consistent with repo migrations `..._establish_product_metrics.sql` and `..._establish_admin_user_directory.sql`, which contribute **functions + columns, not tables/views** (see §17). **CONFIRMED.**

## 5. Required tables — CONFIRMED

Per `06_WEB_CLOUD_PAYMENT.md` + `supabase/README.md` + migration chain (CLOUD-002/004/005/011/013): `profiles`, `entitlements`, `devices`, `sessions`, `webhook_events` are all present live with row counts (from `list_tables`, no row content read):

| Table | Rows (count metadata only) |
|---|---|
| profiles | 2 |
| entitlements | 3 |
| devices | 0 |
| sessions | 0 |
| webhook_events | 17 |

**All required tables CONFIRMED present.**

## 6. Required columns — CONFIRMED

Live column sets (via `list_tables verbose`) match the migration-defined contracts:

- **profiles** (`id uuid PK/FK`, `display_name text ≤80`, `created_at/updated_at timestamptz default now()`, `role text default 'user'`, `public_user_id text unique 8–200`): all 6 present.
- **entitlements** (13 columns): `id`, `user_id`, `product`, `plan`, `status default 'active'`, `provider`, `provider_customer_ref`, `provider_payment_ref`, `starts_at default now()`, `expires_at nullable`, `created_at/updated_at`, plus `provider_order_ref nullable` and `provider_subscription_ref nullable` (from `20260927100000_entitlements_provider_refs.sql`). All present.
- **devices** (8 columns): `id`, `user_id`, `device_public_id unique`, `platform`, `app_version`, `first_seen_at/last_seen_at`, `revoked_at nullable`. All present.
- **sessions** (7 columns): `id`, `user_id`, `device_id`, `session_public_id unique`, `created_at/last_seen_at`, `revoked_at nullable`. All present.
- **webhook_events** (10 columns): `id`, `event_id unique`, `event_type`, `processed_at nullable default now()`, `status default 'processing'`, `claimed_at`, `attempts default 0`, `last_error nullable`, `created_at/updated_at`. All present.

**Required columns CONFIRMED. No missing or extra columns observed in `public`.**

## 7. Primary / foreign keys — CONFIRMED

From `pg_constraint` (live):

- PKs: `profiles_pkey(id)`, `entitlements_pkey(id)`, `devices_pkey(id)`, `sessions_pkey(id)`, `webhook_events_pkey(id)`. All present.
- UNIQUEs: `profiles_public_user_id_unique`, `entitlements_one_current_per_user_product(user_id, product)` (the ADR-012 one-current-row invariant), `devices_public_id_unique`, `sessions_public_id_unique`, `webhook_events_event_id_unique`. All present.
- FKs with `ON DELETE CASCADE`: `profiles.id → auth.users(id)`, `entitlements.user_id → auth.users(id)`, `devices.user_id → auth.users(id)`, `sessions.user_id → auth.users(id)`, `sessions.device_id → devices(id)`. All present with the migration-specified cascade direction.

**PK/FK set CONFIRMED.**

## 8. Constraints (CHECK) — CONFIRMED

Live CHECKs match the migration contracts:

- profiles: `display_name ≤ 80`, `role IN ('user','admin')`, `public_user_id 8–200`.
- entitlements: `plan IN ('monthly','lifetime')`, `status IN ('active','cancelled','expired','revoked')`, plan↔expiry (`lifetime ⇒ expires_at IS NULL`, `monthly ⇒ expires_at NOT NULL`), status↔plan reachability (`lifetime ⇒ active/revoked`; `monthly ⇒ active/cancelled/expired`), `expires_at ≥ starts_at`, provider non-empty (`provider IS NOT NULL AND provider <> ''` — the provider-neutral successor from `20260920100000`, old `provider='razorpay'` check absent as intended).
- devices: `platform IN ('macos','windows','linux')`, `app_version 1–32`, `device_public_id 8–200`, `revoked_at ≥ first_seen_at`.
- sessions: `session_public_id 8–200`, `revoked_at ≥ created_at`.
- webhook_events: `status IN ('processing','completed','failed')`.

**Constraints CONFIRMED.**

## 9. Indexes — CONFIRMED

Live `pg_indexes WHERE schemaname='public'` (19 indexes):

- profiles: pkey + `profiles_public_user_id_unique`.
- entitlements: pkey + `entitlements_one_current_per_user_product` + `entitlements_provider_order_ref_idx (partial WHERE NOT NULL)` + `entitlements_provider_payment_ref_idx` + `entitlements_provider_subscription_ref_idx (partial WHERE NOT NULL)`.
- devices: pkey + `devices_public_id_unique` + `devices_user_id_idx`.
- sessions: pkey + `sessions_public_id_unique` + `sessions_device_id_idx` + `sessions_last_seen_at_idx` + `sessions_user_id_idx`.
- webhook_events: pkey + `webhook_events_event_id_unique` + `webhook_events_processed_at_idx` + `webhook_events_status_claimed_at_idx(status, claimed_at)`.

Matches the repo's reconciliation/query path (`provider_order_ref`/`provider_subscription_ref` partial indexes from the 2026-09-27 migration; claim-lease composite on webhook_events). Performance advisor lists 5 as currently unused (`webhook_events_processed_at_idx`, `sessions_device_id_idx`, the three entitlement provider-ref indexes) at INFO level — expected on a low-volume ledger, not a defect. **Indexes CONFIRMED.**

## 10. RLS policies — CONFIRMED (with one intentional empty-policy table)

`pg_policies WHERE schemaname='public'` returns 10 policies; `list_tables` reports RLS enabled on all 5 tables:

- profiles: `profiles_select_own`, `profiles_insert_own`, `profiles_update_own` — all `TO authenticated`, `auth.uid()`-bound, no DELETE. CONFIRMED.
- devices/sessions: `select_own`/`insert_own`/`update_own` per table, `TO authenticated`, `user_id = (SELECT auth.uid())`, sessions write path additionally requires a live owned device (`EXISTS … devices … revoked_at IS NULL`), update USING requires `revoked_at IS NULL` (terminal revocation). CONFIRMED.
- entitlements: exactly one policy, `entitlements_select_own` (SELECT, `TO authenticated`, `user_id = (SELECT auth.uid())`). No write policies — absence = deny. CONFIRMED per CLOUD-004.
- webhook_events: RLS enabled, **zero policies**. This is the migration-specified posture (`20260926000000`: "No policies: service_role bypasses RLS … Authenticated/anon have no grants and no policies, so all access is denied"). Security advisor emits the expected INFO `rls_enabled_no_policy` for this table. **CONFIRMED intentional.**

Column/table grants corroborate least privilege (see §12 notes): `authenticated` holds table-level INSERT/SELECT/UPDATE only on profiles/devices/sessions; on entitlements only a 6-column SELECT projection (`product`, `plan`, `status`, `starts_at`, `expires_at`, `updated_at`); no `authenticated`/`anon` grants on webhook_events; `service_role` holds INSERT/SELECT/UPDATE on entitlements + webhook_events only. **CONFIRMED.**

## 11. Authentication configuration relevant to Soravo — PARTIAL (see discrepancies D3)

- Verified live: `auth.users` count = 3 vs `profiles` rows = 2 (aggregate counts only; no identifiers read). One auth account has no profile row — consistent with the documented lazy self-INSERT model (CLOUD-002: "profile rows are lazily self-INSERTed"), not a defect.
- Verified live: all RLS policies bind to server-derived `(SELECT auth.uid())`; no policy references `user_metadata` (migration-guard invariant holds live).
- Verified live: security advisor WARN `auth_leaked_password_protection` — **leaked-password protection is DISABLED** on the live project (discrepancy D3).
- NOT verified via read-only MCP (no auth-config API probed, no secret handling): PKCE/session-persistence behavior, JWT expiry, email-enumeration-safe error copy, MFA/OTP settings. Website/desktop code integration (`@supabase/supabase-js`, PKCE) was not re-audited in this task. Hence PARTIAL with UNKNOWNs recorded.

## 12. Entitlement tables / state — CONFIRMED present, values aggregate-only

- Table + columns + constraints + RLS + projection grant all CONFIRMED (§§4–10).
- Aggregate state (no identifiers/refs read): 3 rows total — `(lifetime, active, razorpay): 2`, `(monthly, active, razorpay): 1`; products `soravo_lifetime` (2) and `soravo_monthly` (1). No `cancelled`/`expired`/`revoked` rows currently present. Monthly plan/expiry invariant holds structurally (CHECK would reject otherwise).
- Write path: `service_role` INSERT/SELECT/UPDATE present (from `..._razorpay_webhook_hardening_022.sql`); `authenticated` has no write grant and no write policy. **CONFIRMED.**

## 13. Subscription state — CONFIRMED structurally, PARTIAL semantically

- Structural: monthly-vs-lifetime invariants (plan/expiry/status CHECKs), `provider_subscription_ref` column + partial index, `admin_metrics_*` validity predicate (read-time, `now() <= expires_at`) all present live.
- Live aggregate: 1 active monthly row, 2 active lifetime rows; zero cancelled/expired rows to exercise the renewal/cancellation paths. Webhook ledger shows 1 `subscription.charged/completed` event (aggregate only).
- End-to-end subscription lifecycle (renewal extension, cancellation-through-expiry) was NOT executed in this read-only task. Hence structural CONFIRMED, lifecycle semantics PARTIAL/UNKNOWN beyond stored state.

## 14. Payment-related records / schema — CONFIRMED (schema + ledger presence)

- Opaque provider refs: `provider`, `provider_customer_ref`, `provider_payment_ref`, `provider_order_ref`, `provider_subscription_ref` columns all present; order/subscription partial indexes present; `provider_payment_ref` index present. No card data/CVV/secret columns exist anywhere in `public`. CONFIRMED.
- Price catalog remains code-owned (`packages/payment-domain` per `03_TECHNICAL_DESIGN.md`); no third catalog table exists in the database. CONFIRMED by the 5-table closed set.
- Checkout/webhook Edge Functions exist in repo (`supabase/functions/payment-checkout`, `supabase/functions/razorpay-webhook`); **deployed-function revision was NOT probed in this task** (no Functions API call). UNKNOWN — see D4.

## 15. Webhook-related persistence — CONFIRMED

- `webhook_events` ledger present with the hardened state machine (`status` CHECK, `claimed_at` lease column, `attempts`, `last_error` (opaque), `processed_at` completion-only semantics), unique `event_id` dedup boundary, `(status, claimed_at)` reclaim index. Service-role-only grants. CONFIRMED.
- Aggregate ledger state (counts only): 17 rows — `completed: 15`, `failed: 2`. By `(event_type, status)`: `order.paid 2 completed / 1 failed`; `payment_link.paid 1 completed`; `payment.authorized 2 completed`; `payment.captured 2 completed / 1 failed`; `payment.failed 6 completed`; `refund.processed 1 completed`; `subscription.charged 1 completed`. No `processing`-leased rows currently outstanding. The 2 `failed` rows are reclaimable by design; payload contents were NOT read. CONFIRMED present; per-event business correctness NOT re-adjudicated here.

## 16. Database functions / triggers where required — CONFIRMED with advisory

Triggers live (`information_schema.triggers`, 16 entries): `devices_*` (set_timestamps, guard_identity, guard_revocation), `sessions_*` (same triple), `entitlements_set_timestamps` (INSERT+UPDATE), `profiles_*` (set_timestamps, set_public_user_id, guard_public_user_id_immutable, guard_role_immutable on INSERT+UPDATE). No triggers on `webhook_events` (matches repo — none defined). All trigger functions are `SECURITY INVOKER` with `search_path = pg_catalog` and EXECUTE granted to `postgres` only. **CONFIRMED.**

Functions live (`pg_proc`, 15 in `public`):

- 11 trigger helpers (INVOKER, pinned search_path, postgres-only EXECUTE). CONFIRMED.
- 4 `SECURITY DEFINER` admin RPCs with pinned `search_path = pg_catalog` and in-body `auth.uid() + profiles.role='admin'` gates (source spot-checked for `admin_metrics_totals`, `admin_users`): `admin_metrics_active_users`, `admin_metrics_growth`, `admin_metrics_totals`, `admin_users(p_search, p_offset)`. EXECUTE is `authenticated` + `postgres` (revoked from PUBLIC/anon/service_role per migration comments). This is the ADR-016/ADR-025-sanctioned RLS-bypass exception, but the live security advisor raises WARN `authenticated_security_definer_function_executable` (4 findings) — expected for this design, retained as advisory discrepancy D2. No `SECURITY DEFINER` outside these four. **CONFIRMED present; WARN acknowledged.**

## 17. Repository migrations vs remote applied state — CONFIRMED semantic match

14 repo files ↔ 14 remote entries. Name correspondence (remote name after stripping the anomalous embedded prefix on #5):

| Repo file (version_name) | Remote (version / name) | Disposition |
|---|---|---|
| 20260915000000_establish_supabase_baseline | 20260915050920 / establish_supabase_baseline | CONFIRMED semantic match; version-string differs (UNKNOWN cause — apply-time stamping) |
| 20260915120000_establish_profiles_and_rls | 20260915062310 / establish_profiles_and_rls | CONFIRMED semantic match; version-string differs |
| 20260915123000_profiles_set_search_path | 20260915062707 / profiles_set_search_path | CONFIRMED semantic match; version-string differs |
| 20260915140000_harden_rls_authorization | 20260915094537 / harden_rls_authorization | CONFIRMED semantic match; version-string differs |
| 20260915150000_establish_entitlements | 20260915102139 / 20260915150000_establish_entitlements | CONFIRMED semantic match; remote name embeds the repo version (cosmetic anomaly, no semantic effect) |
| 20260915160000_establish_devices_and_sessions | 20260915111100 / establish_devices_and_sessions | CONFIRMED semantic match; version-string differs |
| 20260915170000_establish_admin_role_authorization | 20260915114327 / establish_admin_role_authorization | CONFIRMED semantic match; version-string differs |
| 20260915171000_admin_role_insert_guard | 20260915114529 / admin_role_insert_guard | CONFIRMED semantic match; version-string differs |
| 20260915180000_establish_product_metrics | 20260915130217 / establish_product_metrics | CONFIRMED semantic match; contributes the 3 `admin_metrics_*` DEFINER functions (no table) — live functions present |
| 20260916120000_establish_admin_user_directory | 20260916052432 / establish_admin_user_directory | CONFIRMED semantic match; contributes `profiles.public_user_id` + `admin_users()` (no table/view) — both present live |
| 20260920100000_entitlements_provider_neutral | 20260926173530 / entitlements_provider_neutral | CONFIRMED semantic match; live CHECK is the neutral form |
| 20260926000000_establish_webhook_events | 20260926173539 / establish_webhook_events | CONFIRMED semantic match |
| 20260926140000_razorpay_webhook_hardening_022 | 20260926173605 / razorpay_webhook_hardening_022 | CONFIRMED semantic match; live claim-ledger columns + service_role write grants present |
| 20260927100000_entitlements_provider_refs | 20260926193817 / entitlements_provider_refs | CONFIRMED semantic match; live `provider_order_ref`/`provider_subscription_ref` + partial indexes present |

No repo migration is missing remotely; no remote migration is missing from the repo. Content equivalence was verified by object presence (tables/columns/constraints/indexes/policies/functions/triggers/grants), not by byte-diff of migration bodies.

## Discrepancy ledger (exact object / repo source / remote state / classification)

| ID | Exact object | Repository source | Remote state (live) | Classification |
|---|---|---|---|---|
| D1 | Migration version strings (all 14) + remote name `20260915150000_establish_entitlements` | `supabase/migrations/<version>_<name>.sql` filename versions | Remote `version` values are apply-time stamps differing from filename versions; one remote name embeds its filename version | **UNKNOWN** (cause of re-stamping not established via read-only MCP; semantic object set matches 14/14, so no functional divergence evidenced) |
| D2 | `public.admin_metrics_active_users`, `admin_metrics_growth`, `admin_metrics_totals`, `admin_users` — `SECURITY DEFINER` + `EXECUTE TO authenticated` | `20260915180000_establish_product_metrics.sql`, `20260916120000_establish_admin_user_directory.sql` (sanctioned DEFINER + in-body admin gate + EXECUTE to authenticated only) | Present live exactly as designed; security advisor WARN `authenticated_security_definer_function_executable` (4 findings) fires | **CONFIRMED** (design-intended posture; WARN is the linter's generic DEFINER-executable signal, mitigated in-body by `auth.uid()` + `profiles.role='admin'` checks verified in source for 2/4 functions) |
| D3 | Auth leaked-password protection | No repo source asserts its state (auth dashboard setting, not a migration) | Security advisor WARN `auth_leaked_password_protection`: DISABLED | **CONFIRMED** (hardening gap; enablement is a dashboard/auth-config action, out of scope for this read-only task) |
| D4 | Deployed Edge Function revisions (`payment-checkout`, `razorpay-webhook`) | `supabase/functions/*`, `supabase/config.toml` (`verify_jwt=false` for webhook) | Not probed (no Functions read API called; `verify_jwt` posture not re-verified live) | **UNKNOWN** (no evidence collected; explicitly not inferred) |
| D5 | `auth.users` (3) vs `profiles` (2) count delta | `supabase/README.md` + CLOUD-002 lazy self-INSERT model | 3 auth accounts, 2 profile rows (counts only) | **CONFIRMED** present; **consistent** with lazy-INSERT design — not a discrepancy in the defect sense, recorded for completeness |
| D6 | Supabase Auth detailed config (PKCE enforcement, JWT expiry, OTP/MFA, enumeration-safe errors, redirect URLs) | `06_WEB_CLOUD_PAYMENT.md` (PKCE), website integration (not re-audited) | Not inspected via any auth-config API in this task | **UNKNOWN** (no evidence; not inferred from code) |
| D7 | Subscription lifecycle behavior (renewal extension, cancel-through-expiry, expiry transition) | `06_WEB_CLOUD_PAYMENT.md` entitlement semantics; DB CHECKs | Structural invariants present; only `active` rows exist live (2 lifetime, 1 monthly); no lifecycle transition executed | **UNKNOWN** beyond stored state (read-only task; structural predicates CONFIRMED) |
| D8 | `webhook_events` failing rows (2: `order.paid/failed` ×1, `payment.captured/failed` ×1) | `..._razorpay_webhook_hardening_022.sql` (`failed` = reclaimable) | 2 `failed` rows present; `last_error`/payloads NOT read (secret/PII hygiene) | **CONFIRMED** present; business impact **UNKNOWN** ( Owning payment-investigation task to triage with privileged tooling) |

No other discrepancies found. In particular: no missing tables/columns/keys/constraints/indexes/policies/triggers/functions; no `anon` grants on application tables; no `SECURITY DEFINER` outside the four sanctioned admin RPCs; no payment-credential columns; no third price-catalog table.

## Completion-matrix impact (evidence-backed only)

Existing matrix (`docs/Soravo_Engineering_Docs_v6/22_IMPLEMENTATION_COMPLETION_MATRIX.md`) asserts:

- §8 Supabase project, §9 database/schema, §10 migrations, §11 auth (IMPLEMENTED_VERIFIED), §12 profiles, §13 entitlements, §19 webhooks, §20 payment verification (IMPLEMENTED_VERIFIED); §14 subscription state PARTIAL.

Live evidence in this report **corroborates** §§8–10/12/13/19/20 as IMPLEMENTED_VERIFIED (objects present + RLS + ledger + hardening grants) and **corroborates** §14 remaining PARTIAL (structure present, lifecycle behavior unexercised). The matrix's caveat "Supabase live inspection unavailable via MCP; state inferred from migrations" is now superseded by this live inspection for the database/schema surface only — auth-config (D6), deployed-function revisions (D4), and subscription lifecycle (D7) remain non-live-verified.

**No matrix status cell is changed by this report.** Per task instruction ("only with evidence-backed status changes"), the matrix file itself is left untouched; this report is the evidence bundle for a future matrix revision. No commit, no push performed.

## Attestations

- Read-only: every live call was a SELECT against catalog views / aggregate counts, `list_*` metadata, `get_project_url`, or `get_advisors`. No `apply_migration`, no DDL, no DML, no Edge Function invocation.
- Secrets/PII: no secret, key, token, password, payload, email, user id, or provider reference VALUE was requested, printed, or stored. Aggregates only. Publishable-key endpoint was deliberately not called.
- Stale-note flag: the v6 pack `00_README.md` research HEAD (`2f96f3d…`) predates repo HEAD `ede495b5`; all "CONFIRMED" claims above are bound to live state observed 2026-09-28 plus repo files at the working tree, not to the pack's historical snapshot.

## Exact next tasks (for owners, not executed here)

1. D3: enable HaveIBeenPwned leaked-password protection (auth dashboard) — security hardening.
2. D8: triage the 2 `failed` webhook rows via privileged payment tooling (out of scope for read-only verification).
3. D4/D6: verify deployed function revisions + `verify_jwt=false` posture and auth-config surface through their authoritative APIs.
4. D1: document the migration version re-stamping convention (filename version vs applied version + embedded-prefix anomaly on #5) so future audits need not re-derive it.
