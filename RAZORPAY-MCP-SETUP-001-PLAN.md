# RAZORPAY-MCP-SETUP-001-PLAN.md

**Document**: Razorpay MCP Server Setup Plan
**Status**: DRAFT (pending review before configuration)
**Created**: 2026-09-28

---

## Executive Summary

An official Razorpay MCP server exists and can be configured for Soravo development. **TEST credentials only will be used.** This document outlines the verification findings, configuration requirements, and security considerations before implementation.

---

## Phase 1: Environment Verification Results

| Component | Status | Notes |
|-----------|--------|-------|
| Node.js | ✅ Available | v22.23.1 |
| npm | ✅ Available | v10.9.8 |
| npx | ✅ Available | Ready for MCP package installation |
| Docker | ❌ Not available | Not required for local stdio transport |
| OpenCode | ✅ Available | v1.18.31, running |

### Current MCP Configuration

Existing configured servers in `~/.config/opencode/opencode.jsonc`:
- **GitHub MCP**: Remote, OAuth-pending
- **Supabase MCP**: Connected (project zbzhlhoxblguepplqppw)
- **Cloudflare MCP**: Connected
- **TestSprite MCP**: Connected (local npx)

**Razorpay MCP**: Not configured (audit confirms absence)

### Environment Variables

No Razorpay-related environment variables currently set. No secrets found in repository.

---

## Phase 2: Configuration Requirements

### A. Recommended Transport: **Stdio (Local)**

**Rationale**:
- The official server is Go-based and runs as a local process
- Stdio transport via `npx` provides immediate access without additional infrastructure
- Aligns with TestSprite MCP pattern already in use
- Avoids remote OAuth complexity for payment provider access

**Alternative (not selected)**: Remote HTTP/SSE transport is not currently offered by Razorpay.

### B. Exact Configuration Required

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "razorpay": {
      "type": "local",
      "command": ["npx", "-y", "@razorpay/razorpay-mcp-server"],
      "enabled": true,
      "environment": {
        "RAZORPAY_KEY_ID": "{env:RAZORPAY_KEY_ID}",
        "RAZORPAY_KEY_SECRET": "{env:RAZORPAY_KEY_SECRET}"
      }
    }
  }
}
```

### C. Required Authentication Material

| Variable | Purpose | Source |
|----------|---------|--------|
| `RAZORPAY_KEY_ID` | Public API key (starts with `rzp_test_` for TEST) | Razorpay Developer Dashboard |
| `RAZORPAY_KEY_SECRET` | API secret key (never logged or printed) | Razorpay Developer Dashboard |

**Note**: Credentials must be exported to the host secret environment (`{env:}` interpolation). **Never stored in config files.**

### D. TEST vs LIVE Credentials

**TEST credentials are supported and recommended** for development:
- Razorpay provides separate TEST and LIVE environments
- TEST mode uses `rzp_test_*` key IDs
- No real money flows in TEST environment
- TEST credentials can be generated from Razorpay Developer Dashboard

### E. Read-Only Mode

**Read-only access is available via scoped credentials**:
- The official server documentation references permission controls
- Test keys (from Razorpay dashboard) have limited scope by default
- Webhook secret (`RAZORPAY_WEBHOOK_SECRET`) required only for webhook verification (not needed for basic payment operations)

### F. Available Tools (Based on Official Repository)

The official MCP server (`razorpay/razorpay-mcp-server`) implements tools for:

**Orders API**:
- `fetch_order` - Retrieve order details by ID
- `fetch_all_orders` - List orders with optional filters
- `create_order` - Create new payment order
- `capture_order` - Capture authorized payment

**Payments**:
- `fetch_payment` - Get payment details
- `fetch_payments` - List payments
- `refunds` - Issue and list refunds

**Customers**:
- `fetch_customer` - Get customer details
- `create_customer` - Register new customer
- `fetch_customer_orders` - Get customer's order history

**Payment Links**:
- `fetch_payment_link` - Get link details
- `create_payment_link` - Generate payment link
- `fetch_all_payment_links` - List links

**Webhooks** (requires webhook secret):
- `verify_webhook` - Verify webhook signature
- `fetch_webhook_events` - List webhook events

### G. Tools That Can Mutate Payment State

**MUTATION TOOLS** (require careful handling):
- `create_order` - Creates new payment orders
- `capture_order` - Captures authorized payments
- `refunds` - Issues refunds
- `create_customer` - Creates customer records
- `create_payment_link` - Generates payment links

**READ-ONLY TOOLS** (safe for inspection):
- All `fetch_*` tools
- All `fetch_all_*` tools

### H. Security Implications

| Risk | Mitigation |
|------|------------|
| **Credential Exposure** | Store in host secret environment; never commit to repo; `{env:}` interpolation |
| **Payment Mutation** | Use TEST environment; limit agent tool access; require human approval for captures/refunds |
| **Webhook Signature Verification** | Required for webhook endpoint; store secret separately from API keys |
| **Scope Creep** | Enable only required tools; review tool catalog before use |
| **Account Access** | Razorpay keys have account-level permissions; use dedicated TEST account |

### I. Documentation Reference

- Official Repository: https://github.com/razorpay/razorpay-mcp-server
- Razorpay API Docs: https://razorpay.com/docs/api/
- MCP Server Docs: https://razorpay.com/docs/mcp-server/

---

## Implementation Steps (After Review)

1. **Create TEST Razorpay Account** (if not exists)
2. **Generate TEST API Keys** (Key ID + Key Secret)
3. **Export Credentials** to host secret environment
4. **Add MCP Config** to `~/.config/opencode/opencode.jsonc`
5. **Restart OpenCode** to load new MCP server
6. **Verify Connection** with a read-only operation
7. **Update `progress/MCP.md`** with audit record

---

## Review Questions

1. Should we use remote HTTP transport (if available later) or stick with stdio?
2. What tools should be enabled initially (read-only vs mutation)?
3. Do we need to implement any additional guardrails for payment mutations?
4. Should webhook verification be part of the initial setup?

---

## Status

**AWAITING REVIEW** — Do not install, configure, authenticate, or commit until this plan is approved.
