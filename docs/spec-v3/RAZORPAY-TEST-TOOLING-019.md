# RAZORPAY-TEST-TOOLING-019: Test Credentials and Tooling

**Date:** 2026-09-26  
**Status:** DOCUMENTED — CREDENTIALS BLOCKED

---

## 1. Skill Selection Gate

| Skill | Selected | Rationale |
|-------|----------|-----------|
| `github` | ✅ YES | Used for GitHub Actions CI configuration, secret management patterns |
| `security-guidance` | ✅ YES | Applied for credential handling, secret scanning, environment variable security |
| `supply-chain-risk-auditor` | ❌ NO | Not directly applicable; no new dependencies added in this task |
| `mcp-server-review` | ✅ YES | Evaluated Razorpay MCP server (already audited in 018) |
| `supabase` | ✅ YES | Webhook handler uses Supabase Edge Functions; secret configuration patterns |

**Note:** No Razorpay-specific or payment-specific skills exist in the available skills list. All analysis performed using official Razorpay documentation and repositories.

---

## 2. Official Tools Evaluated

### 2.1 Razorpay MCP Server (Remote)

**Source:** https://mcp.razorpay.com/mcp (official remote MCP server)

| Capability | MCP Support | TEST Mode |
|------------|-------------|-----------|
| Orders (create, fetch, list, update, payments) | ✅ | ✅ |
| Payments (fetch, list, capture, update, card details) | ✅ | ✅ |
| Refunds (fetch, list, payment-specific) | ⚠️ Partial (no `create_refund`) | ✅ |
| Payment Links (full CRUD + send) | ✅ | ✅ |
| QR Codes (create, fetch, list, payments) | ⚠️ Partial (no `close_qr_code`) | ✅ |
| Settlements (fetch, recon details) | ✅ | ✅ |
| Tokens (fetch, revoke) | ✅ | ✅ |
| **Products** | ❌ | ❌ |
| **Plans** | ❌ | ❌ |
| **Subscriptions** | ❌ | ❌ |
| **Customers** | ❌ | ❌ |
| **Invoices** | ❌ | ❌ |
| **Webhooks** | ❌ | ❌ |
| **Disputes** | ❌ | ❌ |
| **Route / Smart Collect** | ❌ | ❌ |

**Authentication:** Basic Auth via `Authorization: Basic <base64(key:secret)>`
**Configuration:** Remote via `npx mcp-remote` with `RAZORPAY_AUTH_TOKEN` environment variable
**Read-Only Mode:** Supported via `--read-only` flag

### 2.2 Razorpay CLI (Official)

**Source:** https://github.com/razorpay/razorpay-cli | https://razorpay.com/cli/

**Installation:**
```bash
# Quick install (macOS/Linux)
curl -fsSL https://razorpay.com/cli/latest/install.sh | bash

# Homebrew (macOS)
brew install razorpay/razorpay-cli/razorpay

# Scoop (Windows)
scoop bucket add razorpay https://github.com/razorpay/scoop-razorpay-cli.git && scoop install razorpay
```

**Configuration:**
```bash
# Interactive
razorpay configure

# Non-interactive
razorpay configure --key-id rzp_test_XXXX --key-secret XXXX
```

**Credential Storage:** `~/.razorpay/config.yaml` (file) or environment variables:
```bash
export RAZORPAY_KEY_ID=rzp_test_XXXX
export RAZORPAY_KEY_SECRET=XXXX
```

**Capabilities (Complete Razorpay API Coverage):**

| Group | Commands | Soravo Relevance |
|-------|----------|------------------|
| `orders` | create, fetch, list, update, payments | ✅ Core payment flow |
| `payments` | fetch, list, capture, card, update, downtime | ✅ Payment verification |
| `refunds` | create, fetch, list, payment-specific | ✅ Refund handling |
| `customers` | create, fetch, list, update | ⚠️ Future subscriptions |
| `invoices` | full CRUD + issue, notify, line items | ⚠️ Future invoicing |
| `payment-links` | create, fetch, list, update, send | ✅ Alternative to orders |
| `qr-codes` | create, fetch, list, payments, close | ⚠️ Future QR payments |
| `subscriptions` | full lifecycle + plans, addons, offers | ⚠️ Future subscriptions |
| `settlements` | fetch, list, recon details | ⚠️ Reconciliation |
| `disputes` | fetch, list, update | ⚠️ Dispute handling |
| `documents` | upload, fetch, list | ❌ Not needed |
| `route` | linked accounts, transfers | ❌ Not needed |
| `smart-collect` | virtual accounts | ❌ Not needed |

