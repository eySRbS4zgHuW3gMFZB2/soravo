# Documentation State Audit V6 — T01 Baseline State Determination

- **Audit ID:** DOCUMENTATION-STATE-AUDIT-V6-001
- **Audit type:** Read-only, evidence-gathering. No source, config, dependency, migration, or documentation remediation was performed.
- **Authority pack:** `Soravo_Engineering_Docs_v6/` (24 files, `SPEC_MANIFEST.json` declares v6 / 6.0.0)
- **Repository:** `https://github.com/eySRbS4zgHuW3gMFZB2/soravo.git`
- **Branch:** `main`
- **Audited HEAD:** `2f96f3d21213bce24f049996d5ab897f16acd31b`
- **Audited origin/main:** `2f96f3d21213bce24f049996d5ab897f16acd31b` (identical to HEAD; verified against the GitHub API, not only the local remote-tracking ref)
- **Audit date:** 2026-09-27
- **Report status:** COMPLETE — determinate findings; declared gaps remain open.

---

## 1. Executive Summary

At the audited commit, Soravo is **NOT PRODUCTION-READY**, **NOT BUILDABLE**, and **NOT RELEASABLE**. The web frontend, the Rust workspace, and the Tauri desktop application all fail their own CI gates. A production Cloudflare Pages deployment was nevertheless published from the exact commit whose CI failed, because deployment is not gated on CI and `main` carries no branch protection.

Two additional classes of defect are determinate and materially worse than a red build:

1. **The committed tree is internally inconsistent.** Files tracked at HEAD reference a module (`crate::helpers`, crate `soravo_audio`) that is absent from git. The desktop application therefore cannot compile from a clean clone, and the code that would fix it exists only as untracked local files.
2. **The payment path is structurally non-functional despite passing unit tests.** Razorpay Checkout.js is never loaded, and the deployed Content-Security-Policy would block it even if it were. The frontend's own test suite asserts that Razorpay must be *absent* from the CSP, so the test suite actively protects the broken state.

Documentation authority is also contradictory. The v6 pack's designated sole design authority (`DESIGN.md`) describes an unrelated global money-transfer product, its `00_README.md` self-identifies as v5, and the non-authoritative `PROGRESS.md` still names the superseded v2/v3 documents as "Current Authority" while asserting that the payment backend is unimplemented — contradicted by 17 webhook ledger rows in the live database.

**15 blocking issues** and **15 declared evidence gaps** are recorded below.

---

## 2. Audit Scope and Method

In scope: documentation authority and classification; implementation inventory; build/CI/test baselines; security and dependency posture; Supabase schema, migration, and Edge Function state; web/cloud deployment state; desktop integration and Handy provenance; payment and entitlement state; milestone-claim verification.

Out of scope and deliberately not performed: any remediation, any write to source/config/migrations/docs, any deployment, any secret-value read, any production data read beyond aggregate counts.

Method: read all 24 manifest-declared v6 files; enumerate tracked and untracked state; execute the documented local build/test/lint/audit commands and record exit codes; query GitHub via the authenticated `gh` CLI for authoritative commit, run, and branch-protection state; query the live Supabase project through the connected Supabase MCP server using schema introspection and aggregate-only SQL.

Determination rules: every status word below is one of IMPLEMENTED, TESTED, DEPLOYED, VERIFIED END-TO-END, PRODUCTION-READY, BLOCKED, or `UNKNOWN — EVIDENCE MISSING`. `UNKNOWN` is never used to imply absence.

### 2.1 Commands executed and exit codes

| Command | Exit | Result |
|---|---|---|
| `cargo fmt --all -- --check` | 1 | 22 diff hunks across 9 files |
| `cargo check --workspace --all-targets` | 101 | 22 compiler-error lines |
| `cargo test --workspace` | 101 | Compilation failed; no test executed |
| `cargo clippy --workspace --all-targets` | 101 | 22 error lines, 10 warning lines |
| `cargo audit` | 0 | 886 dependencies scanned, 7 warnings |
| `cargo audit --deny warnings` + `ci.yml` ignore list | fail | `error: 5 denied warnings found!` |
| `cargo deny check` | 1 | Unmaintained `bincode`, `paste`; stale ignores |
| `pnpm --filter @soravo/website typecheck` | 0 | Pass |
| `pnpm --filter @soravo/website lint` | 0 | Pass (dirty worktree only) |
| `pnpm --filter @soravo/website test` | 0 | 16 files / 179 tests pass (dirty worktree only) |
| `pnpm --filter @soravo/website build` | 0 | Pass; `dist/_headers` emitted |
| `pnpm --filter @soravo/payment-domain typecheck` | 0 | Pass |
| `pnpm --filter @soravo/payment-domain build` | 0 | Pass |
| `pnpm --filter @soravo/license-api typecheck` | 0 | Pass (after local `dist` existed) |
| `pnpm --filter @soravo/license-api test` | 0 | 71 tests pass |
| `pnpm test:supabase` | 1 | 2 files pass; `webhook-hardening.test.mjs` collection fails |
| root `pnpm typecheck` | not run | Superseded by per-package runs plus CI job evidence |
| root `pnpm lint` / `pnpm test` / `pnpm build` | not run | Authoritative outcome taken from CI at HEAD (§7) |

---

## 3. Authority and Precedence Resolution

Applied precedence, in order:

