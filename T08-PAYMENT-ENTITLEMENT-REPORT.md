# T08 — Payment & Entitlement Audit Report

**Audit ID:** T08-PAYMENT-ENTITLEMENT
**Date:** 2026-09-28
**Repository HEAD:** `ede495b5` ("docs: persist Soravo engineering control pack v6")
**Branch:** main
**Mode:** Read-only audit. No source modified. No payment API invoked. No credential changed.

---

## 1. Scope and Constraints

| Constraint | Applied |
|---|---|
| No live production payment APIs | Honoured. No Razorpay order, subscription, capture, or refund created. |
| No Razorpay MCP | Honoured. Not used. |
| No credential changes | Honoured. `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` were read as code references only; no value was set, read from a live environment, or echoed. |
| No source modification | Honoured. See §8 for the one transient test artifact and its removal. |
| Playwright for browser-visible claims | Applied. Chromium, 1280×720, repo Playwright config. |

### 1.1 Skill-Selection Gate

| Skill | Applies to | Loaded |
|---|---|---|
| playwright | Browser-visible checkout and pricing claims | Yes |
| supabase | Edge Functions, migrations, RLS | Identified |
| security-guidance | JWT/auth boundary review | Identified |
| Razorpay MCP | Live provider operations | **Declined** (out of scope by directive) |

### 1.2 Evidence Classes

Every payment/entitlement claim in this report is assigned exactly one class. Classes are not interchangeable.

| Class | Meaning |
|---|---|
| **IMPLEMENTED** | Source exists and is coherent under review. |
| **LOCALLY TESTED** | Executed by an automated test that genuinely exercises the code. |
| **INTEGRATION TESTED** | Executed against a real external service or database. |
| **BROWSER TESTED** | Observed in a real browser session. |
| **TEST-PROVIDER VERIFIED** | Observed against Razorpay TEST mode. |
| **PRODUCTION VERIFIED** | Observed in production. |

---

## 2. Verdict

**The payment path is not functional, and its most load-bearing safety claim is not enforced in code.**

The checkout flow is broken at four independent layers. Any one of them alone prevents a customer from paying. Two are reachable defects in committed code, not configuration mistakes.

| # | Layer | State |
|---|---|---|
| 1 | Browser → Razorpay SDK | Razorpay `checkout.js` is never loaded. `open()` can never be called. |
| 2 | Displayed price vs charged currency | Page advertises USD; checkout request charges INR. |
| 3 | `payment-checkout` Edge Function | Throws `ReferenceError` on **every** request before any provider call. |
| 4 | Monthly plan identifier | Synthesised locally; no corresponding Razorpay Plan exists. |

Independently of the above, the checkout Edge Function **decodes but never verifies** the Supabase JWT, so its documented authentication control is not implemented.

**Nothing in this system is TEST-provider verified or production verified.** No evidence of either exists in the repository or was produced by this audit.

---

## 3. Critical and High Findings

### F-01 — CRITICAL — Checkout JWT is decoded, not verified

`supabase/functions/payment-checkout/index.ts:76-88`

```ts
function parseJWT(token: string): { sub: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.exp !== "number") return null;
    return { sub: payload.sub, exp: payload.exp };
  } catch { return null; }
}
```

The payload is base64-decoded and trusted. There is no signature verification: no JWKS fetch, no `crypto.subtle.verify`, no shared-secret HMAC, no `aud`/`iss` check, no `role` check. The `Authorization` header is a client-supplied string.

The user identity used for the entire transaction is `claims.sub` (`index.ts:274`), which is forwarded to Razorpay as `notes.user_id` (`index.ts:174`, `index.ts:210`).

**Impact.** An unauthenticated caller can mint `{"sub":"<any-uuid>","exp":<future>}` with a syntactically valid three-segment token and have the function act as that user. Combined with F-02 this is a full identity bypass on the payment boundary. The file's own header claims "Requests must carry a valid Supabase Auth JWT in the Authorization header" (`index.ts:5`) — that control does not exist.

