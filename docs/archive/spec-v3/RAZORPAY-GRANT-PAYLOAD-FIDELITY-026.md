# RAZORPAY-GRANT-PAYLOAD-FIDELITY-026

**Date:** 2026-09-27
**Status:** COMPLETE (offline; no live credential, no deploy, no commit)
**Findings closed:** F25-5, F25-6
**Baseline:** 130 tests passing before this task · **Final:** 178 tests passing

---

## 1. Summary

Two payload-fidelity defects in the Razorpay webhook meant the handler disagreed
with Razorpay's own published webhook documentation. Both were found **without a
single live API call**, by transcribing Razorpay's documented payloads into test
fixtures and asserting the handler against them.

| Finding | Defect | Impact | Status |
|---|---|---|---|
| **F25-5** | `assertPaymentCaptured` required `captured === true` | Every documented **subscription** charge was rejected with `422 payment is not captured (status=captured)` — a self-contradictory message. Revenue-affecting for all recurring billing. | **FIXED** |
| **F25-6** | The `renew` branch required a captured payment | Every `subscription.resumed` delivery was rejected `422 payment entity missing for a success event`. The documented payload has **no** payment entity. | **FIXED** |

The unifying lesson: **the previous 130-test suite contained zero fixtures derived
from Razorpay's documentation.** Every payload was authored by this project, so
the suite could only ever confirm that the handler agreed with itself. Both bugs
were invisible for exactly that reason.

---

## 2. Evidence base (all offline)

Primary sources, pinned to `razorpay/markdown-docs@master`:

| Source | Used for |
|---|---|
| `webhooks/subscriptions.md` | `charged`, `activated`, `pending`, `halted`, `paused`, `resumed`, `cancelled`, `completed` |
| `webhooks/orders.md` | `order.paid` |
| `webhooks/payments.md` | `payment.captured`, `payment.failed` |
| `webhooks/refunds.md` | `refund.processed` |

No Razorpay API key was used. No secret was read. No Dashboard was opened. No
Edge Function was deployed. No database migration was authored.

### 2.1 The documented event matrix

Every value below is transcribed from Razorpay's own samples. `hasPayment` is
whether Razorpay includes a `payment` entity in the payload.

| Event | `contains[]` | `hasPayment` | `captured` form | Handler action |
|---|---|---|---|---|
| `order.paid` | `["payment","order"]` | yes | `true` (boolean) | `grant` |
| `payment.captured` | `["payment"]` | yes | `true` (boolean) | `grant` |
| `payment.authorized` | `["payment"]` | yes | `true` (boolean) | `log` |
| `payment.failed` | `["payment"]` | yes | **`true` (boolean)** | `log` |
| `subscription.charged` | `["subscription","payment"]` | yes | **`"1"` (string)** | `grant` |
| `subscription.completed` | `["subscription","payment"]` | yes | **`"1"` (string)** | `log` |
| `subscription.activated` | `["subscription"]` **and** `["subscription","payment"]` | **varies** | `"1"` when present | `log` |
| `subscription.updated` | `["subscription"]` | no | — | `log` |
| `subscription.pending` | `["subscription"]` | no | — | `log` |
| `subscription.halted` | `["subscription"]` | no | — | `cancel` |
| `subscription.paused` | `["subscription"]` | no | — | `cancel` |
| `subscription.resumed` | `["subscription"]` | no | — | `subscription-state` |
| `subscription.cancelled` | `["subscription"]` | no | — | `cancel` |
| `subscription.authenticated` | `["subscription"]` | no | — | `log` |
| `refund.processed` | `["refund","payment"]` | yes (partial) | `true` (boolean) | `revoke` (guarded) |

Three consequences drove the implementation:

1. **`captured` has two documented serialisations.** `"1"` across the whole
   subscription family, `true` across payments/orders/refunds. A single strict
   comparison cannot be correct for both.
2. **`captured: true` appears on a *failed* payment.** Razorpay's documented
   `payment.failed` sample ships `status: "failed"` alongside `captured: true`,
   because the flag is a snapshot of an earlier transition. The status check is
   therefore load-bearing, not redundant.
