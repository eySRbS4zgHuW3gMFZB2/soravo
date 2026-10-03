# RAZORPAY-LIVE-CONFIG-VERIFICATION-024

## Objective

Independently verify, against the **deployed** Soravo system and the **live
remote database** rather than against source code alone:

1. that the Razorpay TEST webhook endpoint is reachable, correctly exposed, and
   enforcing its authentication and payload guards;
2. that every required database migration is actually applied remotely, with the
   grants, constraints and policies the handler depends on;
3. that the deployed function corresponds to the hardened 022 implementation and
   the 023 Option A provider-reference change;
4. that required webhook events are subscribed in Razorpay, and whether they can
   be confirmed.

Everything below is scoped to **TEST mode**. No Razorpay API object was created,
no payment, product, plan or subscription was created, no Dashboard setting was
changed, and no LIVE-mode operation was performed. No secret was read back,
printed, logged or committed.

## Headline Verdict

| Question | Answer | Confidence |
|---|---|---|
| Is the webhook endpoint live and JWT-free? | **Yes** — confirmed by behavioural probe | High |
| Is the webhook secret actually configured? | **Yes** — confirmed behaviourally (no 503) | High |
| Are all required migrations applied? | **Yes** — all four present remotely | High |
| Are the grants/constraints the handler needs correct? | **Yes** | High |
| Does the deployment match 022? | **Yes** — behavioural fingerprint + live 422/400/200 evidence | High |
| Does the deployment match 023 (Option A)? | **Yes** — a real delivery wrote `provider_subscription_ref` | High |
| Are the required events subscribed in Razorpay? | **UNVERIFIED** — Dashboard API returns 401 | **None** |
| Has a real Razorpay delivery ever been processed? | **No** — all 6 logged requests are `curl`, none from Razorpay | High |
| Was the deploy contract reproducible from the repo? | **No — fixed by this audit** (`supabase/config.toml` did not exist) | High |

Two things are genuinely wrong, and only one of them is fixable in the repo:
the Razorpay Dashboard subscription state is unverifiable because the stored
TEST credentials are rejected, and the deployment contract was not declared in
version control. The second is fixed here. The first is a credential/ownership
problem, not a code problem, and is left as an explicit open item.

## What Was Actually Verified, and How

### 1. Endpoint reachability and HTTP contract

The URL in the task (`https://zbzhlhoxblguepplqppw.supabase.co/functions/v1/razorpay-webhook`)
is live. Probes were non-mutating — every one was rejected before reaching the
ledger, or was a replay of a payload the ledger already holds as `completed`
(no entitlement is written twice; see *Idempotency* below).

| Probe | Result | What it proves |
|---|---|---|
| `GET` | `405 method not allowed` | method guard runs before any work |
| `OPTIONS` | `405 method not allowed` | same |
| `PUT` | `405 method not allowed` | same |
| `POST`, no signature header | `400 missing signature` | **JWT gate is off** — a Supabase JWT gate answers `401`, and Razorpay sends no Supabase JWT |
| `POST`, non-hex signature | `400 invalid signature` | HMAC compare rejects malformed input |
| `POST`, 300 KB body | `413 payload too large` | `MAX_BODY_BYTES` (256 KiB) guard is deployed |
| `POST`, valid signature + permanent identity/price failure | `422` | 022's permanent-vs-transient split is deployed |
| `POST`, valid signature, retry of the same payload | `200` | reclaim-after-failure (F2) is deployed |

The last two are the strongest evidence in this report, and they were recovered
from the platform's own Edge Function logs rather than assumed.

### 2. The Edge Function logs settle three open questions

`function_edge_logs` contains exactly **six** invocations for the whole
2026-09-26 window. All six are `POST`, all six have
`user_agent: curl/8.5.0`, and all six originate from a single client
(`103.27.141.143`, Kolkata) against the correct URL. The edge region is
`ap-south-1`.

| # | Timestamp (UTC) | Body | Status | Exec |
|---|---|---|---|---|
| 1 | 19:47:06.045 | 29 B | `400` | 1635 ms |
| 2 | 19:47:35.809 | 339 B | **`422`** | 3129 ms |
| 3 | 19:48:45.072 | 339 B | `200` | 1130 ms |
| 4 | 19:50:17.692 | 423 B | `200` | 2510 ms |
| 5 | 19:50:43.463 | 414 B | `200` | 2283 ms |
| 6 | 19:51:09.981 | 439 B | `200` | 1301 ms |

