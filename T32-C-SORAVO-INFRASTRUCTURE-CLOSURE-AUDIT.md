# T32-C — SORAVO INFRASTRUCTURE COMPLETION AUDIT (Closure Audit)

**Date:** 2026-09-29
**Task:** T32-C — Soravo infrastructure completion audit (AUDIT ONLY)
**Status:** AUDIT COMPLETE — NO SOURCE MODIFIED BY THIS TASK
**Branch (audit ref):** `t31/soravo-wrapper-completion`
**HEAD (audit ref):** `648d110d286b81a8a0ce1d203f7a5407936ebc51`
**origin/main:** `ede495b55efd95cedd882d90a19d12b4777da852`
**Worktree at audit time:** DIRTY (T32-A doc delta + T32-B checkout hardening, both uncommitted — see §2)

---

## 0. READING GATE — COMPLETED

Read before auditing, in order:

1. `SPEC_MANIFEST.json` — v2 manifest (documents list = authority set)
2. Authoritative v6 pack (`Soravo_Engineering_Docs_v6/` §00–§21, DESIGN, manifest)
3. `PROGRESS.md` — full (through T32-B entry, line 1982)
4. `T16-FINAL-COMPLETION-MATRIX.md` — 22-domain matrix (authoritative baseline; **NOT modified by this task**)
5. `T29-HANDY-V1-PRESERVATION-POLICY-REPORT.md`
6. `T30-HANDY-V1-FAILURE-RECLASSIFICATION-REPORT.md`
7. `T31-SORAVO-WRAPPER-COMPLETION-REPORT.md`
8. `T32-A-HANDY-V1-POLICY-RECONCILIATION-REPORT.md`
9. `T32-B-PAYMENT-HARDENING-REPORT.md`
10. Live git / PR / CI state (primary evidence, §2)

**No source file was modified by this audit.** All domain verdicts below rest on
committed-HEAD evidence, worktree-local test evidence, live provider evidence, or
explicitly marked absence of evidence.

### Status vocabulary (this report)

- `PRODUCTION_VERIFIED` — live production traffic evidence. **Zero domains.**
- `IMPLEMENTED_VERIFIED` — committed source + test/CI/live-TEST evidence in local or TEST scope.
- `IMPLEMENTED_UNVERIFIED` — source exists but key integration/execution evidence is missing.
- `PARTIAL` — part of the domain is evidenced, part is missing or blocked.
- `BLOCKED` — cannot proceed without external/human action.
- `NOT_STARTED` — no implementation.

### Scope boundaries honoured

- Handy's functioning STT/audio pipeline is the **preserved foundation**, not Soravo work.
  It appears below only where a Soravo-owned integration touches it (domains 12, 20).
- The T30 transcription test dispute is **not reopened**: T30 classifications
  (10 catalog = Soravo-owned missing data; 5 transcription = contradictory/stale tests,
  STOP-gated) are recorded as-is. `catalog.json` re-verified byte-identical (`{}`, §3.10).

---

## 1. CURRENT GitHub PR AND CI STATE (primary evidence, 2026-09-29)

### Open PRs (this milestone's scope)

| PR | Branch | State | Head |
|----|--------|-------|------|
| #63 | `t31/soravo-wrapper-completion` | **OPEN** | T31 commit `648d110d` |
| #62 | `t24/t22-milestone-ci-stabilization` | **OPEN** (other milestone, untouched) | `42ad6290` |

PR #63 contains **only** the T31 security-audit ignore sync. The T32-A doc delta
and **all of T32-B checkout hardening are uncommitted** and therefore in **neither**
PR and covered by **no CI run**.

### Latest CI runs

| Run | Workflow | Branch | Result |
|-----|----------|--------|--------|
| 36509157409 | Security Audit | t31 | **SUCCESS** (cargo-audit, cargo-deny, npm-audit all green — T31 fix confirmed) |
| 36509157391 | CI | t31 | **FAILURE** = exactly the 15 STOP-gated Rust tests (188 passed / 15 failed; failure list byte-identical to T28/T30) |
| 36501679504 | Security Audit | t24 | FAILURE (pre-T31 cargo-audit drift; superseded) |
| 36501679480 | CI | t24 | FAILURE (same 15 tests) |