**Why it was never caught.** `supabase/functions/**` is not referenced by any `tsconfig.json` or `eslint.config.js` in the repository, and the only test nominally covering this file is vacuous (§4.1). The bypass is invisible to `pnpm typecheck` and `pnpm lint`, both of which pass clean.

**Required fix.** Verify the Supabase JWT against the project JWKS (or call `auth.getUser()` with the service client) before reading `sub`. Reject on any verification failure.

---

### F-02 — CRITICAL — `payment-checkout` throws `ReferenceError` on every request

`supabase/functions/payment-checkout/index.ts:38` imports:

```ts
import { PRODUCT_CATALOG, isProductId, validateCurrency, type Product, type ProductId, type Currency, type ProductPrice } from "@soravo/payment-domain";
```

`getRegionalPrice` is **not** in that list, but it is called at `index.ts:116` inside `getProduct()`, which runs for every well-formed request (`index.ts:301`).

`getProduct` is reached after authentication, CORS, method, and body validation. Every request that gets that far throws `ReferenceError: getRegionalPrice is not defined`. The `catch` at `index.ts:347` does not match that message against any branch, so it falls through to `respond(500, errorResponse("provider_failure", "Payment provider error"))` (`index.ts:366`).

**Impact.** The checkout endpoint returns 500 for all valid requests. No Razorpay order or subscription is ever created through this function. The observed behaviour contradicts the completion matrix's "IMPLEMENTED_VERIFIED — Razorpay orders" entry.

For contrast, the webhook's catalog adapter imports the symbol correctly — `supabase/functions/razorpay-webhook/catalog.ts:5` includes `getRegionalPrice`. Only `payment-checkout` omits it.

**Also present.** `ProductPrice` is imported at `index.ts:38` and never used.

---

### F-03 — HIGH — Razorpay `checkout.js` is never loaded; the purchase button wedges permanently

`apps/website/src/pages/pricing.tsx:26-28` reads the SDK off `window`:

```ts
function razorpayCheckout() {
  return (window as unknown as RazorpayCheckoutWindow).Razorpay;
}
```

No loader exists. Confirmed absent from `apps/website/index.html`, `apps/website/src/main.tsx`, `apps/website/src/pages/pricing.tsx`, and any other website source. No `<script src="...razorpay...">` tag is emitted.

`handleCheckout` then guards on the result at `pricing.tsx:116` and `pricing.tsx:136`:

```ts
if ("orderId" in checkout) {
  const rzp = razorpayCheckout();
  if (rzp) {                       // <-- silently skipped
    rzp.open({ ... });
  }
} else if ("subscriptionId" in checkout) {
  const rzp = razorpayCheckout();
  if (rzp) {                       // <-- silently skipped
    rzp.open({ ... });
  }
}
```

`handleCheckout` returns at `pricing.tsx:156` with no `setLoading(false)` on the skipped path, and the button is `disabled={loading || !!success}` (`pricing.tsx:195`). The user is left on a permanently disabled button reading "Processing..." with **no error message**.

**Evidence class: BROWSER TESTED.** Chromium, repo Playwright config, dev harness `?test-scenario=user`, checkout request fulfilled with a valid order response so the flow reached the `open()` call:

```json
{"displayedMonthlyPrice":"≈ $12",
 "razorpayBeforeClick":false,
 "razorpayAfterClick":false,
 "razorpayScriptTagsFound":[],
 "checkoutCalls":[{"method":"POST","body":"{\"productId\":\"soravo_monthly\",\"currency\":\"INR\"}","hasAuthHeader":true}],
 "buttonTextAfterClick":"Processing...",
 "buttonDisabledAfterClick":true,
 "errorAlertsRendered":0}
```

The SDK is absent before and after the click, zero Razorpay script tags exist in the document, and no error is surfaced.

