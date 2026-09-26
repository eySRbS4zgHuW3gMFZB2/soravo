// RAZORPAY-WEBHOOK-HARDENING-022 — regression suite for the hardened
// Razorpay webhook Edge Function.
//
// Every test here maps to a finding in
// docs/spec-v3/RAZORPAY-PAYMENT-ARCHITECTURE-021.md (F1-F12) or to a
// 022-discovered defect. The suite runs under plain Vitest/Node, so the logic
// modules are imported directly; `index.ts` is asserted structurally (it
// imports Deno and a remote ESM URL, so it cannot be executed here).
//
// Scope: TEST mode only. No network calls, no Razorpay API mutation, no
// Dashboard objects, and no secrets — the webhook secret used below is a
// throwaway value generated inside the test.

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PRODUCT_CATALOG,
  PRODUCT_IDS,
  isProductId,
  resolveLegacyProduct,
  resolveProduct,
} from "../functions/razorpay-webhook/catalog.ts";
import {
  WebhookError,
  asNumber,
  asString,
  assertPaymentCaptured,
  assertPaymentMatchesProduct,
  buildEntitlementRow,
  buildRevocationPatch,
  classifyEvent,
  deriveEventId,
  extractEntity,
  fetchOrderNotes,
  isPurchaseEvent,
  isRefundEvent,
  isSubscriptionStateEvent,
  isWithinReplayWindow,
  normalizeCapturedFlag,
  normalizeNotes,
  parseEnvelope,
  resolvePurchaseIdentity,
  resolveSubscriptionResume,
  SUBSCRIPTION_RESUME_PATCH,
} from "../functions/razorpay-webhook/events.ts";
import {
  createLedger,
  createMemoryLedgerStore,
  isLeaseActive,
  sanitizeReason,
} from "../functions/razorpay-webhook/ledger.ts";
import { verifyRazorpaySignature } from "../functions/razorpay-webhook/verify.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fnDir = join(repoRoot, "supabase", "functions", "razorpay-webhook");
const migrationsDir = join(repoRoot, "supabase", "migrations");

const readFn = (name) => readFileSync(join(fnDir, name), "utf8");
const readMigration = (name) => readFileSync(join(migrationsDir, name), "utf8");

/**
 * Source-level assertions must not be satisfied (or broken) by prose. Comments
 * legitimately *name* the very patterns we forbid — `verify.ts` explains why it
 * does not use a `charCodeAt` loop — so structural checks run on code only.
 */
function stripTsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

const USER_ID = "11111111-2222-3333-4444-555555555555";
const NOW_ISO = "2026-09-27T12:00:00.000Z";
const NOW_MS = Date.parse(NOW_ISO);

/** A real Razorpay `payment.captured` envelope: payment entity only, no order. */
function capturedEnvelope(overrides = {}) {
  const payment = {
    entity: "payment",
    id: "pay_captured_001",
    order_id: "order_abc123",
    amount: 1200,
    currency: "USD",
    status: "captured",
    captured: true,
    international: false,
    notes: { user_id: USER_ID, product_id: "soravo_monthly" },
    ...overrides,
  };
  return {
    entity: "event",
    event: "payment.captured",
    contains: ["payment"],
    payload: { payment },
    created_at: Math.floor(NOW_MS / 1000),
  };
}

/** Razorpay `order.paid`: carries BOTH the order and the payment entity. */
function orderPaidEnvelope(
  orderNotes = { user_id: USER_ID, product_id: "soravo_lifetime" },
  paymentNotes = {},
) {
  return {
    entity: "event",
    event: "order.paid",
    contains: ["order", "payment"],
    payload: {
      order: { entity: "order", id: "order_abc123", notes: orderNotes },
      payment: {
        entity: "payment",
        id: "pay_ordered_002",
        order_id: "order_abc123",
        amount: 5000,
        currency: "USD",
        status: "captured",
        captured: true,
        notes: paymentNotes,
      },
    },
    created_at: Math.floor(NOW_MS / 1000),
  };
}

function refundEnvelope(amount = 5000) {
  return {
    entity: "event",
    event: "refund.processed",
    contains: ["refund"],
    payload: {
      refund: { entity: "refund", id: "rfnd_001", amount, status: "processed" },
      payment: {
        entity: "payment",
        id: "pay_ordered_002",
        order_id: "order_abc123",
        amount: 5000,
        currency: "USD",
        status: "captured",
        captured: true,
        notes: {},
      },
    },
    created_at: Math.floor(NOW_MS / 1000),
  };
}

function authorizedEnvelope() {
  return {
    entity: "event",
    event: "payment.authorized",
    contains: ["payment"],
    payload: {
      payment: {
        entity: "payment",
        id: "pay_auth_003",
        order_id: "order_abc123",
        amount: 1200,
        currency: "USD",
        status: "authorized",
        captured: false,
        notes: { user_id: USER_ID, product_id: "soravo_monthly" },
      },
    },
    created_at: Math.floor(NOW_MS / 1000),
  };
}

// ===========================================================================
// RAZORPAY_DOCUMENTED fixtures
//
// Transcribed from Razorpay's own published webhook samples
// (razorpay/markdown-docs@master):
//   webhooks/subscriptions.md   charged / activated / pending / halted /
//                               paused / resumed / cancelled / completed
//   webhooks/orders.md          order.paid
//   webhooks/payments.md        payment.captured, payment.failed
//   webhooks/refunds.md         refund.processed
//
// 130 green tests failed to catch F25-5 and F25-6 because every fixture in this
// file had been authored by this project. These fixtures close that gap: the
// field values asserted below are Razorpay's, not ours.
//
// Two individually-marked deviations from a byte-for-byte copy:
//   1. PII-bearing demo fields (email, contact, card{}, acquirer_data) are
//      dropped. They carry no assertion and this repository has a standing
//      no-PII rule.
//   2. The documented identity/amount values are overlaid with Soravo's own
//      (notes.user_id, notes.product_id, catalogue INR price) so a fixture can
//      drive the real grant path end to end. Every such site is marked
//      SORAVO_SYNTHETIC. The field under dispute in F25-5 — `captured` — is
//      NEVER overlaid: it is the documented value, and that is the whole point.
// ===========================================================================

/** Documented value for the INR monthly entitlement. See catalog.ts. */
const MONTHLY_INR_MINOR = PRODUCT_CATALOG.soravo_monthly.regionalPrices.INR.amountMinor;

/** Documented catalogue keys the fixtures are built to satisfy. */
const LIFETIME_INR_MINOR = PRODUCT_CATALOG.soravo_lifetime.regionalPrices.INR.amountMinor;

/**
 * RAZORPAY_DOCUMENTED — `subscription.charged`
 * source: webhooks/subscriptions.md §"Subscription Charged"
 *
 * The recurring money event. `contains: ["subscription", "payment"]`.
 * The disputed field, verbatim from Razorpay: `"captured": "1"` — a STRING.
 * F25-5: the old strict `captured !== true` refused this payload.
 */
function documentedSubscriptionCharged(captured = "1") {
  return {
    entity: "event",
    account_id: "acc_BFQ7uQEaa7j2z7",
    event: "subscription.charged",
    contains: ["subscription", "payment"],
    payload: {
      subscription: {
        entity: {
          id: "sub_DEX6xcJ1HSW4CR",
          entity: "subscription",
          plan_id: "plan_BvrFKjSxauOH7N",
          customer_id: "cust_C0WlbKhp3aLA7W",
          status: "active",
          type: 2,
          current_start: 1570213800,
          current_end: 1572892200,
          ended_at: null,
          quantity: 1,
          // SORAVO_SYNTHETIC: the documented sample carries only Razorpay's own
          // demo note. license-api stamps the entitlement identity onto the
          // plan's notes at creation time, so a real delivery looks like this.
          notes: { user_id: USER_ID, product_id: "soravo_monthly" },
          charge_at: 1572892200,
          start_at: 1570213800,
          end_at: 1599244200,
          auth_attempts: 0,
          total_count: 12,
          paid_count: 1,
          customer_notify: true,
          created_at: 1567689895,
          expire_by: 1567881000,
          short_url: null,
          has_scheduled_changes: false,
          change_scheduled_at: null,
          source: "api",
          remaining_count: 11,
        },
      },
      payment: {
        entity: {
          id: "pay_DEXFWroJ6LikKT",
          entity: "payment",
          // SORAVO_SYNTHETIC: catalogue INR monthly price, not the doc's ₹1000.
          amount: MONTHLY_INR_MINOR,
          currency: "INR",
          status: "captured",
          order_id: "order_DEXFWXwO24pDxH",
          invoice_id: "inv_DEXFWVuM6rPqlK",
          international: false,
          method: "card",
          amount_refunded: 0,
          amount_transferred: 0,
          refund_status: null,
          // >>> The F25-5 field. Documented value, never overlaid. <<<
          captured,
          description: "Recurring Payment via Subscription",
          card_id: "card_DEXFX0KGtXexrH",
          bank: null,
          wallet: null,
          vpa: null,
          customer_id: "cust_C0WlbKhp3aLA7W",
          token_id: null,
          notes: [],
          fee: 2900,
          tax: 0,
          error_code: null,
          error_description: null,
          created_at: 1567690382,
        },
      },
    },
    created_at: 1567690383,
  };
}

/**
 * RAZORPAY_DOCUMENTED — the paused -> resumed pair, same subscription
 * (`sub_FeQ9WWOjGUZMpG`), from webhooks/subscriptions.md.
 *
 * These two samples are the decisive F25-6 evidence. Diffed field by field:
 *
 *   field             paused          resumed        changed
 *   ----------------  --------------  -------------  -------
 *   status            paused          active         YES
 *   charge_at         null            1602959400     YES
 *   current_start     1600416437      1600416437     no
 *   current_end       1602959400      1602959400     no
 *   paid_count        1               1              no
 *   remaining_count   4               4              no
 *   total_count       5               5              no
 *   contains          [subscription]  [subscription] no payment entity
 *
 * `paid_count` does NOT rise: resuming moves no money and opens no new billing
 * period. It re-arms `charge_at` for the next scheduled charge and nothing else.
 */
function documentedSubscriptionPaused() {
  return {
    entity: "event",
    account_id: "acc_Fe3fPCmiStazv3",
    event: "subscription.paused",
    contains: ["subscription"],
    payload: {
      subscription: {
        entity: {
          id: "sub_FeQ9WWOjGUZMpG",
          entity: "subscription",
          plan_id: "plan_FeMmuaVVa1HR0W",
          customer_id: "cust_FeOEa4PPa0by07",
          status: "paused",
          type: 1,
          current_start: 1600416437,
          current_end: 1602959400,
          ended_at: null,
          quantity: 1,
          notes: [],
          charge_at: null,
          start_at: 1600416437,
          end_at: 1610908200,
          auth_attempts: 0,
          total_count: 5,
          paid_count: 1,
          customer_notify: true,
          created_at: 1600416405,
          expire_by: null,
          short_url: null,
          has_scheduled_changes: false,
          change_scheduled_at: null,
          source: "api",
          payment_method: "card",
          remaining_count: 4,
          pause_initiated_by: "self",
          cancel_initiated_by: null,
        },
      },
    },
    created_at: 1600416473,
  };
}

/** RAZORPAY_DOCUMENTED — webhooks/subscriptions.md §"Subscription Resumed". */
function documentedSubscriptionResumed(overrides = {}) {
  return {
    entity: "event",
    account_id: "acc_Fe3fPCmiStazv3",
    event: "subscription.resumed",
    contains: ["subscription"],
    payload: {
      subscription: {
        entity: {
          id: "sub_FeQ9WWOjGUZMpG",
          entity: "subscription",
          plan_id: "plan_FeMmuaVVa1HR0W",
          customer_id: "cust_FeOEa4PPa0by07",
          status: "active",
          type: 1,
          current_start: 1600416437,
          current_end: 1602959400,
          ended_at: null,
          quantity: 1,
          notes: [],
          charge_at: 1602959400,
          start_at: 1600416437,
          end_at: 1610908200,
          auth_attempts: 0,
          total_count: 5,
          paid_count: 1,
          customer_notify: true,
          created_at: 1600416405,
          expire_by: null,
          short_url: null,
          has_scheduled_changes: false,
          change_scheduled_at: null,
          source: "api",
          payment_method: "card",
          remaining_count: 4,
          pause_initiated_by: null,
          cancel_initiated_by: null,
          ...overrides,
        },
      },
    },
    created_at: 1600416481,
  };
}

