# License API (`@soravo/license-api`)

Server-side payment boundary for Soravo.

This package provides the server-authoritative payment skeleton delivered by CLOUD-009 (accepted ADR-024). It owns the sole `createOrder` surface through which paid-access initiations pass, ensuring that the server — never the client — resolves the product catalog, sets the price, and isolates the provider implementation.

## Scope and constraints

CLOUD-009 ships the skeleton only:

- **No live Razorpay integration** — no SDK import, no API calls, no signature verification (reserved for CLOUD-010).
- **No webhook handling** — no idempotency ledger, no `orders` table, no HMAC verification (reserved for CLOUD-011).
- **No entitlement writes** — the `OrderInitiation` result never activates an entitlement; entitlement writes remain the exclusive province of CLOUD-012 via the `service_role` boundary (ADR-012).
- **No database migration** — the payment-history table, webhook-records, and reconciliation schema are deferred to CLOUD-010/011; CLOUD-009 adds zero SQL.
- **No HTTP listener** — the skeleton is a TypeScript library; deployment as an HTTP service is deferred to a later phase.

The server is the price authority. The public `createOrder` accessor accepts only a server-derived `userId` and a `productId`; it ignores any client-supplied `amountMinor`, `currency`, `status`, `verified`, `paidAt`, `entitlement`, or `reference` and returns only read-only initiation facts (never authoritative state).

## Product catalog

Prices are documented as `evaluated_target` values (USD 12.00/month, USD 50.00 lifetime) per `01_PRD.md §8`. They are server-resolved at construction and cannot be influenced by callers. No Razorpay environment variables are read; the `.env.example` documents `RAZORPAY_*` names as reserved.

## Provider abstraction

`createPaymentProvider({ kind }, nodeEnv)`:

- `kind: "dev"` — returns a deterministic, in-process test fake (`DevPaymentProvider`) in non-production environments; refused with `invalid_configuration` under `NODE_ENV=production`.
- `kind: "razorpay"` — throws `provider_not_implemented` (CLOUD-010).
- Unknown kinds — throw `invalid_configuration`.

The Razorpay adapter arriving in CLOUD-010 will receive only `CreateOrderRequest` (server-resolved amount/currency) and must never leak merchant credentials into the public surface.

## Entitlement boundary

`PaymentService.createOrder` is the only exported class surface (its prototype is locked to `["constructor", "createOrder"]`). It never writes to the database and never creates, modifies, or reads entitlements. The separation is enforced structurally and verified by tests.

## Development

```
pnpm install
pnpm --filter @soravo/license-api typecheck
pnpm --filter @soravo/license-api lint
pnpm --filter @soravo/license-api test
```

All tests run with Vitest against an in-process dev provider; no secrets or network calls are made.

## Docs

- Decision record: `decisions/ADR-024-payment-service-skeleton.md`
- Entitlement authority: `decisions/ADR-012-supabase-entitlements-authorization.md`
- Secret inventory: `14_ENVIRONMENT_AND_SECRETS.md`
- Pricing reference: `01_PRD.md §8`
- Task definition: `05_TASK_BREAKDOWN.md CLOUD-009`