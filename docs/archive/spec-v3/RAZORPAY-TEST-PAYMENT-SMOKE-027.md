# RAZORPAY-TEST-PAYMENT-SMOKE-027

**Milestone:** first real Razorpay **TEST-mode** lifetime payment, end to end, against
the deployed Supabase Edge Function.

**Date:** 2026-09-27
**Branch:** `feature/razorpay-payments-021-026`
**HEAD at time of writing:** `804d8af2703130bad2f6c0883a0403a2e5a5de36` (milestone 026),
`0/0` vs `origin/feature/razorpay-payments-021-026`

> **Nothing is committed or pushed.** This report and the `PROGRESS.md` section are
> staged-untouched working-tree changes pending human review.

---

## Verdict

**PASS — with two configuration findings that are reported, not worked around silently.**

A real Razorpay TEST payment of **INR 415.00** for `soravo_lifetime` was captured, the
webhook was delivered by Razorpay to the deployed Edge Function, the HMAC signature was
validated, the event was claimed and completed in the ledger, and **exactly one**
lifetime entitlement was created for the correct dedicated TEST Supabase user. All
three required suites are green.

| # | Verification | Result |
|---|---|---|
| 1 | Razorpay TEST credential auth | **PASS** — `GET /v1/payments?count=1` → `200` |
| 2 | Webhook config present and active | **PASS** — one active `api-test` endpoint, all 8 required events subscribed |
| 3 | Real order created | **PASS** — `order_Tgp6qmHcQ9scy7`, `41500 INR`, correct `user_id` + `product_id` notes |
| 4 | Real payment captured | **PASS** — `pay_Tgp91ev4woNKyY`, `status=captured`, `captured=true`, order `paid`, `attempts=1` |
| 5 | Webhook delivered to deployed function | **PASS** — 3 real events received and processed |
| 6 | HMAC signature validation | **PASS** — 3 valid accepted; 4 invalid variants all rejected `400` |
| 7 | Ledger claim → completion | **PASS** — all 3 events `status=completed`, `attempts=1`, `last_error` empty |
| 8 | Lifetime entitlement for correct user | **PASS** — 1 row, `active`, `plan=lifetime`, `expires_at=NULL` |
| 9 | Correct provider references | **PASS** — order ref and payment ref both match Razorpay |
| 10 | No duplicate entitlement | **PASS** — 1 row by order ref, 1 by payment ref, 0 duplicate event ids |
| 11 | `pnpm test:supabase` | **PASS** — 178/178 |
| 12 | `pnpm --filter @soravo/license-api test` | **PASS** — 55/55 |
| 13 | `pnpm --filter @soravo/license-api typecheck` | **PASS** — clean |

---

## 1. Skill Selection Gate record (loaded, not claimed)

| Skill | Loaded | Why |
|---|---|---|
| `security-guidance` | ✅ | payments, credentials, HMAC, PII handling |
| `supabase` | ✅ | Edge Functions, Auth, Postgres verification |
| `gh-cli` | ✅ | git/GitHub operations (not yet used — nothing committed) |

**Deliberately not loaded, with reasons:** `securability-engineering` and
`supply-chain-risk-auditor` (no source or dependency change was made),
`supabase-postgres-best-practices` (no schema or migration change — verification was
read-only SQL), `github` (`gh-cli` is the matrix default for CLI work), `vitest`
(the gate attaches to *changing* tests; both suites were run, never modified).

---

## 2. Credential sourcing — no secret entered chat, at any point

Razorpay credentials were **never** requested from the user, never pasted into chat,
and never printed, echoed, logged or committed.

- **Non-chat source:** `services/license-api/.env.local` — gitignored, untracked,
  mode `600`, the same file milestone 020 used.
- **Verified by shape only:** `RAZORPAY_KEY_ID` is `rzp_test_` prefixed (23 chars,
  SHA-256 prefix `8f5c6caee3e0`), `RAZORPAY_KEY_SECRET` present (24 chars, SHA-256
  prefix `2e209ce4454c`). These are truncated hashes, not values.
- `RAZORPAY_KEY_ID` is a **client-side publishable identifier** that Razorpay's
  `checkout.js` requires in the browser. It is passed directly into the page by the
  driver script and is never logged.
- **No credential was rotated.** `RAZORPAY_WEBHOOK_SECRET` was left exactly as
  configured, and no LIVE credential or LIVE Razorpay object was used or created.

---

## 3. STEP 1 — Razorpay TEST auth ✅

```
GET https://api.razorpay.com/v1/payments?count=1   ->  200
```

The previously revoked key pair was **not** in use. Authenticated reads succeed
against the fresh pair.