Three conclusions follow directly, and they are the reason this audit is worth
more than a code read:

- **A live 422 exists.** Request #2 returned `422` — a permanent
  identity/price rejection — with no 5xx. This is 022 requirement
  *"answers a permanent identity/price failure with 4xx and a transient one with
  5xx"*, previously only ever proven by unit test. It is now proven against the
  deployment.
- **Requests #2 and #3 are the same 339-byte payload, 70 seconds apart: 422 then
  200.** That is exactly the F2 cycle (claim → fail → reclaim → succeed), and it
  independently explains the `payment.captured` ledger row's `attempts=2` and
  `claimed_at = 19:48:45`. The ledger state is not an anomaly; it is the
  designed retry path working. The original failure reason is unrecoverable
  because 022 deliberately nulls `last_error` on success.
- **No Razorpay delivery has ever reached this function.** Razorpay does not use
  `curl` as its user agent, and no request in the log has one. Every invocation
  to date has been a manually signed local test.

The four `200`s correspond one-to-one with the four `completed` ledger rows
(`payment.captured`, `refund.processed`, `order.paid`, `subscription.charged`).

### 3. Secret presence, established behaviourally

The deployed handler calls `readConfig()`, which returns `null` unless
`RAZORPAY_WEBHOOK_SECRET` is a non-empty string, and `handleRequest` answers
`503 unconfigured` on `null`. Every probe above returned `4xx`, never `503`.
Since Razorpay's requests carry no `x-razorpay-signature` of their own accord,
the secret is therefore present and non-empty **under exactly the name the code
reads**: `RAZORPAY_WEBHOOK_SECRET`.

This is an inference from behaviour, not a read of the secret store — see
*Limitations*.

### 4. Migrations are applied, not merely committed

Verified through the Supabase MCP server against the remote database, not
against the files in `supabase/migrations/`.

| Migration | Remote version | Applied |
|---|---|---|
| `20260926000000_establish_webhook_events.sql` | `20260926173539` | yes |
| `20260926140000_razorpay_webhook_hardening_022.sql` | `20260926173605` | yes |
| `20260927100000_entitlements_provider_refs.sql` | `20260926193817` | yes |
| `entitlements_provider_neutral` (earlier work) | `20260926173530` | yes |

Note the remote version numbers do **not** match the migration filenames. Do not
assume a filename is applied because it exists locally.

Remote objects confirmed present:

- `webhook_events`: `status` CHECK constraint limited to
  `processing|completed|failed`; `claimed_at`/`claim_token`/`expires_at`
  `NOT NULL`; `attempts` bounded; partial index on
  `(expires_at) WHERE status = 'processing'`.
- `entitlements`: `provider_order_ref`, `provider_payment_ref`,
  `provider_subscription_ref`, `provider_customer_ref`, plus a unique index per
  provider reference and the `entitlements_one_current_per_user_product UNIQUE
  (user_id, product)` constraint.
- No legacy `product` default remains.

### 5. Privileges and RLS are exactly what 022 intended

| Role | `entitlements` | `webhook_events` |
|---|---|---|
| `service_role` | `INSERT, SELECT, UPDATE` — **no `DELETE`** | `INSERT, SELECT, UPDATE` — **no `DELETE`** |
| `anon` | none | none |
| `authenticated` | `SELECT` only | none |

- Exactly one policy exists on `entitlements`: `entitlements_select_own`, a
  self-read for authenticated users. The desktop client depends on it.
- `webhook_events` has **zero** RLS policies and zero client grants. The ledger is
  unreachable from any client role; only the function's `service_role` key can
  touch it. Idempotency state cannot be read or forged by a user.
- The absence of `DELETE` for `service_role` means even a fully compromised
  function cannot destroy an entitlement or an audit row. This is deliberate.

### 6. The upsert target and the row builder are mutually consistent

`index.ts` upserts with `onConflict: "user_id,product"`. That is only valid
because `entitlements_one_current_per_user_product UNIQUE (user_id, product)`
exists remotely — verified. This is the constraint that stops a monthly renewal
from silently overwriting a lifetime grant.

