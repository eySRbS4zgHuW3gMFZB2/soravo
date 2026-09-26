# RAZORPAY-WEBHOOK-HARDENING-022

## Objective

Repair the Razorpay webhook handler against the twelve findings in
`RAZORPAY-PAYMENT-ARCHITECTURE-021.md` so that a captured TEST payment can grant
exactly one entitlement, and prove it with an executable test suite.

TEST MODE only. No Razorpay Dashboard objects were created, no LIVE-mode
operation, no deployment, and no secret was read, printed or committed.

## Scope Constraints Honoured

- No Razorpay API call, product, plan, subscription or Dashboard webhook.
- No Edge Function deployment; no remote migration applied.
- No secret read back from the environment; the only secret in the test suite is
  a throwaway value generated inside the test.
- No change to the recurring-billing decision. 021 left Option A (Razorpay Plan
  + Subscription) versus Option B (application-managed Orders) open; 022 does not
  pre-empt it. F8 therefore remains **documented, not fixed** (see Residual Risk).

## The Two Defects That Made the Handler Non-Functional

Neither was a hardening nit; both meant the handler could never grant anything.

1. **F13 (discovered in 022).** `service_role` held **no** privilege at all on
   `public.entitlements`. Even a perfect handler writing a correct row would have
   failed with `42501 permission denied for table entitlements`. This is why
   021's F1 was not the only blocker — 021 could not see the grant failure
   because the audit only reached the request path, never a write path.
2. **F2.** The ledger wrote "processed" *before* doing the work, so the first
   transient failure was remembered as a permanent success. Retries were
   acknowledged as duplicates and the payment was silently dropped.

## Requirements Implemented

| # | Requirement | Where |
|---|---|---|
| 1 | `payment.captured` carries no `order` entity and must still resolve (F1) | `events.ts` `resolvePurchaseIdentity`, `fetchOrderNotes`; `index.ts` `resolveGrantIdentity` |
| 2 | Identity is resolved from the relationships that exist: embedded order → payment notes → order fetched from the Razorpay API (F1) | `events.ts` `resolvePurchaseIdentity` |
| 3 | `payment.authorized`, `payment.failed` and every unknown event are acknowledged with 200 and never touch entitlements (F4) | `events.ts` `classifyEvent`; `index.ts` `processEvent` |
| 4 | Only a payment that is actually captured may grant (F4) | `events.ts` `assertPaymentCaptured` |
| 5 | The event is claimed before any work and marked completed only after it succeeds (F2) | `ledger.ts`; migration `20260926140000` |
| 6 | `notes` arrives as an object, `[]` or absent; it is normalized defensively | `events.ts` `normalizeNotes`, `asString`, `asNumber` |
| 7 | Paid amount and currency must equal the catalogue price before any grant (F6) | `events.ts` `assertPaymentMatchesProduct` |
| 8 | Rows are derived from the catalogue and the payment state, never trusted from the payload; no PII in a provider-reference column (F7) | `events.ts` `buildEntitlementRow`, `buildRevocationPatch` |
| 9 | Only completed work returns 2xx; permanent failures answer 4xx, transient 5xx | `index.ts` `handleRequest` |
| 10 | No secret is logged, echoed or included in a response body | `index.ts` |
| 11 | Credentials come from environment secrets only (F11 boundary) | `index.ts` `readConfig`, `events.ts` `fetchOrderNotes` |
| 12 | The ledger stores opaque event identifiers only — no payload, no credentials | migration `20260926140000` |

## Finding Disposition