---

## 4. STEP 2 — Webhook configuration ✅

`GET /v1/webhooks` → `200`, exactly one webhook:

| Field | Value |
|---|---|
| id | `TgmCtZX0SxcKey` |
| `service` | `api-test` |
| active | `true` |
| `disabled_at` | `0` |
| secret present | `true` |
| url | `https://zbzhlhoxblguepplqppw.supabase.co/functions/v1/razorpay-webhook` |

**All 8 required events are subscribed:** `payment.captured`, `order.paid`,
`subscription.charged`, `refund.processed`, `subscription.cancelled`,
`subscription.halted`, `subscription.paused`, `subscription.resumed`.

### Finding A — over-subscribed webhook (reported, not changed)

The endpoint is subscribed to **53 events, ~45 more than the handler needs**. The
handler deliberately logs unrecognised events instead of failing, so the extras are
inert, but they widen the attack and noise surface and cost delivery attempts. A
follow-up should reduce the subscription to the supported set. **No change was made
here** — the webhook configuration was deliberately left untouched.

---

## 5. Finding B — Supabase CLI is NOT authenticated (reported, worked around)

This milestone was resumed with the claim that CLI authentication was in place. It is
not, in this environment:

| Check | Result |
|---|---|
| `~/.supabase/credentials` | **absent** (only `telemetry.json`, `traces/`) |
| `SUPABASE_ACCESS_TOKEN` env var | **unset** |
| `supabase projects list` | `AccessTokenRequiredError` — "Access token not provided" |

The user was **not** asked to paste a token. All database verification was performed
through the **authenticated Supabase MCP tools** (`execute_sql`), which are authorised
out-of-band. This is a real gap worth closing: anyone following the documented
`supabase` CLI path for this milestone will hit the same wall.

---

## 6. Test identity and baseline

A **dedicated** TEST user was created rather than reusing the seeded
`test@example.com`, which already carried lifetime and monthly fixture entitlements
that would have made "exactly one entitlement" unverifiable.

- **TEST user UUID:** `a5a2ae69-80fd-4ba4-9256-548ba0be40e2`
- Email deliberately **not recorded** in this report.
- Baseline before payment: `entitlements` for this user = **0**;
  `entitlements` total = 2; `webhook_events` total = 4.

---

## 7. Finding C — the service's default currency cannot settle on this account ⛔

This is the most important engineering finding of the milestone, and it was **not**
visible from the code or the test suites.

`PaymentService.createOrder()` always sends the catalogue **base** price:

```ts
// services/license-api/src/payment/service.ts
amountMinor: product.price.amountMinor,   // soravo_lifetime -> USD 5000
currency:    product.price.currency,      // -> "USD"
```

The first order was created through that exact production path, producing a
**USD 5000** order. Every card attempt against it failed:

```
BAD_REQUEST_ERROR — "Your payment could not be completed as this business accepts
domestic (Indian) card payments only. Try another payment method."
```

Three attempts, all `status=failed`, `captured=false`. **A USD order can never settle
on this merchant account**, because the account is configured for domestic Indian
cards only. The service exposes no currency or region override, so *every* order it
creates is unpayable against this account configuration.

**Resolution taken:** exactly **one** new order was created, denominated **INR
41500**, which is the catalogue's own INR regional price for `soravo_lifetime`
(`regionalPrices.INR = { amountMinor: 41500, currency: "INR", status: "evaluated_target" }`).
The amount was read from the live catalogue, never invented, and order creation still
went through the production `RazorpayProvider` with the same note shape the service
sets. This is also exactly the value the webhook validates on capture, so the
end-to-end assertion remains meaningful.

**This is a latent production bug, not a test artefact.** A customer in the US, EU,
CA or AU cannot pay, and no code path can produce a settleable order for them. It
needs its own task: `createOrder` must select a regional price (and the client must be
able to request one), or the merchant account must enable international cards.

---

## 8. Finding D — hCaptcha blocks browser automation (worked around legitimately)

Razorpay Checkout enforces an hCaptcha bot check. Automated submission was rejected
in both headless and headed Chromium, surfacing as
`Payment could not be completed` next to a `hcaptcha.com` frame reading
`Please try again. ⚠️ Verify`.

**No attempt was made to bypass, solve, automate or defeat hCaptcha**, and none should
be. Instead, **exactly one** checkout window was opened, nothing sensitive was
pre-filled, and a human completed the payment in that window (test card flow, Skip
OTP). Automation stopped at the challenge, as instructed.