Per-job on run 36509157391: web SUCCESS, desktop SUCCESS, e2e SUCCESS, rust FAILURE (by design until T30 human decisions resolve).

### Worktree vs committed delta (uncommitted = unaudited-by-CI)

- Modified (uncommitted): `PROGRESS.md`, 5× `Soravo_Engineering_Docs_v6/*.md` (T32-A),
  `package.json`, `pnpm-lock.yaml`, `supabase/config.toml`,
  `supabase/functions/payment-checkout/index.ts`, `supabase/tests/payment-checkout.test.mjs`
- Untracked (T32-B, uncommitted): `supabase/functions/payment-checkout/checkout.ts`,
  `deno-shim.d.ts`, `eslint.config.js`, `package.json`, `tsconfig.json`
- Hygiene note: `git diff --check` reports one whitespace error —
  `Soravo_Engineering_Docs_v6/09_AI_AGENT_INSTRUCTIONS.md:122` (new blank line at EOF,
  from the T32-A edit). Trivial, uncommitted.
- Webhook hardening commit `746fbbd5` **is contained in `main`**
  (`git branch --contains` lists `main`). Payment-checkout on `main` is at the
  pre-T32-B commit `091f9e92`; T32-B hardening exists **only in this worktree**.

---

## 2. DOMAIN AUDIT (20 Soravo-owned domains)

### 1. Accounts / auth — PARTIAL

- **Evidence (exists):** `apps/desktop/src-tauri/src/account.rs`,
  `apps/desktop/src-tauri/src/commands/account.rs` (sign_in_start/complete, sign_out,
  device/session, token refresh — per T31 §2 inspection); website `/login`, `/account`,
  `/reset-password` routes (PROGRESS.md Website/Cloud table).
- **Absence of evidence:** no auth-flow execution evidence (no sign-in round-trip proof);
  offline `Unavailable` path untested (T16 domain 5); **no `/signup` route on either
  client** (021 account readiness).
- **Verdict rationale:** both clients carry the code, neither flow is proven end to end.

### 2. Supabase schema — IMPLEMENTED_VERIFIED (TEST/local scope, not production)

- **Evidence:** 14 migration files in `supabase/migrations/` (verified by directory
  listing this session: baseline, profiles+RLS, search_path, RLS hardening,
  entitlements, devices+sessions, admin role + insert guard, product metrics, admin
  directory, provider-neutral, webhook_events, webhook hardening 022, provider refs).
- **Live verification:** T08 live verification confirmed 5 tables/RLS/constraints;
  024 confirmed 4 migrations applied remotely (establish_webhook_events, hardening 022,
  provider refs, provider-neutral).
- **Not claimed:** no production-traffic evidence → not `PRODUCTION_VERIFIED`.

### 3. RLS — IMPLEMENTED_VERIFIED (TEST scope, not production)

- **Evidence:** 024 live remote verification — `service_role` holds
  `INSERT, SELECT, UPDATE` and **no `DELETE`** on `entitlements` and `webhook_events`;
  `anon`/`authenticated` hold nothing on the ledger; only policy on `entitlements` is
  `entitlements_select_own`; `webhook_events` has zero policies (service-role-only writes).
- **Migration source:** `20260915140000_harden_rls_authorization.sql` (+ profiles/RLS
  establishment migrations), all on `main`.
- **Not claimed:** production traffic; leaked-password protection DISABLED (T08 D3, see §17).

### 4. Sessions / devices — PARTIAL

- **Evidence (sessions):** `apps/desktop/src-tauri/src/session.rs` state machine
  (IDLE→…→DONE, ERROR→IDLE); 13 ladder tests passing within the desktop lib suite
  (T10-B, re-confirmed present by T31); `20260915160000_establish_devices_and_sessions.sql`
  migration on `main`.
- **Absence of evidence (devices):** the 027 live smoke test created
  **zero device, session, or profile rows** ("No device, session or profile rows created",
  027 inventory); cross-client sync unverified end to end (021).
- **Verdict rationale:** session logic proven locally; device/cloud half has no execution proof.