**Webhook Management:** ❌ **NOT SUPPORTED** — Must use Dashboard or REST API directly

---

## 3. MCP vs CLI Capability Comparison

| Dimension | MCP (Remote) | CLI (Official) | Winner for Soravo |
|-----------|--------------|----------------|-------------------|
| **Orders** | ✅ Full | ✅ Full | CLI (scriptable, CI-friendly) |
| **Payments** | ✅ Full | ✅ Full | CLI (better output formats) |
| **Refunds** | ⚠️ Read-only | ✅ Full (create) | **CLI** |
| **Payment Links** | ✅ Full | ✅ Full | CLI |
| **QR Codes** | ⚠️ Read-only | ✅ Full | **CLI** |
| **Products** | ❌ | ❌ | Neither (REST API only) |
| **Plans** | ❌ | ✅ (via subscriptions) | **CLI** |
| **Subscriptions** | ❌ | ✅ Full | **CLI** |
| **Customers** | ❌ | ✅ Full | **CLI** |
| **Invoices** | ❌ | ✅ Full | **CLI** |
| **Webhooks** | ❌ | ❌ | Neither (Dashboard/REST API) |
| **Settlements** | ✅ Read-only | ✅ Full | CLI |
| **Disputes** | ❌ | ✅ Full | **CLI** |
| **Automation/CI** | Limited (MCP protocol) | ✅ Native shell | **CLI** |
| **Output Formats** | JSON (MCP) | JSON, YAML, TOML | **CLI** |
| **Test Mode Support** | ✅ | ✅ | Tie |
| **Credential Management** | Env var (auth token) | Config file + env vars | CLI (more flexible) |
| **Operator/Engineer Use** | ✅ (IDE integration) | ✅ (terminal) | Both |

**Recommendation:** Use **CLI for engineering automation, CI/CD, and resource management**. Use **MCP for IDE-assisted exploration and ad-hoc queries**. Both require TEST credentials.

---

## 4. Credential Architecture

### 4.1 Required Secrets (NEVER COMMIT)

| Secret Name | Format | Scope | Where Used |
|-------------|--------|-------|------------|
| `RAZORPAY_KEY_ID` | `rzp_test_XXXXXXXXXXXX` | Test mode API key ID | MCP auth token, CLI config, license-api, webhook verification |
| `RAZORPAY_KEY_SECRET` | Alphanumeric secret | Test mode API secret | MCP auth token, CLI config, license-api |
| `RAZORPAY_WEBHOOK_SECRET` | Alphanumeric (user-defined) | Webhook signature verification | Supabase Edge Function, Razorpay Dashboard webhook config |

### 4.2 Secret Placement by Component