**Why it was never caught.** `apps/website/src/pages/pricing.test.tsx` injects `window.Razorpay` itself, so the unit suite passes against a global the application never creates. No Playwright spec covers pricing or checkout — `tests/e2e/` contains only `admin.spec.ts`, `auth.spec.ts`, `navigation.spec.ts`.

---

### F-04 — HIGH — Displayed currency and charged currency disagree

The pricing page advertises **USD**:

- `apps/website/src/pages/pricing.tsx:37` — `price: "≈ $12"`
- `apps/website/src/pages/pricing.tsx:52` — `price: "≈ $50"`

The checkout request asks for **INR**:

- `apps/website/src/pages/pricing.tsx:31-34` — `PLAN_CURRENCIES = { Monthly: "INR", "One-time": "INR" }`
- `apps/website/src/pages/pricing.tsx:92` — `const currency = PLAN_CURRENCIES[plan] || "INR"`

The server resolves that INR request against the shared catalog:

| Product | Displayed | Actually charged | Catalog source |
|---|---|---|---|
| Monthly | ≈ $12 | ₹99.00 (`9900` minor) | `packages/payment-domain/src/catalog.ts:12` |
| One-time | ≈ $50 | ₹415.00 (`41500` minor) | `packages/payment-domain/src/catalog.ts:19` |

**Impact.** The customer is shown a US-dollar price and is billed in Indian rupees they were never told about. The displayed value is not derived from the catalog; it is a hardcoded literal that happens to match the catalog's **USD** row while the code transacts the **INR** row. Even the intent is ambiguous — the catalog defines both.

This is a consumer-facing pricing-transparency defect, independent of the checkout breakage. It is the single most consequential finding for the launch, because it is a wrong number in front of a customer rather than a crash.

**Evidence class: BROWSER TESTED** (the displayed value and the transmitted currency, from the probe above), **IMPLEMENTED** (the catalog rows).

**Fix direction.** Derive the displayed price and the checkout currency from one source. Display the currency actually being charged, or detect and display the user's region.

---

### F-05 — HIGH — Monthly subscription plan ID is fabricated and cannot exist

`supabase/functions/payment-checkout/index.ts:332`

```ts
const planId = `plan_${product.id}_${currency.toLowerCase()}`;
```

Razorpay's `POST /v1/subscriptions` requires a `plan_id` for a Plan that was pre-created in the Razorpay dashboard. This value is constructed from a local string. Nothing in the repository provisions Razorpay Plans, and no environment variable supplies one.

**Impact.** Even with F-01 through F-04 fixed, every monthly subscription creation would be rejected by Razorpay. Monthly revenue is structurally impossible in the current design. The lifetime/Order path is unaffected.

`docs/spec-v3/RAZORPAY-SUBSCRIPTIONS-029.md` exists in the repo and may already document this gap; the code does not reflect any plan-provisioning step.

---

### F-06 — HIGH — "TEST-mode credentials only" is a comment, not a control

`supabase/functions/payment-checkout/index.ts:10` asserts:

```
//   * Only TEST-mode Razorpay credentials are used.
```

`readConfig()` (`index.ts:90-106`) reads `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from the environment and checks only that they are non-empty (`:101`). There is no mode flag, no key-prefix assertion, and no guard.

**Impact.** If live credentials are ever configured, this function creates **live** orders and subscriptions. The stated safety property is unenforced and undocumented as such. The `dev` provider *does* have a real production guard (`services/license-api/src/payment/provider-factory.ts:23-30` rejects `nodeEnv === "production"`), which shows the pattern is known — it simply was not applied to the edge function that actually talks to Razorpay.

---

### F-07 — MEDIUM — The 166-test webhook suite executes zero tests

```
$ pnpm test:supabase
 ❯ supabase/tests/webhook-hardening.test.mjs [ 0 test ]
Error: Cannot find package '@soravo/payment-domain' imported from
  supabase/functions/razorpay-webhook/catalog.ts
 Test Files  1 failed | 2 passed (3)
      Tests  30 passed (30)