3. **Only `subscription.charged` is a new charge.** `subscription.completed` is
   the *final* charge and Razorpay already delivered it as `.charged`; handling
   it risks a second grant for the same money. `subscription.activated` fires
   around failed and unpaid charges, so it must not grant.

---

## 3. F25-5 — `captured` flag normalisation

### 3.1 Root cause

```ts
// before
if (payment.captured !== true || payment.status !== "captured") { /* 422 */ }
```

Razorpay documents `captured: "1"` for subscriptions. A strict `!== true` rejects
the string. The error message then read `payment is not captured (status=captured)`
— flag and status in the same sentence, contradicting each other.

### 3.2 Fix

`normalizeCapturedFlag` returns a **closed whitelist**, not a truthiness test.

| Input | Classification | Rationale |
|---|---|---|
| `true` | `captured` | documented boolean (payments/orders/refunds) |
| `"1"` | `captured` | documented string (subscriptions) |
| `1` | `captured` | numeric variant, accepted defensively |
| `false` / `"0"` / `0` | `uncaptured` | documented not-captured forms |
| `undefined` | `unknown` / `absent` | absence is **not** captured |
| `null` | `unknown` / `null` | — |
| `"true"`, `"yes"`, `"captured"`, `" 1"`, `"1 "`, `2`, `-1`, `"2"`, `[]`, `{}`, `[1]`, `"01"` | `unknown` | **attacker-controlled field — never widen the accept-set** |
| any other | `unknown` | — |

Two conditions are still required, in order:

1. `normalizeCapturedFlag(payment.captured).state === "captured"`
2. `payment.status === "captured"`

Unrecognised values are echoed **truncated** (`describeCapturedValue` bounds the
length) so a 5 KB payload field cannot bloat a log line or a 422 body.

### 3.3 Why a truthiness test is not acceptable

`Boolean(value)` or `if (value)` would accept every row in the `unknown` group —
including `"true"`, `2`, `[]` and `{}`. An attacker who can influence the captured
field gains an entitlement **without money**. The accept-set is a whitelist
precisely because this field is not trustworthy in isolation; the status check
is the independent second condition.

---

## 4. F25-6 — `subscription.resumed` is a lifecycle transition

### 4.1 Root cause

The old `renew` branch called `assertPaymentCaptured` and derived identity and
amount from a payment. Razorpay's documented `subscription.resumed` payload is:

```jsonc
"contains": ["subscription"]     // no payment entity
```

So every real resume delivery died with `422 payment entity missing for a
success event`. The branch could never have worked.

### 4.2 The decisive evidence

Razorpay documents a `paused` and a `resumed` sample for the **same
subscription** (`sub_FeQ9WWOjGUZMpG`). Diffed field by field:

| Field | `paused` | `resumed` | Changed |
|---|---|---|---|
| `status` | `paused` | `active` | **yes** |
| `charge_at` | `null` | `1602959400` | **yes** |
| `current_start` | `1600416437` | `1600416437` | no |
| `current_end` | `1602959400` | `1602959400` | no |
| `paid_count` | `1` | `1` | **no** |
| `remaining_count` | `4` | `4` | no |
| `total_count` | `5` | `5` | no |
| payment entity | absent | absent | no |

**`paid_count` does not rise and `current_end` does not move.** Resuming moves no
money and opens no new billing period; it re-arms `charge_at` for the next
scheduled charge and flips `status` back to `active`. This pair is asserted
directly in the suite (`P. the paused and resumed samples differ ONLY in status
and charge_at`) so that if Razorpay ever changes the semantics, the decision
below must be revisited rather than silently inherited.

### 4.3 Fix

`subscription.resumed` → `EventAction` `"subscription-state"` (replacing
`"renew"`). The branch:

- resolves **only** the subscription id and the `status` field;
- requires `status === "active"` — a replayed pause/halt/cancel, or a garbled
  delivery, cannot resurrect a cancelled subscription;
