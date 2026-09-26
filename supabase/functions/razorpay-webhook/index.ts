// Razorpay webhook Edge Function — hardened implementation (022).
//
// Layout: this file owns HTTP, configuration and the Supabase wiring only.
// The decision logic lives in pure, unit-tested modules so the security
// properties can be verified rather than asserted:
//   * verify.ts  — HMAC-SHA256 signature check (F11)
//   * events.ts  — parsing, classification, identity, price checks (F1, F4-F8)
//   * catalog.ts — catalogue mirror, drift-guarded by the test suite (F3)
//   * ledger.ts  — idempotency claim state machine (F2, F12)
//
// Trust boundary:
//   * Every request is authenticated with HMAC-SHA256 over the RAW body using
//     RAZORPAY_WEBHOOK_SECRET, read from function secrets only. Nothing in this
//     file prints, echoes or persists a secret.
//   * Entitlement writes use the service-role key that the platform injects;
//     the service role holds an explicit INSERT/UPDATE/SELECT grant on
//     `entitlements` and never DELETE (022 finding F13 — service_role had NO
//     privilege on the table, so no entitlement could ever be written — fixed
//     in migration 20260926140000).
//   * Missing configuration fails closed with 503 instead of throwing at cold
//     start, so a mis-deployed function is diagnosable without crashing.
//
// Delivery semantics:
//   * `webhook_events` is claimed BEFORE any entitlement work and only marked
//     completed AFTER it succeeds; a crash or transient failure leaves the row
//     `failed` (or `processing` past a 5-minute lease) so Razorpay's retry can
//     reclaim it. Duplicate deliveries answer 200 without reprocessing.
//   * Only completed work returns 2xx. Identity, price and payload problems
//     answer 422; transient database/API problems answer 500 — both make
//     Razorpay retry rather than silently dropping a payment.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  WebhookError,
  asString,
  assertPaymentCaptured,
  assertPaymentMatchesProduct,
  buildEntitlementRow,
  buildRevocationPatch,
  classifyEvent,
  deriveEventId,
  extractEntity,
  fetchOrderNotes,
  isWithinReplayWindow,
  parseEnvelope,
  resolvePurchaseIdentity,
  resolveSubscriptionResume,
  SUBSCRIPTION_RESUME_PATCH,
  type Envelope,
  type JsonObject,
  type PurchaseIdentity,
  type EventAction,
  type EntitlementRow,
  type RevocationPatch,
  type SubscriptionResume,
} from "./events.ts";
import { createLedger, type LedgerRow, type LedgerStore } from "./ledger.ts";
import { verifyRazorpaySignature } from "./verify.ts";

const MAX_BODY_BYTES = 256 * 1024;

type Config = {
  webhookSecret: string;
  supabaseUrl: string;
  serviceRoleKey: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
};

function readConfig(): Config | null {
  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) return null;
  return {
    webhookSecret,
    supabaseUrl,
    serviceRoleKey,
    // Optional: enables the order fetch that resolves payment.captured events
    // whose payment carries neither order notes nor payment notes.
    razorpayKeyId: Deno.env.get("RAZORPAY_KEY_ID") ?? "",
    razorpayKeySecret: Deno.env.get("RAZORPAY_KEY_SECRET") ?? "",
  };
}

const config = readConfig();
const supabase: SupabaseClient | null = config
  ? createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: { persistSession: false },
      global: { headers: { "X-Client-Info": "soravo-razorpay-webhook" } },
    })
  : null;

function db(): SupabaseClient {
  if (!supabase) throw new WebhookError(503, "webhook is not configured");
  return supabase;
}

type ProcessOutcome = { status: number; body: string };