### 5. Entitlements — PARTIAL

- **Evidence (server side, live):** 027 TEST-mode live grant — exactly one lifetime
  entitlement for dedicated TEST user `a5a2ae69-…`, `active`, `expires_at=NULL`,
  provider order+payment refs matching Razorpay; `entitlements_one_current_per_user_product
  UNIQUE (user_id, product)` confirmed live (024) so renewals cannot overwrite lifetime grants.
- **Absence of evidence:** subscription lifecycle (charged/cancelled/halted/paused/resumed)
  never exercised against real objects; no offline cache persistence (T16 domain 9).
- **Known divergence (recorded, not fixed):** `subscription.cancelled` routes to immediate
  revocation while ADR-012 preserves access through the paid period (026 risk 1, carried
  by 027). Needs its own product task.
- **Verdict rationale:** one-time grant proven live; recurring + offline paths unproven.

### 6. Payment checkout — PARTIAL

- **Evidence (worktree only):** T32-B hardened `supabase/functions/payment-checkout/`
  (`checkout.ts` new, `index.ts` thin wiring, tsconfig + eslint + `lint:checkout` /
  `typecheck:checkout`); `pnpm test:supabase` 200/200 locally (22 real checkout tests,
  mocked fetch, no network); mutation check kills the T31 defect class (4 failures on
  import removal, green on restore).
- **Absence of evidence:** **entire T32-B delta is uncommitted** (no PR, no CI run);
  deployed function is the pre-hardening version; `RAZORPAY_PLAN_SORAVO_MONTHLY_*` values
  unknown (human Dashboard action); no deployed-checkout replay performed.
- **Verdict rationale:** hardened code proven locally only; nothing about the new checkout
  has reached version control, CI, or deployment.

### 7. Razorpay webhook — IMPLEMENTED_VERIFIED (TEST scope, not production)

- **Evidence (committed):** webhook Edge Function
  (`supabase/functions/razorpay-webhook/{index,events,ledger,verify,catalog}.ts`) merged
  to `main` via `746fbbd5` (containment verified this session); 166 webhook-hardening
  tests green locally; `supabase/config.toml` pins `verify_jwt = false` with 6 regression
  tests (024 F24-1).
- **Evidence (live, TEST mode):** 027 — real INR 415.00 `soravo_lifetime` payment captured,
  delivered by Razorpay, HMAC-validated, ledger-claimed/completed, exactly one entitlement;
  4-variant HMAC negative control (no forged grant, no side effects); 024 — 15-probe
  endpoint fingerprint (400/405/413 contract, JWT gate proven OFF).
- **Not claimed:** LIVE mode never exercised; no production traffic.
- **Carry-forwards (recorded):** endpoint oversubscribed to 53 events (~45 unsupported but
  inert — 027 Finding A); no validly-signed replay ever injected (027 limitation).

### 8. Payment ledger / idempotency — IMPLEMENTED_VERIFIED (TEST scope)

- **Evidence (committed):** `ledger.ts` claim state machine
  (`processing → completed | failed`, 5-min lease, compare-and-swap) + migration
  `20260926140000` (ledger columns, status constraint, backfill); migration confirmed
  applied remotely (024).
- **Evidence (live):** 024 Edge Function logs show the designed
  claim→fail→reclaim→succeed cycle (`attempts=2` on the `payment.captured` row, 422 then
  200, 70 s apart); 027 — all deliveries `completed` with `attempts=1`, zero duplicate
  event ids, zero duplicate entitlements.
- **Limitation (recorded):** duplicate protection evidenced by deterministic idempotency
  key + observed single-insert behaviour, not by an injected signed duplicate (027).

### 9. License API — PARTIAL

- **Evidence (unit, local):** 71/71 `license-api` tests + clean typecheck (T32-B adjacent
  suite re-run); regional pricing for 5 currencies (028) + subscription methods (029).
- **Evidence (live provider, TEST):** 029 — five live TEST orders created through the
  production `RazorpayProvider` path (INR 41500, USD 5000, CAD 6700, EUR 4600, AUD 7500);
  027 — INR lifetime order settled end to end via webhook.