- looks the entitlement up by `provider_subscription_ref` with `maybeSingle()`,
  mirroring `cancelEntitlement`;
- writes a **frozen, single-key** patch: `{ status: "active" }`;
- fabricates nothing: `data: null` → no `user_id`, no `plan`, no window, no
  payment reference. Acknowledged `200` for observability only;
- is a no-op when the row is already active.

`renewEntitlement` is deleted. It was the only code path that could fabricate a
renewal payment reference.

### 4.4 Divergence from `PROGRESS.md` (deliberate, and evidenced)

`PROGRESS.md:1198-1202` prescribed:

> *"Resolve identity from the `subscription` entity's `notes` and **extend the
> monthly window from the resume**"*

**This was not implemented, because the provider evidence contradicts it.** The
documented paused→resumed pair shows `current_end` and `paid_count` **unchanged**,
so the customer's existing paid period is still intact and still valid. Extending
`expires_at` by another 30 days on resume would hand out ~60 days for one payment
— a silent revenue leak, and the exact class of bug F25-6 exists to prevent.

The narrower instruction in the same task block — *"Drop the amount check rather
than weaken it — resume is a state transition, not a payment"* — is what was
implemented. Identity is likewise not read from `notes`: the resume is keyed on
`provider_subscription_ref`, which is the same lookup `cancelEntitlement` uses and
does not depend on attacker-visible note content.

This supersession is recorded here rather than left implicit in the diff.

---

## 5. The twelve entitlement invariants

The exact original I1–I12 wording was not persisted in the repository. The table
below is **this task's canonical enumeration**, stated explicitly so a reviewer
can falsify each one independently. Each row names the test that proves it.

| # | Invariant | Proven by |
|---|---|---|
| **I1** | A grant requires a captured payment. | `R/I1` — `payment.authorized` is `log`; documented `payment.failed` throws |
| **I2** | An authorized-but-flagged-captured payment still cannot grant. | `R/I2` — `status: "authorized"` + `captured: true` throws |
| **I3** | Identity is required; no default user, no default product. | `R/I3` — empty notes → `unresolved`; no `?? "soravo"` fallback in source |
| **I4** | A non-uuid `user_id` is refused. | `R/I4` |
| **I5** | Paid amount must equal the catalogue price exactly. | `R/I5` — off-by-one minor unit throws `amount mismatch` |
| **I6** | An unsupported currency is refused, never coerced. | `R/I6` — `GBP` throws `currency not supported` |
| **I7** | `plan`, `status` and `expires_at` come from the catalogue, never the payload. | `R/I7` — a spoofed `{plan:"lifetime",status:"revoked"}` override is ignored |
| **I8** | A partial refund does not revoke access. | `R/I8`, `P/keeps a partial refund non-revoking` — documented `50000 < 500000`, `refund_status: "partial"` |
| **I9** | A cancelled subscription is a lifecycle change, never a destructive delete. | `R/I9` — no `.delete()` anywhere in the handler; `.cancelled` → `cancel` |
| **I10** | A halted subscription receives no new billing period. | `R/I10` — cancel branch contains no `expires_at`, no `buildEntitlementRow` |
| **I11** | A paused subscription receives no fabricated renewal. | `R/I11` — cancel branch contains no `upsert(` |
| **I12** | A resumed subscription fabricates no payment and no new period. | `R/I12` — asserted at three levels: action, patch keys, branch body |
| — | *(cross-check)* exactly one call site may write a paid window. | `R/cross-checks` — one `buildEntitlementRow(` call, one `await grantEntitlement(`, both on the grant path |

`P`, `O` and `S` provide the supporting evidence: the documented event matrix,
the captured accept-set, and the security regressions.

---

## 6. New test coverage