1. `Soravo_Engineering_Docs_v6/` — active authority, per `SPEC_MANIFEST.json`.
2. Within v6, `DESIGN.md` is declared the sole design authority.
3. `PROGRESS.md` — evidence only; never authority.
4. `docs/spec-v3/`, `docs/spec-v2-archive/`, `SORAVO_PLAN.md`, root `README.md`, `decisions/` — SUPERSEDED. Retained as historical record only.

Consequences enforced in this audit:

- No old document was used to establish current-state truth. Where an old document is cited below, it is cited **as a contradiction**, never as a source.
- `PROGRESS.md` claims are treated as unverified assertions requiring independent evidence, per the v6 evidence rule.

### 3.1 Authority-pack integrity

All 24 manifest-declared files exist in `Soravo_Engineering_Docs_v6/`, and the directory contains no file outside the manifest. This is the one fully clean determination in the documentation layer.

Two internal authority defects are determinate:

- **A-01 — Version identity conflict.** `Soravo_Engineering_Docs_v6/00_README.md:1` titles the pack "Documentation Pack v5", while `SPEC_MANIFEST.json` declares `"name": "...v6"` at version `6.0.0`. A reader entering via the README is told they are reading the wrong version.
- **A-02 — Design authority is wrong-domain.** `Soravo_Engineering_Docs_v6/DESIGN.md:4` frames the product as a global money-transfer brand. `02_PRODUCT_REQUIREMENTS.md` describes a local-first, offline speech-to-text desktop application for macOS and Windows. These are not compatible product definitions, and no other v6 document reconciles them. Because `DESIGN.md` is the declared sole design authority, **the project's design authority is currently self-contradictory**. This audit does not select a winner; doing so would be a design decision outside audit scope.

---

## 4. Documentation Inventory and Classification

| Class | Location | Count | Disposition |
|---|---|---|---|
| A — Active authority | `Soravo_Engineering_Docs_v6/` | 24 | Authoritative; contains A-01, A-02 |
| B — Superseded | `docs/spec-v3/` | 33 | Historical only; includes 15 `RAZORPAY-*.md` task records not carried into v6 |
| B — Superseded | `docs/spec-v2-archive/` | 35 | Historical only |
| B — Superseded | `SORAVO_PLAN.md`, `SORAVO_HANDY_CODE_REUSE_REPORT.md`, root `README.md` | 3 | Historical only |
| C — Supporting, non-normative | `decisions/` (14 ADRs), `docs/ARCHITECTURE.md`, `docs/SECURITY_POLICY.md`, `docs/HANDY_V1_PLAN.md`, `docs/compliance/` | 20 | Retained; ADR-014 and ADR-026 remain the best available record for Cloudflare hosting and the Handy foundation, superseded by v6 where they conflict |
| D — Non-authoritative progress | `PROGRESS.md` | 1 | Evidence only; materially stale (§15) |
| E — Prior audit artifacts | `DOCUMENTATION-HYGIENE-001-REPORT.md`, `DOCUMENTATION-RECONCILIATION-002-REPORT.md`, `DOCUMENTATION-STATE-AUDIT-FINAL.md`, `docs/spec-v3/MODEL_AND_BENCHMARK_REUSE_AUDIT.md` | 4 | Pre-existing untracked files; not authority; not modified by this audit |

Stray non-document artifact: `docs/spec-v3.zip` is a committed archive duplicating the `docs/spec-v3/` tree. It is a drift risk (two copies of the same content) and is not an authority source.

Every one of these Class B/C/E documents remains readable in the working tree. Nothing prevents an agent or contributor from acting on superseded guidance; `main` is unprotected (B-12), so nothing prevents a direct push either.

---

## 5. Implementation Inventory

### 5.1 Workspaces

- Root Cargo workspace: 8 members. **7 of 15 `crates/` are excluded** from the workspace: `diagnostics`, `history`, `licensing`, `scheduler`, `transcribe-cpp`, `transcribe-rs`, `vad`. Excluded crates are therefore outside every `cargo` CI gate.
- Root pnpm workspace: `apps/*`, `services/*`, `packages/*` → `apps/desktop` (Tauri), `apps/website` (Vite/React SPA), `packages/payment-domain`, `services/license-api`.
- `scripts/` is empty. Several v6 expectations that a scripts directory would normally satisfy have no implementation there.

### 5.2 Components

| Component | State | Evidence |
|---|---|---|
| Website SPA | IMPLEMENTED, TESTED (dirty worktree) | 16 test files, 179 tests pass; build emits `dist/_headers` |
| `payment-domain` catalog | IMPLEMENTED, TESTED | 2 products × 5 currencies; single `REGIONAL_PRICING` source |
| `license-api` | IMPLEMENTED, TESTED | 71 tests pass |
| Supabase schema + RLS | DEPLOYED | 5 tables, all `rls_enabled = true`, live project `zbzhlhoxblguepplqppw` |
| Razorpay webhook Edge Function | DEPLOYED (DB evidence), locally BROKEN | 17 `webhook_events` rows live; local test collection fails |
| Payment checkout Edge Function | Locally BROKEN | Bare `@soravo/payment-domain` import |
| Desktop / Tauri | BLOCKED | Does not compile at HEAD |
| Handy-derived modules | PRESENT BUT UNTRACKED | `apps/desktop/src-tauri/src/helpers/` untracked yet required by committed code |
| Model catalog | BLOCKED | Empty; upstream licenses unknown |
| CI/CD | PARTIAL | 4 workflows; 3 of 4 CI jobs red at HEAD; deploy ungated |
| Branch protection | ABSENT | API returns 404 |