- **Absence of evidence:** non-INR settlement blocked by merchant-account configuration
  (domestic-Indian-cards-only — 027 Finding C, external-gated); subscription lifecycle
  never exercised with real Plans/Subscriptions; `service.ts:205` still fabricates
  `plan_<product>_<currency>` (recorded in T32-B §6, needs the same product decision as
  checkout plan IDs); no endpoint/integration execution beyond unit scope.
- **Verdict rationale:** orders proven, recurring + non-INR settle unproven.

### 10. Model catalog policy — BLOCKED

- **Evidence (this session):** `apps/desktop/src-tauri/src/catalog/catalog.json` is
  byte-identical `{}` (re-read; schema-invalid, requires `models[]`).
- **Test evidence:** 10 catalog tests fail on the single Lazy-poison root cause
  (`missing field 'models'` at `catalog/mod.rs:119`) — T30 §2.1, unchanged since T28.
- **Blocker:** 9-item human decision checklist open (model set, source org, per-model
  license verdict per ADR-011, revision pins, byte-exact sizes/hashes from pinned
  artifacts, arch reconciliation, mirror URLs, generator procedure, chain-of-custody
  manifest — T30 §5). Fabrication prohibited (v6 §09, T30 STOP rule).
- **Verdict rationale:** nothing shippable out of the box (T16 domain 4); no agent action available.

### 11. Desktop account integration — PARTIAL

- **Evidence (exists):** Supabase PKCE, secure token storage, account state,
  device/session management, offline cached snapshot (`account.rs`,
  `commands/account.rs` — 021); `AccountPanel` mounted via `app.tsx`.
- **Absence of evidence:** no sign-in round-trip execution; offline `Unavailable` path
  untested (T16 domain 5); entitlement reader correctness against live rows unproven
  from the desktop side (the 022 `product=in.(monthly,lifetime)` +
  `select_primary_entitlement` fix was verified in an isolated harness only, because the
  crate carries pre-existing unrelated errors).
- **Verdict rationale:** code present on the branch; integration unproven.

### 12. Desktop entitlement integration — PARTIAL

- **Evidence (exists):** catalogue product query + `select_primary_entitlement` ranking
  (valid rows first, lifetime over monthly, then most-recently-updated — 022);
  `#[serde(default)]` on `EntitlementInfo.active`.
- **Absence of evidence:** ranking logic proven only in an isolated 9-test harness (022),
  not via the crate's own `cargo test` (blocked by pre-existing unrelated errors);
  subscription-lifecycle rows never produced for the desktop to consume; offline cache
  persistence absent (T16 domain 9).
- **Boundary note:** the Handy STT/audio pipeline underneath is preserved foundation, not
  Soravo work; this verdict covers only the Soravo entitlement reader.
- **Verdict rationale:** reader logic present and unit-proven in isolation; end-to-end
  desktop display of a live entitlement unproven.

### 13. Cloud synchronization — PARTIAL

- **Evidence (exists):** device/session records via Supabase REST (schema + client paths
  present per T31 inspection).
- **Absence of evidence:** **no transcript sync, no conflict resolution** (T15 §14,
  T16 domain 8, unchanged); no sync execution evidence of any kind.
- **Verdict rationale:** record plumbing exists; sync as a feature does not.

### 14. Updater infrastructure — BLOCKED

- **Evidence (exists):** `tauri-plugin-updater` initialised in `main.rs`
  (grep: 1 `updater` reference in `main.rs`).
- **Absence of evidence:** `tauri.conf.json` contains **zero** `updater` references
  (grep this session: no match) — no `plugins.updater` endpoints/pubkey (T16 domain 16
  re-confirmed); no update server; no staged-update test.
- **Verdict rationale:** initialisation without endpoints/keys/server is not an update
  channel; all three require human/external action.

### 15. Cloudflare deployment — BLOCKED

- **Evidence (exists):** `.github/workflows/pages-deployment.yaml` (least-privilege
  secrets, conditional skip — T16 domain 15).
- **Absence of evidence:** **zero deployment executions** (unanimous across
  T08/T11/T13–T15/T16; no contradicting evidence in T29–T32-B). Credentials-gated,
  provider-side.
