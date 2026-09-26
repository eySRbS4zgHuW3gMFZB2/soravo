# RAZORPAY-PAYMENT-ARCHITECTURE-021

## Objective

Deterministic audit of Soravo's current payment, entitlement, webhook, and account architecture against Razorpay, plus the exact mapping of Soravo catalogue objects to Razorpay objects.

**Scope constraints honoured:**
- No Razorpay Products, Plans, Subscriptions, Payment Links, Orders, or any other Dashboard object created.
- No LIVE credentials used. No deployment. No API mutation calls.
- Source of truth is the repository, not the Razorpay Dashboard.
- Every structural claim below is anchored to `file:line`.

## External Verification Performed

Two claims were verified against Razorpay's official documentation before being recorded, and **one earlier working assumption was found to be wrong and corrected**.

| Claim | Verdict | Source |
|---|---|---|
| Razorpay Orders support `USD` | **CONFIRMED — USD is supported** | `razorpay.com/docs/api/orders/create` |
| Non-default currency requires account enablement | **CONFIRMED** | `razorpay.com/docs/payments/international-payments/faqs` |
| Settlement currency is INR for all transactions | **CONFIRMED** | International Payments FAQ |
| `payment.captured` payload contains the `order` entity | **REFUTED** | `razorpay.com/docs/webhooks/payments` |

### Correction 1 — USD is NOT a hard technical blocker

The working assumption that Razorpay is INR-only is **incorrect**. Razorpay Orders accept `USD` natively:

> "ISO code for the currency in which you want to accept the payment. ... To accept currencies other than your default, enable International payments under Account & Settings on the Razorpay Dashboard."
> — `razorpay.com/docs/api/orders/create`

> "You must get the international payments feature enabled on your Razorpay account to accept payments in currencies other than INR. ... No currency conversion is required. You can pass the payment amount in the native currency."
> — International Payments FAQ

`SoravoProduct.currency` (`services/license-api/src/payment/catalog.ts:4`) and the passthrough in `RazorpayProvider.createOrder` are therefore **structurally valid**.

What actually remains is:
1. **Account enablement gate** — "International payments" must be enabled under Account & Settings. This is a Dashboard setting and is **out of scope** for this task; it was not changed.
2. **Settlement/FX business decision** — settlement currency is INR. Razorpay returns `base_currency` (defaults INR) and `base_amount` on the payment when `currency != INR`. Soravo must decide whether INR settlement with FX conversion is acceptable, and must not treat `base_amount` as a catalogue price.
3. **Test-order evidence is INR-only** — the prior verification order was 100 paise / INR (`docs/spec-v3/RAZORPAY-AUTHENTICATION-CHECK-020.md:53`). That is a *convenience* choice made because it is the minimum permitted amount, not evidence that USD is rejected.

### Correction 2 — `payment.captured` carries no `order` entity

Razorpay documents the payload difference explicitly:

> "This payload only contains the payment entity, providing details specific to the transaction, such as the amount, currency, and payment method." — `payment.captured`
> "This payload includes both order and payment entities, making all relevant information available in a single payload." — `order.paid`
> — `razorpay.com/docs/webhooks/payments`

`payment.captured` sets `contains: ["payment"]`. This is the root cause of Finding 1.

## Current Architecture

### Catalogue (`services/license-api/src/payment/catalog.ts:4`)

| Product ID | Plan | Amount (minor units) | Currency | Status |
|---|---|---|---|---|
| `soravo_monthly` | `monthly` | 1200 | USD | `evaluated_target` |
| `soravo_lifetime` | `lifetime` | 5000 | USD | `evaluated_target` |

Both products are `status: "evaluated_target"` — **not purchasable**. No Razorpay Product, Plan, or Price ID is referenced anywhere in the repository; the catalogue is pure Soravo-side data (`catalog.ts:13`).

### Payment provider surface (`services/license-api/src/payment/types.ts:37`)

`PaymentProvider` exposes exactly one method:

```ts
createOrder(request: CreateOrderRequest): Promise<CreatedOrder>;
```

There is no `createPlan`, `createSubscription`, `cancelSubscription`, `refund`, or `fetchPayment` method. `RazorpayProvider.createOrder` forwards the catalogue currency verbatim to `POST /v1/orders` (`razorpay-provider.ts:44`).

`services/license-api/src/index.ts` is a barrel export only — it starts no server and registers no route. **There is no HTTP endpoint anywhere in the repository that a checkout page could call to create an order.** The payment layer is currently unreachable from the website.

### Which recurring model does the current implementation match?

The code unambiguously implements **Option B (application-managed recurring)**, not Option A (Razorpay Plan + Subscription):

- Both products route through the same one-shot `createOrder` (`service.ts`).
- Monthly is a *single* Order that grants a flat 30-day window (`razorpay-webhook/index.ts:134`).
- No Plan, Subscription, `subscription_id`, or recurring-charge identifier exists in any migration or type.

