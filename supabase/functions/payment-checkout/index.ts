// Payment checkout Edge Function — authenticated HTTP boundary between
// website and the Razorpay provider. All decisions live in `./checkout.ts`
// (runtime-agnostic, unit-tested); this file owns Deno wiring only:
// environment read + serve. This mirrors the razorpay-webhook layout.
//
// Security model:
//   * The Supabase platform JWT gate (`verify_jwt = true`, declared in
//     `supabase/config.toml`) verifies the Auth JWT before the handler runs.
//   * Defense-in-depth: `verifyAuthToken` (checkout.ts) re-confirms the token
//     against the authoritative Supabase Auth API (`GET /auth/v1/user`) and
//     the confirmed user id is the checkout identity. Manually decoded JWT
//     claims are a structural pre-check only, never authentication.
//   * The authenticated user ID is derived server-side — the browser never
//     provides user_id, amount, or Razorpay order/subscription IDs.
//   * Product and currency are validated against the server-authoritative
//     `@soravo/payment-domain` catalog; the charged amount always comes from
//     the catalog.
//   * Razorpay credentials (keyId, keySecret) remain server-side only, and
//     only TEST-mode keys (`rzp_test_` prefix) are accepted.
//   * Monthly Razorpay Plan IDs come from deployment configuration
//     (`RAZORPAY_PLAN_SORAVO_MONTHLY_<CURRENCY>`); they are never fabricated.
//
// API contract (authoritative: Soravo v6 §06):
//   POST /payment-checkout
//   Authorization: Bearer <supabase_auth_jwt>
//   Content-Type: application/json
//
//   Request body:
//   {
//     productId: "soravo_monthly" | "soravo_lifetime",
//     currency: "INR" | "USD" | "CAD" | "EUR" | "AUD"
//   }
//
//   Response (200, lifetime):
//   { orderId, keyId, amount, currency, productId }
//   Response (200, monthly):
//   { subscriptionId, keyId, currency, productId }
//
// Error responses:
//   401 — missing or invalid JWT (platform gate or Auth API confirmation)
//   400 — malformed request, unsupported product/currency
//   503 — monthly plan not configured for the currency
//   500 — not configured (incl. non-TEST credentials), Auth verification
//         unavailable, or provider failure (safe errors without leakage)

import { createCheckoutHandler, readCheckoutEnv } from "./checkout.ts";

const env = readCheckoutEnv((name: string) => Deno.env.get(name));

if (!env) {
  console.error("payment checkout endpoint not configured");
}

Deno.serve(createCheckoutHandler(env));