function respond(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

// The Supabase adapter for the claim ledger. Every write is a plain
// PostgREST call guarded by the exact row state the caller observed, so the
// compare-and-swap semantics the ledger relies on hold under concurrency.
function createSupabaseLedgerStore(): LedgerStore {
  function table() {
    return db().from("webhook_events");
  }

  return {
    async read(eventId): Promise<LedgerRow | null> {
      const { data, error } = await table()
        .select("status, claimed_at, attempts")
        .eq("event_id", eventId)
        .maybeSingle();
      if (error) {
        throw new WebhookError(500, `ledger read failed (${error.code ?? "unknown"})`);
      }
      if (!data) return null;
      return {
        status: String(data.status ?? ""),
        claimed_at: data.claimed_at === null || data.claimed_at === undefined
          ? null
          : String(data.claimed_at),
        attempts: typeof data.attempts === "number" ? data.attempts : null,
      };
    },

    async insert(eventId, eventType, claim): Promise<boolean> {
      const nowIso = claim.claimedAt;
      const { error } = await table().insert({
        event_id: eventId,
        event_type: eventType,
        status: "processing",
        claimed_at: nowIso,
        attempts: claim.attempts,
        processed_at: null,
        updated_at: nowIso,
      });
      if (!error) return true;
      // 23505 = unique violation: a concurrent delivery inserted first.
      if (error.code === "23505") return false;
      throw new WebhookError(500, `ledger insert failed (${error.code ?? "unknown"})`);
    },

    async compareAndSwap(eventId, expected, claim): Promise<boolean> {
      const nowIso = claim.claimedAt;
      let query = table()
        .update({
          status: "processing",
          claimed_at: nowIso,
          last_error: null,
          updated_at: nowIso,
          attempts: claim.attempts,
        })
        .eq("event_id", eventId)
        .eq("status", expected.status)
        .select("event_id");
      if (expected.claimedAt === null) query = query.is("claimed_at", null);
      else query = query.eq("claimed_at", expected.claimedAt);

      const { data, error } = await query;
      if (error) {
        throw new WebhookError(500, `ledger claim failed (${error.code ?? "unknown"})`);
      }
      return Array.isArray(data) && data.length > 0;
    },

    async release(eventId, claim, outcome, reason, nowIso): Promise<boolean> {
      const patch = outcome === "completed"
        ? { status: "completed", processed_at: nowIso, last_error: null, updated_at: nowIso }
        : { status: "failed", last_error: reason ?? null, updated_at: nowIso };

      const { data, error } = await table()
        .update(patch)
        .eq("event_id", eventId)
        .eq("status", "processing")
        .eq("claimed_at", claim.claimedAt)
        .select("event_id");
      if (error) {
        throw new WebhookError(500, `ledger release failed (${error.code ?? "unknown"})`);
      }
      const released = Array.isArray(data) && data.length > 0;
      if (!released) {
        // The lease was taken over while we were working. The new owner is
        // authoritative; do not report success for work it may have redone.
        console.warn("webhook ledger claim was lost before release", {
          event: "webhook.ledger_claim_lost",
          eventId,
          outcome,
        });
      }
      return released;
    },
  };
}

async function grantEntitlement(
  identity: PurchaseIdentity,
  payment: JsonObject | undefined,
  nowIso: string,
): Promise<void> {
  const client = db();

  // Same payment already produced this row: nothing to rewrite. This keeps a
  // re-delivered (or differently keyed) success event from shifting an already
  // granted window.
  const { data: existing, error: readError } = await client
    .from("entitlements")
    .select("provider_payment_ref")
    .eq("user_id", identity.userId)
    .eq("product", identity.productId)
    .maybeSingle();
  if (readError) {
    throw new WebhookError(500, `entitlement read failed (${readError.code ?? "unknown"})`);
  }
  if (existing && existing.provider_payment_ref === identity.paymentId) return;

  const row = buildEntitlementRow(identity, payment, nowIso);
  const { error } = await client.from("entitlements").upsert(row, {
    onConflict: "user_id,product",
  });
  if (error) {
    if (error.code === "23503") {
      throw new WebhookError(422, "entitlement user does not exist");
    }
    if (error.code === "23514") {
      throw new WebhookError(422, "entitlement row violates a database invariant");
    }
    console.error("entitlement write failed", {
      event: "webhook.entitlement_write_failed",
      userId: identity.userId,
      productId: identity.productId,
      paymentId: identity.paymentId,
      code: error.code,
      message: error.message,
    });
    throw new WebhookError(500, `entitlement write failed (${error.code ?? "unknown"})`);
  }
}

async function revokeEntitlement(paymentId: string, nowIso: string): Promise<boolean> {
  const client = db();
  const { data, error } = await client
    .from("entitlements")
    .select("id, plan, status, expires_at")
    .eq("provider_payment_ref", paymentId)
    .maybeSingle();
  if (error) {
    throw new WebhookError(500, `entitlement read failed (${error.code ?? "unknown"})`);
  }
  if (!data) return false;

  const expiresAt = typeof data.expires_at === "string" ? Date.parse(data.expires_at) : NaN;
  const alreadyRevoked = data.plan === "lifetime"
    ? data.status === "revoked"
    : data.status === "cancelled" && Number.isFinite(expiresAt) &&
      expiresAt <= Date.parse(nowIso);
  if (alreadyRevoked) return true;

  const patch = buildRevocationPatch(String(data.plan), nowIso);
  const { error: updateError } = await client
    .from("entitlements")
    .update(patch)
    .eq("id", String(data.id));
  if (updateError) {
    throw new WebhookError(500, `entitlement revoke failed (${updateError.code ?? "unknown"})`);
  }
  return true;
}

async function cancelEntitlement(subscriptionId: string, nowIso: string): Promise<boolean> {
  const client = db();
  const { data, error } = await client
    .from("entitlements")
    .select("id, plan, status, expires_at")
    .eq("provider_subscription_ref", subscriptionId)
    .maybeSingle();
  if (error) {
    throw new WebhookError(500, `entitlement read failed (${error.code ?? "unknown"})`);
  }
  if (!data) return false;

  const expiresAt = typeof data.expires_at === "string" ? Date.parse(data.expires_at) : NaN;
  const alreadyCancelled = data.plan === "lifetime"
    ? data.status === "revoked"
    : data.status === "cancelled" && Number.isFinite(expiresAt) &&
      expiresAt <= Date.parse(nowIso);
  if (alreadyCancelled) return true;

  const patch = buildRevocationPatch(String(data.plan), nowIso);
  const { error: updateError } = await client
    .from("entitlements")
    .update(patch)
    .eq("id", String(data.id));
  if (updateError) {
    throw new WebhookError(500, `entitlement cancel failed (${updateError.code ?? "unknown"})`);
  }
  return true;
}

// F25-6: a resume is a LIFECYCLE transition, so the row is found by the same
// subscription-keyed lookup `cancelEntitlement` uses and only `status` is touched.
// There is no captured payment to verify, no amount to check, and no window to move.
async function recordSubscriptionResume(target: SubscriptionResume): Promise<boolean> {
  const client = db();
  const { data, error } = await client
    .from("entitlements")
    .select("id, plan, status")
    .eq("provider_subscription_ref", target.subscriptionId)
    .maybeSingle();
  if (error) {
    throw new WebhookError(500, `entitlement read failed (${error.code ?? "unknown"})`);
  }
  // No row means no captured payment ever produced this entitlement — most
  // likely because the `subscription.charged` that should have created it was
  // refused (F25-5) or arrived out of order. A resume must NOT paper over that by
  // fabricating a payment: the event is acknowledged and the row stays absent, and
  // the retried charge is what will create it with a real payment reference.
  if (!data) return false;
  if (String(data.plan) === "lifetime") return true; // defensive: lifetime has no subscription ref
  if (String(data.status) === "active") return true; // already active — nothing to do

  const { error: updateError } = await client
    .from("entitlements")
    .update({ ...SUBSCRIPTION_RESUME_PATCH })
    .eq("id", String(data.id));
  if (updateError) {
    throw new WebhookError(500, `entitlement resume failed (${updateError.code ?? "unknown"})`);
  }
  return true;
}

async function resolveGrantIdentity(payload: JsonObject | undefined): Promise<PurchaseIdentity> {
  let resolution = resolvePurchaseIdentity({ payload });
  if (resolution.kind === "resolved") return resolution.identity;

  const orderId = asString(extractEntity(payload, "payment")?.order_id) ??
    asString(extractEntity(payload, "order")?.id);
  const fetched = await fetchOrderNotes(orderId, {
    keyId: config?.razorpayKeyId ?? "",
    keySecret: config?.razorpayKeySecret ?? "",
  });

  if (fetched.ok) {
    const withFetchedOrder = resolvePurchaseIdentity({
      payload,
      fetchedOrderNotes: fetched.notes,
    });
    if (withFetchedOrder.kind === "resolved") return withFetchedOrder.identity;
    resolution = withFetchedOrder;
  } else if (fetched.reason === "transient") {
    throw new WebhookError(500, "order lookup failed");
  } else if (fetched.reason === "not_configured") {
    resolution = {
      kind: "unresolved",
      reason: `${resolution.reason}; order fetch not configured`,
    };
  }

  throw new WebhookError(422, `identity unresolved: ${resolution.reason}`);
}

async function processEvent(envelope: Envelope): Promise<ProcessOutcome> {
  const nowIso = new Date().toISOString();
  const action = classifyEvent(envelope.event);
  const payment = extractEntity(envelope.payload, "payment");
  const paymentId = asString(payment?.id);
  const subscription = extractEntity(envelope.payload, "subscription");
  const subscriptionId = asString(subscription?.id);

  if (action === "log") {
    // payment.authorized, payment.failed, refund.failed, subscription.activated,
    // subscription.pending, subscription.updated, subscription.completed and every
    // unknown event: acknowledge without touching entitlements (requirement 3).
    // subscription.resumed is deliberately NOT listed here — it is a lifecycle
    // transition handled by the `subscription-state` branch below, and
    // subscription.paused/halted/cancelled by the `cancel` branch. (F25-7: the
    // previous comment listed .paused and .resumed here, contradicting
    // classifyEvent.)
    console.info("webhook event recorded", {
      event: "webhook.recorded",
      eventType: envelope.event,
      paymentId: paymentId ?? null,
      subscriptionId: subscriptionId ?? null,
      action,
    });
    return { status: 200, body: "event recorded" };
  }

  if (action === "grant") {
    const captured = assertPaymentCaptured(envelope.payload);
    const identity = await resolveGrantIdentity(envelope.payload);
    assertPaymentMatchesProduct(identity);
    await grantEntitlement(identity, payment, nowIso);
    console.info("entitlement activated", {
      event: "entitlement.activated",
      eventType: envelope.event,
      userId: identity.userId,
      productId: identity.productId,
      plan: identity.product.plan,
      paymentId: captured.paymentId,
      subscriptionId: identity.subscriptionId ?? null,
      identitySource: identity.source,
      amountMinor: identity.amountMinor,
      currency: identity.currency,
    });
    return { status: 200, body: "entitlement activated" };
  }

  if (action === "subscription-state") {
    // F25-6: subscription.resumed. Lifecycle only — no captured payment is
    // required, none is fabricated, and no billing period is created, extended or
    // restored. The documented payload is contains:["subscription"] and would
    // previously have died with 422 "payment entity missing for a success event".
    const resume = resolveSubscriptionResume(envelope.payload);
    const updated = await recordSubscriptionResume(resume);
    console.info(
      updated ? "subscription resumed" : "subscription resume without an entitlement",
      {
        event: updated ? "subscription.resumed" : "webhook.subscription_resume_unmatched",
        eventType: envelope.event,
        subscriptionId: resume.subscriptionId,
      },
    );
    return {
      status: 200,
      body: updated ? "subscription resumed" : "subscription resume recorded",
    };
  }

  if (action === "cancel") {
    // subscription.cancelled, subscription.halted, subscription.paused
    if (!subscriptionId) {
      throw new WebhookError(422, "subscription event without a subscription entity");
    }
    const cancelled = await cancelEntitlement(subscriptionId, nowIso);
    console.info(cancelled ? "entitlement cancelled" : "subscription cancel without an entitlement", {
      event: cancelled ? "entitlement.cancelled" : "webhook.subscription_cancel_unmatched",
      eventType: envelope.event,
      subscriptionId,
    });
    return {
      status: 200,
      body: cancelled ? "entitlement cancelled" : "subscription cancel recorded",
    };
  }

  // Revoke path (refund.processed only — Razorpay publishes no `payment.refunded`
  // event; the previous comment naming it was F25-9).
  if (!paymentId) {
    throw new WebhookError(422, "refund event without a payment entity");
  }
  const refund = extractEntity(envelope.payload, "refund");
  const refundAmount = typeof refund?.amount === "number" ? refund.amount : undefined;
  const paymentAmount = typeof payment?.amount === "number" ? payment.amount : undefined;
  if (
    refundAmount !== undefined && paymentAmount !== undefined &&
    refundAmount < paymentAmount
  ) {
    console.info("partial refund recorded", {
      event: "webhook.partial_refund",
      paymentId,
      refundAmount,
      paymentAmount,
    });
    return { status: 200, body: "partial refund recorded" };
  }

  const revoked = await revokeEntitlement(paymentId, nowIso);
  console.info(revoked ? "entitlement revoked" : "refund without an entitlement", {
    event: revoked ? "entitlement.revoked" : "webhook.refund_unmatched",
    eventType: envelope.event,
    paymentId,
  });
  return {
    status: 200,
    body: revoked ? "entitlement revoked" : "refund recorded",
  };
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method !== "POST") return respond(405, "method not allowed");
  if (!config || !supabase) return respond(503, "webhook is not configured");

  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) return respond(400, "missing signature");

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return respond(413, "payload too large");
  }
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) return respond(413, "payload too large");

  if (!(await verifyRazorpaySignature(config.webhookSecret, rawBody, signature))) {
    console.warn("webhook signature rejected", { event: "webhook.bad_signature" });
    return respond(400, "invalid signature");
  }

  const envelope = parseEnvelope(rawBody);
  if (!envelope) return respond(400, "invalid payload");
  if (
    envelope.createdAt !== undefined &&
    !isWithinReplayWindow(envelope.createdAt, Date.now())
  ) {
    console.warn("webhook event outside replay window", {
      event: "webhook.stale_event",
      eventType: envelope.event,
      createdAt: envelope.createdAt,
    });
    return respond(400, "event outside replay window");
  }

  const eventId = await deriveEventId(envelope, rawBody);
  const ledger = createLedger(createSupabaseLedgerStore());

  let claim: Awaited<ReturnType<typeof ledger.claim>>;
  try {
    claim = await ledger.claim(eventId, envelope.event);
  } catch (error) {
    const reason = error instanceof WebhookError ? error.reason : "ledger unavailable";
    console.error("webhook claim failed", {
      event: "webhook.claim_failed",
      eventId,
      reason,
    });
    return respond(500, "retry later");
  }

  if (claim.kind === "duplicate") {
    console.info("duplicate webhook delivery ignored", {
      event: "webhook.duplicate",
      eventId,
      eventType: envelope.event,
    });
    return respond(200, "duplicate event");
  }
  if (claim.kind === "inflight") {
    return respond(409, "event already in progress");
  }

  try {
    const outcome = await processEvent(envelope);
    const released = await ledger.release(eventId, claim.token, "completed");
    if (!released) {
      // Our claim was taken over mid-flight. Report a retryable failure rather
      // than a success we cannot prove: the new owner is authoritative.
      return respond(409, "event already in progress");
    }
    console.info("webhook processed", {
      event: "webhook.processed",
      eventId,
      eventType: envelope.event,
      status: outcome.status,
    });
    return respond(outcome.status, outcome.body);
  } catch (error) {
    const status = error instanceof WebhookError ? error.status : 500;
    const reason = error instanceof WebhookError
      ? error.reason
      : error instanceof Error ? error.message : "unknown error";
    console.error("webhook processing failed", {
      event: "webhook.failed",
      eventId,
      eventType: envelope.event,
      status,
      reason,
    });
    try {
      await ledger.release(eventId, claim.token, "failed", reason);
    } catch (releaseError) {
      console.error("webhook ledger release failed", {
        event: "webhook.ledger_release_failed",
        eventId,
        outcome: "failed",
        reason: releaseError instanceof WebhookError ? releaseError.reason : "unknown",
      });
    }
    return respond(status, status >= 500 ? "retry later" : "unprocessable event");
  }
}

Deno.serve(handleRequest);