The card number, CVV, mobile number and OTP were entered by the human only. **No card
detail was read, stored, logged or recorded by any script**, and none appears in this
report. The browser driver's `handler` result was not captured because the window was
closed after payment — Razorpay's API and the database were used as the authoritative
sources instead, which is the stronger evidence anyway.

---

## 9. STEP 4 — the real order

Created through the production `RazorpayProvider`, amount sourced from the live
catalogue:

| Field | Value |
|---|---|
| order id | `order_Tgp6qmHcQ9scy7` |
| receipt / reference | `4b523a09-e9e9-4e33-a555-6cdf9a223e67` |
| amount | `41500` minor units = **INR 415.00** |
| `notes.user_id` | `a5a2ae69-80fd-4ba4-9256-548ba0be40e2` ✅ |
| `notes.product_id` | `soravo_lifetime` ✅ |
| note keys present | exactly `product_id, user_id` — no leakage |
| initial state | `created`, `attempts=0` |

---

## 10. STEP 7 — payment status with Razorpay ✅

```
order_Tgp6qmHcQ9scy7
  status       = paid
  amount       = 41500 INR
  amount_paid  = 41500
  amount_due   = 0
  attempts     = 1

pay_Tgp91ev4woNKyY
  status       = captured
  captured     = true
  amount       = 41500 INR
  method       = card
  error_code   = none
```

Exactly one payment exists against this order, and it succeeded on the first attempt.

---

## 11. STEP 8/9 — webhook delivery, signature validation, ledger ✅

Razorpay delivered **three** real events for this payment. All three were received by
the deployed function, signature-validated, claimed, processed, and completed:

| `event_type` | ledger `status` | attempts | claimed | processed | `last_error` |
|---|---|---|---|---|---|
| `payment.authorized` | `completed` | 1 | yes | yes | none |
| `order.paid` | `completed` | 1 | yes | yes | none |
| `payment.captured` | `completed` | 1 | yes | yes | none |

Ledger keys follow the deterministic
`<event_type>:<payment_id>:<timestamp>` form, e.g.
`payment.captured:pay_Tgp91ev4woNKyY:1790460332`.

**The grant proves the deployed function holds the working key pair.** A stale
`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` on the function would have made the order
lookup fail and returned HTTP 500 (`transient`, `index.ts:365-366`). The grant
succeeded, so the function's credentials are the fresh, matching pair — **without any
credential having been rotated**.

### Bonus real coverage — `payment.failed`

The three failed USD attempts also produced real, correctly-processed
`payment.failed` webhooks (all `completed`, `attempts=1`, no errors). This confirms the
negative path works end to end and is worth recording: **no entitlement was created by
any of them.**

### Negative control — HMAC gate is enforced

Four rejected variants were sent to the deployed function, using a payload shaped like
a real `payment.captured` for the payment already processed (so a wrongly-accepted
request would have shown up as a duplicate):

| Request | HTTP | Body |
|---|---|---|
| no `X-Razorpay-Signature` | `400` | `missing signature` |
| empty signature | `400` | `missing signature` |
| forged signature | `400` | `invalid signature` |
| malformed signature | `400` | `invalid signature` |

After all four: `webhook_events` total unchanged at **10**, `entitlements` total
unchanged at **3**, `payment.captured` rows for this payment still exactly **1**. No
side effects, no forged grant.

**Limitation, stated plainly:** a *validly signed* replay could not be forged, because
the webhook secret is intentionally not available locally and rotating it was out of
scope. Duplicate protection is therefore evidenced by the ledger's deterministic
idempotency key plus the observed single-insert behaviour, not by an injected signed
replay.

---

## 12. STEP 10/11 — entitlement created, exactly once ✅

```sql
select user_id, product, plan, status, provider,
       provider_order_ref, provider_payment_ref,
       starts_at, expires_at
from public.entitlements
where user_id = 'a5a2ae69-80fd-4ba4-9256-548ba0be40e2';
```

| Column | Value | Check |
|---|---|---|
| `user_id` | `a5a2ae69-80fd-4ba4-9256-548ba0be40e2` | ✅ the dedicated TEST user |
| `product` | `soravo_lifetime` | ✅ |
| `plan` | `lifetime` | ✅ |
| `status` | `active` | ✅ |
| `provider` | `razorpay` | ✅ |
| `provider_order_ref` | `order_Tgp6qmHcQ9scy7` | ✅ matches Razorpay |
| `provider_payment_ref` | `pay_Tgp91ev4woNKyY` | ✅ matches Razorpay |
| `expires_at` | `NULL` | ✅ lifetime, never expires |

### Duplicate and consistency checks