| Section | Purpose | Tests |
|---|---|---|
| **O** | `captured` normalisation: accept-set, refusals, truncation, 422 diagnostics, documented `charged`/`order.paid`/`payment.failed` | 7 |
| **P** | Documented event matrix: classification of all 11 subscription samples, the paused/resumed field diff, partial refund, end-to-end identity + price resolution for `subscription.charged` and `order.paid` | 8 |
| **Q** | `subscription.resumed` lifecycle-only: resolution without payment, the pre-fix counterexample, status contradiction refusal, patch shape, branch purity, `renewEntitlement` removal | 9 |
| **R** | The twelve invariants I1–I12 + cross-check | 13 |
| **S** | Security regressions: forged captured values, tampered amount, missing identity, payment-injected resume, unknown-subscription resume, idempotency, replay window, no secret/PII logging | 8 |
| | **Total new** | **47** |

Result: `130 → 178` passing (`166` webhook + `12` migration).

### 6.1 Fixture provenance discipline

Fixtures are split by provenance and labelled in the file:

- **`RAZORPAY_DOCUMENTED`** — transcribed from Razorpay's samples.
- **`SORAVO_SYNTHETIC`** — the only deliberate deviations, each marked inline:
  1. **PII dropped.** Demo `email`, `contact`, `card{}`, `acquirer_data` fields are
     removed. They carry no assertion and the repository has a standing no-PII rule.
  2. **Identity and amount overlaid.** Documented demo values are replaced with
     Soravo's own (`notes.user_id`, `notes.product_id`, catalogue INR price) so a
     fixture can drive the real grant path end to end.

**The disputed `captured` field is never overlaid.** It is always Razorpay's
documented value — that is the entire point of the fixture.

### 6.2 The pre-fix counterexample

`Q/counterexample` pins the F25-6 failure mode as an assertion rather than
leaving it implicit: calling `assertPaymentCaptured` on the documented resumed
payload throws `422 payment entity missing`. This documents *why* the handler
must not take that call, so a future refactor reintroducing it is caught.

---

## 7. Mutation proof

Both fixes were verified by reverting them and confirming the suite goes red,
then restoring both and confirming green.

| # | Mutation | Result |
|---|---|---|
| **1** | Replace `normalizeCapturedFlag` with the old strict `captured === true` | **KILLED** — 3 failures (174/177), including `O/grants on the documented subscription.charged payload` and the end-to-end price-resolution test. Failure message: `WebhookError: payment is not captured (captured=mutant, status=captured)` |
| **2** | Reintroduce `assertPaymentCaptured` into the `subscription-state` branch | **KILLED** — 2 failures (175/177), both naming the exact defect: `expected 'action === "subscription-state") {...' not to contain 'assertPaymentCaptured'` |
| — | Both restored | **GREEN** — 178/178 |

Source files were byte-verified identical to their pre-mutation state after
restore (`diff -q` clean for both `events.ts` and `index.ts`).

---

## 8. Test and verification commands

```bash
pnpm test:supabase     # 178 passed (166 webhook-hardening + 12 migration-guard)
```

No network, no credentials, no LIVE-mode calls. The webhook tests exercise
`events.ts` directly plus structural assertions on `index.ts` (the established
convention in this suite — `index.ts` calls `Deno.serve` at module scope and is
not importable under Vitest).

---

## 9. Remaining risks (deliberately not fixed here)

These are recorded, not silently deferred. Each is out of 026's stated scope.

### 9.1 Cancellation semantics contradict ADR-012 — **most significant**

ADR-012 documents that a **cancelled** subscription keeps access through the paid
period. But `subscription.paused`, `.halted` **and `.cancelled`** are all
classified `cancel`, and `cancelEntitlement` calls:

```ts
buildRevocationPatch(identity.plan, nowIso)   // sets expires_at = now
```

which **immediately** expires the row. So a customer who cancels mid-period loses
access at once, contradicting the documented ADR-012 policy. This is a real
policy/implementation divergence, surfaced by this task's event-matrix work.

**Not fixed here:** changing cancellation semantics is a business-policy decision
that would also require deciding whether pause/halt and cancel should share a
code path at all. It is flagged for a dedicated task.

### 9.2 `subscription.activated` with a payment is treated as `log`

