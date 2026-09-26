# RAZORPAY Secret Boundary — Local Development Setup

**Task**: RAZORPAY-LOCAL-SECRET-SETUP-019B
**Date**: 2026-09-26
**Status**: IMPLEMENTED

---

## 1. Local Secret File

**Path**: `services/license-api/.env.local`

**Git Status**: ✅ **IGNORED** (confirmed via `git check-ignore`)

**Contents** (template — no secrets):
```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

---

## 2. Configuration Mechanism

### `license-api` (TypeScript library)

- **Does NOT load `.env.local` automatically**.
- Configuration is passed **programmatically** via `createPaymentProvider()`:
  ```typescript
  createPaymentProvider({
    kind: "razorpay",
    razorpay: { keyId: "rzp_test_...", keySecret: "..." }
  }, nodeEnv);
  ```
- Required credentials: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (both required for `kind: "razorpay"`).
- `RAZORPAY_WEBHOOK_SECRET` is **NOT used** by the license-api library.

### Supabase Edge Function: `razorpay-webhook`

- **Loads secrets via `Deno.env.get()`** at runtime.
- Required secrets (must be set in **Supabase Dashboard → Edge Functions → Secrets**):
  - `RAZORPAY_WEBHOOK_SECRET` — HMAC verification of webhook payloads
  - `SUPABASE_URL` — project URL
  - `SUPABASE_SERVICE_ROLE_KEY` — service-role key for database writes
- **Does NOT read `.env.local`** — uses Supabase platform secret store.

---

## 3. Secret Boundaries by Environment

| Environment | `RAZORPAY_KEY_ID` | `RAZORPAY_KEY_SECRET` | `RAZORPAY_WEBHOOK_SECRET` |
|-------------|-------------------|----------------------|---------------------------|
| **A. Local development** | `.env.local` (gitignored) → passed to `createPaymentProvider()` | `.env.local` (gitignored) → passed to `createPaymentProvider()` | `.env.local` (gitignored) — for local webhook testing only |
| **B. license-api deployment** | Platform secret store → injected at runtime | Platform secret store → injected at runtime | N/A (webhook is separate) |
| **C. Supabase Edge Function** | N/A | N/A | **Supabase Dashboard → Edge Function Secrets** |
| **D. GitHub Actions (CI/CD)** | GitHub Actions Secrets (if needed for tests) | GitHub Actions Secrets (if needed for tests) | N/A (not used in CI) |

---

## 4. User Action Required

> **Put your Razorpay TEST credentials into:**
> `services/license-api/.env.local`
>
> **Do not paste them into chat.**
>
> **Use:**
> ```
> RAZORPAY_KEY_ID=rzp_test_...
> RAZORPAY_KEY_SECRET=...
> ```
>
> **Do not commit the file.**

**After you configure the file**, run the verification check (see Section 5).

---

## 5. Verification (Post-Configuration)

After you populate `.env.local`, the following checks will be performed **without revealing secrets**:

- [ ] `RAZORPAY_KEY_ID` exists and is non-empty
- [ ] `RAZORPAY_KEY_SECRET` exists and is non-empty
- [ ] `RAZORPAY_KEY_ID` begins with `rzp_test_` (TEST mode prefix)
- [ ] `RAZORPAY_WEBHOOK_SECRET` exists and is non-empty (for local webhook testing)
- [ ] File remains gitignored (`git check-ignore` passes)

**NEVER** print values. **NEVER** include in logs. **NEVER** include in reports.

---

## 6. Files Changed

- `services/license-api/.env.local` — Created (template, gitignored)
- `docs/spec-v3/RAZORPAY-SECRET-BOUNDARY-019B.md` — Created (this document)

---

## 7. Progress Record

| Item | Status |
|------|--------|
| Local secret path verified | ✅ IMPLEMENTED |
| Git ignore confirmed | ✅ VERIFIED |
| Configuration mechanism documented | ✅ IMPLEMENTED |
| Template `.env.local` created | ✅ IMPLEMENTED |
| Secret boundaries documented | ✅ IMPLEMENTED |
| User action documented | ✅ IMPLEMENTED |
| Verification procedure defined | ✅ IMPLEMENTED |
| User has configured credentials | ⏳ NOT EXECUTED (awaits user) |
| Post-config verification | ⏳ NOT EXECUTED (awaits user) |

---

## 8. Next Steps (Deferred)

- [ ] Configure webhook URL in Razorpay Dashboard (CLOUD-011)
- [ ] Deploy `razorpay-webhook` Edge Function with secrets (CLOUD-011)
- [ ] Configure license-api deployment secrets (CLOUD-010)
- [ ] Run payment integration test (CLOUD-012)

**Do not perform a payment transaction yet. Do not configure the webhook yet. Do not touch live credentials.**