---

## 6. Requirement-by-Requirement Status

Assessed against v6 requirements. "Verified end-to-end" is asserted only where a runtime artifact proves it.

| v6 area | Status | Basis |
|---|---|---|
| Local-first dictation product definition | BLOCKED — authority contradiction | A-02 |
| Website public surface, pricing, FAQ, legal pages | IMPLEMENTED, TESTED | 179 passing tests |
| Shared price catalog single-source rule | IMPLEMENTED | `packages/payment-domain/src/catalog.ts`; no third catalog found in the website (prices are display strings `≈ $12` / `≈ $50` with a separate `PLAN_CURRENCIES` map, which is presentation, not a second price list) |
| Regional pricing (5 currencies) | IMPLEMENTED | `REGIONAL_PRICING` |
| Supabase profiles / entitlements / devices / sessions | DEPLOYED | live tables, RLS on |
| Webhook idempotency ledger | DEPLOYED, EXERCISED | 17 rows, all `2026-09-26` |
| Webhook HMAC verification | IMPLEMENTED | `supabase/functions/razorpay-webhook/verify.ts` |
| Razorpay checkout (client) | **BLOCKED** | B-09, B-10 — Checkout.js never loaded and CSP-blocked |
| Razorpay checkout (Edge Function) | **BLOCKED** | B-07, B-08 — package unresolvable |
| Entitlements reflected in account UI | IMPLEMENTED, TESTED | `pages/account.tsx` |
| Admin dashboard | IMPLEMENTED, TESTED | `pages/admin.tsx`, metrics/directory services |
| CSP and security headers | IMPLEMENTED, DEPLOYED | `dist/_headers`; `verifyDist` gates the build |
| Zero client-side secrets | IMPLEMENTED | no `RAZORPAY_KEY_SECRET` in `apps/website/src`; only `VITE_*` publishable vars |
| CI required on `main` | **NOT ENFORCED** | B-12, B-13 |
| Desktop application build | **BLOCKED** | B-01, B-02, B-03, B-04 |
| Handy provenance / license chain | `UNKNOWN — EVIDENCE MISSING` | G-01 |
| Model licensing | `UNKNOWN — EVIDENCE MISSING` | G-07 |
| Release engineering (DMG/MSI/NSI) | NOT STARTED | `release.yml` never dispatched |

---

## 7. Build and CI Baseline

### 7.1 Authoritative CI state at HEAD

`gh run view 36286378783` (head SHA `2f96f3d2`, workflow `CI`, conclusion `failure`):

| Job | Conclusion |
|---|---|
| `e2e` | **success** |
| `web` | **failure** |
| `rust` | **failure** |
| `desktop` | **failure** |

Three of four required jobs are red on the audited commit. Only the Playwright E2E job passes.

### 7.2 B-01 — `web` job fails: 15 ESLint errors

`pnpm lint` → `@soravo/website lint: eslint src --max-warnings=0` → 15 errors:

- `src/lib/payment-service.ts` — `1:15 'Currency' unused`, `1:25 'ProductId' unused`
- `src/pages/account.tsx` — `10:3 'refreshEntitlements' unused`, `292:18 'handleRefresh' unused`
- `src/pages/pricing.test.tsx` — `1:64 'Mock' unused`, `3:24 'useNavigate' unused`, `25:16`/`72:23`/`101:25`/`172:25` `no-explicit-any`
- `src/pages/pricing.tsx` — `1:25 'FormEvent' unused`, `95:30`/`104:31`/`116:30`/`124:31` `no-explicit-any`

`typecheck`, `test`, `build`, and `audit` were all **skipped** because lint runs first. The dirty worktree lints clean, which proves these fixes exist locally but are **not committed**.

### 7.3 B-03 — `desktop` job fails

`pnpm tauri build` → `error[E0432]`/`error[E0433]`. Representative unresolved items on the committed tree: crate `soravo_audio` (×2), `ferrous_opencc`, `gtk`, `gtk_layer_shell`, `once_cell`, `tauri_plugin_global_shortcut`, and `crate::helpers`. First reported: `unresolved imports crate::audio_toolkit::is_microphone_access_denied, crate::audio_toolkit::is_no_input_device_error`.

### 7.4 B-04 — The committed tree is internally inconsistent

`git grep -lE 'crate::helpers|soravo_audio' HEAD -- apps/desktop/src-tauri/src/*.rs` returns two committed files:

- `apps/desktop/src-tauri/src/audio_toolkit/mod.rs`
- `apps/desktop/src-tauri/src/managers/audio.rs`

`lib.rs` at HEAD declares 19 modules and **does not declare `mod helpers`**, and `src/helpers/` is **untracked**. Therefore a clean clone of `main` cannot build the desktop app, and the repair work is not under version control.

### 7.5 B-02 — `rust` job fails

Locally, against the dirty worktree: `cargo fmt --check` exits 1 (22 hunks / 9 files); `cargo clippy --all-targets` exits 101 (22 errors, 10 warnings) and CI adds `-D warnings`; `cargo test --workspace` exits 101 before any test runs; `cargo deny check` exits 1; `cargo audit --deny warnings` with the `ci.yml` ignore list reports `error: 5 denied warnings found!`.