**However, this is an observed implementation fact, not an approved architecture decision.** The written specifications do not resolve the A/B question, so the *intended* model remains ambiguous and is not settled by this audit. Note also that B is only partially realised: a genuinely recurring Razorpay charge needs an authorised mandate and a charge cycle, which a one-shot Order plus a hardcoded 30-day timer does not provide.

### Entitlements (`supabase/migrations/20260915150000_establish_entitlements.sql:90`)

| Property | Value |
|---|---|
| Uniqueness | `(user_id, product)` — one row per product |
| `plan` | `monthly` \| `lifetime` |
| `expires_at` | set for monthly, `NULL` for lifetime |
| Provider refs | `provider`, `provider_customer_ref`, `provider_payment_ref` |
| Missing refs | no `provider_order_ref`, no `provider_subscription_ref` |

## Required Razorpay Objects (Mapping)

### Objects actually required

| Soravo object | Razorpay object required | Rationale |
|---|---|---|
| `soravo_lifetime` | **Order** only | One-time payment. No Product, Plan, or Payment Link is needed; `notes.product_id` already carries the mapping. |
| `soravo_monthly` | **Undecided** | Option A ⇒ **Plan + Subscription** (plus Order per cycle). Option B ⇒ application-managed **Order** per cycle with mandate/charge handling. The spec does not choose. |
| — | **Razorpay Product: NOT required** | `services/license-api` never references a `product` entity. Product in Razorpay is a catalogue-organisation convenience; Soravo already has its own catalogue. |
| — | **Payment Link / Payment Page: NOT required** | Code integrates via Checkout against an Order. |

### Objects explicitly withheld (per task constraint)

No Product, Plan, Subscription, Payment Link, or any other Dashboard object was created. The only Razorpay object that exists from prior work is the single 1 INR TEST Order recorded in `RAZORPAY-AUTHENTICATION-CHECK-020.md:53`.

## Webhook Readiness

Handler: `supabase/functions/razorpay-webhook/index.ts` (272 lines).

### What is correct

- Secret loading fails closed if `RAZORPAY_WEBHOOK_SECRET` or `RAZORPAY_SERVICE_ROLE_KEY` is absent (`index.ts:4`).
- HMAC-SHA256 over the **raw body** is computed and compared (`index.ts:85`), which is the correct input.
- Service-role access is used, so RLS does not block entitlement writes.
- `webhook_events` has RLS enabled with no client grants (`supabase/migrations/20260926000000_establish_webhook_events.sql:35`).
- Non-POST and missing/invalid signature return 400/405 (`index.ts:202`).
- Entitlement upsert failure throws rather than being swallowed (`index.ts:155`).

### Findings

#### F1 — CRITICAL: every `payment.captured` silently grants nothing

Three lines compose into a guaranteed no-op:

```ts
// index.ts:240 — `order` is undefined for payment.captured
const { payment, order } = payload.payload;

// index.ts:124
const userId = order?.notes?.user_id;   // undefined

// index.ts:128
if (!userId) {
  console.error("Missing user_id in order notes", ...);
  return;                                 // no entitlement written
}
```

`payment.captured` and `payment.authorized` payloads contain only the `payment` entity (see Correction 2). `order` is therefore always `undefined`, `userId` is always `undefined`, and the handler returns at `index.ts:131` **before** the upsert at `index.ts:138`.

The failure is silent and unrecoverable:
- `index.ts:254` then logs `webhook.processed` and returns **HTTP 200**.
- Razorpay sees success and never retries.
- No entitlement exists; the customer paid and received nothing.
- No user-visible error surfaces anywhere.

This is worse than a crash: a 500 would trigger Razorpay retries. As written, it fails permanently and quietly for **every** successful payment.

Note that `payment.notes` **is** present in the payload and Razorpay copies Order notes onto the Payment at creation, so `payment.notes.user_id` is a viable fix. The robust options are (a) subscribe to `order.paid`, which carries both entities, or (b) fetch the Order via `GET /v1/orders/{id}` using `payment.order_id` and read its authoritative `notes`.

#### F2 — CRITICAL: event is marked processed before processing, blocking all replay

```ts
// index.ts:229 — pre-check
if (await isEventProcessed(eventId)) { return new Response("OK", { status: 200 }); }

// index.ts:238 — marked processed BEFORE the handler runs
await markEventProcessed(eventId, payload.event);

// index.ts:240 — handler runs after
```

Combined with F1, a captured payment is durably recorded as processed at line 238 and then dropped at line 131. Replay is refused at line 229, so the event can never be reprocessed.

`index.ts:117` additionally swallows unique-violation `23505` and returns normally, so a concurrent duplicate that passes the line-229 pre-check is silently allowed to proceed — TOCTOU. A failed-but-recorded event can never be retried, and a duplicate can be processed twice.