- **Verdict rationale:** workflow file existence is not a deployment.

### 16. CI/CD — PARTIAL

- **Evidence (green):** PR #63 runs — Security Audit 36509157409 SUCCESS
  (cargo-audit/deny/npm-audit green post-T31); CI 36509157391 web/desktop/e2e SUCCESS;
  e2e 20/20 per T09-C baseline.
- **Evidence (red by design):** CI rust job FAILURE = exactly the 15 STOP-gated tests
  (T30-gated; failure list byte-identical across T28/T30/CI-162/run-36509157391).
- **Absence of evidence / gaps:** T32-A/T32-B delta covered by **no CI run** (uncommitted);
  release workflow is `workflow_dispatch`-only with signing commented out, never exercised
  (T16 domain 14); branch protection absent (404, T16); `pages-deployment` deploys
  independent of CI (red-CI can ship, T16).
- **Verdict rationale:** CI proves what it covers; release + protection + T32-B coverage
  are open.

### 17. Security checks — PARTIAL

- **Evidence (green):** cargo-audit / cargo-deny / npm-audit SUCCESS on latest Security
  Audit run; CSP explicit in `tauri.conf.json`; secret hygiene verified (025: `.env.local`
  gitignored/untracked/`chmod 600`, zero real-shaped tokens in tracked files, key-id
  redactions intact); T32-B checkout asserts no secret substring in any response path.
- **Open items (recorded):** leaked-password protection DISABLED (T08 D3); webhook
  oversubscribed to 53 events (027-A); B2 unsafe-FFI ADR pending (T16 domain 17);
  T16 F-09 remainder — `razorpay-webhook/**` still outside type/lint coverage (T32-B §6).
- **Verdict rationale:** gates green, hardening incomplete, three advisories-tracked items open.

### 18. Windows packaging — PARTIAL

- **Evidence (exists):** MSI + NSIS targets, installer icon, en-US/Wix config present in
  `tauri.conf.json` (T16 domain 20; no contradicting evidence since).
- **Absence of evidence:** **no `tauri build` execution evidence** on Windows or CI.
- **Verdict rationale:** configuration is not a package.

### 19. macOS packaging — PARTIAL

- **Evidence (exists):** DMG target, `Entitlements.plist`, icons present (T16 domain 21).
- **Absence of evidence:** no build/notarization evidence; app-ID registration outstanding;
  `NSMicrophoneUsageDescription` gap noted (T15 §4).
- **Verdict rationale:** configuration is not a shippable, notarized artifact.

### 20. Soravo IPC integration — IMPLEMENTED_UNVERIFIED

- **Evidence (exists):** `apps/desktop/src-tauri/src/commands/soravo_ipc.rs`
  (`session_snapshot`/`session_transition`, `inject_text` with oversize rejection — T31
  inspection); session IPC + account IPC commands live; desktop CI job compiles the
  target (run 36509157391 desktop SUCCESS).
- **Absence of evidence:** no runtime IPC round-trip proof (no E2E exercising
  snapshot/transition/inject against the session machine).
- **Verdict rationale:** commands present and compiling; runtime integration unproven.
  (Session *logic* is test-proven — see domain 4; this verdict covers the IPC layer.)

---

## 3. CLOSURE SUMMARY

### Counts (20 domains)

| Status | Count | Domains |
|--------|-------|---------|
| `PRODUCTION_VERIFIED` | **0** | — |
| `IMPLEMENTED_VERIFIED` | **4** | Supabase schema (2), RLS (3), Razorpay webhook (7), Payment ledger (8) |
| `IMPLEMENTED_UNVERIFIED` | **1** | Soravo IPC integration (20) |
| `PARTIAL` | **12** | Accounts (1), Sessions/devices (4), Entitlements (5), Payment checkout (6), License API (9), Desktop account (11), Desktop entitlement (12), Cloud sync (13), CI/CD (16), Security (17), Windows (18), macOS (19) |
| `BLOCKED` | **3** | Model catalog (10), Updater (14), Cloudflare (15) |
| `NOT_STARTED` | **0** | — |