The two audit gates disagree. `ci.yml:59` ignores 8 advisory IDs; `security-audit.yml:26` ignores 10. The IDs unignored by `ci.yml` but ignored by `security-audit.yml` are `RUSTSEC-2024-0422`, `RUSTSEC-2024-0423`, and `RUSTSEC-2026-0186`. Conversely, **neither** workflow ignores `RUSTSEC-2025-0141` (`bincode 2.0.1`) or `RUSTSEC-2024-0436` (`paste 1.0.15`), which `cargo deny` flags as unmaintained; those two crates are present only in the dirty lockfile.

`RUSTSEC-2026-0186` (`memmap2 0.8.0`, *unsound*) **is** in the committed lockfile and is suppressed by `security-audit.yml`'s ignore list. The passing weekly `Security Audit` run (36281790018) therefore reflects a suppression, not a clean dependency graph.

### 7.6 B-05, B-06 — Root script chains are unrunnable

`package.json:12` ends `lint` with `pnpm --filter @soravo/payment-domain lint`; `package.json:13` ends `test` with `pnpm --filter @soravo/payment-domain test`. `packages/payment-domain/package.json` defines only `build` and `typecheck`. Both chains will fail with a missing-script error once the website lint error is fixed — a latent second failure hidden behind B-01.

### 7.7 B-13, B-14, B-15 — Deployment is not gated on CI

- `pages-deployment.yaml` triggers on `push: branches: [main]` with **no `needs:` and no `workflow_run` dependency**. It cannot observe CI.
- **Confirmed hazard:** at SHA `2f96f3d2`, `CI` concluded `failure` while `Deploy website to Cloudflare Pages` concluded `success`. Step-level inspection of run 36286378781 shows `Deploy to Cloudflare Pages => success`, so the deploy genuinely executed — it was not skipped by the `CLOUDFLARE_API_TOKEN != ''` guard. **Production was published from a commit that failed its own CI.**
- `pages-deployment.yaml:40` runs root `pnpm build`, which is `website build && desktop build` (`package.json:7`) — not the website-only build the workflow's own comment describes. Deployment is coupled to the desktop frontend build.
- The `Build website` step passes `vars.VITE_SUPABASE_URL` and `vars.VITE_SUPABASE_ANON_KEY` with no non-empty guard. If those repository variables are unset, the build succeeds and deploys a site with a broken Supabase client.

### 7.8 B-12 — `main` has no branch protection

`gh api repos/eySRbS4zgHuW3gMFZB2/soravo/branches/main/protection` → HTTP 404 `Branch not protected`. Direct pushes to `main` are permitted, which is how a red CI state and a green deployment coexist on the same SHA.

---

## 8. Test Baseline

| Suite | Committed HEAD | Dirty worktree |
|---|---|---|
| Website unit/component | **Not reached** (lint gate) | 179 pass / 16 files |
| Website E2E (Playwright, CI) | **pass** | not re-run |
| `license-api` | Not reached | 71 pass |
| `payment-domain` | **No test script exists** | N/A |
| Supabase Edge Function | Not reached | 1 of 3 files fails collection |
| Rust `cargo test --workspace` | **Compiles nothing** | Compiles nothing |

The single strongest test signal is a false negative: the passing `e2e` job and the passing 179-test website suite coexist with a payment flow that cannot complete in a browser, because `pricing.test.tsx` injects `window.Razorpay = { open: vi.fn() }` in the test environment. **No test ever exercises script loading or CSP enforcement for the payment path.** Green tests here do not indicate a working checkout.

`production-readiness.test.ts` compounds this: `buildCsp` and `buildHeadersText` are defined **inside the test file itself**, so the CSP assertions validate a locally constructed string rather than the emitted artifact, and `:79-81` / `:125-126` actively assert that Razorpay must be absent from CSP and headers. The suite encodes the broken state as a requirement.

---

## 9. Security and Dependency Posture

**Positive, verified controls:**

- No client-side secret material in `apps/website/src`; no `RAZORPAY_KEY_SECRET`; only publishable `VITE_*` values.
- `dist/_headers` emits CSP, COOP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options, X-Frame-Options; `verifyDist` fails the build on violation; HSTS correctly withheld.
- All 5 live Supabase tables have RLS enabled.
- `supabase/config.toml` sets `verify_jwt = false` for `razorpay-webhook` (correct for a server-to-server webhook) and leaves `payment-checkout` at the JWT-required default (correct).
- `cargo audit` reports **no vulnerabilities**; findings are unmaintained/unsound advisories only.

**Adverse, verified:**

- **B-10 — deployed CSP blocks the payment provider.** The real emitted artifact `apps/website/dist/_headers` contains `script-src 'self'; connect-src 'self';`. No Razorpay origin is permitted. `checkout.razorpay.com` and Razorpay API calls are blocked at the browser.
- Advisory suppressions are inconsistent between `ci.yml` and `security-audit.yml`, and a known-unsound `memmap2 0.8.0` is suppressed in the committed configuration.
- 7 of 15 `crates/` sit outside the audited Cargo workspace, so their dependency graphs receive no `cargo audit`/`cargo deny` coverage.
- No branch protection, so no enforced review or gate on `main`.
- Edge Functions consume a workspace package by bare specifier with no import map, meaning the deployed trust boundary for shared payment logic is unresolved (B-08).

---

## 10. Data, Migration, and Backend State

