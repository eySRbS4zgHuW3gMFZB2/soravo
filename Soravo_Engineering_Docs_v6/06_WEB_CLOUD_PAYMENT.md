# 06 — Web / Cloud / Payment Contract
Website: React + TypeScript + Vite + React Router + Tailwind + shadcn/ui. Cloudflare Pages remains established hosting unless ADR changes it.

Auth: Supabase Auth with PKCE, persisted session, auto-refresh and URL session detection. Do not invent a second identity system.

Client RLS: users read owned data; no client entitlement writes; service role is server-only.

Checkout endpoint:
POST `/functions/v1/payment-checkout`
Authorization: Bearer Supabase JWT
Request: `{productId, currency}`.
Server derives user ID from JWT and price/product from `@soravo/payment-domain`.

Lifetime response: orderId + public keyId + amount + currency + productId.
Monthly response: subscriptionId + public keyId + currency + productId.

Frontend may load Razorpay Checkout.js and use public keyId. It must never receive secret key, webhook secret or service role.

Webhook: `/functions/v1/razorpay-webhook`, Supabase JWT verification disabled, Razorpay HMAC verification required. Durable `webhook_events` ledger prevents duplicate business effects.

Entitlement semantics:
lifetime has no expiry unless revoked; monthly may be cancelled while remaining valid through expiry; renewal extends expiry. Database constraints are authoritative.

No third price catalog may exist.