Required: a state machine (`processing` / `completed` / `failed`) with reclaim, and `processed_at` written only on success.

#### F3 — CRITICAL: entitlement `product` key does not match the catalogue

```ts
// index.ts:141
product: "soravo",
```

But the catalogue defines `soravo_monthly` and `soravo_lifetime` (`catalog.ts:4`), and the entitlements table is unique on `(user_id, product)` (`20260915150000_establish_entitlements.sql:90`, constraint `entitlements_one_current_per_user_product`).

Two consequences:
1. Any consumer querying by catalogue ID (`product = 'soravo_monthly'`) will never match a row stored as `"soravo"`.
2. Because uniqueness is `(user_id, product)`, a monthly purchase and a lifetime purchase collapse into **one** row. The second purchase silently overwrites the first — a customer who buys monthly then lifetime loses their lifetime `expires_at = NULL` state, and vice versa.

#### F4 — CRITICAL: `payment.authorized` grants a full entitlement

```ts
// index.ts:76
const SUCCESS_EVENTS = new Set(["payment.captured", "payment.authorized"]);
```

An authorised payment is **not** captured. Funds may never settle, yet the handler performs the same upsert. This grants paid entitlements against money that was never collected. `payment.authorized` must not activate entitlements.

#### F5 — HIGH: dangerous silent default downgrades lifetime to monthly

```ts
// index.ts:125
const productId = order?.notes?.product_id ?? "soravo_monthly";
```

If notes are lost, a **lifetime** purchase is silently converted into a 30-day monthly entitlement. Failsafe defaults must fail *closed* (reject), not guess a cheaper product.

#### F6 — HIGH: no amount or currency verification

The handler never compares `payment.amount` / `payment.currency` against the catalogue price for the resolved product. Any captured amount — including a heavily discounted, partial, or test-mode order — grants the full entitlement. Order notes are client-supplied metadata, not a price authority.

`payment.order_id` is read at `index.ts:240` but **never persisted**. There is no `provider_order_ref` column and no local orders table, so no reconciliation against Razorpay is possible after the fact.

#### F7 — HIGH: `provider_customer_ref` stores PII instead of a Razorpay reference

```ts
// index.ts:145
provider_customer_ref: payment.email,
```

This stores an email address in a provider-reference column, is nullable because `email` is not guaranteed on every payment, and discards the `customer_id` (`cust_...`) that Razorpay actually provides.

#### F8 — HIGH: "monthly" is a one-shot 30-day pass, not a subscription

```ts
// index.ts:134
const expiresAt = plan === "monthly"
  ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  : null;
```

One Order charges once and grants a hardcoded 30 days with no renewal path. There is no stacking or proration: a repeat purchase resets `starts_at` and `expires_at`, discarding remaining time. This is the mechanical evidence that Option A is not implemented.

#### F9 — MEDIUM: unguarded `payment` access crashes on non-payment events

```ts
// index.ts:227 — outside the try/catch that begins at 237
const eventId = `${payload.event}:${payload.payload.payment.id}`;
```

Razorpay delivers many event types (`order.paid`, `refund.processed`, `dispute.*`, `subscription.*`, settlement events). The moment any of those is delivered — for example once a subscription or refund event is enabled in Dashboard — this line dereferences `undefined` and throws *before* the handler's error handling, producing an unhandled rejection and a 5xx that Razorpay will retry indefinitely.

#### F10 — MEDIUM: entitlements are never revoked on refund

`FAILURE_EVENTS` (`index.ts:81`) covers only `payment.failed`. `refund.processed` and `refund.failed` are unhandled and fall through to the `webhook.unhandled` branch (`index.ts:247`). A refunded customer retains `status: "active"` access forever. Dispute and chargeback events are equally unhandled.

#### F11 — MEDIUM: hand-rolled constant-time comparison

```ts
// index.ts:92
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (...) { result |= a.charCodeAt(i) ^ b.charCodeAt(i); }
  return result === 0;
}
```

A JS char-code loop is a downgrade from platform primitives, and the length early-return leaks length. Use `crypto.subtle.importKey` + `crypto.subtle.verify` for constant-time comparison.

#### F12 — MEDIUM: no replay-window validation

Only `event_id` de-duplication exists (`index.ts:227`). There is no tolerance check on `payload.created_at`, so a captured raw webhook body can be replayed indefinitely. Acceptable only in combination with F2's completion-state fix.

### Webhook verdict

**Not ready.** F1 alone means the handler cannot grant an entitlement for any real payment. F1–F4 are each independently sufficient to block production activation.

### Event coverage required (once the model is decided)