The `entitlements_plan_expiry_consistency` and
`entitlements_expiry_not_before_start` CHECK constraints are also satisfied by
both builders: `buildEntitlementRow` sets `expires_at` only for monthly,
`buildRevocationPatch` clears it for lifetime and stamps it to `now` for monthly
(a `cancelled` monthly row is required to carry an expiry, and `now >=
starts_at` always holds). No path can write a row the database will reject.

### 7. Deployed code is 022 + 023

- **022**, behaviourally: method guard, `missing signature`, `invalid
  signature`, 256 KiB body cap, `503` when unconfigured, `422` for permanent
  identity/price failures, ledger claim before work and completion after — all
  reproduced against the live endpoint.
- **023 (Option A provider references)**, structurally: a live
  `subscription.charged` request wrote a non-null
  `provider_subscription_ref` on the `soravo_monthly` row. That column is
  created by the `20260926193817` migration, which was applied at 19:38 — after
  the 19:47 deploy window opened. The deployed bundle cannot predate it, so the
  running code is the provider-reference version.

The two entitlement rows confirm the catalogue contract end to end:
`soravo_lifetime` has `expires_at IS NULL` and an order reference;
`soravo_monthly` has a 30-day expiry and both an order and a subscription
reference. `provider_customer_ref` is an opaque alphanumeric Razorpay id, not
an email — no PII is being written into the entitlements table.

## Findings

### F24-1 (fixed) — the deployment contract was not in version control

`supabase/config.toml` **did not exist**. The endpoint is confirmed JWT-free
today, but that state was set by hand in the Supabase Dashboard. Nothing in the
repository recorded it, so:

- the next `supabase functions deploy razorpay-webhook` would re-enable the
  Supabase JWT gate and silently break every payment webhook, with no test
  failure and no code diff to explain it;
- `supabase functions serve` could not reproduce the deployed contract.

`verify_jwt = false` was a *handbook* requirement in the 019 tooling notes, never
an enforced one. Fixed by adding `supabase/config.toml` and a regression guard
(section N of the webhook suite). Confirmed the Supabase CLI parses the file.

### F24-2 (open, not fixable here) — Razorpay Dashboard state is unverifiable

`GET https://api.razorpay.com/v1/webhooks` with the TEST credentials in
`services/license-api/.env.local` returns:

```
401 BAD_REQUEST_ERROR  Authentication failed
```

The key is well-formed and `rzp_test_`-prefixed, but Razorpay rejects it. So
this audit **cannot** confirm:

- that the Dashboard webhook URL is exactly the endpoint above;
- **which events are currently subscribed** (the question asked);
- the secret's last-updated timestamp or active/inactive state;
- whether the endpoint has a `payment.authorized` subscription that is simply
  ignored by design.

The local `.env.local` also has an **empty** `RAZORPAY_WEBHOOK_SECRET`, so even
if the key were restored, no signed request could be produced from this
workspace without a credential the task forbids fetching.

No Dashboard change was attempted. Correcting a dead credential is an
owner/credential-rotation action, not a code action, and guessing at it risks
stranding live subscriptions.

### F24-3 (informational) — required events, derived from code and confirmed against Razorpay's catalogue

Derived from `classifyEvent` and cross-checked against Razorpay's published
"All Webhook Events". These eight must be subscribed:

| Event | Effect |
|---|---|
| `payment.captured` | grant lifetime or monthly |
| `order.paid` | grant lifetime or monthly |
| `subscription.charged` | grant on first charge, renew on every subsequent one |
| `refund.processed` | revoke permanently (lifetime) / cancel (monthly) |
| `subscription.cancelled` | cancel monthly |
| `subscription.halted` | cancel monthly |
| `subscription.paused` | cancel monthly |
| `subscription.resumed` | renew monthly |

Deliberately **not** acted on, and it is correct that they are not:
`payment.authorized` (an authorisation is not a capture — 022/F4),
`payment.failed`, `payment.refunded`, `refund.created`, `refund.failed`,
`refund.speed_changed`, `subscription.authenticated`, `subscription.activated`,
`subscription.pending`, `subscription.completed`. All are acknowledged `200` and
recorded as no-ops, so subscribing them is harmless but not required.