Razorpay documents **both** a payment-carrying and a payment-less
`subscription.activated`. The first variant is a genuine first charge, but the
event is also emitted around failed and unpaid charges — so granting on the event
name alone would grant for money that never arrived. Current handling logs it and
relies on the accompanying `subscription.charged` for the actual grant. This is
deliberate and covered by `P/never grants from a subscription event that
documents no payment entity`, but it is worth a real-payment smoke test in 027
to confirm `activated` is never the *only* signal for a first charge.

### 9.3 `status: "active"` on resume does not restore a lapsed window

A resume sets `status = "active"` and nothing else. If the paid period had
already elapsed, `expires_at` is unchanged and the read-time validity check in
ADR-012 still treats the entitlement as expired. That is correct under the
lifecycle-only decision (§4.4) but produces a row that is `active` *and*
expired — a combination operators may misread when reconciling by hand.

### 9.4 Structural rather than behavioural proof for the resume branch

`index.ts` cannot be imported under Vitest (`Deno.serve` at module scope, top-level
`createClient`), so the resume branch is verified by source inspection plus
`Q/counterexample`, which demonstrates the runtime failure mode of the old design.
Mutation 2 is therefore killed *structurally*. A behavioural proof would require
extracting `processEvent` into a testable module — a worthwhile refactor, but
outside this task.

---

## 10. Files changed

| File | Change |
|---|---|
| `supabase/functions/razorpay-webhook/events.ts` | `CapturedFlag` + `normalizeCapturedFlag` + `describeCapturedValue`; `assertPaymentCaptured` requires flag **and** status; `EventAction` `"renew"` → `"subscription-state"`; `.resumed` → state; `isSubscriptionStateEvent`, `SubscriptionResume`, `resolveSubscriptionResume`, frozen `SUBSCRIPTION_RESUME_PATCH` |
| `supabase/functions/razorpay-webhook/index.ts` | `recordSubscriptionResume` (status-only, subscription-keyed, `maybeSingle`); renew branch replaced; `renewEntitlement` deleted; three contradicting comments corrected (F25-7, F25-8, F25-9) |
| `supabase/tests/webhook-hardening.test.mjs` | +47 tests (§O–§S); documented fixtures with `RAZORPAY_DOCUMENTED` / `SORAVO_SYNTHETIC` provenance labels |
| `docs/spec-v3/RAZORPAY-TEST-TOOLING-019.md` | Annotated: `payment.authorized` activation claim, the "same as captured" mapping row, the Active Events list, and both renewal bullets |
| `docs/spec-v3/RAZORPAY-MCP-AUDIT-018.md` | Annotated: stale "Webhook handler — NOT STARTED" row superseded; F25-5/F25-6 recorded as offline findings |
| `docs/spec-v3/RAZORPAY-GRANT-PAYLOAD-FIDELITY-026.md` | This report (**new file**) |
| `PROGRESS.md` | Task marked complete, next task set to 027 |

**No migration was authored.** The status-only patch touches columns that already
exist, so no schema change is required.

---

## 11. Final status

| Item | State |
|---|---|
| F25-5 | **FIXED** — closed accept-set, both checks retained |
| F25-6 | **FIXED** — lifecycle-only, status-only patch |
| Comment corrections | **3/3** (F25-7, F25-8, F25-9) |
| 019/018 annotated | **Yes** — both |
| Tests | **178 passed**, 0 failed (was 130) |
| Mutation proof | **2/2 killed**, green on restore |
| Migration | **None** — not required |
| Edge Function deployed | **No** — offline task, by instruction |
| Credentials rotated | **No** — no secret was read or required |
| LIVE-mode traffic | **None** |
| Commit created | **No** — not requested |

### Next task

**`RAZORPAY-TEST-PAYMENT-SMOKE-027`** — the first live TEST-mode delivery. It
only becomes meaningful now: with F25-5 and F25-6 fixed, a 422 can no longer be
an artefact of our own payload handling, so a failure is genuinely diagnostic.
Working TEST key → `GET /v1/webhooks` confirms URL and the 8 subscribed events →
one real TEST payment per state transition (₹1 lifetime, monthly charge,
pause/resume, cancel, refund).