### 10.1 B-11 — Migration versions are irreconcilable

The worktree has 14 migration files; the live project has 14 applied migrations. **Zero version identifiers match.**

| Local filename version | Remote applied version |
|---|---|
| 20260915000000 | 20260915050920 |
| 20260915120000 | 20260915062310 |
| 20260915123000 | 20260915062707 |
| 20260915140000 | 20260915094537 |
| 20260915150000 | 20260915102139 |
| 20260915160000 | 20260915111100 |
| 20260915170000 | 20260915114327 |
| 20260915171000 | 20260915114529 |
| 20260915180000 | 20260915130217 |
| 20260916120000 | 20260916052432 |
| 20260920100000 | 20260926173530 |
| 20260926000000 | 20260926173539 |
| 20260926140000 | 20260926173605 |
| 20260927100000 | 20260926193817 |

A `supabase db push` from this worktree would treat all 14 as unapplied and attempt to re-apply the entire schema history. Migration reproducibility and disaster recovery are therefore **broken**.

### 10.2 Live data state (aggregate counts only; no user data read)

| Table | RLS | Rows |
|---|---|---|
| `profiles` | on | 2 |
| `entitlements` | on | 3 |
| `devices` | on | 0 |
| `sessions` | on | 0 |
| `webhook_events` | on | 17 |

`webhook_events` breakdown — all 17 rows dated `2026-09-26`:

| event_type | status | n | attempts |
|---|---|---|---|
| payment.failed | completed | 6 | 6 |
| payment.captured | completed | 2 | 3 |
| order.paid | completed | 2 | 2 |
| payment.authorized | completed | 2 | 2 |
| **payment.captured** | **failed** | **1** | **14** |
| subscription.charged | completed | 1 | 1 |
| **order.paid** | **failed** | **1** | **14** |
| payment_link.paid | completed | 1 | 1 |
| refund.processed | completed | 1 | 1 |

Two events are terminally `failed` after **14 attempts each**, and both are payment-success-path types (`payment.captured`, `order.paid`) — the events that grant entitlements. Whether this traffic is synthetic seeding or real money movement is `UNKNOWN — EVIDENCE MISSING`; the single-day clustering and the mixed event vocabulary are consistent with a seeded verification run, but the audit cannot assert that.

### 10.3 B-07, B-08 — Edge Functions cannot resolve shared payment logic

`supabase/functions/razorpay-webhook/catalog.ts:5` and `supabase/functions/payment-checkout/index.ts:38` import `@soravo/payment-domain` by bare specifier. There is no `supabase/deno.json`, no import map, and no `supabase/node_modules`. The test run fails deterministically:

```
Cannot find package '@soravo/payment-domain'
imported from .../supabase/functions/razorpay-webhook/catalog.ts
```

`vite.config.ts` resolves the package for the website via a build-time alias, and `license-api`/`payment-domain` resolve it through `dist/` — but Deno has neither mechanism. The Edge Function deployment path is therefore unproven, and the deployed webhook code version cannot be tied to this source (G-05).

---

## 11. Web/Cloud Deployment State

| Assertion | Status |
|---|---|
| Cloudflare Pages project `soravo` exists and received a deployment | DEPLOYED — run 36286378781, deploy step succeeded, 2026-09-27T01:43:04Z |
| Deployment is gated on passing CI | **NOT ENFORCED** (B-13) |
| Deployed build is from a CI-green commit | **NO** — deployed SHA `2f96f3d2` has 3 of 4 CI jobs failing |
| Website build at deploy time is website-only | **NO** — runs root `pnpm build` including the desktop frontend (B-14) |
| `VITE_*` values are guaranteed present at build time | **NO** — unguarded (B-15) |
| Cloudflare account/project/binding/branch configuration inspected | `UNKNOWN — EVIDENCE MISSING` (G-02) |
| Custom domain / TLS / live-site smoke test | `UNKNOWN — EVIDENCE MISSING` |

The live site is serving a build from a commit that does not pass CI. The deployed artifact is not reproducible from a green state.

---

## 12. Desktop Integration and Handy Provenance

**Status: BLOCKED, with an unresolved version-control integrity defect.**

- The desktop application does not compile at HEAD (B-03), and the committed tree references an untracked module (B-04).
- Locally, the dirty worktree still fails to compile: 22 compiler-error lines spanning unresolved `rodio::OutputStream`/`Sink`/`OutputStreamBuilder`, missing `gtk`/`gtk_layer_shell`, missing `tempfile`, `HFRepository::with_revision`, `Image::from_path`, `resolve_cache_dir`, and an incompatible string conversion.
- `Cargo.lock` is modified by `+2558/-386` lines and pulls in `handy-keys 0.3.4`, `hf-hub 1.0.0`, `rodio 0.22.2`, `gtk4 0.11.5`, `tauri 2.12.0`, and two CPAL versions.
- `Cargo.lock` pins `vad-rs` to `https://github.com/cjpais/vad-rs#2a412ed858695b9251f3f5a1a20d95b59fa7c498`. This is evidence of a `vad-rs` dependency, **not** evidence of a Handy dependency, and it does not establish Handy provenance.
- v6 declares the exact Handy upstream repository and source commit as unknown. The documented earlier pin `842acdf9` is recorded as not an ancestor of current `main`; commit `a156c8c9` is on `main` as the Handy-derived integration, but no manifest, per-file hash list, or license chain accompanies it.