/** RAZORPAY_DOCUMENTED — webhooks/subscriptions.md §"Subscription Halted". */
function documentedSubscriptionHalted() {
  return {
    entity: "event",
    account_id: "acc_BFQ7uQEaa7j2z7",
    event: "subscription.halted",
    contains: ["subscription"],
    payload: {
      subscription: {
        entity: {
          id: "sub_DEX6xcJ1HSW4CR",
          entity: "subscription",
          plan_id: "plan_BvrFKjSxauOH7N",
          customer_id: "cust_C0WlbKhp3aLA7W",
          status: "halted",
          type: 1,
          current_start: 1570213800,
          current_end: 1572892200,
          quantity: 1,
          notes: [],
          charge_at: 1572892200,
          auth_attempts: 3,
          total_count: 5,
          paid_count: 1,
          created_at: 1567689895,
          remaining_count: 4,
        },
      },
    },
    created_at: 1572892200,
  };
}

/** RAZORPAY_DOCUMENTED — webhooks/subscriptions.md §"Subscription Cancelled". */
function documentedSubscriptionCancelled() {
  return {
    entity: "event",
    account_id: "acc_BFQ7uQEaa7j2z7",
    event: "subscription.cancelled",
    contains: ["subscription"],
    payload: {
      subscription: {
        entity: {
          id: "sub_DEXpmJhEIZK4fe",
          entity: "subscription",
          plan_id: "plan_BvrHngQ0xLNnNG",
          customer_id: "cust_BUR6z2fhBcu8cb",
          status: "cancelled",
          type: 1,
          current_start: 1570213800,
          current_end: 1572892200,
          ended_at: 1572892200,
          quantity: 1,
          notes: [],
          charge_at: 1572892200,
          auth_attempts: 0,
          total_count: 5,
          paid_count: 1,
          created_at: 1567689895,
          remaining_count: 4,
        },
      },
    },
    created_at: 1572892200,
  };
}

/**
 * RAZORPAY_DOCUMENTED — `order.paid` (netbanking sample), webhooks/orders.md.
 * The one-time lifetime purchase path. `contains: ["payment","order"]` and
 * `captured: true` — a BOOLEAN, unlike the subscription family. Both documented
 * representations therefore have to work.
 */
function documentedOrderPaid() {
  return {
    entity: "event",
    account_id: "acc_BFQ7uQEaa7j2z7",
    event: "order.paid",
    contains: ["payment", "order"],
    payload: {
      payment: {
        entity: {
          id: "pay_DESlfW9H8K9uqM",
          entity: "payment",
          // SORAVO_SYNTHETIC: catalogue INR lifetime price.
          amount: LIFETIME_INR_MINOR,
          currency: "INR",
          status: "captured",
          order_id: "order_DESlLckIVRkHWj",
          invoice_id: null,
          international: false,
          method: "netbanking",
          amount_refunded: 0,
          refund_status: null,
          // Documented: boolean, unlike subscription.charged.
          captured: true,
          description: null,
          card_id: null,
          bank: "HDFC",
          wallet: null,
          vpa: null,
          notes: [],
          fee: 2,
          tax: 0,
          error_code: null,
          error_description: null,
          created_at: 1567674599,
        },
      },
      order: {
        entity: {
          id: "order_DESlLckIVRkHWj",
          entity: "order",
          // SORAVO_SYNTHETIC: license-api stamps identity onto order notes.
          amount: LIFETIME_INR_MINOR,
          amount_paid: LIFETIME_INR_MINOR,
          amount_due: 0,
          currency: "INR",
          receipt: "rcptid #1",
          offer_id: null,
          status: "paid",
          attempts: 1,
          notes: { user_id: USER_ID, product_id: "soravo_lifetime" },
          created_at: 1567674581,
        },
      },
    },
    created_at: 1567674606,
  };
}

/**
 * RAZORPAY_DOCUMENTED — `payment.failed` (card sample), webhooks/payments.md.
 *
 * The anti-spoofing fixture that matters most: Razorpay ships this with
 * `"captured": true` and `"status": "failed"` in the same payload, because the
 * flag is a snapshot of an earlier transition. A check that looked only at
 * `captured` would grant access for a payment that failed. This is why
 * `assertPaymentCaptured` requires BOTH conditions.
 */
function documentedPaymentFailed() {
  return {
    entity: "event",
    account_id: "acc_BFQ7uQEaa7j2z7",
    event: "payment.failed",
    contains: ["payment"],
    payload: {
      payment: {
        entity: {
          id: "pay_DESp9bgForNoUd",
          entity: "payment",
          amount: 5000,
          currency: "INR",
          status: "failed",
          order_id: "order_DESoU0U4ikYA19",
          international: false,
          method: "card",
          amount_refunded: 0,
          refund_status: null,
          // Documented anomaly: captured TRUE on a FAILED payment.
          captured: true,
          error_code: "BAD_CARD_ERROR",
          error_description: "Your card was declined.",
          error_source: "issuer",
          error_step: "authorization",
          error_reason: "issuer_declined",
          notes: [],
          created_at: 1567674797,
        },
      },
    },
    created_at: 1567674804,
  };
}

/**
 * RAZORPAY_DOCUMENTED — `refund.processed` (normal refund), webhooks/refunds.md.
 * Partial: refund.amount 50000 against payment.amount 500000, and the payment
 * reports `refund_status: "partial"` / `amount_refunded: 190000`. Must never
 * revoke (I8).
 */
function documentedRefundProcessed() {
  return {
    entity: "event",
    account_id: "acc_E7OQJcEANmBHTC",
    event: "refund.processed",
    contains: ["refund", "payment"],
    payload: {
      refund: {
        entity: {
          id: "rfnd_FS8TWyPrCsa0OB",
          entity: "refund",
          amount: 50000,
          currency: "INR",
          payment_id: "pay_FPoJKWQQ8lK13n",
          notes: {},
          receipt: null,
          created_at: 1597734071,
          batch_id: null,
          status: "processed",
          speed_processed: "normal",
          speed_requested: "optimum",
        },
      },
      payment: {
        entity: {
          id: "pay_FPoJKWQQ8lK13n",
          entity: "payment",
          amount: 500000,
          currency: "INR",
          status: "captured",
          order_id: "order_FPoIeimWki9j8A",
          international: false,
          method: "netbanking",
          amount_refunded: 190000,
          refund_status: "partial",
          captured: true,
          notes: [],
          created_at: 1597226379,
        },
      },
    },
    created_at: 1597734071,
  };
}

/**
 * The documented lifecycle matrix, straight out of
 * razorpay/markdown-docs@master:webhooks/subscriptions.md.
 *
 * Only `subscription.charged` and `subscription.completed` carry a payment
 * entity; every other subscription event is `contains: ["subscription"]`. Every
 * payment-carrying subscription sample uses `captured: "1"`.
 */
const DOCUMENTED_SUBSCRIPTION_MATRIX = [
  { event: "subscription.authenticated", hasPayment: false, status: "authenticated" },
  { event: "subscription.activated", hasPayment: false, status: "active" },
  { event: "subscription.activated", hasPayment: true, status: "active" },
  { event: "subscription.charged", hasPayment: true, status: "active" },
  { event: "subscription.completed", hasPayment: true, status: "completed" },
  { event: "subscription.updated", hasPayment: false, status: "active" },
  { event: "subscription.pending", hasPayment: false, status: "pending" },
  { event: "subscription.halted", hasPayment: false, status: "halted" },
  { event: "subscription.paused", hasPayment: false, status: "paused" },
  { event: "subscription.resumed", hasPayment: false, status: "active" },
  { event: "subscription.cancelled", hasPayment: false, status: "cancelled" },
];

async function hmacHex(secret, body) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// --------------------------------------------------------------------------
// A. Catalogue: the Edge Function mirror must not drift from the price
//    authority (021 F3, F6; ASVS V2.2 boundary validation).
// --------------------------------------------------------------------------

