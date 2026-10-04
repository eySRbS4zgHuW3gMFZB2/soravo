# T32-B — SORAVO PAYMENT CHECKOUT HARDENING REPORT

**Date:** 2026-09-29
**Task:** T32-B — Soravo payment/account boundary hardening (TEST only)
**Status:** IMPLEMENTATION COMPLETE — STOP (no commit/push per instruction)
**Branch:** `t31/soravo-wrapper-completion`
**Start SHA:** `648d110d286b81a8a0ce1d203f7a5407936ebc51`
**PR:** none created (not instructed)

---

## 0. READING GATE — COMPLETED

Read before editing, in order:

1. `SPEC_MANIFEST.json` — v2 manifest (documents list = authority set)
2. Authoritative v6 pack (`Soravo_Engineering_Docs_v6/`): §00 README, §01 authority,
   §02 product requirements, §03 technical design, §04 Handy reuse policy,
   §05 desktop contracts, **§06 web/cloud/payment contract** (checkout endpoint
   authority), §07–§11 plan/tasks/instructions/skills/MCP, **§12 security
   baseline**, §13–§14 DoD/CI, **§15 environment & secrets** (TEST-only rule),
   §16–§21 protocols/ADRs/chain-of-custody, DESIGN (skimmed), manifest
3. `PROGRESS.md` (full, incl. 021/022/023/024 payment history)
4. `T29-HANDY-V1-PRESERVATION-POLICY-REPORT.md`
5. `T30-HANDY-V1-FAILURE-RECLASSIFICATION-REPORT.md`
6. `T31-SORAVO-WRAPPER-COMPLETION-REPORT.md` (§5 triage = this task's input)
7. `T16-FINAL-COMPLETION-MATRIX.md` (F-01 JWT, F-05 plan IDs, F-09 coverage)
8. `T32-A-HANDY-V1-POLICY-RECONCILIATION-REPORT.md`
9. Payment sources: `supabase/functions/payment-checkout/index.ts`,
   `supabase/tests/payment-checkout.test.mjs`, `packages/payment-domain/src/*`,
   `services/license-api/src/payment/*`, `apps/website/src/lib/payment-service.ts`
10. Git/branch/PR/CI: branch `t31/soravo-wrapper-completion`, PR #63 OPEN
    (web/desktop/e2e green, rust red = the 15 STOP-gated tests, unchanged)

Key contract anchors (existing, not invented):
- v6 §06: `POST /functions/v1/payment-checkout`, Bearer Supabase JWT,
  request `{productId, currency}`; server derives user ID from JWT and
  price/product from `@soravo/payment-domain`; lifetime → orderId + keyId +
  amount + currency + productId; monthly → subscriptionId + keyId + currency +
  productId; "No third price catalog may exist."
- v6 §15: server-only `RAZORPAY_KEY_ID/KEY_SECRET/WEBHOOK_SECRET`; "Use TEST
  credentials for TEST E2E. Never substitute LIVE credentials."

---

## 1. SCOPE DISCIPLINE

Allowed and touched: `supabase/functions/payment-checkout/*` (function +
checkout-scoped config), payment-domain *integration* (import only — the
package itself is byte-unchanged), Supabase Auth boundary, Razorpay boundary,
checkout tests/config.

Forbidden and untouched: Handy core, STT, transcription, post-processing,
audio/VAD, frontend redesign, catalog invention, model metadata invention,
entitlement behavior invention. Proof: `git diff --name-only -- crates/
apps/desktop/` is empty (§7).

`services/license-api` left byte-unchanged (its identical plan fabrication is
recorded in §6 as needing the same product decision — fixing it here would
exceed the checkout scope and pre-empt that decision).

---

## 2. FINDING REPRODUCTION (all 7 real/current, then dispositioned)

| # | T31 finding | Reproduction | Verdict |
|---|-------------|--------------|---------|
| 1 | `getRegionalPrice` import/resolution | `index.ts:116` calls it; `index.ts:38` imports only `PRODUCT_CATALOG, isProductId, validateCurrency` — never defined/imported | REAL — ReferenceError on every checkout. FIXED (imported from `@soravo/payment-domain`, which exports it). Specifier resolution itself is sound: workspace package, vitest alias for tests, Supabase CLI esbuild bundling for deploy (same mechanism as the deployed webhook, behaviorally proven in 024) |
| 2 | `Buffer` in Deno | `Buffer.from(...)` at `index.ts:166,204`; no `node:buffer` import; `Buffer` is not a Deno global | REAL — would throw at runtime. FIXED (`encodeBase64Ascii` via TextEncoder+btoa; equivalence with `Buffer` asserted in tests for ASCII credentials) |
| 3 | JWT auth / defense-in-depth | `parseJWT` (atob-decode, no signature check) was the ONLY in-handler check; `[functions.payment-checkout]` had NO `verify_jwt` line (implicit default) | REAL — FIXED both halves: explicit `verify_jwt = true` declared in `config.toml` (platform gate now version-controlled, 024-style), plus in-handler authoritative confirmation via Auth API (§3) |
| 4 | supabase functions outside type/lint | Root `lint`/`typecheck` cover 4 workspace packages only; no tsconfig/eslint under `supabase/` | REAL — FIXED for the checkout scope (new tsconfig + eslint config + `lint:checkout`/`typecheck:checkout` wired into root scripts, hence CI). Webhook remainder recorded in §6 |
| 5 | TEST-mode enforcement | Only a comment claimed TEST-only; `readConfig` accepted any non-empty key | REAL — FIXED (`rzp_test_` prefix enforced at env read, fail closed) |
| 6 | Server-authoritative pricing | Amount/user_id already server-derived (good), BUT monthly sent fabricated `plan_<product>_<currency>` (T16 F-05 class) | REAL — FIXED (plan IDs from `RAZORPAY_PLAN_SORAVO_MONTHLY_*` env; missing → 503, never fabricated) |
| 7 | Provider-independent boundary | Function redefined its own provider interface AND re-implemented Razorpay HTTP instead of reusing license-api's provider | REAL, but reuse is NOT the fix: license-api's provider depends on Node APIs (`Buffer`, `node:crypto`) unavailable in the Edge runtime. FIXED as documented split: domain owns data (imported), function owns Deno-safe provider wiring (comment-anchored in `checkout.ts`) |

Nothing was fixed by invention: no credentials, Plan IDs, prices, products,
keys, or provider facts created. The monthly-plan env names are Soravo-owned
deployment configuration, and an unset mapping fails closed rather than
guessing.

---

## 3. AUTHENTICATION DESIGN (the §06 + task MUST)

Requirement: "The server must establish user identity through the
authoritative Supabase Auth mechanism. Do not trust manually decoded JWT
payloads as authentication."

Implemented layers:

1. **Platform gate (primary):** `verify_jwt = true` now declared explicitly
   in `supabase/config.toml`. The Supabase gateway verifies the Auth JWT
   signature before the handler runs. Previously this was an implicit default
   — one undocumented Dashboard/CLI drift away from silent bypass (the exact
   failure class 024 fixed for the webhook with `verify_jwt = false`).
2. **In-handler authoritative confirmation (defense-in-depth, justified):**
   `verifyAuthToken` calls `GET <SUPABASE_URL>/auth/v1/user` (the endpoint
   `auth.getUser()` uses; pure `fetch`, no new dependency, Deno-safe) and the
   returned id is the checkout identity. A decoded `sub` the Auth API does not
   confirm — including a sub mismatch — is rejected with 401.
3. **`parseJWTClaims` demoted to structural pre-check** (shape + expiry only),
   documented as NEVER authentication. It lets expired/malformed requests fail
   fast without a network call.
4. **Transient handling:** Auth API rejection → 401; Auth API unreachable →
   throws `AuthVerificationError` → 500 `auth_unavailable` (fail closed WITHOUT
   forcing logout — a network blip must not read as "user is unauthenticated").
5. **Previously-read-but-unused config fixed:** `SUPABASE_URL`/`SUPABASE_ANON_KEY`
   were loaded and never used — they now feed exactly this verification.

---

## 4. FILES CHANGED (exact)

| File | Change |
|------|--------|
| `supabase/functions/payment-checkout/checkout.ts` | NEW — all checkout decisions, runtime-agnostic (handler factory with injected `fetch`/env, Auth verification, TEST gate, plan resolution, Deno-safe provider) |
| `supabase/functions/payment-checkout/index.ts` | Rewritten to thin Deno wiring (env read + `Deno.serve`); header documents the contract |
| `supabase/functions/payment-checkout/tsconfig.json` | NEW — extends `tsconfig.base.json` (strict incl. `noUncheckedIndexedAccess`), paths-map for `@soravo/payment-domain`, Deno shim include |
| `supabase/functions/payment-checkout/eslint.config.js` | NEW — re-exports the payment-domain flat config (same rule set, zero new deps; pnpm isolation prevents direct dep install in a non-package dir) |
| `supabase/functions/payment-checkout/deno-shim.d.ts` | NEW — minimal `Deno.env.get`/`Deno.serve` ambient for `tsc` only |
| `supabase/functions/payment-checkout/package.json` | NEW — `{"type":"module"}` only (silences ESM warning; deploy-harmless) |
| `supabase/tests/payment-checkout.test.mjs` | Rewritten — 22 real unit tests replace 15 tautologies + live-fetch helper (deleted, not weakened) |
| `supabase/config.toml` | Explicit `verify_jwt = true` + gate documentation for payment-checkout |
| `package.json` | `lint:checkout` / `typecheck:checkout` scripts, wired into `lint`/`typecheck` chains; root devDeps pinned to already-locked versions (`eslint 10.11.0`, `@eslint/js 10.0.1`, `typescript 6.0.3`, `typescript-eslint 8.70.1`) |
| `pnpm-lock.yaml` | Root importer entries for the above (no version churn) |
| `PROGRESS.md` | T32-B entry |
| `T32-B-PAYMENT-HARDENING-REPORT.md` | This report |

`packages/payment-domain` — byte-unchanged (integration by import only).

---

## 5. TESTS (existing documented contracts only)

`pnpm test:supabase` → **200 passed, 0 failed** (checkout 22 + webhook 166 + migration-guard 12; suite was 196 before: 15 checkout tautologies removed, 22 real tests added).

New coverage, all with mocked `fetch` + explicit env (no network, no secrets):
- Auth (7): missing header / malformed JWT / expired JWT (no Auth call) → 401;
  Auth API rejection → 401; Auth-confirms-different-user → 401; Auth
  unreachable → 500 `auth_unavailable`; `verifyAuthToken` unit contract.
- Validation (6): invalid JSON / missing productId / missing currency / unknown
  product / unknown currency → 400; GET → 405, OPTIONS → 204.
- Server-authoritative pricing (5): client `amount`/`user_id` ignored — charged
  amount and `notes.user_id` asserted on the captured Razorpay payload against
  `PRODUCT_CATALOG` (catalog is the price authority, values never hardcoded);
  lifetime ↔ orderId/amount vs monthly ↔ subscriptionId/no-amount routing;
  configured plan ID sent verbatim; missing plan → 503 with zero provider
  calls; no secret substring in any response (incl. provider-failure path).
- TEST-mode (2): `isTestModeKeyId` + `readCheckoutEnv` (LIVE key → null,
  missing secret → null); null env → 500 `not_configured`, zero fetch calls.
- Helpers (2): `parseJWTClaims` shape table; `encodeBase64Ascii` ≡ `Buffer`
  for ASCII credentials.

Mutation check: `getRegionalPrice` import removed → 4 failures; restored →
22 green. (Catches the exact T31 defect class.)

Adjacent suites (unchanged code, regression check): `payment-domain` lint
pass; `license-api` 71/71; website 179/179 (one flaky admin failure on first
run, green on rerun in an untouched file).

`pnpm lint:checkout` + `pnpm typecheck:checkout` → pass (both CI-wired now).

---

## 6. REMAINING BLOCKERS / DELIBERATE NON-CHANGES

1. **Deployment (external-gated):** function not deployed; `RAZORPAY_WEBHOOK_SECRET`
   unset; `RAZORPAY_PLAN_SORAVO_MONTHLY_*` values unknown (human Dashboard +
   Supabase access required). Deploy-time replay (one TEST lifetime + one TEST
   monthly) is the defined next task.
2. **Real monthly Plan IDs (human action):** fabrication refused in both
   checkout (503) and — by non-change — `services/license-api/src/payment/service.ts:205`,
   which contains the identical `plan_<product>_<currency>` pattern. Aligning
   it needs the same product decision on real plan IDs; out of checkout scope.
3. **T16 F-09 remainder:** `supabase/functions/razorpay-webhook/**` (with
   `esm.sh` imports + unguarded `Deno.serve`) is still outside type/lint
   coverage — needs Deno-aware setup, separate task.
4. **T30 STOP-gates unchanged:** catalog checklist (10 tests) + transcription
   A/B/C (5 tests); rust job stays red by design.
5. **Resolution note:** `@soravo/payment-domain` bare specifier in Edge
   Functions resolves via Supabase CLI esbuild bundling against workspace
   `node_modules` (proven for the webhook by 024's behavioral probes);
   checkout now shares exactly that mechanism. First deploy must confirm the
   bundle includes it (item 1 covers this).

---

## 7. VERIFICATION SUMMARY

- `pnpm test:supabase` — 200/200
- `pnpm lint:checkout`, `pnpm typecheck:checkout` — pass
- `git diff --name-only -- crates/ apps/desktop/` — empty (zero Handy-core)
- `git status` — only §4 files + pre-existing T22–T32-A untracked reports (preserved, untouched) + pre-existing T32-A doc delta (not mine, not committed)
- No commit or push (per instruction). STOP.

---

*Report: T32-B — Authority: Soravo v6 pack (§06/§12/§15) + T29/T30/T31/T16 + primary repo/test evidence. No credential, price, product, plan, or provider fact invented.*