| Event | Current | Required for |
|---|---|---|
| `payment.captured` | handled (broken, F1) | Both options |
| `payment.authorized` | handled (wrong, F4) | Should not grant entitlement |
| `payment.failed` | logged only | Both options |
| `order.paid` | not handled | Carries order + payment entities; simplest F1 fix |
| `refund.processed` | not handled | Revoke/downgrade entitlement |
| `refund.failed` | not handled | Failure visibility |
| `subscription.*` | not handled | **Only if Option A is chosen** |
| `dispute.*` / `charge.refunded` | not handled | Chargeback handling |

## Account Readiness

### Desktop (substantial infrastructure present)

- Supabase auth with PKCE, refresh, and secure token storage; account state, device/session listing and revocation, entitlement retrieval, and offline state with a cached snapshot — `apps/desktop/src-tauri/src/account.rs:1`.
- DTOs for account snapshot, identity, entitlement, and device models — `apps/desktop/src-tauri/src/commands/account.rs:9`.
- `AccountPanel` is imported and rendered — `apps/desktop/src/components/account-panel.tsx:1`, mounted via `apps/desktop/src/app.tsx`.

### Website

- Authenticated routes `/login` (`app.tsx:64`), `/account` (`:65`), `/reset-password` (`:66`) — **no `/signup` route exists.** There is no sign-up path in the website routing.
- **No `/signup` route exists.** There is no sign-up path in the website routing.

### Cross-client sync

Website and desktop both resolve identity from the same Supabase `auth.users` and read the same `entitlements` table, so the **data layer** for sync is genuinely shared. This has not been verified end-to-end: no test exercises sign-in on one client and entitlement retrieval on the other.

### Gaps

1. **No sign-up flow on either client.** Users cannot self-register from the product UI.
2. **No billing UI and no checkout wiring.** `license-api` exposes no callable endpoint (`index.ts` is a barrel), so nothing in the product can start a payment.
3. **Entitlement lookup would fail today** even if a payment succeeded, because the stored `product` value (`"soravo"`, F3) does not match the catalogue IDs.
4. `RAZORPAY_WEBHOOK_SECRET` is still unset per `RAZORPAY-AUTHENTICATION-CHECK-020.md:79`, so no live delivery has ever been received.

## Security Review

- Credentials are read from environment only, fail closed, and are never echoed (`index.ts:4`).
- No secret is printed by this audit. `docs/spec-v3/RAZORPAY-SECRET-VALUE-019C.md` and the key identifier recorded in `PROGRESS.md` are treated as sensitive and are not reproduced here.
- The service-role key is correctly confined to the Edge Function; `webhook_events` grants nothing to clients.
- Principal risk is not credential handling but **silent data-integrity failure** (F1–F4): money taken, entitlement never granted, no error surfaced.

## Exact Next User Action

Two decisions are required, and neither can be inferred from the repository:

1. **Recurring model — Option A or Option B.**
   - *A:* Razorpay Plan + Subscription. Requires creating Plan/Subscription objects (currently withheld).
   - *B:* Application-managed recurring Orders. No new object types, but requires mandate authorisation, a charge cycle, and renewal logic that does not exist.
   The current code implements neither completely; it implements a one-shot Order plus a 30-day timer.

2. **International payments + settlement.**
   - Confirm whether to enable International Payments on the Razorpay account (a Dashboard action, deliberately not performed here).
   - Confirm that INR settlement with Razorpay-side FX conversion is acceptable for a USD-priced catalogue, and decide how `base_amount` is reconciled against catalogue prices.

Additionally, decide whether to fix the webhook **before** any end-to-end TEST payment is attempted. Recommendation: yes — F1 guarantees that a real TEST payment would appear to succeed while granting nothing, which would produce a misleading verification result.

## Exact Next OpenCode Task

> **RAZORPAY-WEBHOOK-HARDENING-022** — Repair `supabase/functions/razorpay-webhook/index.ts` against findings F1–F12 in `RAZORPAY-PAYMENT-ARCHITECTURE-021.md`, TEST mode only, no Dashboard object creation, no deployment.
>
> Scope: `supabase/functions/razorpay-webhook/index.ts`; new migration for `webhook_events` state machine; `services/license-api/src/payment/catalog.ts` product-key alignment; `entitlements` order/subscription reference columns.
>
> Acceptance: a signed `payment.captured` fixture with no `order` entity still resolves the user; duplicate and concurrent delivery grant exactly one entitlement; replay after failure succeeds; `payment.authorized` grants nothing; unknown event types return 200 without a 5xx loop; refund revokes entitlement; `crypto.subtle` verifies the signature.

This task must be preceded by the two user decisions above for the event-coverage portion; F1–F4 and F9–F12 can proceed independently of them.

## Files Changed

- `docs/spec-v3/RAZORPAY-PAYMENT-ARCHITECTURE-021.md` — created (this file)
- `PROGRESS.md` — appended

No source code, schema, or configuration was modified. No build or test target is affected.