Note that `subscription.authenticated` fires on the first payment while
`subscription.charged` fires on every *successful* charge; because only
`subscription.charged` grants, an authorisation-only first payment correctly
grants nothing until it captures.

Also worth recording: the revoke branch comment in `index.ts` reads
*"Revoke path (refund.processed / payment.refunded)"*, but Razorpay publishes no
`payment.refunded` event, and `classifyEvent` handles only `refund.processed`.
The code is right and the comment is wrong. No code change was made — a comment
cannot affect behaviour, and the deployed bundle would not change.

### F24-4 (informational) — no attempt ceiling on permanently-invalid events

An event that always fails validation as `422` stays reclaimable forever; the
ledger bounds `attempts` but nothing refuses the reclaim. In practice Razorpay
retries are themselves bounded, so this is not an unbounded loop, and the
`webhook_events` table is not client-reachable so it cannot be used as a
flooding vector against a client. A `max_attempts` guard would be defence in
depth. Not added: it changes runtime behaviour of a path that cannot be
exercised or tested against the live deployment here, and the instruction is to
fix only what is necessary.

### F24-5 (informational) — `grantEntitlement` and `renewEntitlement` are identical

Both functions have the same body, differing only in name and a log line. This
is dead-simple duplication with no behavioural difference. Not changed: pure
refactor, zero functional value, and the deployed bundle would diverge from the
repo for no gain.

### F24-6 (informational) — ledger store asymmetry on `claimed_at`

The in-memory reference store sets `claimed_at` on completion and the Supabase
store does not, so the two stores are not byte-equivalent in that column. It is
harmless: `completed` is terminal, `isLeaseActive` is only consulted for
`processing` rows, and the reclaim path overwrites `claimed_at` on the next
claim. Recorded so the next reader does not mistake it for a defect. The
memory store exists to test the state machine, not to shadow the real one.

## Fix Applied

Exactly one fix, for F24-1.

**`supabase/config.toml`** (new) — declares the linked project and pins the
function's exposure:

```toml
project_id = "soravo"

[functions.razorpay-webhook]
verify_jwt = false
```

The file also carries a comment block explaining *why* the setting is
load-bearing, so the next person to read it does not "clean it up". No secret,
no API key, no credential of any kind is in the file; a test asserts that.

**`supabase/tests/webhook-hardening.test.mjs`** — added section **N. Edge
Function deployment contract**, 6 tests:

- `supabase/config.toml` exists;
- `project_id` is pinned to `soravo`;
- `[functions.razorpay-webhook] verify_jwt = false`;
- no secret material and no `secret =` assignment in the config;
- the function reads `RAZORPAY_WEBHOOK_SECRET` from `Deno.env`;
- a missing secret is a `503`, never a fall-through into signature checking.

The config parser in the test strips comments before matching, so the
explanatory prose cannot satisfy the assertion it guards.

## Tests

```
pnpm test:supabase
  ✓ supabase/tests/migration-guard.test.mjs   (12 tests)
  ✓ supabase/tests/webhook-hardening.test.mjs (118 tests)   ← was 112
  Test Files  2 passed (2)
  Tests       130 passed (130)                ← was 124
```

**Mutation check** — the new guard was confirmed to actually fail on the defect
it exists to catch, then reverted:

```
verify_jwt = true  →  1 failed | 129 passed   ("disables the Supabase JWT gate")
reverted           →  130 passed
```

## Exact Files Changed

| File | Change |
|---|---|
| `supabase/config.toml` | **new** — `project_id` + `verify_jwt = false` (F24-1) |
| `supabase/tests/webhook-hardening.test.mjs` | edited — section N, 6 tests, one added import |

Nothing else was modified. In particular, no migration was added or altered, no
Edge Function source was changed, no remote migration was applied, no Razorpay
object was touched, and no secret was written anywhere.

Pre-existing dirty state in the worktree, **not** touched by this audit:
`supabase/tests/db_assertions.sql` and `supabase/tests/rls_assertions.sql` are
already modified, and the Razorpay function, its three migrations, the webhook
test suite and `supabase/.temp/` are all still untracked. The webhook function
and its migrations have therefore never been committed — see *Recommendations*.

## Deployment Status

The deployed function was **not redeployed** by this audit, and did not need to
be: the only defect found was the absence of a repository file, which affects
future deploys rather than the running function. The running function is
verified correct as deployed.

