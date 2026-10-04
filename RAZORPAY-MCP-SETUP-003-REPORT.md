# RAZORPAY-MCP-SETUP-003-REPORT.md

**Task**: RAZORPAY-MCP-SETUP-003 — Authenticate TEST merchant and verify read-only access
**Status**: AUTHENTICATION BLOCKED (human-deferred) — no live call made, no state changed
**Created**: 2026-09-28
**OpenCode**: v1.18.31

Secret states are reported as EXISTS/MISSING only. No credential values or
derived credential values appear in this report, in configuration, or in the
repository.

---

## 1. Configuration path

`/home/maya/.config/opencode/opencode.json` (global OpenCode config, outside git).

## 2. MCP server name

`razorpay`

## 3. Endpoint

`https://mcp.razorpay.com/mcp` (official Razorpay Remote MCP, Streamable HTTP;
legacy `/sse` deprecated 2025-08-13).

## 4. Authentication mechanism

Official merchant-token model: `Authorization: Basic <base64(TEST_KEY_ID:TEST_KEY_SECRET)>`
header on the Remote endpoint (OAuth is the documented alternative; Basic
merchant token is the configured path). TEST-only key pair required
(Key ID prefix `rzp_test_*`; LIVE keys must never be used).

## 5. Credential variable name

`RAZORPAY_MCP_AUTH_HEADER` — referenced by the config as
`{env:RAZORPAY_MCP_AUTH_HEADER}`.

## 6. Credential-value exposure check

- Config file read in full: the `Authorization` header contains **only** the
  variable reference `{env:RAZORPAY_MCP_AUTH_HEADER}`. No key, secret, token,
  base64 blob, or derived value present. ✅
- Host environment: `RAZORPAY_MCP_AUTH_HEADER` = MISSING (verified via
  presence-only check; value never printed).
- Repository-wide: no Razorpay credential values stored; this report contains
  none. ✅

## 7. Discovery result

`opencode mcp list` (2026-09-28): `razorpay → needs authentication
(https://mcp.razorpay.com/mcp)` — server APPEARS, endpoint resolves.
DISCOVERED. ✅ (Prior `mcp debug` also confirmed HTTP 401 + MCP
resource-metadata from the endpoint: DNS/TLS/HTTP all OK.)

## 8. Authentication result

**NOT AUTHENTICATED — BLOCKED (human-deferred).**

- Phase 2 gate: the human was given placeholder-only export instructions and
  explicitly answered "Not yet, deferred".
- No token was requested, pasted, echoed, or handled by the agent at any point.
- `opencode mcp auth razorpay` (OAuth browser flow) was NOT run — account
  binding is a human-escalation step per doc 15 and could link a non-TEST
  identity.
- No restart/reload was performed (nothing to reload without credentials).

## 9. Read-only verification result

**NOT PERFORMED — BLOCKED** (authentication missing; there is no authenticated
session to call against).

- Intended harmless call (reserved for the authenticated follow-up):
  `fetch_all_orders` with minimal page size, or `fetch_all_settlements`.
- NOT `AUTHENTICATED_BUT_READ_ONLY_E2E_DEFERRED`: that verdict requires an
  authenticated session with only ID-gated reads available. This session is
  unauthenticated, so the correct state is BLOCKED pre-auth.
- No object ID was fabricated; no mutation was executed to obtain one.

## 10. TEST / LIVE / UNKNOWN determination

**UNKNOWN** — no authenticated merchant session exists, so no environment
signal is available. Per the task rule, all further Razorpay operations are
STOPPED. (Had auth succeeded, the verdict would come from the read-only
response's account/mode attributes, expecting TEST.)

## 11. Mutation tools intentionally NOT executed

None invoked. Explicitly excluded per the task ban list (create/capture order,
create payment link, create refund, create/close QR code, create settlement,
create payout, initiate payment, modify notes, revoke token, submit/resend
OTP). The full Remote mutation inventory (`capture_payment`,
`update_payment`, `create_payment_link`, `create_payment_link_upi`,
`send_payment_link`, `update_payment_link`, `create_order`, `update_order`,
`update_refund`, `create_qr_code`) was reviewed from documentation only.

## 12. Exact remaining limitation

A single human action unblocks the whole chain: export
`RAZORPAY_MCP_AUTH_HEADER` (derived locally from a TEST-only `rzp_test_*`
key pair, placeholder-only command already provided in-session) in the shell
that runs OpenCode, restart OpenCode, then re-run this task from Phase 3.
Until then: discovery ✅ / auth ❌ / read ❌ / account-match ❌ → per doc 11,
Razorpay MCP status = **BLOCKED**.

---

**Scope compliance**: no application source, Supabase, Edge Functions, CI, or
dependencies modified. Single repo artifact is this report. Not committed, not
pushed. STOP.