Provenance is therefore `UNKNOWN — EVIDENCE MISSING` (G-01), and the reuse-license obligation that v6 attaches to Handy-derived code cannot be discharged from repository state. This is a release blocker independent of the compile failures.

---

## 13. Payment and Entitlements State

| Layer | Status |
|---|---|
| Shared price catalog | IMPLEMENTED, single source |
| Entitlement schema + RLS | DEPLOYED, 3 rows |
| Webhook ledger | DEPLOYED, 17 rows, 2 terminally failed at 14 attempts |
| Webhook HMAC verification | IMPLEMENTED in source |
| Checkout Edge Function | **BROKEN locally** — unresolvable package import |
| Client order creation | Reachable (session-gated, bearer-authenticated) |
| **Client Razorpay UI** | **NON-FUNCTIONAL — B-09** |
| **Client CSP permission for Razorpay** | **DENIED — B-10** |
| End-to-end payment | **NOT VERIFIED, and statically blocked** |
| Live Razorpay configuration | `UNKNOWN — EVIDENCE MISSING` (G-04) |

### 13.1 B-09 — Checkout.js is never loaded

`apps/website/index.html` contains exactly one script, `<script type="module" src="/src/main.tsx">`. There is no Razorpay script tag, and no `loadScript`/`createElement("script")` helper anywhere in `apps/website/src`. `main.tsx` loads only the E2E harness. Therefore `window.Razorpay` is **always `undefined`**.

The failure is silent by construction. `pricing.tsx:119-120` and `140-141` read `const rzp = window.Razorpay;` and guard with `if (rzp) { ... }` with no `else`. On a real click the sequence is:

1. `createCheckoutOrder` succeeds against the live Edge Function, creating a real Razorpay order/subscription.
2. `rzp` is `undefined`, so nothing opens.
3. `setLoading(false)` is only called from the `handler` and `modal.ondismiss` callbacks, neither of which exists. The button remains permanently disabled and spinning.
4. An orphaned, payable order remains in the Razorpay account with no user-facing path to complete it.

The user sees a spinner and an error-free dead end. The `pricing.test.tsx` suite passes because it assigns `window.Razorpay = { open: vi.fn() }` before rendering — a condition the application never establishes.

### 13.2 B-10 — The deployed CSP forbids the provider