| Component | Secrets Required | Mechanism |
|-----------|------------------|-----------|
| **MCP Server (OpenCode)** | `RAZORPAY_AUTH_TOKEN` (derived) | Environment variable in OpenCode config |
| **Razorpay CLI** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | `~/.razorpay/config.yaml` OR env vars |
| **license-api (server)** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Process environment (Supabase Edge Function secrets) |
| **Webhook Handler (Supabase)** | `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secrets |
| **GitHub Actions CI** | None (test credentials not in CI) | N/A — TEST credentials are local-only |

### 4.3 Environment Variable Patterns (Per docs/spec-v3/14_ENVIRONMENT_AND_SECRETS.md)

**Development (.env.local files — gitignored):**
```bash
# services/license-api/.env.local (server-only, NEVER in website/desktop)
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXX
RAZORPAY_WEBHOOK_SECRET=XXXXXXXXXXXXXXXXXXXX
```

**OpenCode MCP Config:**
```json
{
  "razorpay-mcp": {
    "type": "local",
    "command": ["npx", "-y", "mcp-remote"],
    "args": [
      "https://mcp.razorpay.com/mcp",
      "--header",
      "Authorization:${RAZORPAY_AUTH_TOKEN}"
    ],
    "environment": {
      "RAZORPAY_AUTH_TOKEN": "{env:RAZORPAY_AUTH_TOKEN}"
    },
    "enabled": true
  }
}
```

**Generate MCP Auth Token:**
```bash
export RAZORPAY_API_KEY="rzp_test_XXXX"
export RAZORPAY_API_SECRET="XXXX"
export RAZORPAY_AUTH_TOKEN="Basic $(echo "$RAZORPAY_API_KEY:$RAZORPAY_API_SECRET" | base64)"
```

### 4.4 What Must NEVER Be Committed

| File/Pattern | Status | Enforced By |
|--------------|--------|-------------|
| `.env` | ✅ gitignored | `.gitignore` line 13 |
| `.env.*` | ✅ gitignored | `.gitignore` line 14 |
| `.razorpay/config.yaml` | ✅ gitignored | User responsibility |
| `RAZORPAY_KEY_ID` in code | ❌ Forbidden | Secret scanning, code review |
| `RAZORPAY_KEY_SECRET` in code | ❌ Forbidden | Secret scanning, code review |
| `RAZORPAY_WEBHOOK_SECRET` in code | ❌ Forbidden | Secret scanning, code review |
| Secrets in GitHub Actions secrets | ❌ Forbidden (TEST only) | Policy — TEST creds local-only |
| Secrets in website bundle (VITE_*) | ❌ Forbidden | Build config, code review |
| Secrets in desktop bundle | ❌ Forbidden | Tauri config, code review |

---

## 5. Test-Mode Verification

### 5.1 TEST Key Format Validation

Razorpay TEST keys **must** begin with `rzp_test_` prefix:
- `RAZORPAY_KEY_ID`: `rzp_test_XXXXXXXXXXXXXXXX`
- `RAZORPAY_KEY_SECRET`: Generated secret (no fixed prefix)

**Verification Steps (when credentials available):**
1. Confirm `RAZORPAY_KEY_ID` starts with `rzp_test_`
2. Run harmless read-only API call via CLI: `razorpay orders list --count 1`
3. Verify response contains test-mode indicators (amounts in paise, test data)
4. Run MCP read-only test: `fetch_all_orders` with `--read-only` flag

### 5.2 Test Operations Performed (from 018)

| Operation | Tool | Status |
|-----------|------|--------|
| Order creation | MCP `create_order` | ✅ VERIFIED (doc) |
| Order inspection | MCP `fetch_order` | ✅ VERIFIED (doc) |
| Payment inspection | MCP `fetch_payment` | ✅ VERIFIED (doc) |
| Payment capture | MCP `capture_payment` | ✅ VERIFIED (doc) |
| Payment link creation | MCP `create_payment_link` | ✅ VERIFIED (doc) |
| CLI order list | CLI `razorpay orders list` | ❌ BLOCKED (no creds) |
| CLI payment fetch | CLI `razorpay payments fetch` | ❌ BLOCKED (no creds) |

---

## 6. Webhook Readiness

### 6.1 Webhook Handler Analysis

**File:** `supabase/functions/razorpay-webhook/index.ts` (272 lines)

**Implemented Features:**
- ✅ Signature verification (HMAC-SHA256, timing-safe comparison)
- ✅ Idempotency via `webhook_events` table (unique constraint on `event_id`)
- ⚠️ Event routing: `payment.captured` → entitlement activation.
  **`payment.authorized` no longer activates anything** — corrected in 026, see below.
- ✅ Event routing: `payment.failed` → logging only
- ✅ Duplicate detection and graceful 200 response
- ✅ Error handling with structured logging
- ✅ Service-role Supabase client for entitlement upsert

> **Corrected by `RAZORPAY-GRANT-PAYLOAD-FIDELITY-026`.** This document originally
> read *"Event routing: `payment.captured`, `payment.authorized` → entitlement
> activation"*. That was wrong and, if implemented, would grant a paid window
> for money that was never captured. `assertPaymentCaptured` requires
> `status === "captured"` **in addition to** a truthy captured flag, so an
> authorized-only payment is refused. Razorpay's own `payment.failed` sample
> ships `"captured": true` together with `"status": "failed"` precisely because
> the flag is a snapshot of an earlier transition — which is why the status
> check is load-bearing and not redundant. See invariants I1/I2 in
> `RAZORPAY-GRANT-PAYLOAD-FIDELITY-026.md`.

**Required Webhook Configuration (Razorpay Dashboard):**

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Webhook URL** | `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook` | Must be publicly reachable HTTPS |
| **Webhook Secret** | Value of `RAZORPAY_WEBHOOK_SECRET` | User-defined, configured in both Dashboard and Supabase secrets |
| **Active Events** | `order.paid`, `payment.captured`, `payment.failed`, `refund.processed`, `subscription.charged`, `subscription.activated`, `subscription.pending`, `subscription.updated`, `subscription.halted`, `subscription.paused`, `subscription.resumed`, `subscription.cancelled`, `subscription.completed` | Minimum required; add `refund.created`, `refund.failed` for refunds |
| **Alert Email** | Operations email | For failure notifications |

### 6.2 Webhook Prerequisites (BLOCKED Until Met)

| Prerequisite | Status | Notes |
|--------------|--------|-------|
| Supabase project deployed | ⚠️ NOT DEPLOYED | `supabase functions deploy` required |
| Edge Function publicly reachable | ❌ BLOCKED | Requires Supabase project + deployment |
| `RAZORPAY_WEBHOOK_SECRET` generated | ❌ BLOCKED | User must generate secure random string |
| Webhook configured in Razorpay Dashboard (TEST mode) | ❌ BLOCKED | Requires public URL + secret |
| Webhook test delivery successful | ❌ BLOCKED | Use Dashboard "Test" button after config |

### 6.3 Expected Payload Fields (Per Handler)

```typescript
interface RazorpayWebhookPayload {
  event: string;  // e.g., "payment.captured"
  payload: {
    payment: {
      id: string;           // pay_XXXX
      order_id: string;     // order_XXXX
      email: string;        // Customer email
      contact: string;      // Customer phone
      amount: number;       // Paise
      currency: string;     // "INR" or "USD"
      status: string;       // "captured", "authorized", "failed"
      notes: Record<string, string>;  // Contains user_id, product_id
      // ... other fields
    };
    order?: {
      id: string;
      notes: Record<string, string>;  // Contains user_id, product_id
      // ... other fields
    };
  };
}
```

### 6.4 Entitlement Mapping

| Webhook Event | Entitlement Action |
|---------------|-------------------|
| `payment.captured` | Upsert `entitlements` row: `status='active'`, `plan` from `product_id` |
| `order.paid` | Upsert `entitlements` row (lifetime) — documented `captured` is a **boolean** `true` |
| `subscription.charged` | Upsert `entitlements` row — documented `captured` is the **string** `"1"` |
| `payment.authorized` | ⚠️ **Log only. No entitlement change.** Corrected in 026 — see the note below. |
| `payment.failed` | Log only; no entitlement change |
| `refund.processed` | Revoke, **but only when `refund.amount >= payment.amount`**; a partial refund is recorded and does not revoke (I8) |
| `subscription.paused` / `.halted` / `.cancelled` | Cancel path, keyed on `provider_subscription_ref`. No payment is fabricated. |
| `subscription.resumed` | Lifecycle path: sets `status='active'` on the existing row **only**. No payment is required, none is fabricated, and no billing period is created or extended. |

> **Corrected by `RAZORPAY-GRANT-PAYLOAD-FIDELITY-026`.** The original row read
> *"`payment.authorized` — Same as captured (for auth+capture flow)"*. That is
> unsafe: authorization is a hold, not a capture. Treated as "same as captured"
> it would activate a paid window for a payment that is still reversible. The
> handler routes `payment.authorized` to `log`, and invariant **I2** asserts
> that an authorized-but-captured-flagged payment still cannot grant.
>
> Also added in 026: Razorpay serialises `captured` **two different ways** in its
> own documentation — `"1"` (string) across `webhooks/subscriptions.md` and
> `true` (boolean) across `webhooks/payments.md`, `orders.md` and `refunds.md`.
> Both are now accepted, via a closed whitelist (`true`, `1`, `"1"`). Do not
> reintroduce a strict `captured === true` comparison, and do not replace it
> with a truthiness test — see the accept-set table in
> `RAZORPAY-GRANT-PAYLOAD-FIDELITY-026.md`.

**Order Notes Required (from license-api):**
```json
{
  "user_id": "<uuid>",
  "product_id": "soravo_monthly" | "soravo_lifetime"
}
```

---

## 7. Product/Plan Analysis

### 7.1 Soravo's Existing Architecture (Provider-Neutral)

From `services/license-api/src/payment/catalog.ts`:
```typescript
soravo_monthly: { plan: "monthly", price: { amountMinor: 1200, currency: "USD" } }
soravo_lifetime: { plan: "lifetime", price: { amountMinor: 5000, currency: "USD" } }
```

**Entitlements Table (Provider-Neutral):**
- `provider` column: constrained to `'razorpay'` currently, but architecture allows others
- `provider_customer_ref`: Razorpay customer ID (email in current impl)
- `provider_payment_ref`: Razorpay payment ID (`pay_XXXX`)

### 7.2 Razorpay Resource Mapping

| Soravo Concept | Razorpay Resource | MCP Support | CLI Support | Notes |
|----------------|-------------------|-------------|-------------|-------|
| One-time purchase (lifetime) | **Order** + Payment | ✅ | ✅ | Current model |
| Subscription (monthly) | **Subscription** + Plan | ❌ | ✅ | Requires Plan creation |
| Product catalog | **Product** (not in API) | ❌ | ❌ | Soravo owns catalog |
| Pricing | **Plan** (amount, currency, interval) | ❌ | ✅ | Razorpay Plans for subscriptions |
| Customer | **Customer** | ❌ | ✅ | Optional; can use email in notes |

### 7.3 Recommendation: Do NOT Create Razorpay Products/Plans

**Rationale:**
1. **Soravo backend is provider-neutral** — Product/plan definitions live in `license-api` catalog
2. **Razorpay Orders suffice for one-time payments** — Lifetime plan maps to single Order
3. **Monthly subscriptions need Razorpay Plans** — But Soravo can manage billing cycles server-side using webhook `payment.captured` + scheduled checks. *(026 note: a lifecycle event must never be used to extend a paid window. A paid window may only be created by a captured payment — see invariant I12 in `RAZORPAY-GRANT-PAYLOAD-FIDELITY-026.md`.)*
4. **Avoid provider lock-in** — Keep pricing, plan metadata, and entitlement logic in Soravo

**Implementation Approach:**
- **Lifetime (one-time):** Create Razorpay Order → Customer pays → Webhook activates lifetime entitlement
- **Monthly (recurring):** Create Razorpay Order for first payment → Webhook activates monthly entitlement with 30-day expiry → Server-side cron renews via new Order on expiry (or use Razorpay Subscriptions if automation preferred). *(026 note: any such renewal is a new captured payment and must therefore arrive as `subscription.charged`, not as a lifecycle event like `subscription.resumed`. The lifecycle path writes `status` only.)*

**Razorpay Subscriptions (Optional Enhancement):**
If recurring automation is desired, use Razorpay Subscriptions via CLI/API:
- Create Plan: `razorpay subscriptions plan create --amount 1200 --currency USD --interval monthly`
- Create Subscription: `razorpay subscriptions create --plan_id plan_XXX --customer_id cust_XXX`
- Webhook events: `subscription.charged`, `subscription.cancelled`, `subscription.paused`

---

## 8. Remaining Manual Dashboard Steps

| Step | Description | Prerequisite |
|------|-------------|--------------|
| 1. Create Razorpay Test Account | Sign up at dashboard.razorpay.com | None |
| 2. Generate Test API Keys | Settings → API Keys → Generate Test Keys | Test account |
| 3. Generate Webhook Secret | Secure random string (32+ chars) | None |
| 4. Deploy Supabase Edge Function | `supabase functions deploy razorpay-webhook` | Supabase project linked |
| 5. Configure Webhook in Dashboard (TEST) | Settings → Webhooks → Add New → URL, Secret, Events | Deployed function URL |
| 6. Test Webhook Delivery | Dashboard → Webhook → Test button | Configured webhook |
| 7. Verify Entitlement Creation | Check Supabase `entitlements` table after test payment | All above |

---

## 9. Remaining Implementation Work

| Work Item | Status | Blocked By | Phase |
|-----------|--------|------------|-------|
| TEST credentials in local environment | ❌ BLOCKED | User action required | 019 |
| MCP integration activation | ❌ BLOCKED | TEST credentials | 019 |
| CLI installation and configuration | ❌ NOT STARTED | TEST credentials | 019 |
| Supabase Edge Function deployment | ❌ NOT STARTED | Supabase project access | 8 |
| Webhook Dashboard configuration | ❌ BLOCKED | Deployed function URL | 8 |
| Webhook test delivery verification | ❌ BLOCKED | Webhook configured | 8 |
| End-to-end payment flow test | ❌ BLOCKED | All above | 8 |
| Razorpay Subscription integration (optional) | ❌ DEFERRED | Monthly plan decision | 8+ |
| Refund processing via CLI/API | ❌ NOT STARTED | MCP lacks `create_refund` | 8+ |

---

## 10. Files Changed / To Be Created

| File | Action | Status |
|------|--------|--------|
| `docs/spec-v3/RAZORPAY-TEST-TOOLING-019.md` | Created | ✅ THIS FILE |
| `PROGRESS.md` | Updated | ✅ PENDING |
| `services/license-api/.env.local` | User must create | ❌ BLOCKED |
| `~/.razorpay/config.yaml` | CLI creates on configure | ❌ BLOCKED |
| Supabase Edge Function secrets | User must set via CLI | ❌ BLOCKED |

---

## 11. Next Exact Task

**Task ID:** RAZORPAY-TEST-CREDENTIALS-AND-TOOLING-019 → **COMPLETE** (Documentation only)

**Next Action Required from User:**
1. Create Razorpay Test account at https://dashboard.razorpay.com
2. Generate Test API Keys (Key ID starting with `rzp_test_`, Key Secret)
3. Generate secure `RAZORPAY_WEBHOOK_SECRET` (e.g., `openssl rand -hex 32`)
4. Configure local environment:
   - `services/license-api/.env.local` with the three secrets
   - `export RAZORPAY_AUTH_TOKEN="Basic $(echo 'rzp_test_XXX:SECRET' | base64)"` for MCP
   - `razorpay configure --key-id rzp_test_XXX --key-secret SECRET` for CLI
5. Deploy Supabase Edge Function: `supabase functions deploy razorpay-webhook`
6. Configure webhook in Razorpay Dashboard (TEST mode) with deployed URL
7. Test webhook delivery

**Then:** Proceed to Phase 8 implementation (Entitlements/Payments/Offline) with verified TEST credentials.

---

## 12. Security Checklist (Per security-guidance)

- [x] No secrets in documentation
- [x] No secrets in `.env.example` files (only placeholders)
- [x] `.gitignore` excludes `.env`, `.env.*`, `*.key`, `*.pem`
- [x] Client-safe variables only in website/desktop bundles (VITE_* prefix)
- [x] Server-only secrets in `license-api` and Supabase Edge Functions
- [x] Webhook secret separate from API secret
- [x] Timing-safe signature verification implemented
- [x] Idempotency enforced at database level
- [ ] Credentials configured in local environment (user action)
- [ ] Secret rotation plan documented (for production)

---

**Last Updated:** 2026-09-26  
**Reviewed By:** Security guidance + Official Razorpay documentation