Corrected tally: IMPLEMENTED_VERIFIED **4** (domains 2, 3, 7, 8) · IMPLEMENTED_UNVERIFIED
**1** (20) · PARTIAL **12** · BLOCKED **3** · PRODUCTION_VERIFIED **0** · NOT_STARTED **0**.

### What "closure" means here

- **Closed with TEST-scope evidence:** webhook + ledger + schema + RLS. A real TEST
  payment settles into a real entitlement through a committed, tested, live-probed path.
- **Not closed:** everything requiring human/external action (catalog checklist, signing
  keys, Cloudflare credentials, Supabase deploy auth, Razorpay Plans, merchant-account
  international enablement, ADR-018 approval, T30 transcription A/B/C), plus the
  uncommitted T32-B checkout hardening (locally proven, not yet committed/deployed).
- **No production readiness is inferred.** Source existence, local green suites, and TEST
  deliveries do not constitute production verification for any domain.

### Exact next actions (ordered, owner-gated where marked)

1. **[Owner]** Resolve T30 gates: §5 catalog checklist + §4 transcription option (A/B/C).
2. **[Owner]** Approve ADR-018 (pending since T29).
3. Commit T32-A docs + T32-B checkout hardening to `t31/soravo-wrapper-completion`
   (or successor branch) and let PR #63 CI cover them; fix the
   `09_AI_AGENT_INSTRUCTIONS.md:122` whitespace nit in the same pass.
4. **[Owner + Supabase access]** Set `RAZORPAY_PLAN_SORAVO_MONTHLY_*` + TEST secrets,
   deploy payment-checkout, replay one TEST lifetime + one TEST monthly checkout.
5. **[Owner]** Create real Razorpay TEST Plans/Subscriptions; trim webhook subscription
   53 → 8 supported events (027-A); decide `subscription.cancelled` vs ADR-012.
6. **[Owner]** Cloudflare credentials + first Pages deployment; Supabase CLI auth;
   signing keys for Windows/macOS; updater endpoints/pubkey + staged-update test.
7. Only then: any LIVE-mode operation (none performed or recommended by this audit).

---

## 4. COMPLETION SCHEMA (v6 §09)

- **Changed files:** NONE (audit only).
- **Created file:** `T32-C-SORAVO-INFRASTRUCTURE-CLOSURE-AUDIT.md` (this report).
- **Updated file:** `PROGRESS.md` (T32-C entry only; completion matrix untouched).
- **Unchanged relevant files:** all source, test, config, migration, function, workflow files;
  all prior T-reports; `T16-FINAL-COMPLETION-MATRIX.md` explicitly unmodified.
- **Commands (read-only):** `git status --short --branch`, `git rev-parse HEAD`,
  `git log --oneline -8`, `git diff --check`, `gh pr list --state open`,
  `gh run list --limit 8`, `git log --oneline origin/main -- <function paths>`,
  `git branch -a --contains 746fbbd5`, directory listings of `supabase/migrations/`,
  `supabase/functions/`, `services/license-api/src/payment/`, `packages/payment-domain/src/`;
  file-existence checks for `account.rs`/`account.rs-commands`/`session.rs`/`soravo_ipc.rs`;
  content read of `catalog.json` (`{}`); grep for `updater` in `tauri.conf.json` (no match)
  and `main.rs` (1 match); `release.yml` trigger inspection (`workflow_dispatch`-only).
- **Tests:** none executed (audit-only mandate; all test figures cited from T30/T31/T32-B
  reports and CI runs 36509157391 / 36509157409).
- **Security:** no secrets touched, printed, or committed; no credential inspected beyond
  shape/provenance already recorded in 025/027.
- **CI:** observed only (runs listed in §1). **Deployment:** none. **External config:** none.
- **Commit/push:** none (per STOP instruction).

**STOP. Audit complete. No commit or push performed. No production source modified.
Completion matrix not modified. T30 dispute not reopened. Handy STT pipeline not
classified as Soravo work.**

---

*Report: T32-C — Author: T32-C audit session — Authority: Soravo v6 engineering control
pack + T29/T30/T31/T32-A/T32-B + T16 matrix + primary git/PR/CI evidence gathered
2026-09-29 on branch `t31/soravo-wrapper-completion` @ `648d110d`.*
