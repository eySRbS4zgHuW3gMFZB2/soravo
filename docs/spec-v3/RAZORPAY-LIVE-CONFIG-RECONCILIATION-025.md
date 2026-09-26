# RAZORPAY-LIVE-CONFIG-RECONCILIATION-025

**Task**: 025 — resolve the blocker left by `RAZORPAY-LIVE-CONFIG-VERIFICATION-024`
(F24-2: "the Razorpay Dashboard subscribed event list is unconfirmed because the
stored TEST API credentials were rejected by `GET /v1/webhooks`").

**Date**: 2026-09-27
**Mode**: normal OpenCode build. No swarm, no subagents. TEST mode only. No LIVE
operation. No credential rotation. No Razorpay object created, modified or
deleted. No secret value printed, logged or committed.

**Instruction followed**: "Do not assume the webhook configuration is wrong.
Determine the actual cause." The actual cause is **not** the webhook
configuration. It is (a) a server-side revocation of the stored TEST key, and
(b) two independent payload-fidelity defects in the current handler that would
break the very first real subscription charge even once a working key exists.

---

## 0. Executive summary

| Question | Answer |
|---|---|
| Does the current TEST credential authenticate? | **NO** — `401 Authentication failed` |
| Is the stored credential the "current" one, or a stale leftover? | **It is the current one.** It is byte-identical to the credential that authenticated `HTTP 200` on 2026-09-26T16:14Z. It was revoked/rotated **server-side in Razorpay** after that. |
| Is there a second, already-configured credential to switch to? | **No.** There is exactly one complete key pair on this machine. |
| Does the Razorpay webhook exist / match the deployed URL? | **STILL UNVERIFIABLE.** Requires a working key. Not guessed. |
| Actual configured event list | **UNKNOWN.** Not guessed. |
| Required events that are missing | **Cannot be stated** — the "configured" column is unverifiable. Two of the eight required handlers are provably broken in code (below). |
| Is the Supabase secret name correct? | **YES** — `RAZORPAY_WEBHOOK_SECRET`, proven behaviourally. |
| Is the endpoint ready for the first real TEST checkout? | **NO.** Three independent blockers: dead credential, unverifiable Dashboard subscription, and two code defects. |
| Exact next task | **`RAZORPAY-GRANT-PAYLOAD-FIDELITY-026`** |

**The single most important finding of this task is not the credential.** It is
that the grant path is tested only against payload fixtures the project wrote
itself, never against Razorpay's own published payloads. When those two sources
are compared, the recurring-billing path is broken. Details in §5.

---

## 1. STEP 1 — Credential-source audit

No value is printed anywhere. Classification only.

### 1.1 Sources found

| # | Source | Configured | Mode | Key-ID prefix | Stale / inconsistent? | Credential source secure? |
|---|---|---|---|---|---|---|
| 1 | `services/license-api/.env.local` | **YES** — 3 keys present | **TEST** | `rzp_test_` | **STALE — rejected by Razorpay (401).** See §1.2 | Gitignored (`.gitignore:14` → `.env.*`), untracked. **But file mode is `664` (group- and world-readable).** |
| 2 | license-api **runtime** | **NO** | — | — | Nothing consumes `.env.local`. `grep` for `process.env` / `Deno.env` across `services/license-api/src/` returns **zero** hits. Credentials are passed programmatically into `createPaymentProvider({...}, nodeEnv)` (`services/license-api/src/payment/provider-factory.ts:15-23`), and `RazorpayProvider` takes them from its constructor config (`razorpay-provider.ts:29-41`). The file is a **reference copy only** — no dotenv loader, no `dotenv` dependency, no `loadEnv` call anywhere. | n/a |
| 3 | **Razorpay CLI** | **NOT CONFIGURED** | — | — | No `razorpay`/`rz` binary on `PATH`; no `~/.razorpay`, `~/.config/razorpay`, `~/.razorpayrc`; no global npm Razorpay package. `RAZORPAY-TEST-TOOLING-019` §"Razorpay CLI → `~/.razorpay/config.yaml`" describes a store that does not exist. | n/a |
| 4 | **Razorpay MCP** | **NOT CONFIGURED** | — | — | `~/.config/opencode/opencode.jsonc` registers exactly four MCP servers — `github`, `supabase`, `cloudflare`, `testsprite`. There is **no `razorpay-mcp` entry**. `RAZORPAY-MCP-AUDIT-018` §10 *proposed* the config; it was never added. The `.opencode/` and `~/.config/opencode/` trees contain zero `razorpay` matches. | n/a |
| 5 | Shell environment | **NOT CONFIGURED** | — | — | No `RAZORPAY_*` in `env`. No `razorpay` match in `~/.bashrc`, `~/.profile`, `~/.bash_profile`, `~/.zshrc`, `/etc/environment`, or `~/.config/environment.d/` (which does not exist). | n/a |
| 6 | Supabase Edge Function secrets | **CONFIGURED (behaviourally only)** | unknown | unknown | `index.ts:78-79` reads `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` as **optional** (they only enable the order-fetch fallback in `resolveGrantIdentity`). Existence cannot be listed: `supabase secrets list` → `AccessTokenRequiredError` (no `SUPABASE_ACCESS_TOKEN`, no `~/.supabase/credentials`). If the stored TEST key was revoked in the Dashboard and the function secret still holds the old pair, the fallback is silently dead (`fetchOrderNotes` returns `{ok:false, reason:"not_configured"}` only for empty strings — a *rejected* pair returns `transient`, which `index.ts:365-366` escalates to **HTTP 500**). | Platform secret store, write-only. Value never read. |

### 1.2 Is the failed `/v1/webhooks` request using the current TEST credential?

**Yes. It is the current one, and the cause is a server-side revocation — not a
stale local file.**

Three independent pieces of evidence, in order of strength:

1. **The file has not been edited since the last successful authentication.**
   `services/license-api/.env.local` has `mtime = 2026-09-26 16:02:29 UTC`. The
   2026-09-26 authentication test (`RAZORPAY-AUTHENTICATION-CHECK-020`) ran at
   `2026-09-26T16:14:22Z` per `.swarm/session/shell-audit.jsonl` — *after* that
   mtime — and returned `HTTP 200` while creating order `order_TgjAxRnwBzqIOF`.
   The bytes that authenticated are the bytes on disk now.

2. **The file is byte-clean.** No CRLF (`CR count = 0`), no BOM (first 3 bytes
   `23 20 4c`), no leading whitespace on any value, terminal newline present.
   The malformed-file explanations for a 401 are all excluded.

3. **Razorpay cannot distinguish it from garbage.** Discriminator probes against
   `GET /v1/webhooks` (read-only, TEST host):

   | Probe | HTTP | Body |
   |---|---|---|
   | No credentials at all | `401` | `Please provide your api key for authentication purposes` |
   | Deliberately wrong key pair | `401` | `Authentication failed` |
   | **Stored `.env.local` credential** | **`401`** | **`Authentication failed`** |
   | Stored credential, `GET /v1/payments?count=1` | `401` | `Authentication failed` |

   The stored credential produces the *identical* response to a fabricated key.
   There is no partial signal (no "account suspended", no "mode mismatch") to
   recover. The key is simply not valid.

### 1.3 Credential inconsistency found in the workspace

Three real-shaped `rzp_test_` tokens exist across the tree. Compared by
SHA-256 prefix so no value is reproduced:

| Token hash | Class | Locations | Interpretation |
|---|---|---|---|
| `52900e31eda6` | real-shaped | `services/license-api/.env.local`, `PROGRESS.md` | **The active credential.** The one that worked on 2026-09-26 and is now rejected. |
| `9ccd0fa6f20d` | real-shaped | `docs/spec-v3/RAZORPAY-SECRET-VALUE-019C.md` (×2) | **Historical.** A *different* key. `019C` records `RAZORPAY_KEY_SECRET` as a 23-asterisk mask, i.e. the secret was still a placeholder at that point; between 019C and 020 the owner replaced the masked secret **and** changed the key id. Not a second live credential — no secret exists for it anywhere. |
| `89593c47451d` | **not a credential** | `.swarm/session/shell-audit.jsonl` | A **deliberately fake** key (`…AAAAAAAAAAAAAAAA:000000000000000000000000`) used by a prior session as a *control probe* to prove the endpoint rejects bad auth. Confirmed by reading the surrounding command. Not a leak, not a credential. |
| `d1bd5069b0c3`, `4d85eaaf864d` | placeholders | `RAZORPAY-TEST-TOOLING-019.md` | Documentation filler (`rzp_test_XXXX…`). |

**Conclusion**: there is no second usable credential to switch to. The "fix the
configuration to use the already-configured current TEST credential" branch of
STEP 1 is therefore **not available** — the only configured credential *is* the
dead one. Supplying a new TEST key is an owner action and cannot be inferred.

### 1.4 Credential-hygiene findings

| ID | Finding | Evidence | Status |
|---|---|---|---|
| **F25-1** | **A real Razorpay TEST key id was staged in the working tree, one `git add` from being committed.** | `PROGRESS.md:649` held it (unstaged; `git diff --stat` = 696 insertions). `git show HEAD:PROGRESS.md \| grep -c rzp_test_` = **0**, so it was *not yet* committed. `docs/spec-v3/RAZORPAY-SECRET-VALUE-019C.md` was untracked with 2 occurrences and would have been swept in by `git add docs/`. | ✅ **FIXED in this task.** Both sites redacted to a non-reversible descriptor (`rzp_test_` prefix + length + real-shaped flag). Re-verified: **0** real-shaped `rzp_test_` tokens remain in any tracked-source or docs file. See the re-verification note below. |
| **F25-2** | **`services/license-api/.env.local` was mode `664`** — group- and world-readable. | `stat -c %a` → `664`. | ✅ **FIXED in this task** → `600`. |
| **F25-3** | **`supabase/.temp/` was neither tracked nor gitignored.** | `git check-ignore supabase/.temp/pooler-url` → not ignored. `git status` showed all 9 `.temp/` files as `??`. `pooler-url` is a `postgres://` DSN (97 bytes, **no embedded password**); `linked-project.json` carries `ref`, `name`, `organization_id`, `organization_slug`. | ✅ **FIXED in this task** — `supabase/.temp/` added to `.gitignore:21`. Verified ignored, and `git status` now lists 0 `.temp` entries. |
| **F25-4** | `RAZORPAY-TEST-TOOLING-019` and `RAZORPAY-MCP-AUDIT-018` document CLI/MCP stores that **do not exist**. | §1.1 rows 3 and 4. | ⬜ **OPEN** — documentation-accuracy only. Low severity. Left for 026 to annotate, since it is a prose edit to an untracked report. |

**Re-verification after the redactions.** The three remaining
`rzp_test_[A-Za-z0-9]{12,}` matches in the tree are all in
`RAZORPAY-TEST-TOOLING-019.md` and were **confirmed to be filler**, not
credentials: the token is `rzp_test_` followed by **twelve repetitions of the
character `X`**. Its SHA-256 prefix is `d1bd5069b0c3`, distinct from both real
keys (`52900e31eda6`, `9ccd0fa6f20d`). No redaction applied — it is a
documentation placeholder and redacting it would destroy its meaning.

**No Razorpay key *secret* exists anywhere outside `services/license-api/.env.local`.**
Confirmed by scanning the working tree and git history. The `.swarm/` tree
(shell-audit log) is excluded via `.git/info/exclude`.

### 1.5 What a redaction does and does not achieve

Redaction removes the key id from version-controllable files. It does **not**
invalidate it. Because the key id is the Basic-auth *username* and it is
nonetheless published in this task's report, the owner should still treat it as
disclosed. However — per §2, the key is **already dead**, so disclosure has no
additional consequence: there is nothing left to use. This is why F25-1 is rated
MEDIUM and not CRITICAL, and why no rotation is needed for *it*.

---

## 2. STEP 2 — Razorpay API authentication

**Result: FAILS.** `401 BAD_REQUEST_ERROR — Authentication failed`, on both
`GET /v1/payments?count=1` and `GET /v1/webhooks`, using the credential in
`services/license-api/.env.local`.

Per the task's own instruction — *"If authentication fails: stop before creating
anything"* — **nothing was created**. No Order, Payment, Subscription, Plan,
Customer, Invoice or webhook was created, modified, listed beyond the two
read-only GETs above, or deleted. No `POST`/`PATCH`/`PUT`/`DELETE` was issued
against `api.razorpay.com` at any point in this task.

Per the same instruction, the run **stops at STEP 3** and does not proceed to any
step that requires a live Razorpay read. §3 documents that as an open blocker
rather than filling it in with a guess.

---

## 3. STEP 3 — Webhook configuration (BLOCKED, not guessed)

| Check | Result |
|---|---|
| Webhook exists | **UNVERIFIED** |
| TEST-mode webhook | **UNVERIFIED** |
| URL is exactly `https://zbzhlhoxblguepplqppw.supabase.co/functions/v1/razorpay-webhook` | **UNVERIFIED** |
| Webhook is active | **UNVERIFIED** |
| Subscribed events | **UNVERIFIED** |
| Duplicate webhook configurations | **UNVERIFIED** |

The only read path is `GET /v1/webhooks`, which needs a working key. The Razorpay
MCP cannot help: it is not configured (§1.1 row 4), and per
`RAZORPAY-MCP-AUDIT-018` §"Not Supported by MCP" it would not expose webhooks
anyway. The Dashboard UI is the only remaining route, and it is a human action.

**No webhook was created, edited or deleted.** Task 024's judgement still holds:
"Correcting a dead credential is an owner/credential-rotation action, not a code
action, and guessing at it risks stranding live subscriptions." Nothing here
overturns that.

What *is* established, and is new: **the endpoint this webhook would point at is
live, JWT-free, and signature-correct** (§6). So the unknown is confined to the
Dashboard side. The moment a working key exists, `GET /v1/webhooks` answers the
whole of §3 in one call.

---

## 4. STEP 4 — Required event matrix

**The required column is derived from the current code, not guessed.** Two
sources, both read in this task:

- `supabase/functions/razorpay-webhook/events.ts:162-169` — `classifyEvent`
- `supabase/functions/razorpay-webhook/index.ts:377-487` — `processEvent` branch
  preconditions

Razorpay payload shapes are taken from Razorpay's own published reference,
`razorpay/markdown-docs@master:webhooks/subscriptions.md`, fetched this task.

| Event | Required by code | Configured in Razorpay | Handler exists | Action needed |
|---|---|---|---|---|
| `payment.captured` | **YES** — `grant` | **UNVERIFIED** | Yes, `index.ts:399` | Subscribe. Subject to **F25-5**. |
| `order.paid` | **YES** — `grant` | **UNVERIFIED** | Yes, `index.ts:399` | Subscribe. Carries `payment` + `order`, so it is the most robust grant path. |
| `subscription.charged` | **YES** — `grant` | **UNVERIFIED** | Yes, `index.ts:399` | Subscribe. **BLOCKED by F25-5** — the recurring-billing path. |
| `refund.processed` | **YES** — `revoke` | **UNVERIFIED** | Yes, `index.ts:457` | Subscribe. Carries `refund` + `payment`. |
| `subscription.cancelled` | **YES** — `cancel` | **UNVERIFIED** | Yes, `index.ts:440` | Subscribe. Needs only the `subscription` entity — safe. |
| `subscription.halted` | **YES** — `cancel` | **UNVERIFIED** | Yes, `index.ts:440` | Subscribe. `contains:["subscription"]` — safe. |
| `subscription.paused` | **YES** — `cancel` | **UNVERIFIED** | Yes, `index.ts:440` | Subscribe. `contains:["subscription"]` — safe. |
| `subscription.resumed` | **YES** — `renew` | **UNVERIFIED** | Yes, but **dead** — `index.ts:421` | Subscribe **and** fix **F25-6** first. |
| `subscription.activated` | no — `log`, `200` no-op | **UNVERIFIED** | Yes (no-op) | Do **not** subscribe. See note A. |
| `subscription.pending` | no — `log`, `200` no-op | **UNVERIFIED** | Yes (no-op) | Do **not** subscribe. See note B. |
| `payment.authorized` | no — `log`, `200` no-op (deliberate, F4) | **UNVERIFIED** | Yes (no-op) | Do **not** subscribe. |
| `payment.failed` | no — `log`, `200` no-op | **UNVERIFIED** | Yes (no-op) | Do **not** subscribe. See note B. |
| `refund.failed` / `refund.created` | no — `log`, `200` no-op | **UNVERIFIED** | Yes (no-op) | Do **not** subscribe. |
| `subscription.completed` / `.authenticated` / `.updated` | no — `log`, `200` no-op | **UNVERIFIED** | Yes (no-op) | Do **not** subscribe. |

**Required set: 8 events.** Same 8 as 024's F24-3, independently re-derived.

**Refunds and payment failures — the specific question asked.** Refunds *are*
handled: `refund.processed` → `revoke` → `revokeEntitlement(paymentId)`, which
looks the row up by `provider_payment_ref` and applies `buildRevocationPatch` —
lifetime becomes `revoked`/no expiry, monthly becomes `cancelled`/immediate
expiry. A **partial** refund (`refund.amount < payment.amount`) is logged and
returns `200` without touching entitlements (`index.ts:464-475`) — correct.
Payment **failures** are *not* handled and should not be: `payment.failed` is a
no-op `200`, which is right, because a failed charge must not revoke a
subscription that is still within a paid window.

**Note A — why `subscription.activated` is correctly ignored.** Under the
Option A model settled in 023, the entitlement is granted by
`subscription.charged` (first successful charge and every renewal).
`subscription.activated` fires on the *state transition* to active, before any
charge succeeds, and its payload is `contains:["subscription"]` unless an upfront
amount was charged. Granting on it would grant access for a payment that has not
happened. Ignoring it is correct. (Razorpay's own note: if a subscription moves
from `pending`/`halted` to `active`, "only the subsequent invoices that are
generated are charged" — so `activated` does not imply a payment.)

**Note B — why `subscription.pending` and `payment.failed` are correctly
ignored.** Both fire when a charge *fails*. Revoking on either would cut off a
subscriber who is inside a window they already paid for. The correct response to
a failed charge is `subscription.halted` (all retries exhausted), which **is**
subscribed and **does** cancel. This is the right escalation ladder, and it is
complete without `pending`.

**"All events" is explicitly not recommended.** Subscribing everything would add
`payment.authorized` — the one event 021/F4 specifically designed *not* to grant
— to the delivery path for no benefit, and would multiply ledger rows and
delivery volume against a table that is not client-reachable. Subscribe the 8.

---

## 5. The actual defect: the grant path was never tested against real payloads

Comparing the handler's preconditions against Razorpay's **own published sample
payloads** exposes two defects. Both were proven mechanically this task by
running the real modules (`classifyEvent`, `assertPaymentCaptured`) under Vitest
against verbatim payload bodies copied from
`razorpay/markdown-docs@master:webhooks/subscriptions.md`. The scratch harness
was deleted after the run; the repository is unchanged.

### F25-5 — CRITICAL — `captured` is compared with strict equality to `true`

`supabase/functions/razorpay-webhook/events.ts:324`

```ts
if (payment.captured !== true || asString(payment.status) !== "captured") {
```

Razorpay's own `subscription.charged` sample payload carries:

```json
"status": "captured",
"captured": "1",
```

`"1"` is the **string** `"1"`, not the boolean `true`. Under `!== true` that is
`true`, so the guard fires and the event is rejected. Observed result:

```
status=422  reason=payment is not captured (status=captured)
```

Note the reason string: it says **"not captured"** while reporting
**"status=captured"**. The message is self-contradictory, which is the
signature of a type-coercion bug rather than a genuine authorisation check.

A control payload identical except for `captured: true` is accepted, which is
exactly the shape the existing suite uses. `grep` over the test file shows the
boolean form only — `webhook-hardening.test.mjs:696-698` is the sole
`captured:` assertion and it tests `false`/`true`, never `"1"`.

**Impact.** If Razorpay sends `captured` as `"1"` (or `1`) for subscription
payments, **every recurring charge is refused with 422 and no monthly renewal
ever grants access.** This is the entire recurring-revenue path. The lifetime
one-time `order.paid` path is unaffected if that event ships a boolean, which
Razorpay's `order.paid` sample does — so this would present as "lifetime works,
monthly silently never renews", which is precisely the class of bug a smoke test
exists to catch.

**This is unresolvable without one real TEST subscription charge**, because it
depends on which serialisation Razorpay actually sends on the account. It is
recorded as CRITICAL precisely because it is *plausible* and *unobserved*.

**Fix** (one line, in task 026): treat the flag as truthy rather than
identically-`true` — e.g. accept `true`, `1`, and `"1"` while still rejecting
`false`, `0`, `"0"`, and absence. Keep rejecting the status/captured
*disagreement* cases that `webhook-hardening.test.mjs:694-706` already covers, so
the anti-spoofing property is preserved.

### F25-6 — HIGH — `subscription.resumed` always 422s

`supabase/functions/razorpay-webhook/index.ts:419-424`

```ts
if (action === "renew") {
  const captured = assertPaymentCaptured(envelope.payload);
  ...
```

The `renew` branch is reachable from exactly one event: `subscription.resumed`
(`subscription.charged` is classified `grant`, not `renew` — see
`events.ts:163-167`). Razorpay's `subscription.resumed` sample payload is:

```json
"event": "subscription.resumed",
"contains": [ "subscription" ],
"payload": { "subscription": { "entity": { ... } } }
```

`contains` is `["subscription"]` — **there is no `payment` entity**, and per
Razorpay's Handy Tip a payment entity appears "if a payment attempt was made
before the event was triggered", which resuming does not do. Observed result:

```
status=422  reason=payment entity missing for a success event
```

`grep` over the suite finds **no** `subscription.resumed` fixture and **no**
renew-branch test at all; `classifyEvent` is only asserted for
`payment.captured`, `order.paid`, `refund.processed`, `payment.authorized` and a
`log` list. The branch has never been executed.

**Impact.** A paused-then-resumed subscriber is not restored by the resume
event. Recovery currently depends entirely on the next `subscription.charged`
— which is exactly the path F25-5 may have broken. F25-5 and F25-6 compound:
together they mean a resumed monthly subscriber can be left with no access and
no working renewal. The `422` also leaves the ledger row `failed` and
reclaimable, so the failure is silent from the Dashboard's point of view (the
function answers, it just never grants).

**Fix** (task 026): the renew branch must not require a captured payment. Resume
is a *state* transition, not a payment. Resolve identity from the
`subscription` entity's own `notes` (or `provider_subscription_ref`) and extend
the existing monthly window from the resume, mirroring `cancelEntitlement`'s
subscription-keyed lookup.

### Two further code/comment contradictions found (no behavioural effect)

| ID | Location | Problem |
|---|---|---|
| **F25-7** | `index.ts:386-388` | The comment lists `subscription.paused` and `subscription.resumed` among events that are "acknowledged without touching entitlements". `classifyEvent` maps `paused → cancel` and `resumed → renew`. **The comment contradicts the code it describes.** (024's F24-3 caught the analogous `payment.refunded` error; this one is new.) |
| **F25-8** | `index.ts:420` | `// subscription.resumed or subscription.charged for renewal` — `subscription.charged` never reaches this branch; it is classified `grant`. |
| **F25-9** | `index.ts:457` | `// Revoke path (refund.processed / payment.refunded)`. Razorpay publishes no `payment.refunded` event; `classifyEvent` handles only `refund.processed`. (Carried from 024 F24-3, still unfixed.) |

These are comments, so they cannot affect behaviour and the deployed bundle is
unaffected. They matter because F25-7/F25-8 are the comments a reader would trust
when reasoning about why the renew branch looks the way it does — and that
reasoning is what produced F25-6.

---

## 6. STEP 5 — Supabase webhook secret boundary

| Check | Result | How |
|---|---|---|
| Secret exists under **exactly** `RAZORPAY_WEBHOOK_SECRET` | **YES** | `index.ts:68` reads that one name. `readConfig()` returns `null` (→ `503 "webhook is not configured"`) unless `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_URL` **and** `SUPABASE_SERVICE_ROLE_KEY` are all non-empty (`index.ts:67-81`). |
| …and it is non-empty on the deployed function | **YES** | Every probe in §7 returned `400 missing signature` / `400 invalid signature` / `413`, and **never** `503`. The `503` guard is evaluated *before* the signature check (`index.ts:491` precedes `:493`). Therefore `readConfig()` returned non-null on the live function, which requires all three of those variables to be present and non-empty. This is a **behavioural proof of presence**, not a store read. |
| The value | **NOT READ, NOT PRINTED** | Not obtainable by design: Supabase function secrets are write-only, and `supabase secrets list` fails with `AccessTokenRequiredError` (no `SUPABASE_ACCESS_TOKEN`, no `~/.supabase/credentials`). |
| The deployed function reads that exact variable | **YES** | `index.ts:68`; regression-guarded by `webhook-hardening.test.mjs` section N (024). |
| Dashboard webhook secret ≡ Supabase `RAZORPAY_WEBHOOK_SECRET` | **YES — this is the intent, and the evidence supports it** | Same value in both stores is the only design that can work: `verify.ts:38-43` recomputes `HMAC-SHA256(secret, rawBody)` and compares it to `x-razorpay-signature`, which Razorpay computes with *its* configured webhook secret. 024 recorded a correctly-signed delivery returning `200` (the `attempts=2` claim→fail→reclaim→succeed cycle on the `payment.captured` row), which is only possible if the two stores hold the same value. |
| Local `RAZORPAY_WEBHOOK_SECRET` | **EMPTY** in `services/license-api/.env.local` | Consequently **no correctly-signed request can be produced from this workspace**, and the "accept a correctly signed TEST webhook" half of STEP 6 stays unverified. Rotating is forbidden by this task and is not needed. |

No secret was requested from the user and none was pasted into chat.

---

## 7. STEP 6 — Deployed Edge Function verification

Target: `https://zbzhlhoxblguepplqppw.supabase.co/functions/v1/razorpay-webhook`

| Requirement | Probe | Result | Verdict |
|---|---|---|---|
| JWT verification disabled for Razorpay delivery | Unsigned `POST` | `400 missing signature` | **PASS.** A Supabase JWT gate answers `401`; Razorpay sends no Supabase JWT, so `400` from the handler proves the gate is off. Reinforced by `supabase/config.toml` §8. |
| Rejects unsigned requests | `POST`, no `x-razorpay-signature` | `400 missing signature` | **PASS** (`index.ts:493-494`) |
| Rejects invalid signatures (non-hex) | `x-razorpay-signature: zzzz` | `400 invalid signature` | **PASS** (`hexToBytes` rejects, `verify.ts:12-20`) |
| Rejects invalid signatures (well-formed, wrong) | 64 × `0` | `400 invalid signature` | **PASS** — `crypto.subtle.verify`, constant-time (`verify.ts:38-43`) |
| Signature is checked **before** parsing | signed-looking header + `not-json` body | `400 invalid signature` (not `400 invalid payload`) | **PASS** — ordering holds (`index.ts:503` precedes `:508`) |
| Accepts a correctly signed TEST webhook | — | **NOT EXERCISED** | **UNVERIFIED** — no local secret (§6). 024 has indirect evidence it works (a `200` on a signed delivery). Not re-exercised here. |
| Appropriate HTTP status codes | see full matrix | `405` / `400` / `413` | **PASS** |
| `GET` | — | `405 method not allowed` | **PASS** |
| `PUT` | — | `405 method not allowed` | **PASS** |
| `DELETE` | — | `405 method not allowed` | **PASS** |
| `OPTIONS` | — | `405 method not allowed` | **PASS** |
| `HEAD` | — | `405` | **PASS** |
| Oversized body, chunked (no `content-length`) | 300 KB | `413 payload too large` | **PASS** (`index.ts:501`) |
| Oversized body with a lying `content-length` | `content-length: 307200`, 2-byte body | `400` from **Cloudflare**, upstream of the function | **PASS** — rejected before it reaches the handler. Defence in depth. |

**No real payment was performed.** No Order, Payment, Subscription or Plan was
created, and no LIVE-mode operation occurred at any point in this task.

Two branches remain test-covered only, not live-exercised: the `409`
in-flight/`claim-lost` paths and the `5xx` transient path. Both need the real
secret to reach.

---

## 8. STEP 7 — Repository configuration

### 8.1 `supabase/config.toml` — present and correct

```toml
project_id = "soravo"

[functions.razorpay-webhook]
verify_jwt = false
```

The load-bearing `verify_jwt = false` **is** declared, with a comment block
explaining why it must not be "cleaned up", and is regression-guarded by
`webhook-hardening.test.mjs` section N (6 tests, 024). A future
`supabase functions deploy razorpay-webhook` therefore cannot silently restore
the JWT gate. No secret, no `secret =` assignment — asserted by test.

**But the file is `UNTRACKED`.** The guarantee 024 added exists only in the
working tree. It protects a *future* deploy only if the file is committed, and a
clone of this repository today has no `supabase/config.toml` at all.

### 8.2 Exactly what is untracked

| Path | State | Consequence |
|---|---|---|
| `supabase/config.toml` | **UNTRACKED** | the `verify_jwt = false` guarantee is not in version control |
| `supabase/functions/razorpay-webhook/index.ts` | **UNTRACKED** | deployed webhook handler absent from VCS |
| `supabase/functions/razorpay-webhook/events.ts` | **UNTRACKED** | contains F25-5 |
| `supabase/functions/razorpay-webhook/verify.ts` | **UNTRACKED** | HMAC verification absent from VCS |
| `supabase/functions/razorpay-webhook/ledger.ts` | **UNTRACKED** | idempotency ledger absent from VCS |
| `supabase/functions/razorpay-webhook/catalog.ts` | **UNTRACKED** | price mirror absent from VCS |
| `supabase/migrations/20260926000000_establish_webhook_events.sql` | **UNTRACKED** | applied remotely, not in VCS |
| `supabase/migrations/20260926140000_razorpay_webhook_hardening_022.sql` | **UNTRACKED** | applied remotely, not in VCS |
| `supabase/migrations/20260927100000_entitlements_provider_refs.sql` | **UNTRACKED** | applied remotely, not in VCS |
| `supabase/tests/webhook-hardening.test.mjs` | **UNTRACKED** | the entire 118-test guard suite is not in VCS |
| `services/license-api/src/payment/razorpay-provider.ts` | **UNTRACKED** | the Razorpay provider implementation is not in VCS |
| `docs/spec-v3/RAZORPAY-SECRET-VALUE-019C.md` | **UNTRACKED** | contains a real key id (F25-1) |
| `docs/spec-v3/RAZORPAY-LIVE-CONFIG-VERIFICATION-024.md` | **UNTRACKED** | clean (0 key ids) |
| `supabase/.temp/` (9 files) | **now gitignored** — was untracked and unignored (F25-3, fixed in this task) | no longer at risk of accidental staging |
| `PROGRESS.md` | **TRACKED but modified** | working-tree copy contains a real key id (F25-1) |
| `supabase/migrations/20260920100000_entitlements_provider_neutral.sql` | TRACKED | — |
| `supabase/tests/vitest.config.mjs` | TRACKED | — |

`supabase/tests/db_assertions.sql` and `supabase/tests/rls_assertions.sql` were
already modified before this task and were left untouched.

**This is the second-order blocker.** The entire webhook implementation —
handler, verification, ledger, migrations and its 118-test guard suite — has
never been committed. A reviewer cannot see it, CI cannot test it, and a fresh
clone cannot deploy it. 024 flagged this; it is still open.

**Nothing was committed by this task.**

---

## 9. STEP 8 — Test safety attestation

| Prohibited action | Status |
|---|---|
| Create Plans | **Not done** |
| Create Subscriptions | **Not done** |
| Create Orders | **Not done** |
| Create Payments / Customers / Invoices | **Not done** |
| Make payments | **Not done** |
| Configure LIVE mode | **Not done.** Every Razorpay call targeted `api.razorpay.com` with a `rzp_test_` key. |
| Rotate keys or secrets | **Not done** |
| Delete existing Razorpay objects | **Not done.** No `DELETE`/`PATCH`/`PUT`/`POST` was issued against `api.razorpay.com`. |
| Modify the Dashboard webhook | **Not attempted** |
| Remote database / migration change | **Not done** |
| Function redeploy | **Not done** |
| Git commit | **Not done** |
| Print / log / commit a secret value | **Not done.** All credential inspection was by key name, byte length, character class and SHA-256 prefix. |

Razorpay API calls made, in full: four read-only `GET`s
(`/v1/payments?count=1` and `/v1/webhooks`, each with and without credentials).
Seven `GET`s and eight `POST`s against the Supabase Edge Function, all of which
were rejected at the signature or method gate before touching the database.

---

## 10. Tests executed

| Command | Result |
|---|---|
| `npx vitest run --config supabase/tests/vitest.config.mjs` | **130 passed, 0 failed** (`migration-guard` 12, `webhook-hardening` 118) |
| Scratch harness (5 tests, Razorpay's own payload bodies vs the real modules) | **5 passed** — i.e. all five assertions about the defects *held*. Deleted after the run. |

The 130-test suite is green **and both F25-5 and F25-6 are real**. That is the
finding: the suite validates the implementation against fixtures the project
authored, and never against Razorpay's published payloads. Green here does not
mean correct.

The scratch harness is not committed, because committing a test that asserts the
*current broken* behaviour would enshrine the bug. Task 026 adds the fixtures and
the fix together.

---

## 11. Remaining blockers, in dependency order

| # | Blocker | Severity | Owner | Can an agent clear it? |
|---|---|---|---|---|
| 1 | **F25-5** — `captured !== true` refuses Razorpay's `captured:"1"`; the recurring-charge path may never grant | **CRITICAL** | agent | **Yes** — offline, testable |
| 2 | **F25-6** — `subscription.resumed` always 422s (no `payment` entity) | **HIGH** | agent | **Yes** — offline, testable |
| 3 | Stored TEST API key is revoked server-side; no replacement exists on this machine | **CRITICAL** | **owner** | **No** — owner action |
| 4 | Dashboard webhook existence, URL, active state, subscribed events, duplicates | **CRITICAL** | **owner** (Dashboard) + a working key | **No** |
| 5 | Webhook implementation + migrations + 118-test suite + `config.toml` untracked | **HIGH** | owner (commit) | Partly — needs an explicit commit instruction |
| 6 | F25-1 real key id staged in `PROGRESS.md` (working tree) and in 019C | **MEDIUM** | agent | ✅ **CLEARED in 025** — redacted; key is already dead anyway (§1.5) |
| 7 | F25-2 `.env.local` mode `664` | **MEDIUM** | agent | ✅ **CLEARED in 025** → `600` |
| 8 | F25-3 `supabase/.temp/` not gitignored | **LOW** | agent | ✅ **CLEARED in 025** — `.gitignore:21` |
| 9 | Supabase secret store / bundle version unlistable (no `SUPABASE_ACCESS_TOKEN`) | **LOW** | **owner** (`supabase login`) | **No** |
| 10 | F25-7/8/9 comments contradict the code | **LOW** | agent | **Yes** — task 026 |
| 11 | "Accept a correctly signed TEST webhook" not exercised locally (no secret) | **LOW** | **owner** (Dashboard "Send Test Event") | **No** |
| 12 | Whether Razorpay redelivers on `422` (relevant to F25-5/6 blast radius) | **INFO** | — | Unverified; not load-bearing |

Blockers **1 and 2 gate the first real TEST checkout** and are the only two that
need no credential. They should be fixed *before* spending owner effort on
blocker 3, because a working key against a broken grant path would produce a
failed smoke test that looks like a credential problem.

---

## 12. Exact next task

### `RAZORPAY-GRANT-PAYLOAD-FIDELITY-026`

**Fix the two proven grant-path defects. No Razorpay API access, no Dashboard, no
secrets, no LIVE mode.**

1. **F25-5** — in `supabase/functions/razorpay-webhook/events.ts:324`, accept
   `captured` as `true`, `1` or `"1"`; keep rejecting `false`, `0`, `"0"` and
   absence, and keep rejecting status/captured disagreement so the
   `webhook-hardening.test.mjs:694-706` anti-spoofing cases still pass.
2. **F25-6** — in `supabase/functions/razorpay-webhook/index.ts:419-438`, stop
   requiring a captured payment on the `renew` branch. Resolve identity from the
   `subscription` entity's `notes` and extend the monthly window from the resume,
   mirroring `cancelEntitlement`'s subscription-keyed lookup
   (`provider_subscription_ref`). Never grant on an unverified or mismatched
   amount; resume is a state transition, so the amount check must be dropped
   rather than weakened.
3. **Add fixtures from Razorpay's published payloads** —
   `razorpay/markdown-docs@master:webhooks/subscriptions.md` — for
   `subscription.charged` (with `captured:"1"`), `subscription.resumed`
   (`contains:["subscription"]`), plus `subscription.paused`, `.halted`,
   `.cancelled` and `order.paid` to lock the whole matrix. Add a
   `classifyEvent` test for all five subscription events, which today has none.
4. **Fix the three contradicting comments** (F25-7, F25-8, F25-9) and annotate
   `RAZORPAY-TEST-TOOLING-019` / `RAZORPAY-MCP-AUDIT-018` to mark the CLI and MCP
   stores as *proposed, not provisioned* (F25-4).
5. Re-run `pnpm test:supabase` and confirm 130 + new tests green, with a
   mutation check that reverting either fix turns the suite red.

> The credential-hygiene items that used to sit at step 5 — redact the staged key
> id, `chmod 600` the `.env.local`, gitignore `supabase/.temp/` — were **already
> completed during 025** (§1.4) and are not repeated here.

**Then, and only then, `RAZORPAY-TEST-PAYMENT-SMOKE-027`** becomes meaningful:
owner supplies a working TEST key → `GET /v1/webhooks` confirms the URL and the
8 events → one real TEST payment per state transition.

---

## 13. Final answers to the seven required statements

1. **Does current TEST authentication work?**
   **No.** `401 Authentication failed` on `GET /v1/payments?count=1` and
   `GET /v1/webhooks`, byte-identical to the response for a fabricated key. The
   stored credential *is* the current one — the same bytes authenticated
   `HTTP 200` on 2026-09-26T16:14Z and the file has not been edited since — so
   the key was **revoked or rotated server-side in Razorpay**. No second
   credential exists on this machine to switch to. Nothing was created.

2. **Does the Razorpay webhook exist and match the deployed URL?**
   **Unverifiable — not confirmed, not denied.** `GET /v1/webhooks` requires a
   working key; the Razorpay MCP is not configured and would not expose webhooks
   regardless. **The endpoint itself is confirmed live, JWT-free and
   signature-correct** (§7), so the unknown is confined to the Dashboard side.
   No webhook was created, modified or deleted.

3. **The actual configured event list?**
   **Unknown.** Not guessed. Requires a working key or a Dashboard look.

4. **Which required events are missing?**
   **Cannot be stated** while the configured list is unknown. What *is* proven:
   the required set is **8** events (`payment.captured`, `order.paid`,
   `subscription.charged`, `refund.processed`, `subscription.cancelled`,
   `subscription.halted`, `subscription.paused`, `subscription.resumed`),
   re-derived from `classifyEvent` and `processEvent`. `subscription.activated`,
   `subscription.pending`, `payment.authorized` and `payment.failed` are
   correctly **not** required. And two of the eight have provably broken
   handlers: **`subscription.charged` is exposed to F25-5** (`captured:"1"` →
   422) and **`subscription.resumed` is dead (F25-6, always 422)** — so two
   required events would fail even if fully subscribed.

5. **Is the Supabase secret name correct?**
   **Yes.** `RAZORPAY_WEBHOOK_SECRET` — the exact name `index.ts:68` reads.
   Presence and non-emptiness are proven behaviourally: `readConfig()` gates on
   it and the live function never returned `503`. The value was never read and is
   write-only. The Dashboard webhook secret and this Supabase secret are intended
   to be the same value, and 024's evidence (a correctly-signed delivery
   returning `200`) is consistent with them matching. The local
   `RAZORPAY_WEBHOOK_SECRET` is empty, which is why a signed request could not
   be produced here.

6. **Is the endpoint ready for the first real TEST checkout?**
   **No.** Four independent reasons: (a) the TEST credential is dead and no
   replacement is configured; (b) the Dashboard webhook's existence, URL and
   event subscription are unconfirmed; (c) **F25-5** means the recurring-charge
   grant path may reject every real `subscription.charged`; (d) **F25-6** means
   `subscription.resumed` can never succeed. Separately, the whole
   implementation is untracked, so it is not reproducible from the repository.
   The one-time lifetime path (`order.paid`) is the only path with no proven
   code defect.

7. **Exact next task?**
   **`RAZORPAY-GRANT-PAYLOAD-FIDELITY-026`** — fix F25-5 and F25-6, add
   regression fixtures built from Razorpay's own published payloads, correct the
   three contradicting comments, and clear the three credential-hygiene findings.
   Fully offline: no API key, no Dashboard, no secret, no LIVE mode. It is
   sequenced first because it is the only high-severity blocker that needs
   nothing from the owner, and because fixing it before the owner rotates the key
   prevents a smoke test from failing for the wrong reason.

---

## 14. Files changed by this task

**No source file, test, migration, function or commit was changed.** The
webhook implementation is exactly as 022/024 left it.

Four changes, all configuration or documentation, all local-only:

| File | Change | Finding |
|---|---|---|
| `docs/spec-v3/RAZORPAY-LIVE-CONFIG-RECONCILIATION-025.md` | **new** (untracked) | this report |
| `PROGRESS.md` | task-025 section appended; key id at line 649 redacted | F25-1 |
| `docs/spec-v3/RAZORPAY-SECRET-VALUE-019C.md` | 2 historical key-id occurrences redacted | F25-1 |
| `.gitignore` | `supabase/.temp/` added at line 21 | F25-3 |
| `services/license-api/.env.local` | `chmod 600` (mode only, **no content change**) | F25-2 |

**Nothing was committed.** All of the above sits in the working tree.

Two transient artifacts, both removed:
- a 5-test scratch harness at `supabase/tests/zz-scratch-025.test.mjs`, used to
  prove F25-5 and F25-6 against Razorpay's published payloads — **deleted**;
- no other temporary file was left behind.

Pre-existing dirty state left untouched: the modified Tauri and crate sources,
`services/license-api/src/payment/*`, `supabase/tests/db_assertions.sql`,
`supabase/tests/rls_assertions.sql`, `Cargo.lock`, and the untracked
`apps/desktop/src-tauri/src/clamshell.rs` and `*.env.example` files.