The real emitted artifact contains:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; ...
```

Adding the Checkout.js tag alone would not fix B-09; CSP would block the script and the provider's API connections. Fixing B-09 requires a coordinated change to `apps/website/scripts/prod-headers.mjs` **and** to the two assertions in `production-readiness.test.ts` that currently mandate Razorpay's absence.

### 13.3 Pricing-UI copy contradiction

`pricing.tsx:217-218` still states that prices are "evaluated targets from early planning" and that terms "will be published when the payment flow is live — nothing is billed today", while the page simultaneously offers live Razorpay checkout buttons. The copy is stale relative to the implemented code and would be user-facing if checkout worked.

---

## 14. Documentation Contradictions and Drift

| ID | Contradiction | Evidence |
|---|---|---|
| D-01 | v6 README titles itself v5; manifest declares v6 6.0.0 | `00_README.md:1` vs `SPEC_MANIFEST.json` |
| D-02 | Sole design authority describes a global money-transfer brand; the product requirements describe local-first dictation | `DESIGN.md:4` vs `02_PRODUCT_REQUIREMENTS.md` |
| D-03 | `PROGRESS.md:12-19` names `SORAVO_PLAN.md` and `docs/spec-v3/` as "Current Authority" — both superseded by v6 | `PROGRESS.md` |
| D-04 | `PROGRESS.md:141-155` lists "Razorpay webhook handling not implemented" and `PROGRESS.md:155-171` states "Supabase functions empty" — both false: 2 Edge Function source trees exist and the live DB holds 17 webhook ledger rows | `PROGRESS.md` vs `supabase/functions/`, `webhook_events` |
| D-05 | `PROGRESS.md:168` states the Cloudflare deployment pipeline is "verified but not automated" — false: `pages-deployment.yaml` is merged and deploys on every push to `main` | run 36286378781 |
| D-06 | `PROGRESS.md:326` lists "Merge PR #55" as current priority while the Handy-derived integration commit `a156c8c9` is already on `main` | git history |
| D-07 | `pricing.tsx:217-218` copy says payment is not live while the page performs live checkout | source |
| D-08 | `production-readiness.test.ts:79-81`/`:125-126` require Razorpay to be absent from CSP while payment integration is implemented | test vs source |
| D-09 | Three competing pre-v6 audit reports remain untracked alongside this one, with no supersession marker | worktree |
| D-10 | `docs/spec-v3.zip` duplicates the `docs/spec-v3/` tree as a second copy | worktree |
| D-11 | `PROGRESS.md` headline progress figures (~65% / ~45% / ~25%) use an unstated denominator and are contradicted by a 3-of-4-red CI baseline | `PROGRESS.md:43-53` |

---

## 15. Milestone and Task Claim Verification

`PROGRESS.md` is a non-authoritative progress log. Its claims were tested against evidence; the results are poor.

| Claim | Verdict |
|---|---|
| Foundation ~65%, implementation ~45%, release readiness ~25% | **Not verifiable.** The stated denominator is unstated, and the release-readiness figure is contradicted by 3-of-4 red CI, a non-compiling desktop app, and a non-functional checkout. |
| "Razorpay webhook handling not implemented" | **False** — implemented in source and exercised in the live DB (17 rows). |
| "Supabase functions empty" | **False** — `payment-checkout/` and `razorpay-webhook/` both contain source. |
| "Production deployment pipeline … not automated" | **False** — automated on every `main` push. |
| "Merge PR #55" outstanding | **Stale** — integration commit `a156c8c9` is on `main`. |
| "Model licensing verification — catalog empty; upstream licenses unknown" | **Confirmed accurate**, and remains release-blocking. |
| "Install GTK dependencies" as priority 1 | **Partially accurate** — GTK libs are a real Linux-build prerequisite, but they are not the current blocker; committed code is internally inconsistent regardless of system libraries. |
| Website/backend/CI "Completed" sections | **Partially accurate.** Web features are implemented and locally tested, but were never verified in CI because the lint gate blocks the job, and the payment path is statically broken. |

Net assessment: `PROGRESS.md` understates backend and deployment completion while overstating release readiness. It must not be used for planning until reconciled.

---

## 16. Blocking Issues

15 blockers. Each is determinate and evidenced.

| ID | Blocker | Evidence |
|---|---|---|
| B-01 | CI `web` job red at HEAD: 15 ESLint errors in 4 website files; `typecheck`/`test`/`build`/`audit` never run | gh run 36286378783 |
| B-02 | CI `rust` job red at HEAD (fmt, clippy `-D warnings`, test, audit, deny) | gh run 36286378783; local exit codes |
| B-03 | CI `desktop` job red at HEAD: `pnpm tauri build` fails with E0432/E0433 across `soravo_audio`, `ferrous_opencc`, `gtk`, `gtk_layer_shell`, `once_cell`, `crate::helpers` | gh run 36286378783 |
| B-04 | Committed tree is internally inconsistent: `audio_toolkit/mod.rs` and `managers/audio.rs` reference `crate::helpers`/`soravo_audio`; `lib.rs` declares no `mod helpers`; `src/helpers/` untracked | `git grep` / `git show HEAD:` |
| B-05 | Root `pnpm lint` chain unrunnable: `@soravo/payment-domain` has no `lint` script | `package.json:12`, `packages/payment-domain/package.json` |
| B-06 | Root `pnpm test` chain unrunnable: `@soravo/payment-domain` has no `test` script | `package.json:13` |
| B-07 | `pnpm test:supabase` fails: `Cannot find package '@soravo/payment-domain'` | local run |
| B-08 | Edge Functions import a workspace package by bare specifier with no import map or Deno config | `catalog.ts:5`, `payment-checkout/index.ts:38` |
| B-09 | Razorpay Checkout.js never loaded; `if (rzp)` has no `else` → silent no-op, permanent spinner, orphan orders | `index.html`, `pricing.tsx:119-120,140-141` |
| B-10 | Deployed CSP (`script-src 'self'; connect-src 'self';`) blocks Razorpay; tests mandate its absence | `dist/_headers`, `production-readiness.test.ts:79-81,125-126` |
| B-11 | Supabase migration versions irreconcilable: 0 of 14 local versions match applied versions | `supabase/migrations/` vs `supabase_migrations` |
| B-12 | `main` has no branch protection | GitHub API 404 |
| B-13 | Deployment not gated on CI; a red-CI SHA was deployed to production | runs 36286378783 / 36286378781 |
| B-14 | `pages-deployment.yaml` runs root `pnpm build` (website **+ desktop**), not website-only | `pages-deployment.yaml:40`, `package.json:7` |
| B-15 | `VITE_*` build values are unguarded; unset values deploy a broken-Supabase site | `pages-deployment.yaml:39-48` |

Additional release blocker outside the numbering: the Handy provenance/license chain is `UNKNOWN — EVIDENCE MISSING` (G-01), which independently prevents release sign-off.

---

## 17. Evidence Gaps

15 gaps. Each is `UNKNOWN — EVIDENCE MISSING`; none implies the capability is absent.

| ID | Gap | Why unresolved |
|---|---|---|
| G-01 | Handy upstream repository, exact commit, per-file hashes, license chain | Not recorded in v6 or derivable from the lockfile; `vad-rs` is not evidence of Handy |
| G-02 | Cloudflare account, Pages project config, bindings, branch/deployment history | No `CLOUDFLARE_API_TOKEN` locally; Cloudflare MCP connected but exposed no callable tool in this session |
| G-03 | GitHub issue/PR/repo-graph evidence | GitHub MCP failed: "Incompatible auth server: does not support dynamic client registration" |
| G-04 | Razorpay live config: key ids, webhook registration URL, plans/subscriptions, live charge | No Razorpay credential or MCP path available; secret values deliberately not read |
| G-05 | Deployed Edge Function code version and its correspondence to this source | No deploy/describe path available; B-08 leaves resolution unproven |
| G-06 | Pristine isolated-HEAD build baseline | No clean worktree run performed; dirty manifest/lockfile confound attribution of local compiler errors |
| G-07 | Model catalog contents and upstream licenses | Catalog empty; upstream terms unknown |
| G-08 | Desktop runtime behavior on macOS/Windows, code signing, notarization | Requires built artifacts, which do not exist (B-03) |
| G-09 | Secret values, rotation state, revocation | Names are referenced in config; values are not inspectable and were not read |
| G-10 | GitHub rulesets (as opposed to legacy branch protection) | Only the legacy protection endpoint was queried (B-12) |
| G-11 | Browser E2E of checkout against live Supabase and Razorpay | Playwright suite passes but never loads the provider (B-09) |
| G-12 | macOS/Windows release artifacts | `release.yml` is `workflow_dispatch`-only and has never been dispatched |
| G-13 | Linux GTK build | Requires system libraries; desktop build fails earlier (B-03) |
| G-14 | RLS adversarial verification under live multi-role sessions | Schema and policies are present; adversarial testing not performed |
| G-15 | `PROGRESS.md` progress percentages | Denominator unstated and contradicted by CI state |

---

## 18. Risk Register

| Risk | Likelihood | Impact | Basis |
|---|---|---|---|
| Red CI is deployable to production; defective builds reach users | **Observed** | Critical | B-12, B-13 — realized at SHA `2f96f3d2` |
| A `supabase db push` re-applies the entire schema history | High | Critical | B-11 — 0/14 version match |
| Untracked local files are the only copy of required desktop code; a clean-up or clone destroys them | High | Critical | B-04 |
| Payment appears available but silently fails, stranding users and leaving payable orphan orders | **Observed** | High | B-09, B-10 |
| Green test suite masks an unusable payment path | **Observed** | High | §8, `pricing.test.tsx` global injection |
| Webhook grant events fail terminally and entitlements are never issued | Medium | High | 2 events failed at 14 attempts |
| Hidden unmerged fixes diverge further from `main` | High | Medium | B-01 fixed only in the dirty worktree |
| Dependency advisories diverge between CI and scheduled audit | Medium | Medium | §7.5 ignore-list mismatch |
| Unsuppressed unsound crate ships | Medium | Medium | `memmap2 0.8.0` suppression |
| 7 of 15 crates receive no dependency scanning | Medium | Medium | §5.1 |
| Superseded v2/v3 guidance is acted upon | Medium | Medium | §4, no branch protection |
| Design authority is wrong-domain, misdirecting implementation | Medium | High | D-02 |

---

## 19. Recommended Next Milestone

**`T02 — CI Baseline Restoration`** (v6 Phase 1, per `07_TASK_BREAKDOWN.md`).

Rationale: T01 is complete. Every other milestone is blocked behind a red or absent gate, and the highest-severity confirmed harm — production deployed from a red-CI commit — is caused by missing gates rather than by any product defect. T02 is the prerequisite for obtaining trustworthy evidence about everything else.

T02 must be completed before T03, in this order:

1. **B-04 first** — commit the untracked `apps/desktop/src-tauri/src/helpers/` tree and reconcile `lib.rs` module declarations, so the desktop build failure reflects real code rather than a missing module. Establish an isolated clean-HEAD build to close G-06.
2. **B-01** — land the 15 ESLint fixes already present in the worktree.
3. **B-05, B-06** — add `lint`/`test` scripts to `packages/payment-domain` or remove them from the root chains, so the gates become runnable rather than vacuously green.
4. **B-02, B-03** — drive `cargo fmt`, `clippy -D warnings`, `cargo test`, and `pnpm tauri build` to green.
5. **B-12, B-13, B-14, B-15** — enable branch protection on `main`, gate Pages deployment on a successful `CI` run, scope the build to the website, and fail the build on unset `VITE_*` values.
6. **B-11** — reconcile migration versions with `supabase migration repair` before any further `db push`, so schema history is reproducible.

Deliberately **not** in T02: the payment fixes (B-07, B-08, B-09, B-10), which form T03, and the Handy provenance work (G-01), which requires an upstream identification step before any code change.

A direct consequence to accept explicitly: closing B-12 and B-13 will make the next `main` push fail closed. Given that `main` is currently red, expect the first protected push to be rejected until step 1-4 land. This is the intended behavior.

---

## 20. Determinism Statement

- Every status in this report derives from a command exit code, a Git object, a GitHub API response, a GitHub Actions run record, or a Supabase schema/aggregate query executed during this audit. Command transcripts are retained outside the repository under `/tmp/opencode/`.
- All 24 manifest-declared v6 files were read in manifest order. No file outside the manifest exists in the v6 directory.
- Repository identity was confirmed against the **GitHub API**, not only the local remote-tracking ref: remote `main`, local `HEAD`, local `origin/main`, and the audited CI run's `headSha` all equal `2f96f3d21213bce24f049996d5ab897f16acd31b`.
- Findings B-01, B-02, B-03, B-12, and B-13 are attested by GitHub Actions run records for that exact SHA and are independent of the local dirty worktree.
- Local command results describe the **dirty worktree** and are labeled as such wherever they could differ from committed state; G-06 records that no pristine-HEAD baseline was established.
- Absence of evidence is recorded as `UNKNOWN — EVIDENCE MISSING` and never as a negative capability claim.
- No secret value, key, token, or user-identifying record was read. Database access was limited to schema introspection and aggregate counts.
- No source file, configuration file, dependency manifest, lockfile, migration, or pre-existing document was created, modified, or deleted by this audit. Build commands regenerated only gitignored `dist/` output; `git status --porcelain` entry count was 59 before and after.
- This audit is reproducible: re-running §2.1 against a clean checkout of `2f96f3d2` must reproduce B-01 through B-04 and B-11 through B-13 exactly, and must reproduce B-05 through B-10.

**END OF AUDIT**