| Finding | Severity in 021 | Disposition |
|---|---|---|
| F1 no order entity on `payment.captured` | CRITICAL | **Fixed** — three-tier identity resolution incl. order fetch |
| F2 marked processed before working | CRITICAL | **Fixed** — claim/complete/fail ledger with a 5-minute lease and compare-and-swap |
| F3 `product` key does not match the catalogue | CRITICAL | **Fixed** — catalogue ids everywhere; column default dropped; legacy rows remapped; desktop reader rewritten |
| F4 `payment.authorized` grants an entitlement | CRITICAL | **Fixed** — classified as log; grants require `captured === true` **and** `status === "captured"` |
| F5 silent default downgrades lifetime to monthly | HIGH | **Fixed** — no default product; unknown or ambiguous notes are refused (422) |
| F6 no amount/currency verification | HIGH | **Fixed** — exact match against the catalogue entry, 422 otherwise |
| F7 `provider_customer_ref` stores PII | HIGH | **Fixed** — `cust_...` customer id, else the payment id; never email or contact |
| F8 "monthly" is a one-shot 30-day pass | HIGH | **Not fixed by design** — requires the Option A/B decision; monthly remains 30 days from the grant |
| F9 unguarded `payment` access | MEDIUM | **Fixed** — every field read is type-checked; non-payment events cannot crash the handler |
| F10 never revoked on refund | MEDIUM | **Fixed** — `refund.processed` revokes via `provider_payment_ref`; partial refunds are recorded, not revoked |
| F11 hand-rolled constant-time compare | MEDIUM | **Fixed** — `crypto.subtle.importKey` + `crypto.subtle.verify` |
| F12 no replay-window validation | MEDIUM | **Fixed** — 24h delivery window, 5m forward clock-skew tolerance |
| **F13** `service_role` had no `entitlements` privilege | **CRITICAL (022)** | **Fixed** — explicit `insert, update, select` grant, never `delete` |

## Files Changed

- `supabase/functions/razorpay-webhook/ledger.ts` — **new.** Idempotency claim
  state machine, isolated from HTTP and from the database driver: a `LedgerStore`
  port with a memory implementation and a Supabase/PostgREST implementation. The
  "exactly one grant per logical event" property is a unit-testable decision, not
  an aspiration.
- `supabase/functions/razorpay-webhook/events.ts` — pure parsing, event
  classification, identity resolution, price verification, row building. Fixed
  `subjectIdFor`, which unwrapped `payload.payload` a second time and therefore
  always returned `undefined`, silently downgrading every event id to a body
  digest. Fixed F7 (PII in `provider_customer_ref`).
- `supabase/functions/razorpay-webhook/index.ts` — HTTP, configuration and
  Supabase wiring only. Trust-boundary comments state the 2xx/4xx/5xx contract
  and the F13 grant.
- `supabase/migrations/20260926140000_razorpay_webhook_hardening_022.sql` — the
  ledger columns, status check constraint, backfill, service-role grants, the
  `product` default removal and remap, and the catalogue-aware
  `public.admin_users()`.
- `supabase/tests/webhook-hardening.test.mjs` — **new.** 111 tests.
- `apps/desktop/src-tauri/src/account.rs` — entitlement read path (see below).
- `PROGRESS.md` — this entry's status record.

## The Desktop Reader Was Also Broken — Twice

`fetch_entitlement` queried `product=eq.soravo`, a value no row holds after
migration `20260926140000` remapped the catalogue, so **every** desktop user
would have been shown as unentitled even with a perfectly working webhook.

It also had a latent second bug: `EntitlementInfo.active` is a required
`bool` with no `#[serde(default)]`, but the query never selects an `active`
column — the table has none. Deserialization of a projected row would have
failed outright.

Fixed:

- query `product=in.(soravo_monthly,soravo_lifetime)`;
- `#[serde(default)]` on the client-computed `active` field;
- new `select_primary_entitlement`, because `.next()` on a multi-row response
  made the answer depend on row order. Ranking, highest first: a currently
  **valid** row, then **lifetime over monthly** (matching `admin_users()`), then
  most recently updated. A refunded lifetime row therefore cannot hide an active
  subscription.

## Verification

### Executed

- `pnpm test:supabase` — **123 passed, 0 failed** (2 files: 12 pre-existing
  migration-guard tests + 111 new webhook-hardening tests, ~300ms).
- Entitlement ranking logic compiled and executed in an isolated harness:
  **9 passed, 0 failed**. Necessary because `apps/desktop/src-tauri` does not
  currently compile for reasons unrelated to this task (52 pre-existing errors in
  `soravo_stt`, `model`, `tray_i18n`, `download`); the harness ran the code
  copied verbatim from `account.rs`.
- **Mutation check** — to prove the suite is not vacuous, two properties were
  deliberately broken and the suite re-run: reintroducing the `payload.payload`
  double-unwrap in `subjectIdFor` and making the ledger lease effectively
  infinite. Both were caught (5 failing tests), and both were reverted; the suite
  returned to green.

### How the tests are built

`index.ts` cannot execute under Node (Deno plus a remote ESM import), so its
invariants are asserted structurally against comment-stripped source: no
`"soravo"` product literal, no `?? "soravo..."` default, no
`payment.authorized` in a grant set, no `.delete()`, no `process.env`, no
`console.log`, and the ordering that makes the whole design work — signature
before parse, claim before work, capture and price before grant, completion after
work. Behavioural logic is imported and executed directly from the pure modules.