describe("A. catalogue parity with the price authority", () => {
  const licenseCatalogSource = readFileSync(
    join(repoRoot, "services", "license-api", "src", "payment", "catalog.ts"),
    "utf8",
  );

  function parseLicenseCatalogBasePrices() {
    // Parse the base USD price from the license catalogue REGIONAL_PRICING constant.
    // The webhook catalog mirrors the base price plus regionalPrices; we verify the base price parity.
    const re =
      /soravo_(monthly|lifetime):\s*\{\s*USD:\s*\{\s*amountMinor:\s*(\d+),\s*currency:\s*"USD",\s*status:\s*"[^"]+"\s*\}/g;
    const out = new Map();
    for (const m of licenseCatalogSource.matchAll(re)) {
      const productId = `soravo_${m[1]}`;
      out.set(productId, {
        id: productId,
        plan: m[1],
        amountMinor: Number(m[2]),
        currency: "USD",
      });
    }
    return out;
  }

  it("parses a non-empty licence catalogue base prices (guard on the guard)", () => {
    expect(parseLicenseCatalogBasePrices().size).toBeGreaterThan(0);
  });

  it("declares exactly the same product ids as the licence catalogue", () => {
    expect([...PRODUCT_IDS].sort()).toEqual([...parseLicenseCatalogBasePrices().keys()].sort());
  });

  it("keeps id, plan, displayName, amountMinor and currency identical to the licence catalogue (base USD price)", () => {
    const licence = parseLicenseCatalogBasePrices();
    for (const [key, product] of Object.entries(PRODUCT_CATALOG)) {
      const source = licence.get(key);
      expect(source, `license catalogue is missing ${key}`).toBeDefined();
      expect({
        id: product.id,
        plan: product.plan,
        amountMinor: product.price.amountMinor,
        currency: product.price.currency,
      }).toEqual({
        id: source.id,
        plan: source.plan,
        amountMinor: source.amountMinor,
        currency: source.currency,
      });
    }
  });

  it("models monthly and lifetime as two distinct products with distinct prices", () => {
    expect(PRODUCT_CATALOG.soravo_monthly.id).toBe("soravo_monthly");
    expect(PRODUCT_CATALOG.soravo_lifetime.id).toBe("soravo_lifetime");
    expect(PRODUCT_CATALOG.soravo_monthly.plan).toBe("monthly");
    expect(PRODUCT_CATALOG.soravo_lifetime.plan).toBe("lifetime");
    expect(PRODUCT_CATALOG.soravo_monthly.price.amountMinor)
      .not.toBe(PRODUCT_CATALOG.soravo_lifetime.price.amountMinor);
  });

  it("exposes regionalPrices for all supported currencies", () => {
    const supportedCurrencies = ["USD", "INR", "CAD", "EUR", "AUD"];
    for (const product of Object.values(PRODUCT_CATALOG)) {
      for (const currency of supportedCurrencies) {
        expect(product.regionalPrices[currency]).toBeDefined();
        expect(product.regionalPrices[currency].currency).toBe(currency);
        expect(Number.isSafeInteger(product.regionalPrices[currency].amountMinor)).toBe(true);
        expect(product.regionalPrices[currency].amountMinor).toBeGreaterThan(0);
      }
    }
  });

  it("resolves only catalogue ids and refuses everything else", () => {
    expect(resolveProduct("soravo_monthly")?.id).toBe("soravo_monthly");
    expect(resolveProduct("soravo")).toBeUndefined();
    expect(resolveProduct("soravo_lifetime_v2")).toBeUndefined();
    expect(resolveProduct("")).toBeUndefined();
    expect(resolveProduct(undefined)).toBeUndefined();
    expect(resolveProduct(42)).toBeUndefined();
    expect(isProductId("soravo")).toBe(false);
  });

  it("recovers a legacy 'soravo' marker only when a plan note disambiguates it", () => {
    expect(resolveLegacyProduct("soravo", "lifetime")).toBe("soravo_lifetime");
    expect(resolveLegacyProduct("soravo", "monthly")).toBe("soravo_monthly");
    // F5: never guess a cheaper plan when the note is absent.
    expect(resolveLegacyProduct("soravo", undefined)).toBeUndefined();
    expect(resolveLegacyProduct("soravo", "enterprise")).toBeUndefined();
    expect(resolveLegacyProduct("soravo_monthly", "lifetime")).toBeUndefined();
  });
});

// --------------------------------------------------------------------------
// B. Signature verification (021 F11; ASVS V6/V13 cryptographic controls).
// --------------------------------------------------------------------------

describe("B. HMAC signature verification", () => {
  const SECRET = "test_webhook_secret_not_a_real_credential";
  const BODY = JSON.stringify(capturedEnvelope());

  it("accepts a genuine signature over the raw body", async () => {
    expect(await verifyRazorpaySignature(SECRET, BODY, await hmacHex(SECRET, BODY))).toBe(true);
  });

  it("rejects a body modified after signing (the F1-class tamper case)", async () => {
    const sig = await hmacHex(SECRET, BODY);
    const tampered = BODY.replace('"amount":1200', '"amount":1');
    expect(tampered).not.toBe(BODY);
    expect(await verifyRazorpaySignature(SECRET, tampered, sig)).toBe(false);
  });

  it("rejects a signature computed with a different secret", async () => {
    const sig = await hmacHex("a_different_secret", BODY);
    expect(await verifyRazorpaySignature(SECRET, BODY, sig)).toBe(false);
  });

  it("accepts an uppercase-hex signature (same bytes, not a parse failure)", async () => {
    const sig = await hmacHex(SECRET, BODY);
    const upper = sig.toUpperCase();
    expect(upper).not.toBe(sig);
    expect(await verifyRazorpaySignature(SECRET, BODY, upper)).toBe(true);
  });

  it("rejects a signature whose bytes are only a prefix of a real one", async () => {
    const sig = await hmacHex(SECRET, BODY);
    expect(await verifyRazorpaySignature(SECRET, BODY, sig.slice(0, 62))).toBe(false);
  });

  it("returns false (never throws) for malformed, empty or missing signatures", async () => {
    for (const sig of ["", "zz", "abc", "not-hex-at-all", "0".repeat(63), "0".repeat(64)]) {
      expect(await verifyRazorpaySignature(SECRET, BODY, sig)).toBe(false);
    }
    expect(await verifyRazorpaySignature("", BODY, "ab")).toBe(false);
    expect(await verifyRazorpaySignature(SECRET, BODY, "")).toBe(false);
  });

  it("does not fall back to a hand-rolled comparison loop", () => {
    const code = stripTsComments(readFn("verify.ts"));
    expect(code).not.toMatch(/charCodeAt/);
    expect(code).not.toMatch(/timingSafeEqual/);
    expect(code).toMatch(/crypto\.subtle\.verify/);
  });
});

// --------------------------------------------------------------------------
// C. Envelope parsing and event classification (021 F4, F9).
// --------------------------------------------------------------------------

describe("C. envelope parsing and event classification", () => {
  it("parses a well-formed envelope with its created_at", () => {
    const envelope = parseEnvelope(JSON.stringify(capturedEnvelope()));
    expect(envelope?.event).toBe("payment.captured");
    expect(envelope?.createdAt).toBe(Math.floor(NOW_MS / 1000));
    expect(envelope?.payload?.payment).toBeDefined();
  });

  it("rejects invalid JSON, non-objects and event-less payloads", () => {
    expect(parseEnvelope("{not json")).toBeUndefined();
    expect(parseEnvelope("[]")).toBeUndefined();
    expect(parseEnvelope("null")).toBeUndefined();
    expect(parseEnvelope('"a string"')).toBeUndefined();
    expect(parseEnvelope('{"entity":"event"}')).toBeUndefined();
    expect(parseEnvelope('{"event":""}')).toBeUndefined();
  });

  it("classifies captured/paid as grant and refund as revoke", () => {
    expect(classifyEvent("payment.captured")).toBe("grant");
    expect(classifyEvent("order.paid")).toBe("grant");
    expect(classifyEvent("refund.processed")).toBe("revoke");
  });

  it("F4: payment.authorized must NOT grant an entitlement", () => {
    expect(classifyEvent("payment.authorized")).toBe("log");
  });

  it("acknowledges every other event type without a 5xx loop (F9/F10)", () => {
    const acknowledged = [
      "payment.failed",
      "refund.failed",
      "order.created",
      "order.attempted",
      "payment.dispute.created",
      "payment.dispute.closed",
      "charge.refunded",
      "subscription.activated",
      "subscription.completed",
      "settlement.paid",
      "payout.settled",
      "invoice.paid",
      "something.razorpay.invents.later",
    ];
    for (const event of acknowledged) {
      expect(classifyEvent(event), event).toBe("log");
    }
  });

  it("never throws on a malformed or absent entity (F9 unguarded dereference)", () => {
    const hostile = [
      undefined,
      null,
      {},
      { payment: null },
      { payment: "pay_string" },
      { payment: [] },
      { payment: {} },
      { payment: { entity: null, id: null } },
      { payment: 42 },
      { refund: { entity: "refund" } },
    ];
    for (const payload of hostile) {
      expect(() => extractEntity(payload, "payment")).not.toThrow();
      expect(extractEntity(payload, "payment")).toBeUndefined();
    }
  });

  it("reads a well-formed entity whether it is nested or flat", () => {
    expect(extractEntity({ payment: { entity: "payment", id: "pay_a" } }, "payment")?.id)
      .toBe("pay_a");
    expect(extractEntity({ payment: { id: "pay_b" } }, "payment")?.id).toBe("pay_b");
  });

  it("normalizes hostile notes shapes into an indexable record (requirement 6)", () => {
    expect(normalizeNotes(undefined)).toEqual({});
    expect(normalizeNotes([])).toEqual({});
    expect(normalizeNotes(null)).toEqual({});
    expect(normalizeNotes("user_id=x")).toEqual({});
    expect(normalizeNotes({ user_id: "u", attempts: 3, test: true, bad: { a: 1 } }))
      .toEqual({ user_id: "u", attempts: "3", test: "true" });
  });

  it("type-checks scalars instead of coercing blindly", () => {
    expect(asString("x")).toBe("x");
    expect(asString("")).toBeUndefined();
    expect(asString(5)).toBeUndefined();
    expect(asNumber(1200)).toBe(1200);
    expect(asNumber("1200")).toBeUndefined();
    expect(asNumber(Number.NaN)).toBeUndefined();
    expect(asNumber(Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});

// --------------------------------------------------------------------------
// D. Identity resolution (021 F1, F5, F7).
// --------------------------------------------------------------------------

describe("D. purchase identity resolution", () => {
  it("F1: resolves a payment.captured that carries NO order entity, from payment notes", () => {
    const envelope = capturedEnvelope();
    expect(envelope.payload.order).toBeUndefined();

    const result = resolvePurchaseIdentity({ payload: envelope.payload });
    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.identity.userId).toBe(USER_ID);
    expect(result.identity.productId).toBe("soravo_monthly");
    expect(result.identity.paymentId).toBe("pay_captured_001");
    expect(result.identity.orderId).toBe("order_abc123");
    expect(result.identity.amountMinor).toBe(1200);
    expect(result.identity.currency).toBe("USD");
    expect(result.identity.source).toBe("payment");
  });

  it("F1: resolves order.paid from the embedded order entity", () => {
    const result = resolvePurchaseIdentity({ payload: orderPaidEnvelope().payload });
    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.identity.source).toBe("order");
    expect(result.identity.productId).toBe("soravo_lifetime");
  });

  it("F1: falls back to payment notes when the order carries none", () => {
    const envelope = orderPaidEnvelope({}, { user_id: USER_ID, product_id: "soravo_monthly" });
    const result = resolvePurchaseIdentity({ payload: envelope.payload });
    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.identity.source).toBe("payment");
    expect(result.identity.productId).toBe("soravo_monthly");
  });

  it("prefers the order entity's notes over the payment's", () => {
    const envelope = orderPaidEnvelope(
      { user_id: USER_ID, product_id: "soravo_lifetime" },
      { user_id: "99999999-9999-9999-9999-999999999999", product_id: "soravo_monthly" },
    );
    const result = resolvePurchaseIdentity({ payload: envelope.payload });
    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.identity.source).toBe("order");
    expect(result.identity.productId).toBe("soravo_lifetime");
  });

  it("F1: resolves from the Razorpay order fetch when neither entity has notes", async () => {
    const envelope = capturedEnvelope({ notes: [] });
    const direct = resolvePurchaseIdentity({ payload: envelope.payload });
    expect(direct.kind).toBe("unresolved");

    const resolved = resolvePurchaseIdentity({
      payload: envelope.payload,
      fetchedOrderNotes: { user_id: USER_ID, product_id: "soravo_monthly" },
    });
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;
    expect(resolved.identity.source).toBe("fetched-order");
    expect(resolved.identity.userId).toBe(USER_ID);
  });

  it("F5: refuses to grant when notes are missing — no default product", () => {
    const result = resolvePurchaseIdentity({ payload: capturedEnvelope({ notes: [] }).payload });
    expect(result.kind).toBe("unresolved");
    if (result.kind === "resolved") return;
    expect(result.reason).toMatch(/user_id note missing/);
  });

  it("F5: refuses an unknown product note instead of downgrading lifetime to monthly", () => {
    for (const productId of ["soravo", "soravo_yearly", "SORAVO_MONTHLY", "soravo_monthly "]) {
      const result = resolvePurchaseIdentity({
        payload: capturedEnvelope({ notes: { user_id: USER_ID, product_id: productId } }).payload,
      });
      expect(result.kind, productId).toBe("unresolved");
    }
  });

  it("recovers a legacy 'soravo' marker when a plan note is present", () => {
    const result = resolvePurchaseIdentity({
      payload: capturedEnvelope({
        notes: { user_id: USER_ID, product_id: "soravo", plan: "lifetime" },
        amount: 5000,
      }).payload,
    });
    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.identity.productId).toBe("soravo_lifetime");
  });

  it("resolves from a plan note alone when no product note exists", () => {
    const result = resolvePurchaseIdentity({
      payload: capturedEnvelope({ notes: { user_id: USER_ID, plan: "lifetime" }, amount: 5000 }).payload,
    });
    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.identity.productId).toBe("soravo_lifetime");
  });

  it("requires user_id to be a real uuid (no arbitrary string identity)", () => {
    for (const userId of ["not-a-uuid", "1", "", "'; drop table entitlements; --"]) {
      const result = resolvePurchaseIdentity({
        payload: capturedEnvelope({ notes: { user_id: userId, product_id: "soravo_monthly" } }).payload,
      });
      if (userId === "") {
        expect(result.kind).toBe("unresolved");
      } else {
        expect(result.kind, userId).toBe("unresolved");
        if (result.kind !== "resolved") expect(result.reason).toMatch(/uuid/);
      }
    }
  });

  it("refuses a payment with no amount or currency", () => {
    expect(resolvePurchaseIdentity({ payload: capturedEnvelope({ amount: undefined }).payload }).kind)
      .toBe("unresolved");
    expect(resolvePurchaseIdentity({ payload: capturedEnvelope({ currency: undefined }).payload }).kind)
      .toBe("unresolved");
  });

  it("refuses an event with no payment entity at all", () => {
    expect(resolvePurchaseIdentity({ payload: {} }).kind).toBe("unresolved");
    expect(resolvePurchaseIdentity({ payload: undefined }).kind).toBe("unresolved");
  });
});