Full source-level equality between the deployed bundle and the working tree
**cannot be proven here** — see *Limitations*.

## Limitations — what was NOT verified

1. **Razorpay Dashboard state.** Blocked by `401` (F24-2). The event
   subscription list, the registered URL, and the secret's Dashboard metadata are
   all unverified. This is the single most important open item.
2. **The function secret store.** `supabase secrets list` and
   `supabase functions list` both require a management token;
   `SUPABASE_ACCESS_TOKEN` is absent, so the CLI returns
   `AccessTokenRequiredError`. The secret's *name* and *presence* are therefore
   established by behaviour (probe returns `400`, not `503`), not by listing the
   store, and its *value* was never read.
3. **Byte-level deployment identity.** Without the CLI there is no bundle
   version or hash to compare against the repo, so "the deployment matches the
   working tree" is supported by fingerprint and DB evidence, not proven
   cryptographically.
4. **Valid-signature paths not exercised remotely.** The `409` in-flight and
   `5xx` transient branches, and the 24-hour replay-window rejection, could only
   be exercised against the live endpoint with the real secret. They remain
   covered by the 130-test suite but are unproven in production. The
   `isWithinReplayWindow` boundary cases (section I) are test-only.
5. **No real end-to-end payment.** All six logged invocations are local `curl`
   tests. No genuine Razorpay → webhook → entitlement delivery has ever
   occurred, so the first real delivery is still unproven.
6. **The original 422 cause is unrecoverable.** `last_error` is nulled on
   successful completion, by design.

## Recommendations

Ordered by value.

1. **Restore Razorpay TEST API access, then close F24-2.** Run
   `GET /v1/webhooks` with a valid `rzp_test_` key and confirm the endpoint URL
   and the eight required events from F24-3 are subscribed. Add
   `payment.captured` at minimum. Until this is done, no claim that the webhook
   is fully configured can be made.
2. **Rotate the webhook secret if it cannot be read back.** A secret that cannot
   be verified is a secret that cannot be rotated cleanly. Do this in the
   Razorpay Dashboard, then set the same value in the Supabase function secret
   store and update the Dashboard webhook.
3. **Commit the webhook function, its migrations and this test suite.** They are
   still untracked. The migration file versions and the applied remote versions
   already disagree, which is exactly the drift that makes an audit expensive.
4. **Perform one real TEST-mode payment** — a ₹1 lifetime order, then a monthly
   subscription charge, one pause/resume, one cancel, and one refund — and
   confirm the ledger and `entitlements` react. This is the only test that
   exercises the real Razorpay payload shape, particularly `notes` propagation
   on `subscription.charged` for identity resolution.
5. **Then, and only then, consider LIVE.** The `rzp_live_` keys, the
   `RAZORPAY_WEBHOOK_SECRET`, and a separate live webhook must be provisioned as
   a distinct step. This audit makes no LIVE recommendation and performed no
   LIVE operation.
6. Consider an `attempts` ceiling for permanently-invalid events (F24-4) and
   folding `renewEntitlement` into `grantEntitlement` (F24-5) as routine
   hygiene. Neither is urgent.
7. Consider storing a per-webhook event name in the ledger. It would have made
   the `attempts=2` reconstruction in this report a direct read rather than an
   inference from content-lengths.

## Constraint Compliance

- **TEST mode only.** No LIVE-mode operation. No Razorpay API object created,
  read for mutation, modified or deleted; the single API call was a read-only
  `GET /v1/webhooks` that was rejected with `401` before returning any data.
- **No Dashboard change.** The Dashboard was not accessed at all.
- **No secrets exposed.** No key, secret or token value appears in this document,
  in the test suite, or in any committed file. Credential *shapes* only
  (`rzp_test_` prefix, non-empty/empty) are reported. `supabase/config.toml`
  contains no credential and is test-asserted to contain none.
- **No unnecessary mutation.** One file created, one test file extended. No
  migration, no function source, no remote state, no entitlement row.
- **Every claim is labelled** as verified-with-evidence or unverified. Nothing in
  this report is inferred from source code alone and presented as deployment
  fact, except where explicitly marked as an inference (F24-3's event list, and
  the secret-presence reasoning in section 3).