Catalogue parity is enforced by parsing
`services/license-api/src/payment/catalog.ts` and failing on any drift in id,
plan, displayName, amountMinor or currency, so the Edge Function's deliberate
duplicate of the price authority cannot rot silently.

## Residual Risk

- **F8 stands.** Monthly is a 30-day window from the grant with no renewal,
  stacking or proration. This is not a bug in the webhook; it is the mechanical
  evidence that the recurring model is undecided. It is the strongest reason the
  Option A/B decision is now the blocking item.
- **The SQL store is unverified against a live database.** The ledger's
  compare-and-swap is proven against the memory store; the PostgREST
  implementation (`.eq("status", expected).eq("claimed_at", expected)`) is
  verified by inspection and by the migration contract tests only. Two concurrent
  deliveries of the same event have not been exercised against real Postgres.
- **`grantEntitlement` re-reads before writing.** A re-delivered event with a
  different ledger key would upsert and reset `starts_at`, discarding remaining
  monthly time. The `provider_payment_ref` equality check guards the same-payment
  case; the different-key case is not covered.
- **Unknown event types are acknowledged, not routed.** `refund.failed`,
  `dispute.*` and `subscription.*` return 200 without action. That is the safe
  default for F9, but disputes remain unhandled by design.
- **Desktop offline cache** stores whatever `select_primary_entitlement` chose at
  fetch time; it is not re-evaluated against the clock while offline.

## Deployment Status

**Not deployed.** Nothing in this task was applied to a remote project: no
migration was run, no function was deployed, and no webhook URL exists yet. The
`grant` path additionally depends on `RAZORPAY_WEBHOOK_SECRET` being set, which
per task 020 it is not.

## Exact Next User Action (required, cannot be inferred)

1. Choose **Option A** (Razorpay Plan + Subscription) or **Option B**
   (application-managed recurring Orders). F8 and all subscription event
   coverage wait on this.
2. Authorize a deployment task: apply `20260926140000` to the Supabase project,
   set `RAZORPAY_WEBHOOK_SECRET`, and deploy the function.
3. Confirm International Payments enablement and INR settlement for the
   USD-priced catalogue (carried forward from 021, still open).

## Exact Next OpenCode Task

**RAZORPAY-WEBHOOK-DEPLOYMENT-023** — apply the migration, set the webhook
secret, deploy the Edge Function, and replay one TEST-mode `payment.captured`
and one `refund.processed` to confirm the claim/complete ledger against a real
database. Still no LIVE mode and no Dashboard recurrence objects until the A/B
decision.

## Files Changed

- `supabase/functions/razorpay-webhook/ledger.ts` (new)
- `supabase/functions/razorpay-webhook/events.ts`
- `supabase/functions/razorpay-webhook/index.ts`
- `supabase/migrations/20260926140000_razorpay_webhook_hardening_022.sql`
- `supabase/tests/webhook-hardening.test.mjs` (new)
- `apps/desktop/src-tauri/src/account.rs`
- `PROGRESS.md`

## Tests Executed

- `pnpm test:supabase` — 123 passed / 0 failed
- Isolated entitlement-ranking harness — 9 passed / 0 failed
- Mutation check (2 deliberate regressions) — both detected, then reverted
- No secret exposure in any file, log or output

## Verified Items

- Every 021 finding F1–F12 is either fixed with a test or explicitly carried
  forward as a decision blocker (F8).
- F13 (`service_role` had no `entitlements` privilege) is fixed in the same
  migration that adds the ledger.
- Exactly-once grant is proven as a state-machine property, not asserted.
- The webhook's catalogue mirror cannot drift from the licence catalogue.
- The desktop entitlement read is correct for users holding monthly, lifetime or
  both.

## Blocked Items

- Recurring model A vs B — user decision required (blocks F8, subscription
  events, and all recurrence work).
- Remote migration, secret configuration, function deployment, Dashboard webhook
  creation — require a deployment task and Supabase access.
- `apps/desktop/src-tauri` does not compile (52 pre-existing errors in unrelated
  modules), so `cargo test` cannot run the crate; the entitlement logic was
  verified in isolation instead.

## Not Executed Items

- Any Razorpay API call, Dashboard object, LIVE-mode operation or deployment.
- Any remote database migration.
- An end-to-end TEST payment (deliberately deferred to 023 so the result is not
  confounded by an unapplied migration and an unset secret).