| Check | Value | Expected |
|---|---|---|
| `entitlements` total | 3 | 2 seeded + 1 new |
| entitlements for TEST user | 1 | 1 |
| entitlements by `provider_order_ref` | 1 | 1 |
| entitlements by `provider_payment_ref` | 1 | 1 |
| `webhook_events` total | 10 | 4 seeded + 3 `payment.failed` + 3 for this payment |
| events for this payment | 3 | 3 |
| duplicate `event_id` values | 0 | 0 |
| events not `completed` | 0 | 0 |
| entitlements not `active` | 0 | 0 |
| ledger rows with a non-empty `last_error` | 0 | 0 |

**No duplicate entitlement exists.** The three events for the payment produced one
grant, not three.

---

## 13. STEP 12 — required suites ✅

| Command | Result |
|---|---|
| `pnpm test:supabase` | **178/178 passed** (2 files: `migration-guard` 12, `webhook-hardening` 166) |
| `pnpm --filter @soravo/license-api test` | **55/55 passed** (6 files) |
| `pnpm --filter @soravo/license-api typecheck` | **clean** (`tsc --noEmit`, exit 0) |

No test file was modified. No source file was modified — this milestone changed
**zero lines of product code**.

---

## 14. STEP 9 — TEST-only objects created (inventory)

Everything this milestone created in TEST mode, for later cleanup:

**Razorpay (no delete API — retained as evidence):**
- order `order_TgofHACuiHtvUC` — USD 5000, `attempted`, 3 failed payments. **Unpayable**, superseded.
- order `order_Tgp6qmHcQ9scy7` — INR 41500, `paid`.
- payments `pay_Tgp0VpSW7uSx7k`, `pay_Tgp04HTlMbb11Q`, `pay_TgoyPvNFulFesN` — `failed`.
- payment `pay_Tgp91ev4woNKyY` — `captured`.

**Supabase:**
- TEST auth user `a5a2ae69-80fd-4ba4-9256-548ba0be40e2` (confirmed, no profile row).
- 1 lifetime entitlement for that user — **retained deliberately as the evidence for
  this milestone**; it is the proof that the grant path works.
- 6 `webhook_events` rows (3 `payment.failed`, 3 for the successful payment) — retained
  as the delivery/ledger evidence.
- **No** device, session, or profile rows were created for the TEST user.

**Local scratch** (all under gitignored `supabase/.temp/smoke-027/`, never in
`git status`): driver scripts, the minimal `checkout.html` host page, the Playwright
profile, and captured API responses. Eligible for deletion; retained until the
milestone is signed off.

---

## 15. STEP 12 — Git milestone ⏸ HELD FOR REVIEW

Intentionally **not** performed, per instruction.

- Branch `feature/razorpay-payments-021-026`, HEAD `804d8af2…`, `0/0` vs remote.
- Working tree: **47** entries — 45 unrelated pre-existing dirty paths, plus
  `PROGRESS.md` (modified) and this report (new). **Nothing staged.**
- No `git add -A`, no stash, no reset, no force operation, and no change to any of the
  45 unrelated paths.
- When approved, the commit must stage **only**:
  `docs/spec-v3/RAZORPAY-TEST-PAYMENT-SMOKE-027.md` and `PROGRESS.md`.

---

## 16. What this milestone did **not** verify

Do not read these as closed:

- **International / multi-currency settlement is still broken** (Finding C). Only the
  INR domestic path is proven. `USD`/`CAD`/`EUR`/`AUD` orders remain unpayable.
- **`subscription.cancelled` contradicts ADR-012** — it routes to `cancel` and expires
  access immediately, whereas ADR-012 preserves it through the paid period. Untouched
  here; it needs its own task.
- **Resume can leave a row `active` and already expired** — the lifecycle-only path
  never touches `expires_at`.
- **`subscription.activated` is `log` even in its payment-carrying variant** — only
  monthly was not exercised, so `charged` as a first-charge signal is unconfirmed.
- **No validly-signed replay was injected** (§11), so duplicate protection is evidenced
  by the idempotency key and observed single-insert behaviour, not by an injected
  signed duplicate.
- **No refund, halt, pause or resume event was exercised** in this run.
- Green suites do **not** prove live behaviour; only the Razorpay API responses and the
  database rows in §10–§12 do.

---

## 17. Recommended follow-ups

1. **Fix the currency selection bug** (Finding C) — highest severity. It makes every
   non-INR customer unpayable and no code path can produce a settleable order.
2. **Restore Supabase CLI authentication** (Finding B) so the documented CLI path works.
3. **Trim the webhook subscription** from 53 events to the supported set (Finding A).
4. Decide on a supported way to run browser-driven TEST payments, given hCaptcha makes
   full automation infeasible (Finding D).