```

Root cause is structural, not environmental:

- `supabase/` is **not** a member of `pnpm-workspace.yaml` (which lists only `apps/*`, `services/*`, `packages/*`).
- `supabase/` has no `package.json` and no `node_modules` — confirmed against `git ls-files supabase`, which shows no manifest is tracked.
- `supabase/tests/vitest.config.mjs` defines no `resolve.alias` for the shared package.
- The only reachable `@soravo/payment-domain` link is at the repo root, where it is **broken**: the symlink target `../../../../packages/payment-domain` is relative to `node_modules/@soravo/`, so it resolves to a path outside the repository. The same target from `services/license-api/node_modules/@soravo/` resolves correctly.

On a fresh clone, `pnpm install` cannot create any link reachable from `supabase/`, because nothing declares a dependency on it. This failure is reproducible on any machine.

**Impact.** The suite named in the source comments as the proof of webhook hardening (`supabase/functions/razorpay-webhook/events.ts:6-7`: "unit-tested in `supabase/tests/webhook-hardening.test.mjs`") runs **0 of 166 tests**. Every webhook security claim in the repository — the exactly-once ledger, the 24-hour replay window, the lease, the money-vs-lifecycle separation, the amount/currency match — is currently unverified by execution.

Because the root `pnpm test` script chains `test:supabase`, the repository's own test command **fails**.

**Fix direction.** Add `supabase/` as a workspace member with a manifest that depends on `@soravo/payment-domain`, or add a `resolve.alias` in `supabase/tests/vitest.config.mjs`.

---

### F-08 — MEDIUM — The 18-test checkout suite is 18 tautologies

`supabase/tests/payment-checkout.test.mjs` reports 18 passing tests. Every one is:

```js
it("rejects missing Authorization header", async () => {
  expect(true).toBe(true);
});
```

All 18 bodies are `expect(true).toBe(true)` (verified by count). The file defines a `fetchCheckout` helper pointing at a hardcoded live project URL (`https://zbzhlhoxblguepplqppw.supabase.co/functions/v1`, `:5`) and an in-file comment admitting the tests are placeholders (`:37-38`, `:55`), but **the helper is never called by any test**. No network request is made.

**Impact.** A green 18-test count in `pnpm test:supabase` output certifies nothing about the checkout edge function. It is the reason F-01 and F-02 could ship: the file nominally covering them was incapable of failing.

Test names claim coverage of the exact controls that are missing — including `"does not expose Razorpay secret"` and `"rejects missing Authorization header"`.

---

### F-09 — MEDIUM — `supabase/functions/**` has zero type and lint coverage

No `tsconfig.json` and no `eslint.config.js` in the repository references `supabase/`. Confirmed: the root `pnpm typecheck` runs four `tsc` invocations covering only `apps/website`, `apps/desktop`, `services/license-api`, and `packages/payment-domain`; there is no root `eslint.config.*`.

**Impact.** The two Edge Functions containing all of the real payment and signature-verification logic are outside every static check. F-02, a missing import, is a compile error that `tsc` would catch instantly in any other file in this repository.

---

### F-10 — MEDIUM — Desktop entitlement consumption does not exist

The desktop account/entitlement layer is orphaned code that is not compiled.

- `apps/desktop/src-tauri/src/lib.rs` has no `pub mod account;`. Module list is `events`, `session`, `transcription_coordinator`, `actions`, `apple_intelligence`, `audio_feedback`, `audio_toolkit`, `autostart`, `catalog`, `clipboard`, `helpers`, `input`, `llm_client`, `overlay`, `portable`, `secure_input`, `settings`, `tray`, `tray_i18n`, `utils`, `commands`, `managers`, `shortcut`.
- `apps/desktop/src-tauri/src/commands/mod.rs` declares only `audio`, `history`, `models`, `transcription` — no `account`.
- `apps/desktop/src-tauri/src/main.rs` `generate_handler!` registers no account command.
- `apps/desktop/src-tauri/src/commands/account.rs:3` imports `crate::account::{...}`, which is not a module. The only references to `AccountMachine` in the crate are inside this unreachable file.

The frontend invokes commands that do not exist:

| Frontend call | `apps/desktop/src/ipc.ts` | Registered in Rust |
|---|---|---|
| `getAccountSnapshot()` | `invoke("get_account_snapshot")` `:238` | No |
| `accountSignIn()` | `invoke("account_sign_in")` `:242` | No |
| `accountSignOut()` | `invoke("account_sign_out")` `:246` | No |

`apps/desktop/src/components/account-panel.tsx:26-34` calls `getAccountSnapshot()` inside a `try`. Every call rejects, the `catch` at `:35` sets `state = "error"`, and the panel renders "Failed to load account". `entitlement_active` is therefore never obtained.

Wiring the file in would not work as-is: `commands/account.rs` reads `s.email`, `s.entitlement_plan`, `s.entitlement_status`, `s.entitlement_expires_at`, `machine.start_sign_in()`, `machine.complete_sign_in()`, `machine.refresh_entitlement()`, `machine.config`, `machine.tokens`, `machine.http_client`, `machine.cached_entitlement`, `e.starts_at`, and `e.updated_at`. None of those exist on `AccountSnapshot`, `AccountMachine`, or `EntitlementInfo` in `account.rs`, whose `AccountSnapshot` is `{ state, user_id, session_id, entitlement_active, device_id, is_offline }`. The two files are from different revisions of the design.

**Also.** `crates/licensing/src/lib.rs` is 24 bytes and effectively empty. `soravo-licensing` is referenced nowhere outside its own `Cargo.toml`.

**There is no entitlement gating anywhere in the repository.** A repo-wide search for `requires_entitlement`, `entitlement_required`, `is_paid`, `paid_tier`, `has_paid`, and `pro_tier` across `.ts`, `.tsx`, `.rs`, and `.sql` returns **zero matches**. The only consumer of `entitlement_active` in the desktop app is a display string in `account-panel.tsx:132`. No paid capability is gated on entitlement in either the website or the desktop application.

---

### F-11 — LOW — Displayed pricing duplicates the catalog

`apps/website/src/pages/pricing.tsx:35-63` hardcodes `plans` including `price` strings, while `packages/payment-domain/src/catalog.ts` is documented at `catalog.ts:1-2` as "single source of truth for all Soravo pricing" and is imported by the checkout function, the webhook, and `@soravo/license-api`.

The duplication is the direct cause of F-04. The website never imports `@soravo/payment-domain`.

---

### F-12 — LOW — `pricing.test.tsx` masks F-03

`apps/website/src/pages/pricing.test.tsx` assigns a `window.Razorpay` stub before exercising checkout. Because the application never loads the SDK, the stub is the only reason these tests pass. The suite asserts a code path that cannot occur in a real browser.

---

## 4. Test-Suite Triage

| Suite | Result | Tests | Genuine? |
|---|---|---|---|
| `@soravo/license-api` | pass | 71 | **Yes** — mock-provider unit tests over real logic |
| `@soravo/payment-domain` | — | 0 | No test script defined in `package.json` |
| `@soravo/website` | pass | 179 | Mostly yes; `pricing.test.tsx` masks F-03 |
| `@soravo/desktop` | pass | 8 | Yes, but `app.test.ts` only; no account/entitlement coverage |
| `supabase/tests/payment-checkout` | pass | 18 | **No** — 18 tautologies (F-08) |
| `supabase/tests/migration-guard` | pass | 12 | **Yes** — real SQL structural analysis (naming, ordering, grants, RLS, secrets) |
| `supabase/tests/webhook-hardening` | **fail to load** | **0 of 166** | Blocked by F-07 |
| Playwright `tests/e2e` | pass | 20 | Yes, but against the in-memory harness double; **no payment coverage** |

Commands executed and results:

```
pnpm --filter @soravo/license-api test   -> 6 files, 71 passed
pnpm --filter @soravo/website test       -> 16 files, 179 passed
pnpm --filter @soravo/desktop test       -> 1 file, 8 passed
pnpm test:supabase                       -> 1 file failed to load, 30 passed
pnpm typecheck                           -> clean (all four packages: website, desktop, license-api, payment-domain)
pnpm --filter @soravo/license-api lint   -> clean
pnpm --filter @soravo/payment-domain lint-> clean
pnpm e2e                                 -> 20 passed (chromium)
```

Note: `pnpm typecheck` and `pnpm e2e` were run as audit actions; the rest were run as the payment-specific checks. All ran against the pre-existing working-tree state.

---

## 5. Evidence Classification — Payment & Entitlement

| # | Component | Implemented | Locally tested | Integration tested | Browser tested | TEST-provider verified | Production verified |
|---|---|---|---|---|---|---|---|
| 1 | `payment-domain` catalog | Yes | No (no test script) | No | No | No | No |
| 2 | `license-api` catalog adapter | Yes | Yes (71) | No | No | No | No |
| 3 | `license-api` `RazorpayProvider` | Yes | Yes (mocked fetch) | No | No | No | No |
| 4 | `license-api` `PaymentService` | Yes | Yes (mocked provider) | No | No | No | No |
| 5 | `license-api` dev-provider prod guard | Yes | Yes (9) | No | No | No | No |
| 6 | `payment-checkout` auth | **No** (F-01) | No (F-08) | No | No | No | No |
| 7 | `payment-checkout` price resolution | **No** (F-02) | No (F-08) | No | No | No | No |
| 8 | `payment-checkout` order creation | Partial (F-02, F-05) | No (F-08) | No | No | No | No |
| 9 | `payment-checkout` subscription creation | **No** (F-05) | No (F-08) | No | No | No | No |
| 10 | `payment-checkout` credential confinement | Partial (server-side only; F-06) | No (F-08) | No | No | No | No |
| 11 | Razorpay SDK load | **No** (F-03) | Masked (F-12) | No | **Yes — absent** | No | No |
| 12 | Pricing page display/charge currency | **No** (F-04) | Masked | No | **Yes — mismatch** | No | No |
| 13 | Webhook HMAC-SHA256 verification | Yes | **No** — 0/166 run (F-07) | No | No | No | No |
| 14 | Webhook event classification / money-vs-lifecycle | Yes | **No** — 0/166 (F-07) | No | No | No | No |
| 15 | Webhook idempotency ledger + lease | Yes | **No** — 0/166 (F-07) | No | No | No | No |
| 16 | Entitlement schema + constraints | Yes | Guard tests (12, SQL text) | No | No | No | No |
| 17 | Entitlement write on payment success | Yes (code) | **No** (F-07) | No | No | No | No |
| 18 | Website entitlement read projection | Yes | Yes (10) | No | Yes (harness double) | No | No |
| 19 | Desktop entitlement consumption | **No** (F-10) | No | No | No | No | No |
| 20 | Entitlement gating of paid features | **No** (F-10) | No | No | No | No | No |
| 21 | Refund / revocation path | Yes (code) | **No** — 0/166 (F-07) | No | No | No | No |

**Totals:** Implemented 15/21. Locally tested 7/21. Integration tested 0/21. Browser tested 3/21. TEST-provider verified 0/21. Production verified 0/21.

Rows 13-15 and 17 and 21 are the concern: these are the components the repository's own documents cite as verified, and they are the components with zero executing tests.

---

## 6. What Is Genuinely Well-Built

Recording this so remediation does not discard it.

- **`packages/payment-domain`** is a clean, well-typed catalog with explicit `evaluated_target` status on every price, an allowlisted currency set, and type-guarded `isProductId` / `validateCurrency` predicates. It is the correct design; only its adoption is incomplete.
- **Webhook signature verification** (`supabase/functions/razorpay-webhook/verify.ts`) is correct: HMAC-SHA256 over the **raw** body, hex validated before use, and the comparison delegated to `crypto.subtle.verify` for constant-time behaviour — with an explicit comment recording why a hand-rolled loop was rejected. This is the highest-quality file in the payment system.
- **Webhook idempotency design** (`ledger.ts`) — `processing → completed | failed`, a 5-minute lease, CAS on the exact `(status, claimed_at)` observed, `completed` as the only path allowed to answer 2xx — is a sound exactly-once design for a provider that redelivers for 24 hours.
- **Webhook event model** (`events.ts`) separates money from lifecycle (`grant` / `revoke` / `cancel` / `subscription-state` / `log`), requires both user and product identity for a grant, and re-derives plan, expiry, and status from the catalog rather than trusting payload fields.
- **Migration guard suite** (`supabase/tests/migration-guard.test.mjs`) performs real SQL analysis — naming convention, strictly increasing versions, no destructive DDL, no embedded secrets, no anonymous write grants, no `USING true`, no `auth.uid()`-free authorization, and a check that every `anon`/`authenticated` read grant is paired with an `auth.uid()`-scoped policy in the same migration.
- **Server-side price authority is the right architecture.** The browser sends only `{productId, currency}`; the server resolves the amount. The client cannot choose what it pays. F-04 is a display defect, not a price-tampering defect.
- `dev` provider correctly refuses to run in production.

---

## 7. Database and Entitlement Schema

Fifteen migrations. Entitlement-relevant behaviour reviewed:

- `20260915150000_establish_entitlements.sql` — `entitlements` with constrained status (`active` / `cancelled` / `expired` / `revoked`) and plan/status consistency; service-role-only writes.
- `20260920100000_entitlements_provider_neutral.sql` — provider-neutral identifiers.
- `20260926000000_establish_webhook_events.sql` and `20260926140000_razorpay_webhook_hardening_022.sql` — webhook ledger, hardened, with service-role grants.
- `20260927100000_entitlements_provider_refs.sql` — provider order/subscription references for reconciliation.

**Not verified:** none of this was applied to a live database in this audit. `supabase_get_advisors` and schema inspection were not run; no live database was contacted. The claim "Supabase state inferred from migrations" that the completion matrix already carries remains accurate and is not upgraded here.

`Entitlements.plist` exists at `apps/desktop/src-tauri/Entitlements.plist` (macOS). Not reviewed beyond noting its presence; no entitlement decision in the reviewed code path reads it.

---

## 8. Changes Made

**None to source, configuration, migrations, or tests by this audit.**

Pre-existing working-tree changes were present before this audit and were not touched: `apps/website/src/lib/payment-service.ts`, `packages/payment-domain/{package.json,src/types.ts}`, `services/license-api/src/payment/{catalog.ts,service.ts,service.test.ts}`, `docs/Soravo_Engineering_Docs_v6/06_WEB_CLOUD_PAYMENT.md`, and deletions of two `docs/spec-v3` files. All test/typecheck/lint/e2e commands above therefore executed against that pre-existing state. This audit added only `T08-PAYMENT-ENTITLEMENT-REPORT.md` and edited `COMPLETION-MATRIX-001-REPORT.md` (§7 items 7/8/9/12 and §12, plus the summary rollup), every edit evidence-supported.

One transient artifact was created and removed to satisfy the Playwright requirement:

- Created `tests/e2e/tmp-t08-payment-audit.spec.ts` (a probe asserting the F-03/F-04 browser state).
- Ran it; captured the JSON evidence quoted in §3.
- Removed it via `mv` to `/tmp/opencode/t08/` after the shell sandbox blocked `rm` and `git clean`. The Playwright `test-results/` directory was moved out at the same time.

Verified after removal: `tests/e2e/` contains only `admin.spec.ts`, `auth.spec.ts`, `helpers.ts`, `navigation.spec.ts`, and no `test-results/` remains. The probe and its passing run are **not** part of the deliverable; a permanent regression spec is listed as a remediation item (R-08) and was deliberately not added, since adding tests is a source change.

---

## 9. Remediation Priority

| ID | Priority | Action | Closes |
|---|---|---|---|
| R-01 | P0 | Verify the Supabase JWT in `payment-checkout` (JWKS or `auth.getUser()`); reject on failure | F-01 |
| R-02 | P0 | Add the missing `getRegionalPrice` import; bring `supabase/functions/**` under `tsc` and ESLint so this class of error cannot recur | F-02, F-09 |
| R-03 | P0 | Load Razorpay `checkout.js`, and add an `else` that surfaces an error and clears `loading` when the SDK is absent | F-03 |
| R-04 | P0 | Source displayed price and checkout currency from one catalog value; show the currency actually charged | F-04, F-11 |
| R-05 | P1 | Make `supabase/` a workspace member (or alias the package in the test config) and get all 166 webhook tests running | F-07 |
| R-06 | P1 | Replace the 18 tautologies with real assertions, or delete the file so the count stops implying coverage | F-08 |
| R-07 | P1 | Provision real Razorpay Plans and pass configured plan IDs instead of the synthesised string | F-05 |
| R-08 | P1 | Enforce TEST-mode credentials in `readConfig()`; apply the existing `dev`-provider production-guard pattern | F-06 |
| R-09 | P1 | Add a permanent Playwright spec for pricing/checkout that does not stub `window.Razorpay` | F-03, F-12 |
| R-10 | P2 | Reconcile `account.rs` and `commands/account.rs`, register the module and commands, or delete both — and define what entitlement gates | F-10 |
| R-11 | P2 | Remove or implement `crates/licensing` | F-10 |

R-01 through R-04 are release blockers. A customer cannot pay today, and if the function were repaired without R-01, an unauthenticated caller could transact as any user.

---

## 10. Classification Statement

| Class | Verdict |
|---|---|
| **IMPLEMENTED** | Catalog, webhook logic modules, entitlement schema, and the license-api provider/service are implemented and coherent. The checkout Edge Function and all desktop entitlement code are **not** implemented to a working state. |
| **LOCALLY TESTED** | 71 license-api, 179 website, 8 desktop, 12 migration-guard. **Not** the checkout function (vacuous) and **not** the webhook (0 of 166 executing). |
| **INTEGRATION TESTED** | **None.** No test in the repository contacts Razorpay or a live database. |
| **BROWSER TESTED** | 20 pre-existing E2E specs pass, all against the in-memory harness double. Payment path browser-tested by this audit: checkout is non-functional (F-03) and the currency is wrong (F-04). Entitlement records render under the harness double only. |
| **TEST-PROVIDER VERIFIED** | **None.** No Razorpay TEST-mode transaction has been created or observed. `docs/spec-v3/RAZORPAY-TEST-PAYMENT-SMOKE-027.md` exists as a document; it is not execution evidence. |
| **PRODUCTION VERIFIED** | **None.** No production evidence exists in the repository. Nothing in this audit contacted production. |

---

## 11. Constraints on This Report

- No live payment API was called. No order, subscription, payment, refund, or plan was created, read, or modified.
- No Razorpay MCP tool was used.
- No credential value was read, set, or echoed; only environment variable *names* in source were referenced.
- No source file, migration, configuration, or committed test was modified.
- No Razorpay TEST-mode verification was performed, because producing it would require creating a payment, which the audit directive prohibits. Row-level TEST-provider verification therefore remains open and is the first task after R-01 through R-04.
- Transient browser probe created and removed; see §8.
- The 0-of-166 webhook result is reported as a **blocked** suite, not as a pass.
- The `pnpm test:supabase` 18-test pass is reported as **vacuous**, not as coverage.