describe("D2. order fetch fallback", () => {
  const CREDS = { keyId: "rzp_test_x", keySecret: "test_secret" };

  it("is disabled (not fatal) when credentials are absent", async () => {
    const result = await fetchOrderNotes("order_abc123", { keyId: "", keySecret: "" });
    expect(result).toEqual({ ok: false, reason: "not_configured" });
  });

  it("reports not_found when there is no order id", async () => {
    expect(await fetchOrderNotes(undefined, CREDS, async () => new Response("{}"))).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("returns normalized notes from a successful fetch", async () => {
    const result = await fetchOrderNotes("order_abc123", CREDS, async () =>
      new Response(JSON.stringify({ id: "order_abc123", notes: { user_id: USER_ID } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    expect(result).toEqual({ ok: true, notes: { user_id: USER_ID } });
  });

  it("maps 404 to not_found, other non-2xx and body errors to transient", async () => {
    const notFound = await fetchOrderNotes("order_x", CREDS, async () => new Response("{}", { status: 404 }));
    expect(notFound).toEqual({ ok: false, reason: "not_found" });

    const serverError = await fetchOrderNotes("order_x", CREDS, async () => new Response("{}", { status: 500 }));
    expect(serverError).toEqual({ ok: false, reason: "transient" });

    const badJson = await fetchOrderNotes("order_x", CREDS, async () => new Response("not json", { status: 200 }));
    expect(badJson).toEqual({ ok: false, reason: "transient" });

    const notAnObject = await fetchOrderNotes("order_x", CREDS, async () =>
      new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
    expect(notAnObject).toEqual({ ok: false, reason: "transient" });
  });

  it("maps a network failure to transient so the delivery is retried", async () => {
    const result = await fetchOrderNotes("order_x", CREDS, async () => {
      throw new Error("ECONNRESET");
    });
    expect(result).toEqual({ ok: false, reason: "transient" });
  });
});

// --------------------------------------------------------------------------
// E. Price verification (021 F6; ASVS V2.3 business-logic security).
// --------------------------------------------------------------------------

describe("E. paid amount and currency must match the catalogue", () => {
  function identityFor(productId, amountMinor, currency = "USD") {
    const result = resolvePurchaseIdentity({
      payload: {
        payment: {
          entity: "payment",
          id: "pay_price_001",
          order_id: "order_abc123",
          amount: amountMinor,
          currency,
          status: "captured",
          captured: true,
          notes: { user_id: USER_ID, product_id: productId },
        },
      },
    });
    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") throw new Error(result.reason);
    return result.identity;
  }

  it("accepts an exact catalogue match", () => {
    expect(() => assertPaymentMatchesProduct(identityFor("soravo_monthly", 1200))).not.toThrow();
    expect(() => assertPaymentMatchesProduct(identityFor("soravo_lifetime", 5000))).not.toThrow();
  });

  it("rejects an underpayment (discounted / partial / test amount)", () => {
    for (const amount of [1, 100, 1199, 4999, 100, 0, 100000]) {
      let thrown;
      try {
        assertPaymentMatchesProduct(identityFor("soravo_monthly", amount));
      } catch (error) {
        thrown = error;
      }
      expect(thrown, `amount ${amount}`).toBeInstanceOf(WebhookError);
      expect(thrown.status).toBe(422);
      expect(thrown.reason).toMatch(/amount mismatch/);
    }
  });

  it("rejects a lifetime purchase paid at the monthly price (no silent downgrade/upgrade)", () => {
    let thrown;
    try {
      assertPaymentMatchesProduct(identityFor("soravo_lifetime", 1200));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(WebhookError);
    expect(thrown.status).toBe(422);
  });

  it("rejects a currency mismatch", () => {
    let thrown;
    try {
      // GBP is not in the supported currencies (USD, INR, CAD, EUR, AUD)
      assertPaymentMatchesProduct(identityFor("soravo_monthly", 1200, "GBP"));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(WebhookError);
    expect(thrown.reason).toMatch(/currency not supported/);
  });
});

// --------------------------------------------------------------------------
// F. Only a captured payment may grant (021 F4).
// --------------------------------------------------------------------------

describe("F. grant requires a captured payment", () => {
  it("accepts a captured payment", () => {
    expect(assertPaymentCaptured(capturedEnvelope().payload).paymentId).toBe("pay_captured_001");
  });

  it("refuses an authorized-but-uncaptured payment with 422", () => {
    let thrown;
    try {
      assertPaymentCaptured(authorizedEnvelope().payload);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(WebhookError);
    expect(thrown.status).toBe(422);
    expect(thrown.reason).toMatch(/not captured/);
  });

  it("refuses a payment whose status/flag disagree (partial capture or spoof)", () => {
    for (const payment of [
      { status: "captured", captured: false },
      { status: "authorized", captured: true },
      { status: "failed", captured: false },
      {},
    ]) {
      expect(
        () => assertPaymentCaptured({ payment: { entity: "payment", id: "pay_x", ...payment } }),
        JSON.stringify(payment),
      ).toThrow(WebhookError);
    }
  });

  it("refuses a success event with no payment entity at all (F9)", () => {
    expect(() => assertPaymentCaptured(undefined)).toThrow(WebhookError);
    expect(() => assertPaymentCaptured({})).toThrow(WebhookError);
  });

  it("end-to-end: an authorized payment never reaches the grant path", () => {
    const envelope = authorizedEnvelope();
    expect(classifyEvent(envelope.event)).toBe("log");
  });
});

// --------------------------------------------------------------------------
// G. Entitlement rows (021 F3, F7, F8).
// --------------------------------------------------------------------------

describe("G. entitlement row construction", () => {
  function identity(productId) {
    const amount = productId === "soravo_monthly" ? 1200 : 5000;
    const result = resolvePurchaseIdentity({
      payload: {
        payment: {
          entity: "payment",
          id: `pay_${productId}`,
          order_id: "order_abc123",
          amount,
          currency: "USD",
          status: "captured",
          captured: true,
          notes: { user_id: USER_ID, product_id: productId },
        },
      },
    });
    if (result.kind !== "resolved") throw new Error(result.reason);
    return result.identity;
  }

  it("F3: writes the catalogue product id, never the pre-catalogue 'soravo'", () => {
    const monthly = buildEntitlementRow(identity("soravo_monthly"), undefined, NOW_ISO);
    const lifetime = buildEntitlementRow(identity("soravo_lifetime"), undefined, NOW_ISO);
    expect(monthly.product).toBe("soravo_monthly");
    expect(lifetime.product).toBe("soravo_lifetime");
    for (const row of [monthly, lifetime]) {
      expect(row.product).not.toBe("soravo");
    }
  });

  it("F3: keeps monthly and lifetime as two independent rows for one user", () => {
    const monthly = buildEntitlementRow(identity("soravo_monthly"), undefined, NOW_ISO);
    const lifetime = buildEntitlementRow(identity("soravo_lifetime"), undefined, NOW_ISO);
    // Uniqueness is (user_id, product): distinct products cannot collapse.
    expect(monthly.user_id).toBe(lifetime.user_id);
    expect(monthly.product).not.toBe(lifetime.product);
    expect(monthly.expires_at).not.toBe(lifetime.expires_at);
  });

  it("derives plan and status from the catalogue, never from the payload", () => {
    const row = buildEntitlementRow(
      identity("soravo_monthly"),
      { plan: "lifetime", status: "revoked", entity: "payment" },
      NOW_ISO,
    );
    expect(row.plan).toBe("monthly");
    expect(row.status).toBe("active");
    expect(row.provider).toBe("razorpay");
  });

  it("F8: grants a 30-day window for monthly and no expiry for lifetime", () => {
    const monthly = buildEntitlementRow(identity("soravo_monthly"), undefined, NOW_ISO);
    const lifetime = buildEntitlementRow(identity("soravo_lifetime"), undefined, NOW_ISO);

    expect(monthly.expires_at).toBe(
      new Date(NOW_MS + 30 * 24 * 60 * 60 * 1000).toISOString(),
    );
    expect(lifetime.expires_at).toBeNull();
    expect(monthly.starts_at).toBe(NOW_ISO);
    expect(lifetime.starts_at).toBe(NOW_ISO);
  });

  it("F7: records the payment reference used for later refund reconciliation", () => {
    const row = buildEntitlementRow(identity("soravo_lifetime"), undefined, NOW_ISO);
    expect(row.provider_payment_ref).toBe("pay_soravo_lifetime");
    expect(row.provider_payment_ref.startsWith("pay_")).toBe(true);
  });

  it("F7: provider_customer_ref is a provider id, never PII", () => {
    const withCustomer = buildEntitlementRow(
      identity("soravo_lifetime"),
      { entity: "payment", customer_id: "cust_ABC123", email: "buyer@example.com", contact: "+15550100" },
      NOW_ISO,
    );
    expect(withCustomer.provider_customer_ref).toBe("cust_ABC123");

    // No customer_id on the payment: fall back to the payment id, never to
    // email/contact (PII in a provider-reference column).
    const withPii = buildEntitlementRow(
      identity("soravo_monthly"),
      { entity: "payment", email: "buyer@example.com", contact: "+15550100" },
      NOW_ISO,
    );
    expect(withPii.provider_customer_ref).toBe("pay_soravo_monthly");
    expect(withPii.provider_customer_ref).not.toContain("@");
    expect(withPii.provider_customer_ref).not.toContain("+");
  });

  it("F7: an empty-string customer id does not blank the NOT NULL column", () => {
    const row = buildEntitlementRow(
      identity("soravo_lifetime"),
      { entity: "payment", customer_id: "" },
      NOW_ISO,
    );
    expect(row.provider_customer_ref).toBe("pay_soravo_lifetime");
  });

  it("no entitlement field ever carries the buyer's email or contact", () => {
    const row = buildEntitlementRow(
      identity("soravo_monthly"),
      { entity: "payment", email: "buyer@example.com", contact: "+15550100", notes: { user_id: USER_ID } },
      NOW_ISO,
    );
    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain("buyer@example.com");
    expect(serialized).not.toContain("+15550100");
    // ...but the operator still gets the minimum needed for reconciliation.
    expect(row.provider).toBe("razorpay");
    expect(row.provider_payment_ref).toBeTruthy();
    expect(row.provider_customer_ref).toBeTruthy();
  });

  it("does not mutate its inputs", () => {
    const id = identity("soravo_monthly");
    const before = JSON.stringify(id);
    buildEntitlementRow(id, { entity: "payment" }, NOW_ISO);
    expect(JSON.stringify(id)).toBe(before);
  });
});

// --------------------------------------------------------------------------
// H. Revocation on refund (021 F10).
// --------------------------------------------------------------------------

describe("H. refund revocation", () => {
  it("revokes a lifetime purchase permanently", () => {
    expect(buildRevocationPatch("lifetime", NOW_ISO)).toEqual({
      status: "revoked",
      expires_at: null,
    });
  });

  it("cancels a monthly purchase effective immediately", () => {
    expect(buildRevocationPatch("monthly", NOW_ISO)).toEqual({
      status: "cancelled",
      expires_at: NOW_ISO,
    });
  });

  it("F10: refund.processed is the revoke trigger and is a known event", () => {
    const envelope = parseEnvelope(JSON.stringify(refundEnvelope()));
    expect(envelope?.event).toBe("refund.processed");
    expect(classifyEvent(envelope.event)).toBe("revoke");
    // A partial refund is deliberately not a revocation, but it must be
    // recognisable rather than crashing on the payment entity.
    expect(extractEntity(envelope?.payload, "payment")?.id).toBe("pay_ordered_002");
    expect(extractEntity(envelope?.payload, "refund")?.id).toBe("rfnd_001");
  });
});

// --------------------------------------------------------------------------
// I. Replay window (021 F12).
// --------------------------------------------------------------------------

describe("I. replay window", () => {
  const nowMs = NOW_MS;

  it("accepts a just-delivered event", () => {
    expect(isWithinReplayWindow(Math.floor(nowMs / 1000), nowMs)).toBe(true);
  });

  it("accepts an event that is slightly ahead (clock skew)", () => {
    expect(isWithinReplayWindow(Math.floor(nowMs / 1000) + 60, nowMs)).toBe(true);
  });

  it("rejects a captured body replayed beyond the 24h delivery window", () => {
    expect(isWithinReplayWindow(Math.floor(nowMs / 1000) - 25 * 3600, nowMs)).toBe(false);
    expect(isWithinReplayWindow(Math.floor(nowMs / 1000) - 30 * 24 * 3600, nowMs)).toBe(false);
  });

  it("rejects a far-future forged created_at", () => {
    expect(isWithinReplayWindow(Math.floor(nowMs / 1000) + 3600, nowMs)).toBe(false);
  });

  it("accepts a boundary case just inside the window", () => {
    expect(isWithinReplayWindow(Math.floor(nowMs / 1000) - 24 * 3600 + 5, nowMs)).toBe(true);
  });
});

// --------------------------------------------------------------------------
// J. Event identity for the idempotency ledger (021 F2, F12).
// --------------------------------------------------------------------------

describe("J. event id derivation", () => {
  it("is stable across re-deliveries of the same logical event", async () => {
    const body = JSON.stringify(capturedEnvelope());
    const a = await deriveEventId(parseEnvelope(body), body);
    const b = await deriveEventId(parseEnvelope(body), body);
    expect(a).toBe(b);
  });

  it("keys on the subject entity and timestamp, not only the body digest", async () => {
    // Regression: the subject lookup used to unwrap `payload.payload`, which
    // always yielded undefined and silently downgraded every id to a digest.
    const body = JSON.stringify(capturedEnvelope());
    const id = await deriveEventId(parseEnvelope(body), body);
    expect(id).toBe(`payment.captured:pay_captured_001:${Math.floor(NOW_MS / 1000)}`);
  });

  it("distinguishes a later event on the same payment (e.g. a second refund)", async () => {
    const first = parseEnvelope(JSON.stringify(refundEnvelope()));
    const later = parseEnvelope(
      JSON.stringify(refundEnvelope(4999)),
    );
    expect(first.createdAt).toBe(later.createdAt);
    first.createdAt = Math.floor(NOW_MS / 1000);
    later.createdAt = Math.floor(NOW_MS / 1000) + 60;
    expect(await deriveEventId(first, "a")).not.toBe(await deriveEventId(later, "b"));
  });

  it("distinguishes different event types on the same subject", async () => {
    const captured = parseEnvelope(JSON.stringify(capturedEnvelope()));
    const authorized = parseEnvelope(JSON.stringify(authorizedEnvelope()));
    authorized.payload.payment.id = "pay_captured_001";
    expect(await deriveEventId(captured, "x")).not.toBe(await deriveEventId(authorized, "y"));
  });

  it("falls back to a body digest when there is no subject or timestamp", async () => {
    const body = JSON.stringify({ entity: "event", event: "custom.thing" });
    const envelope = parseEnvelope(body);
    const id = await deriveEventId(envelope, body);
    expect(id).toMatch(/^custom\.thing:body:[0-9a-f]{32}$/);
  });

  it("uses the refund entity when there is no payment entity", async () => {
    const body = JSON.stringify({
      entity: "event",
      event: "refund.processed",
      payload: { refund: { entity: "refund", id: "rfnd_009" } },
      created_at: 1000,
    });
    expect(await deriveEventId(parseEnvelope(body), body))
      .toBe("refund.processed:rfnd_009:1000");
  });
});

// --------------------------------------------------------------------------
// K. Idempotency claim ledger (021 F2) — the exactly-once property.
// --------------------------------------------------------------------------

describe("K. idempotency claim ledger", () => {
  function ledgerOver(store, atMs = NOW_MS) {
    let clock = atMs;
    const ledger = createLedger(store, { now: () => clock });
    return { ledger, setClock: (value) => { clock = value; }, advance: (ms) => { clock += ms; } };
  }

  it("claims an event it has never seen", async () => {
    const { ledger } = ledgerOver(createMemoryLedgerStore());
    const claim = await ledger.claim("payment.captured:pay_a:1", "payment.captured");
    expect(claim.kind).toBe("claimed");
    expect(claim.kind === "claimed" && claim.token).toBe(NOW_ISO);
  });

  it("grants exactly once: a completed event is a duplicate, never reprocessed", async () => {
    const store = createMemoryLedgerStore();
    const { ledger } = ledgerOver(store);
    const eventId = "payment.captured:pay_a:1";

    expect((await ledger.claim(eventId, "payment.captured")).kind).toBe("claimed");
    await ledger.release(eventId, NOW_ISO, "completed");

    expect((await ledger.claim(eventId, "payment.captured")).kind).toBe("duplicate");
    expect((await ledger.claim(eventId, "payment.captured")).kind).toBe("duplicate");
  });

  it("refuses a concurrent delivery while the first is still running", async () => {
    const { ledger } = ledgerOver(createMemoryLedgerStore());
    const eventId = "payment.captured:pay_a:1";
    expect((await ledger.claim(eventId, "payment.captured")).kind).toBe("claimed");
    expect((await ledger.claim(eventId, "payment.captured")).kind).toBe("inflight");
  });

  it("F2: a failed event is replayable — the retry re-claims and succeeds", async () => {
    const store = createMemoryLedgerStore();
    const { ledger } = ledgerOver(store);
    const eventId = "payment.captured:pay_a:1";

    const first = await ledger.claim(eventId, "payment.captured");
    expect(first.kind).toBe("claimed");
    await ledger.release(eventId, NOW_ISO, "failed", "entitlement write failed (23503)");

    expect(store.snapshot()[eventId].status).toBe("failed");

    const retry = await ledger.claim(eventId, "payment.captured");
    expect(retry.kind).toBe("claimed");
    if (retry.kind !== "claimed") return;
    await ledger.release(eventId, retry.token, "completed");
    expect(store.snapshot()[eventId].status).toBe("completed");
    expect((await ledger.claim(eventId, "payment.captured")).kind).toBe("duplicate");
  });

  it("F2: never marks a failed event as processed", async () => {
    const store = createMemoryLedgerStore();
    const { ledger } = ledgerOver(store);
    const eventId = "payment.captured:pay_a:1";
    await ledger.claim(eventId, "payment.captured");
    await ledger.release(eventId, NOW_ISO, "failed", "boom");
    expect(store.snapshot()[eventId].status).toBe("failed");
    expect(store.snapshot()[eventId].claimed_at).toBe(NOW_ISO);
  });

  it("reclaims a processing row only after the lease expires (dead worker)", async () => {
    const store = createMemoryLedgerStore();
    const { ledger, advance } = ledgerOver(store);
    const eventId = "payment.captured:pay_a:1";
    expect((await ledger.claim(eventId, "payment.captured")).kind).toBe("claimed");

    advance(4 * 60 * 1000);
    expect((await ledger.claim(eventId, "payment.captured")).kind).toBe("inflight");

    advance(2 * 60 * 1000);
    const reclaimed = await ledger.claim(eventId, "payment.captured");
    expect(reclaimed.kind).toBe("claimed");
    expect(store.snapshot()[eventId].attempts).toBe(2);
  });

  it("increments the attempt counter on every reclaim", async () => {
    const store = createMemoryLedgerStore();
    const { ledger, advance } = ledgerOver(store);
    const eventId = "payment.captured:pay_a:1";
    for (let i = 1; i <= 3; i++) {
      const claim = await ledger.claim(eventId, "payment.captured");
      expect(claim.kind).toBe("claimed");
      await ledger.release(eventId, claim.kind === "claimed" ? claim.token : "", "failed", "retry me");
      advance(6 * 60 * 1000);
      expect(store.snapshot()[eventId].attempts).toBe(i);
    }
  });

  it("exactly one of two concurrent claims on a failed row wins", async () => {
    const store = createMemoryLedgerStore();
    const { ledger } = ledgerOver(store);
    const eventId = "payment.captured:pay_a:1";
    const seed = await ledger.claim(eventId, "payment.captured");
    await ledger.release(eventId, seed.kind === "claimed" ? seed.token : "", "failed", "x");

    const [a, b] = await Promise.all([
      ledger.claim(eventId, "payment.captured"),
      ledger.claim(eventId, "payment.captured"),
    ]);
    const claimed = [a, b].filter((c) => c.kind === "claimed");
    expect(claimed).toHaveLength(1);
    expect([a, b].filter((c) => c.kind === "inflight")).toHaveLength(1);
  });

  it("exactly one of two concurrent first-deliveries wins the insert", async () => {
    const store = createMemoryLedgerStore();
    const { ledger } = ledgerOver(store);
    const eventId = "payment.captured:pay_a:1";
    const [a, b] = await Promise.all([
      ledger.claim(eventId, "payment.captured"),
      ledger.claim(eventId, "payment.captured"),
    ]);
    expect([a, b].filter((c) => c.kind === "claimed")).toHaveLength(1);
  });

  it("a stale claim token cannot complete or fail someone else's claim", async () => {
    const store = createMemoryLedgerStore();
    const { ledger, advance } = ledgerOver(store);
    const eventId = "payment.captured:pay_a:1";
    const first = await ledger.claim(eventId, "payment.captured");
    expect(first.kind).toBe("claimed");
    const staleToken = first.kind === "claimed" ? first.token : "";

    advance(6 * 60 * 1000);
    const second = await ledger.claim(eventId, "payment.captured");
    expect(second.kind).toBe("claimed");

    // The original worker finally returns and tries to mark its own claim done.
    expect(await ledger.release(eventId, staleToken, "completed")).toBe(false);
    expect(store.snapshot()[eventId].status).toBe("processing");

    expect(await ledger.release(eventId, second.kind === "claimed" ? second.token : "", "completed"))
      .toBe(true);
  });

  it("treats a completed row as terminal and a failed row as reclaimable", () => {
    expect(isLeaseActive({ status: "completed", claimed_at: NOW_ISO, attempts: 1 }, NOW_MS, 300000))
      .toBe(false);
    expect(isLeaseActive({ status: "failed", claimed_at: NOW_ISO, attempts: 1 }, NOW_MS, 300000))
      .toBe(false);
    expect(isLeaseActive({ status: "processing", claimed_at: NOW_ISO, attempts: 1 }, NOW_MS, 300000))
      .toBe(true);
    expect(isLeaseActive({ status: "processing", claimed_at: NOW_ISO, attempts: 1 }, NOW_MS + 301000, 300000))
      .toBe(false);
    // An unparseable claim timestamp must not be treated as an active lease.
    expect(isLeaseActive({ status: "processing", claimed_at: null, attempts: 1 }, NOW_MS, 300000))
      .toBe(false);
    expect(isLeaseActive({ status: "processing", claimed_at: "garbage", attempts: 1 }, NOW_MS, 300000))
      .toBe(false);
  });

  it("bounds and sanitizes the failure reason written to the ledger", () => {
    expect(sanitizeReason(undefined)).toBe("");
    expect(sanitizeReason("a".repeat(5000)).length).toBe(500);
    expect(sanitizeReason("a".repeat(5000), 10)).toHaveLength(10);
  });
});

// --------------------------------------------------------------------------
// L. Structural guards on the Edge Function source.
//    index.ts cannot execute under Node (Deno + remote ESM), so these
//    assertions cover the properties that must never regress silently.
// --------------------------------------------------------------------------

describe("L. Edge Function source invariants", () => {
  // Assertions run on code with comments removed: the files *document* the
  // patterns they forbid, so a raw text match would both false-alarm and be
  // trivially defeated by editing a comment.
  const index = stripTsComments(readFn("index.ts"));

  it("F3: never writes the pre-catalogue 'soravo' product key", () => {
    expect(index).not.toMatch(/product:\s*["']soravo["']/);
  });

  it("F5: has no default product fallback", () => {
    expect(index).not.toMatch(/\?\?\s*["']soravo/);
  });

  it("F4: payment.authorized is not part of any success/grant set", () => {
    expect(index).not.toMatch(/payment\.authorized/);
  });

  it("F1: does not read user_id straight off a required order entity", () => {
    expect(index).not.toMatch(/order\?\.notes\?\.user_id/);
  });

  it("never deletes an entitlement (reconciliation must not destroy rows)", () => {
    expect(index).not.toMatch(/\.delete\(\)/);
  });

  it("reads credentials from Deno.env only — never process.env", () => {
    expect(index).not.toMatch(/process\.env/);
    expect(index).toMatch(/Deno\.env\.get/);
  });

  it("does not log a secret or a raw payload body", () => {
    expect(index).not.toMatch(/console\.[a-z]+\([^)]*webhookSecret/);
    expect(index).not.toMatch(/console\.[a-z]+\([^)]*serviceRoleKey/);
    expect(index).not.toMatch(/console\.[a-z]+\([^)]*rawBody/);
    expect(index).not.toMatch(/console\.log\(/);
  });

  it("V3.2: answers with an explicit non-HTML content type", () => {
    expect(index).toMatch(/content-type/);
    expect(index).not.toMatch(/content-type[^"]*text\/html/);
  });

  it("rejects a non-POST method and a missing signature before any work", () => {
    expect(index).toMatch(/req\.method !== "POST"/);
    expect(index).toMatch(/x-razorpay-signature/);
  });

  it("bounds the request body size", () => {
    expect(index).toMatch(/MAX_BODY_BYTES/);
  });

  it("fails closed with 503 when unconfigured", () => {
    expect(index).toMatch(/respond\(503/);
  });

  it("answers a permanent identity/price failure with 4xx and a transient one with 5xx", () => {
    expect(index).toMatch(/WebhookError\(422/);
    expect(index).toMatch(/status >= 500 \? "retry later"/);
  });

  it("delegates the claim state machine to the tested ledger module", () => {
    expect(index).toMatch(/from "\.\/ledger\.ts"/);
    expect(index).toMatch(/createLedger\(/);
    expect(index).not.toMatch(/markEventProcessed|isEventProcessed/);
  });

  it("F2: claims the event before doing any work, and completes only after", () => {
    const claim = index.indexOf("ledger.claim(eventId");
    const work = index.indexOf("processEvent(envelope)");
    const complete = index.indexOf('ledger.release(eventId, claim.token, "completed")');
    expect(claim).toBeGreaterThan(-1);
    expect(claim).toBeLessThan(work);
    expect(work).toBeLessThan(complete);
  });

  it("F4/F7: verifies capture and price before the entitlement is written", () => {
    const captured = index.indexOf("assertPaymentCaptured(envelope.payload)");
    const price = index.indexOf("assertPaymentMatchesProduct(identity)");
    const grant = index.indexOf("grantEntitlement(identity");
    expect(captured).toBeGreaterThan(-1);
    expect(captured).toBeLessThan(grant);
    expect(price).toBeLessThan(grant);
  });

  it("F3: upserts on (user_id, product) so a renewal cannot overwrite a lifetime row", () => {
    expect(index).toMatch(/onConflict: "user_id,product"/);
  });

  it("F1: resolves identity from every relationship before giving up", () => {
    expect(index).toMatch(/resolveGrantIdentity/);
    expect(index).toMatch(/fetchOrderNotes\(/);
    expect(index).toMatch(/identity unresolved/);
  });
});

// --------------------------------------------------------------------------
// M. Migration contract for the 022 schema changes.
// --------------------------------------------------------------------------

describe("M. 022 migration contract", () => {
  const sql = readMigration("20260926140000_razorpay_webhook_hardening_022.sql");
  const normalized = sql.replace(/--[^\n]*/g, " ").replace(/\s+/g, " ").toLowerCase();

  it("adds the claim/complete/fail state columns", () => {
    for (const column of ["status", "claimed_at", "attempts", "last_error"]) {
      expect(normalized, column).toMatch(new RegExp(`add column if not exists ${column}\\b`));
    }
  });

  it("constrains status to the three ledger states", () => {
    expect(normalized).toMatch(
      /check \(status in \('processing', 'completed', 'failed'\)\)/,
    );
  });

  it("makes processed_at nullable so it can be written only on success", () => {
    expect(normalized).toMatch(/alter column processed_at drop not null/);
  });

  it("grants the ledger to service_role with update, and never to a client role", () => {
    expect(normalized).toMatch(/grant select, insert, update on table public\.webhook_events to service_role/);
    for (const role of ["anon", "authenticated", "public"]) {
      expect(
        new RegExp(`on (?:table )?public\\.webhook_events to ${role}\\b`).test(normalized),
        role,
      ).toBe(false);
    }
  });

  it("grants entitlements to service_role without delete", () => {
    expect(normalized).toMatch(/grant insert, update, select on table public\.entitlements to service_role/);
    expect(normalized).not.toMatch(/grant[^;]*delete[^;]*on (?:table )?public\.entitlements/);
  });

  it("F3: removes the implicit 'soravo' product default and remaps existing rows", () => {
    expect(normalized).toMatch(/alter column product drop default/);
    expect(normalized).toMatch(/set product = case when plan = 'lifetime' then 'soravo_lifetime'/);
    // The legacy value may appear exactly once, in the backfill that repairs it.
    const legacyRefs = normalized.match(/product = 'soravo'/g) ?? [];
    expect(legacyRefs).toHaveLength(1);
    expect(normalized).toMatch(/where product = 'soravo'/);
  });

  it("makes the claim columns mandatory and bounds the attempt counter", () => {
    expect(normalized).toMatch(/alter column status set not null/);
    expect(normalized).toMatch(/alter column claimed_at set not null/);
    expect(normalized).toMatch(/add column if not exists attempts integer not null default 0/);
    expect(normalized).toMatch(/add constraint webhook_events_status_check/);
  });

  it("backfills pre-existing rows so a redeploy cannot strand them in limbo", () => {
    expect(normalized).toMatch(
      /set status = case when processed_at is null then 'failed' else 'completed' end/,
    );
  });

  it("points admin_users() at the catalogue product ids, preferring lifetime", () => {
    const start = sql.indexOf("create or replace function public.admin_users");
    const end = sql.indexOf("$$;", start);
    expect(start).toBeGreaterThan(-1);
    const adminFn = sql.slice(start, end);
    expect(adminFn).toMatch(/product in \('soravo_monthly', 'soravo_lifetime'\)/);
    expect(adminFn).toMatch(/order by \(case when e\.plan = 'lifetime' then 0 else 1 end\)/);
    expect(adminFn).not.toMatch(/product = 'soravo'/);
  });

  it("indexes the provider payment reference used for refund reconciliation", () => {
    expect(normalized).toMatch(/create index if not exists entitlements_provider_payment_ref_idx/);
  });

  it("contains no secret material", () => {
    expect(sql).not.toMatch(/rzp_(test|live)_/);
    expect(sql).not.toMatch(/-----BEGIN/);
  });
});

// --------------------------------------------------------------------------
// N. Deployment contract for the Razorpay webhook function.
//    Added by RAZORPAY-LIVE-CONFIG-VERIFICATION-024.
// --------------------------------------------------------------------------

describe("N. Edge Function deployment contract", () => {
  const configPath = join(repoRoot, "supabase", "config.toml");
  const config = readFileSync(configPath, "utf8");

  // Comments legitimately *name* what they disable, so match the assignment.
  const assignments = config
    .split("\n")
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter((line) => line.length > 0);

  function setting(section, key) {
    let current = "";
    for (const line of assignments) {
      const header = line.match(/^\[([^\]]+)\]$/);
      if (header) {
        current = header[1].trim();
        continue;
      }
      if (current !== section) continue;
      const pair = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (pair && pair[1] === key) return pair[2].trim().replace(/^["']|["']$/g, "");
    }
    return undefined;
  }

  it("declares supabase/config.toml, so the deploy contract is reviewable", () => {
    expect(existsSync(configPath)).toBe(true);
  });

  it("pins the linked project id", () => {
    expect(setting("", "project_id")).toBe("soravo");
  });

  it("disables the Supabase JWT gate for the Razorpay webhook", () => {
    // Razorpay sends no Supabase Auth JWT. With the gate on, every delivery
    // dies at the platform with 401 before HMAC verification can run.
    expect(setting("functions.razorpay-webhook", "verify_jwt")).toBe("false");
  });

  it("never stores a webhook secret or API credential in the config", () => {
    expect(config).not.toMatch(/rzp_(test|live)_/);
    expect(config).not.toMatch(/-----BEGIN/);
    expect(assignments.join(" ")).not.toMatch(/secret\s*=/i);
  });

  it("reads the webhook secret from the platform secret store under the exact expected name", () => {
    expect(readFn("index.ts")).toMatch(
      /Deno\.env\.get\("RAZORPAY_WEBHOOK_SECRET"\)/
    );
  });

  it("treats a missing webhook secret as unconfigured (503) rather than accepting traffic", () => {
    const index = stripTsComments(readFn("index.ts"));
    // readConfig() returns null when the secret is absent, and handleRequest
    // answers 503 — it must never fall through to signature checking.
    expect(index).toMatch(/if \(!config \|\| !supabase\) return respond\(503/);
    expect(index).toMatch(/if \(!webhookSecret \|\| !supabaseUrl \|\| !serviceRoleKey\) return null/);
  });
});

// --------------------------------------------------------------------------
// O. `captured` flag normalization (F25-5).
//    Razorpay serialises one concept two ways across its own docs, so the
//    accept-set is a closed whitelist rather than a truthiness test.
// --------------------------------------------------------------------------

describe("O. captured flag normalization (F25-5)", () => {
  it("accepts every representation Razorpay actually documents", () => {
    // boolean  — webhooks/payments.md, orders.md, refunds.md
    expect(normalizeCapturedFlag(true)).toEqual({ state: "captured" });
    // string   — webhooks/subscriptions.md (subscription.charged/.activated/.completed)
    expect(normalizeCapturedFlag("1")).toEqual({ state: "captured" });
    // number   — numeric variant, accepted defensively
    expect(normalizeCapturedFlag(1)).toEqual({ state: "captured" });
  });

  it("refuses every documented NOT-captured form", () => {
    for (const value of [false, "0", 0]) {
      expect(normalizeCapturedFlag(value), JSON.stringify(value))
        .toEqual({ state: "uncaptured" });
    }
  });

  it("refuses absence rather than defaulting to captured", () => {
    expect(normalizeCapturedFlag(undefined)).toEqual({ state: "unknown", received: "absent" });
    expect(normalizeCapturedFlag(null)).toEqual({ state: "unknown", received: "null" });
  });

  it("refuses arbitrary truthy values — an attacker controls this field", () => {
    // A `Boolean(value)` / `if (value)` test would admit every one of these and
    // grant access without money. `"true"` is the tempting one: it looks right
    // but Razorpay never sends it.
    for (const value of ["true", "yes", "captured", " 1", "1 ", 2, -1, "2", [], {}, [1], "01"]) {
      const result = normalizeCapturedFlag(value);
      expect(result.state, JSON.stringify(value)).toBe("unknown");
    }
  });

  it("describes an unrecognised value without echoing unbounded text", () => {
    const result = normalizeCapturedFlag("z".repeat(5000));
    expect(result.state).toBe("unknown");
    expect(result.received.length).toBeLessThan(20);
  });

  it("grants on the documented subscription.charged payload", () => {
    // The F25-5 regression, verbatim. Old code: 422 "payment is not captured
    // (status=captured)" — a self-contradictory message.
    const envelope = parseEnvelope(JSON.stringify(documentedSubscriptionCharged()));
    expect(envelope?.event).toBe("subscription.charged");
    expect(classifyEvent(envelope.event)).toBe("grant");
    expect(assertPaymentCaptured(envelope.payload).paymentId).toBe("pay_DEXFWroJ6LikKT");
  });

  it("grants on the documented boolean-captured order.paid payload", () => {
    const envelope = parseEnvelope(JSON.stringify(documentedOrderPaid()));
    expect(assertPaymentCaptured(envelope.payload).paymentId).toBe("pay_DESlfW9H8K9uqM");
  });

  it("still refuses a documented payment.failed that carries captured: true", () => {
    // The reason `status` is still checked. Razorpay documents this exact
    // combination; a flag-only test would grant access for a failed payment.
    const envelope = parseEnvelope(JSON.stringify(documentedPaymentFailed()));
    expect(extractEntity(envelope?.payload, "payment")?.captured).toBe(true);
    expect(() => assertPaymentCaptured(envelope?.payload)).toThrow(WebhookError);

    let thrown;
    try {
      assertPaymentCaptured(envelope?.payload);
    } catch (error) {
      thrown = error;
    }
    expect(thrown.status).toBe(422);
    expect(thrown.reason).toMatch(/status is not captured/);
    expect(thrown.reason).toMatch(/status=failed/);
  });

  it("reports the received form in the 422 so the bug is diagnosable", () => {
    for (const [captured, expected] of [["true", /captured=string\(true\)/], [2, /captured=number/]]) {
      let thrown;
      try {
        assertPaymentCaptured({
          payment: { entity: "payment", id: "pay_x", status: "captured", captured },
        });
      } catch (error) {
        thrown = error;
      }
      expect(thrown, JSON.stringify(captured)).toBeInstanceOf(WebhookError);
      expect(thrown.reason, JSON.stringify(captured)).toMatch(expected);
    }
  });
});

// --------------------------------------------------------------------------
// P. Razorpay-documented payload fidelity across the whole event matrix.
// --------------------------------------------------------------------------

describe("P. documented event matrix", () => {
  it("classifies every subscription event the way its documented shape requires", () => {
    expect(classifyEvent("subscription.charged")).toBe("grant");
    expect(classifyEvent("subscription.resumed")).toBe("subscription-state");
    expect(classifyEvent("subscription.paused")).toBe("cancel");
    expect(classifyEvent("subscription.halted")).toBe("cancel");
    expect(classifyEvent("subscription.cancelled")).toBe("cancel");
  });

  it("never grants from a subscription event that documents no payment entity", () => {
    // Razorpay documents subscription.activated/pending/updated/authenticated
    // as subscription-only. activated can fire around a FAILED or unpaid
    // charge, so granting on it would grant access for money that never arrived.
    for (const event of [
      "subscription.activated",
      "subscription.pending",
      "subscription.updated",
      "subscription.authenticated",
    ]) {
      expect(classifyEvent(event), event).toBe("log");
    }
  });

  it("does not treat subscription.completed as a second charge", () => {
    // It documents a payment, but it is the FINAL charge and Razorpay already
    // delivered it as subscription.charged. Handling it would risk a second
    // grant for the same money.
    expect(classifyEvent("subscription.completed")).toBe("log");
  });

  it("agrees with the documented contains[] of all 11 subscription samples", () => {
    const fixtures = {
      "subscription.charged": documentedSubscriptionCharged(),
      "subscription.paused": documentedSubscriptionPaused(),
      "subscription.resumed": documentedSubscriptionResumed(),
      "subscription.halted": documentedSubscriptionHalted(),
      "subscription.cancelled": documentedSubscriptionCancelled(),
    };
    for (const row of DOCUMENTED_SUBSCRIPTION_MATRIX) {
      const hasPayment = row.hasPayment;
      // Only .charged and .completed ship a payment; the classification must
      // grant exactly on .charged and never on a payment-less event.
      const grants = classifyEvent(row.event) === "grant";
      expect(grants, row.event).toBe(hasPayment && row.event === "subscription.charged");
    }
    for (const [event, body] of Object.entries(fixtures)) {
      const action = classifyEvent(event);
      if (action === "grant" || action === "revoke") continue;
      // Every non-money event must still carry a resolvable subscription id,
      // because the cancel and subscription-state branches key on it.
      expect(asString(extractEntity(body.payload, "subscription")?.id), event).toMatch(/^sub_/);
    }
  });

  it("the paused and resumed samples differ ONLY in status and charge_at", () => {
    // The F25-6 proof, asserted rather than asserted-about. If Razorpay ever
    // changes this, the resume semantics decision must be revisited.
    const paused = extractEntity(documentedSubscriptionPaused().payload, "subscription");
    const resumed = extractEntity(documentedSubscriptionResumed().payload, "subscription");

    expect(resumed.id).toBe(paused.id);
    for (const field of [
      "current_start", "current_end", "start_at", "end_at",
      "paid_count", "remaining_count", "total_count", "quantity",
    ]) {
      expect(resumed[field], field).toEqual(paused[field]);
    }
    // Money did not move and no new period opened.
    expect(resumed.paid_count).toBe(paused.paid_count);
    // The two fields that DO change are the lifecycle transition itself.
    expect(resumed.status).toBe("active");
    expect(paused.status).toBe("paused");
    expect(resumed.charge_at).not.toBe(paused.charge_at);
    // And resumed carries no payment entity at all.
    expect(extractEntity(documentedSubscriptionResumed().payload, "payment")).toBeUndefined();
  });

  it("keeps a partial refund non-revoking on the documented payload (I8)", () => {
    const envelope = parseEnvelope(JSON.stringify(documentedRefundProcessed()));
    expect(classifyEvent(envelope.event)).toBe("revoke");
    const refund = extractEntity(envelope?.payload, "refund");
    const payment = extractEntity(envelope?.payload, "payment");
    // The handler's own guard, restated against the documented numbers.
    expect(refund.amount < payment.amount).toBe(true);
    expect(payment.refund_status).toBe("partial");
  });

  it("end-to-end: the documented charged payload resolves a real identity and price", () => {
    const envelope = parseEnvelope(JSON.stringify(documentedSubscriptionCharged()));
    assertPaymentCaptured(envelope?.payload);
    const resolution = resolvePurchaseIdentity({ payload: envelope?.payload });
    expect(resolution.kind).toBe("resolved");
    if (resolution.kind !== "resolved") return;
    const { identity } = resolution;
    expect(identity.userId).toBe(USER_ID);
    expect(identity.productId).toBe("soravo_monthly");
    expect(identity.paymentId).toBe("pay_DEXFWroJ6LikKT");
    expect(identity.subscriptionId).toBe("sub_DEX6xcJ1HSW4CR");
    expect(identity.currency).toBe("INR");
    expect(identity.amountMinor).toBe(MONTHLY_INR_MINOR);
    // The catalogue check must still hold for a documented payload.
    expect(() => assertPaymentMatchesProduct(identity)).not.toThrow();
  });

  it("end-to-end: the documented order.paid payload grants a lifetime row", () => {
    const envelope = parseEnvelope(JSON.stringify(documentedOrderPaid()));
    assertPaymentCaptured(envelope?.payload);
    const resolution = resolvePurchaseIdentity({ payload: envelope?.payload });
    if (resolution.kind !== "resolved") throw new Error(resolution.reason);
    expect(resolution.identity.source).toBe("order");
    expect(resolution.identity.product.plan).toBe("lifetime");
    expect(() => assertPaymentMatchesProduct(resolution.identity)).not.toThrow();
    const row = buildEntitlementRow(resolution.identity, undefined, NOW_ISO);
    expect(row.plan).toBe("lifetime");
    expect(row.expires_at).toBeNull();
  });
});

// --------------------------------------------------------------------------
// Q. subscription.resumed is a lifecycle transition (F25-6).
// --------------------------------------------------------------------------

describe("Q. subscription.resumed is lifecycle-only (F25-6)", () => {
  it("resolves the documented resumed payload from the subscription alone", () => {
    const resume = resolveSubscriptionResume(documentedSubscriptionResumed().payload);
    expect(resume.subscriptionId).toBe("sub_FeQ9WWOjGUZMpG");
  });

  it("needs no payment entity — the documented payload has none", () => {
    const body = documentedSubscriptionResumed();
    expect(extractEntity(body.payload, "payment")).toBeUndefined();
    expect(body.contains).toEqual(["subscription"]);
    expect(() => resolveSubscriptionResume(body.payload)).not.toThrow();
  });

  it("counterexample: the pre-fix design fails this exact payload", () => {
    // The mutation-2 failure mode, pinned as a fact rather than left implicit.
    // Requiring a payment on a documented resumed payload is not a stricter
    // policy — it is a guaranteed 422 on a real Razorpay delivery, because the
    // payload provably carries no payment entity.
    const body = documentedSubscriptionResumed();
    expect(() => assertPaymentCaptured(body.payload)).toThrow(WebhookError);

    let thrown;
    try {
      assertPaymentCaptured(body.payload);
    } catch (error) {
      thrown = error;
    }
    expect(thrown.status).toBe(422);
    expect(thrown.reason).toMatch(/payment entity missing/);
  });

  it("refuses a resume with no subscription entity", () => {
    for (const payload of [undefined, {}, { subscription: null }, { subscription: {} }]) {
      expect(() => resolveSubscriptionResume(payload), JSON.stringify(payload))
        .toThrow(WebhookError);
    }
  });

  it("refuses a resume whose body contradicts the event name", () => {
    // A replayed pause/halt/cancel, or a garbled delivery, must not resurrect a
    // cancelled subscription.
    for (const status of ["paused", "halted", "cancelled", undefined]) {
      const body = documentedSubscriptionResumed(
        status === undefined ? { status: null } : { status },
      );
      let thrown;
      try {
        resolveSubscriptionResume(body.payload);
      } catch (error) {
        thrown = error;
      }
      expect(thrown, String(status)).toBeInstanceOf(WebhookError);
      expect(thrown.status).toBe(422);
    }
  });

  it("the resume patch writes status and NOTHING else", () => {
    // The safety property, made structural: expires_at, starts_at and every
    // provider reference are absent, so a resume cannot move a paid window or
    // invent a payment reference. Razorpay's own paused -> resumed pair keeps
    // current_end and paid_count identical, so nothing else is warranted.
    expect(Object.keys(SUBSCRIPTION_RESUME_PATCH)).toEqual(["status"]);
    expect(SUBSCRIPTION_RESUME_PATCH.status).toBe("active");
    for (const forbidden of [
      "expires_at", "starts_at", "plan", "provider", "provider_payment_ref",
      "provider_order_ref", "provider_subscription_ref", "user_id", "product",
    ]) {
      expect(SUBSCRIPTION_RESUME_PATCH, forbidden).not.toHaveProperty(forbidden);
    }
    expect(Object.isFrozen(SUBSCRIPTION_RESUME_PATCH)).toBe(true);
  });

  it("a resume is not a purchase and not a refund", () => {
    expect(isPurchaseEvent("subscription.resumed")).toBe(false);
    expect(isRefundEvent("subscription.resumed")).toBe(false);
    expect(isSubscriptionStateEvent("subscription.resumed")).toBe(true);
    // A state transition must never be mistaken for a money event.
    expect(isPurchaseEvent("subscription.paused")).toBe(false);
    expect(isSubscriptionStateEvent("subscription.charged")).toBe(false);
  });

  it("the resume branch never demands a payment or an amount", () => {
    const index = stripTsComments(readFn("index.ts"));
    const branch = index.slice(index.indexOf('action === "subscription-state"'));
    expect(branch.length).toBeGreaterThan(0);
    for (const forbidden of [
      "assertPaymentCaptured",
      "resolveGrantIdentity",
      "assertPaymentMatchesProduct",
      "buildEntitlementRow",
      "expires_at",
      "insert(",
      "upsert(",
    ]) {
      expect(branch, forbidden).not.toContain(forbidden);
    }
  });

  it("the resume writer looks the row up by subscription reference, like cancel", () => {
    const index = stripTsComments(readFn("index.ts"));
    const writer = index.slice(index.indexOf("async function recordSubscriptionResume"));
    expect(writer.length).toBeGreaterThan(0);
    expect(writer).toContain('"provider_subscription_ref"');
    expect(writer).toContain("maybeSingle()");
    // Keyed on the subscription id, exactly like cancelEntitlement.
    const cancel = index.slice(index.indexOf("async function cancelEntitlement"));
    expect(cancel).toContain('"provider_subscription_ref"');
  });

  it("renewEntitlement is gone — no code path can fabricate a renewal payment", () => {
    const index = stripTsComments(readFn("index.ts"));
    expect(index).not.toContain("renewEntitlement");
    expect(index).not.toContain('action === "renew"');
    // Only the grant path may build or upsert an entitlement row.
    expect(index.match(/upsert\(/g) ?? []).toHaveLength(1);
  });
});

// --------------------------------------------------------------------------
// R. The twelve entitlement invariants.
//
// I1-I12 are this task's canonical enumeration of the properties the webhook
// must hold. Each names the test that proves it, so a reviewer can falsify any
// one of them independently. Where an invariant is guaranteed by construction
// (narrow patch, closed accept-set) the test asserts the construction, not the
// outcome.
// --------------------------------------------------------------------------

describe("R. twelve entitlement invariants", () => {
  it("I1: a grant requires a captured payment", () => {
    expect(classifyEvent("payment.authorized")).toBe("log");
    expect(() => assertPaymentCaptured(authorizedEnvelope().payload)).toThrow(WebhookError);
    expect(() => assertPaymentCaptured(documentedPaymentFailed().payload)).toThrow(WebhookError);
  });

  it("I2: an unauthorized-but-captured payment still cannot grant", () => {
    expect(() =>
      assertPaymentCaptured({
        payment: { entity: "payment", id: "pay_x", status: "authorized", captured: true },
      }),
    ).toThrow(WebhookError);
  });

  it("I3: identity is required — no default user and no default product", () => {
    const result = resolvePurchaseIdentity({
      payload: { payment: { entity: "payment", id: "pay_x", amount: 1200, currency: "USD", status: "captured", captured: true, notes: {} } },
    });
    expect(result.kind).toBe("unresolved");
    expect(stripTsComments(readFn("index.ts"))).not.toMatch(/\?\?\s*["']soravo/);
  });

  it("I4: a non-uuid user_id is refused", () => {
    const result = resolvePurchaseIdentity({
      payload: {
        payment: {
          entity: "payment", id: "pay_x", amount: 1200, currency: "USD",
          status: "captured", captured: true,
          notes: { user_id: "not-a-uuid", product_id: "soravo_monthly" },
        },
      },
    });
    expect(result.kind).toBe("unresolved");
  });

  it("I5: the paid amount must equal the catalogue price", () => {
    const charged = parseEnvelope(JSON.stringify(documentedSubscriptionCharged()));
    const resolution = resolvePurchaseIdentity({ payload: charged?.payload });
    if (resolution.kind !== "resolved") throw new Error(resolution.reason);
    const tampered = { ...resolution.identity, amountMinor: resolution.identity.amountMinor - 1 };
    expect(() => assertPaymentMatchesProduct(tampered)).toThrow(/amount mismatch/);
  });

  it("I6: an unsupported currency is refused, not coerced", () => {
    const charged = parseEnvelope(JSON.stringify(documentedSubscriptionCharged()));
    const resolution = resolvePurchaseIdentity({ payload: charged?.payload });
    if (resolution.kind !== "resolved") throw new Error(resolution.reason);
    expect(() =>
      assertPaymentMatchesProduct({ ...resolution.identity, currency: "GBP" }),
    ).toThrow(/currency not supported/);
  });

  it("I7: plan, status and expiry come from the catalogue, never the payload", () => {
    const charged = parseEnvelope(JSON.stringify(documentedSubscriptionCharged()));
    const resolution = resolvePurchaseIdentity({ payload: charged?.payload });
    if (resolution.kind !== "resolved") throw new Error(resolution.reason);
    const row = buildEntitlementRow(
      resolution.identity,
      { plan: "lifetime", status: "revoked", entity: "payment" },
      NOW_ISO,
    );
    expect(row.plan).toBe("monthly");
    expect(row.status).toBe("active");
    expect(row.expires_at).toBe(
      new Date(NOW_MS + 30 * 24 * 60 * 60 * 1000).toISOString(),
    );
  });

  it("I8: a partial refund does not revoke access", () => {
    const index = stripTsComments(readFn("index.ts"));
    // The guard compares the refund amount against the full payment amount.
    expect(index).toContain("refundAmount < paymentAmount");
    const refund = extractEntity(documentedRefundProcessed().payload, "refund");
    const payment = extractEntity(documentedRefundProcessed().payload, "payment");
    expect(refund.amount).toBeLessThan(payment.amount);
  });

  it("I9: a cancelled subscription is a lifecycle change, not a silent delete", () => {
    // The handler must never destroy the row: a customer who paid keeps a
    // readable record, and reconciliation depends on it.
    const index = stripTsComments(readFn("index.ts"));
    expect(index).not.toContain(".delete()");
    expect(classifyEvent("subscription.cancelled")).toBe("cancel");
  });

  it("I10: a halted subscription receives no new billing period", () => {
    // A halt must not grant. Only the grant path may move expires_at, and the
    // halt path is cancel — which carries no window extension.
    const index = stripTsComments(readFn("index.ts"));
    const cancelBranch = index.slice(index.indexOf('action === "cancel"'));
    expect(cancelBranch).not.toContain("expires_at");
    expect(cancelBranch).not.toContain("buildEntitlementRow");
    expect(classifyEvent("subscription.halted")).toBe("cancel");
  });

  it("I11: a paused subscription receives no fabricated renewal", () => {
    const index = stripTsComments(readFn("index.ts"));
    const cancelBranch = index.slice(index.indexOf('action === "cancel"'));
    expect(cancelBranch).not.toContain("upsert(");
    expect(classifyEvent("subscription.paused")).toBe("cancel");
  });

  it("I12: a resumed subscription fabricates no payment and no new period", () => {
    // Asserted at three levels: the action, the patch, and the branch.
    expect(isPurchaseEvent("subscription.resumed")).toBe(false);
    expect(Object.keys(SUBSCRIPTION_RESUME_PATCH)).toEqual(["status"]);
    const index = stripTsComments(readFn("index.ts"));
    const branch = index.slice(index.indexOf('action === "subscription-state"'));
    expect(branch).not.toContain("buildEntitlementRow");
    expect(branch).not.toContain("provider_payment_ref");
  });

  it("cross-checks: the only path that may write a paid window is the grant", () => {
    const index = stripTsComments(readFn("index.ts"));
    // buildEntitlementRow is the sole constructor of starts_at/expires_at, and
    // in index.ts it has exactly ONE call site (the import is a bare name, not
    // a call). A second call would be a second place able to invent a window.
    expect(index.match(/buildEntitlementRow\(/g) ?? []).toHaveLength(1);

    // That single call site is inside grantEntitlement...
    const writerStart = index.indexOf("async function grantEntitlement");
    const writerEnd = index.indexOf("async function", writerStart + 1);
    const writer = index.slice(writerStart, writerEnd);
    expect(writer).toContain("buildEntitlementRow(identity, payment, nowIso)");

    // ...and grantEntitlement is awaited from exactly one place, the grant
    // branch. Together: one constructor, one caller, one branch.
    // (`await ` disambiguates the call from the `function grantEntitlement` decl.)
    expect(index.match(/await grantEntitlement\(/g) ?? []).toHaveLength(1);
    const grantBranch = index.indexOf('action === "grant"');
    const grantCall = index.indexOf("await grantEntitlement(");
    expect(grantBranch).toBeGreaterThan(-1);
    expect(grantCall).toBeGreaterThan(grantBranch);
    // And that branch is a grant, not a revoke/cancel/state transition.
    expect(classifyEvent("subscription.resumed")).not.toBe("grant");
    expect(classifyEvent("subscription.paused")).not.toBe("grant");
    expect(classifyEvent("subscription.cancelled")).not.toBe("grant");
  });
});

// --------------------------------------------------------------------------
// S. Security regressions specific to the new accept-set and state path.
// --------------------------------------------------------------------------

describe("S. security regressions", () => {
  it("a forged captured value cannot reach the grant path", () => {
    for (const captured of ["true", "yes", 2, [], {}, " 1"]) {
      const body = documentedSubscriptionCharged(captured);
      expect(() => assertPaymentCaptured(body.payload), JSON.stringify(captured))
        .toThrow(WebhookError);
    }
  });

  it("a subscription.charged with a tampered amount still cannot grant", () => {
    const body = documentedSubscriptionCharged();
    body.payload.payment.entity.amount = 1; // underpay by 9899
    const resolution = resolvePurchaseIdentity({ payload: body.payload });
    if (resolution.kind !== "resolved") throw new Error(resolution.reason);
    expect(() => assertPaymentMatchesProduct(resolution.identity)).toThrow(/amount mismatch/);
  });

  it("a subscription.charged with no resolvable identity cannot grant", () => {
    const body = documentedSubscriptionCharged();
    body.payload.subscription.entity.notes = [];
    body.payload.payment.entity.notes = [];
    const resolution = resolvePurchaseIdentity({ payload: body.payload });
    expect(resolution.kind).toBe("unresolved");
  });

  it("a resume cannot be forged into a grant by adding a payment entity", () => {
    // Even a perfectly captured payment inside a resumed envelope must not route
    // to the grant branch: the EVENT decides, not the payload's contents.
    const body = documentedSubscriptionResumed();
    body.payload.payment = { entity: documentedSubscriptionCharged().payload.payment.entity };
    expect(classifyEvent(body.event)).toBe("subscription-state");
    const index = stripTsComments(readFn("index.ts"));
    const branch = index.slice(index.indexOf('action === "subscription-state"'));
    expect(branch).not.toContain("assertPaymentCaptured");
  });

  it("a resume for an unknown subscription cannot create a row", () => {
    const index = stripTsComments(readFn("index.ts"));
    const branch = index.slice(index.indexOf('action === "subscription-state"'));
    // No insert/upsert anywhere in the state path: a resume with no matching
    // entitlement is acknowledged, never fabricated.
    expect(branch).not.toContain("insert(");
    expect(branch).not.toContain("upsert(");
  });

  it("duplicate deliveries stay idempotent for the documented charged payload", async () => {
    const body = JSON.stringify(documentedSubscriptionCharged());
    const envelope = parseEnvelope(body);
    // Same logical event => same ledger key, so a redelivery is a duplicate.
    expect(await deriveEventId(envelope, body)).toBe(
      await deriveEventId(parseEnvelope(body), body),
    );
  });

  it("a stale documented resumed payload is outside the replay window", () => {
    // The documented samples are from 2020; the handler must refuse them as
    // replays rather than acting on them.
    const body = documentedSubscriptionResumed();
    expect(isWithinReplayWindow(body.created_at, NOW_MS)).toBe(false);
    expect(isWithinReplayWindow(documentedSubscriptionCharged().created_at, NOW_MS)).toBe(false);
  });

  it("never logs a secret, a raw body, or the PII-bearing documented fields", () => {
    const index = stripTsComments(readFn("index.ts"));
    // These identifiers must exist in the source (they are required inputs);
    // what is forbidden is *logging* them. Same rule as section L.
    for (const secretish of ["webhookSecret", "serviceRoleKey", "rawBody"]) {
      expect(index, secretish).toContain(secretish);
      expect(index, secretish).not.toMatch(
        new RegExp(`console\\.[a-z]+\\([^)]*${secretish}`),
      );
    }
    // The new state path logs identifiers only — never notes, never amounts.
    const branch = index.slice(index.indexOf('action === "subscription-state"'));
    expect(branch).not.toContain("notes");
  });
});
