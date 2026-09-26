// Razorpay webhook parsing, classification, identity resolution and row
// building (021 findings F1-F9; 022 requirements 1-9; 023 Option A + regional pricing).
//
// Pure TypeScript: no Deno APIs, no remote imports, no database access. The
// Edge Function (index.ts) owns HTTP, the idempotency ledger and Supabase
// writes; everything here is deterministic and unit-tested in
// supabase/tests/webhook-hardening.test.mjs.
//
// Design rules enforced here:
//   * Every field read out of the payload is type-checked first — a missing or
//     malformed field produces an explicit reason, never a TypeError (F9).
//   * Identity (user + product) is required for a grant. There is no default
//     product and no default user (F5).
//   * Amount and currency must match the catalogue exactly before an
//     entitlement may be written (F6).
//   * `payment.authorized` never grants (F4); only captured or paid success
//     events do (requirement 4).
//   * Rows are derived, never trusted: plan, expiry and status all come from
//     the catalogue plus the payment state, and no PII is ever written into a
//     provider-reference column (F7, F8).
//   * Option A: soravo_monthly uses Razorpay Subscriptions (auto-renewal),
//     soravo_lifetime uses Razorpay Orders (one-time).
//   * Regional pricing: Soravo owns the catalogue for INR, USD, CAD, EUR, AUD.

import {
  PRODUCT_CATALOG,
  resolveLegacyProduct,
  resolveProduct,
  type CatalogProduct,
  type Currency,
  type ProductId,
} from "./catalog.ts";

export type JsonObject = Record<string, unknown>;

export class WebhookError extends Error {
  readonly status: number;
  readonly reason: string;

  constructor(status: number, reason: string) {
    super(reason);
    this.name = "WebhookError";
    this.status = status;
    this.reason = reason;
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Razorpay re-delivers for 24 hours with exponential backoff; anything older
// than that cannot be a first delivery, so it is a replay (F12).
const REPLAY_MAX_AGE_SECONDS = 24 * 60 * 60;
const REPLAY_MAX_FUTURE_SKEW_SECONDS = 5 * 60;

// Monthly subscription renewal window: 30 days from grant (ADR-012)
const MONTHLY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// The action set separates MONEY from LIFECYCLE. The distinction is load-bearing,
// not cosmetic: only a `grant` may create or extend a paid window, and only a
// `revoke` may cut one that a refund returned. A lifecycle transition may set
// `status` and nothing else.
//   grant              — money arrived (captured payment/charge)
//   revoke             — money came back (processed refund)
//   cancel             — lifecycle: stop future renewal
//   subscription-state — lifecycle: transition, no money, no period change
//   log                — acknowledged, entitlements untouched
export type EventAction =
  | "grant"
  | "revoke"
  | "cancel"
  | "subscription-state"
  | "log";

export type Envelope = {
  event: string;
  payload: JsonObject | undefined;
  createdAt: number | undefined;
};

export type PurchaseIdentity = {
  userId: string;
  productId: ProductId;
  product: CatalogProduct;
  paymentId: string;
  orderId: string | undefined;
  subscriptionId: string | undefined;
  amountMinor: number;
  currency: Currency;
  source: "order" | "payment" | "fetched-order" | "subscription";
};

export type IdentityResolution =
  | { kind: "resolved"; identity: PurchaseIdentity }
  | { kind: "unresolved"; reason: string };

export type EntitlementRow = {
  user_id: string;
  product: ProductId;
  plan: string;
  status: string;
  provider: string;
  provider_customer_ref: string;
  provider_payment_ref: string;
  provider_order_ref: string | null;
  provider_subscription_ref: string | null;
  starts_at: string;
  expires_at: string | null;
};

export type RevocationPatch = { status: string; expires_at: string | null };

export type OrderFetchResult =
  | { ok: true; notes: Record<string, string> }
  | { ok: false; reason: "not_configured" | "not_found" | "transient" };

export function asObject(value: unknown): JsonObject | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

// Razorpay sends `notes` as an object, but an empty notes field arrives as
// `[]`. Anything that is not an object of scalars becomes an empty record so
// downstream code can index freely (requirement 6).
export function normalizeNotes(value: unknown): Record<string, string> {
  const notes = asObject(value);
  if (!notes) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(notes)) {
    if (typeof entry === "string") out[key] = entry;
    else if (typeof entry === "number" || typeof entry === "boolean") out[key] = String(entry);
  }
  return out;
}

export function extractEntity(
  payload: JsonObject | undefined,
  key: string,
): JsonObject | undefined {
  const holder = asObject(payload?.[key]);
  if (!holder) return undefined;
  const entity = asObject(holder.entity);
  if (entity) return entity;
  return asString(holder.id) ? holder : undefined;
}

export function parseEnvelope(rawBody: string): Envelope | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return undefined;
  }
  const envelope = asObject(parsed);
  if (!envelope) return undefined;
  const event = asString(envelope.event);
  if (!event) return undefined;
  return {
    event,
    payload: asObject(envelope.payload),
    createdAt: asNumber(envelope.created_at),
  };
}

// The classification is derived from Razorpay's own published sample payloads
// (razorpay/markdown-docs@master:webhooks/*.md), not from event-name intuition:
//
//   event                    contains                  money?  action
//   -----------------------  ------------------------  -----  ------------------
//   payment.captured         payment                   yes    grant
//   order.paid               payment, order            yes    grant
//   subscription.charged     subscription, payment     yes    grant
//   refund.processed         refund, payment           reverse revoke
//   subscription.cancelled   subscription              no     cancel
//   subscription.halted      subscription              no     cancel
//   subscription.paused      subscription              no     cancel
//   subscription.resumed     subscription              no     subscription-state
//   anything else            —                         no     log
//
// F25-6: `subscription.resumed` is SUBSCRIPTION-ONLY. Razorpay's documented
// paused -> resumed pair keeps current_start, current_end, paid_count and
// remaining_count identical; only `status` (paused -> active) and `charge_at`
// (null -> the next scheduled charge) change. Resuming therefore moves no money,
// opens no new period, and carries no payment entity — so it must never be
// modelled as a renewal. The previous `return "renew"` routed it into a branch
// that demanded a captured payment and could not be executed by any real
// payload.
export function classifyEvent(event: string): EventAction {
  switch (event) {
    case "payment.captured":
    case "order.paid":
    case "subscription.charged":
      return "grant";
    case "refund.processed":
      return "revoke";
    case "subscription.cancelled":
    case "subscription.halted":
    case "subscription.paused":
      return "cancel";
    case "subscription.resumed":
      return "subscription-state";
    default:
      return "log";
  }
}

export function isWithinReplayWindow(
  createdAtSeconds: number,
  nowMs: number,
  maxAgeSeconds = REPLAY_MAX_AGE_SECONDS,
  maxFutureSkewSeconds = REPLAY_MAX_FUTURE_SKEW_SECONDS,
): boolean {
  const ageSeconds = nowMs / 1000 - createdAtSeconds;
  return ageSeconds <= maxAgeSeconds && ageSeconds >= -maxFutureSkewSeconds;
}

export function isPurchaseEvent(event: string): boolean {
  return classifyEvent(event) === "grant";
}

export function isRefundEvent(event: string): boolean {
  return classifyEvent(event) === "revoke";
}

export function isSubscriptionStateEvent(event: string): boolean {
  return classifyEvent(event) === "subscription-state";
}

export type SubscriptionResume = {
  subscriptionId: string;
  /** Observability only — never an authorization input. */
  notes: Record<string, string>;
};

// F25-6: resolve `subscription.resumed` from the SUBSCRIPTION entity alone. No
// payment entity is required, and none may be invented: the documented payload is
// `contains: ["subscription"]`.
export function resolveSubscriptionResume(
  payload: JsonObject | undefined,
): SubscriptionResume {
  const subscription = extractEntity(payload, "subscription");
  const subscriptionId = asString(subscription?.id);
  if (!subscriptionId) {
    throw new WebhookError(422, "subscription.resumed without a subscription entity");
  }
  // The documented resumed payload reports `status: "active"`. Any other value
  // means the body contradicts the event name — a replayed pause/halt/cancel, or
  // a garbled delivery. Refusing keeps a cancelled subscription from being
  // resurrected by a mismatched event.
  const reported = asString(subscription?.status);
  if (reported !== "active") {
    throw new WebhookError(
      422,
      `subscription.resumed reports status=${reported ?? "unknown"} (expected active)`,
    );
  }
  return { subscriptionId, notes: normalizeNotes(subscription?.notes) };
}

// The ONLY mutation a subscription-state event may make. Note what is absent:
// no expires_at, no starts_at, no provider_payment_ref, no amount check.
//
// Razorpay's documented paused -> resumed pair leaves current_start, current_end,
// paid_count and remaining_count identical, so a resume neither buys a new period
// nor restores one the customer had not paid for. Keeping the patch this narrow is
// what makes that true by construction rather than by reviewer vigilance — the
// paid window can only ever move on a `grant`.
export const SUBSCRIPTION_RESUME_PATCH = Object.freeze({ status: "active" }) as {
  readonly status: "active";
};

function identityFromNotes(
  notes: Record<string, string>,
  context: {
    paymentId: string;
    orderId: string | undefined;
    subscriptionId: string | undefined;
    amountMinor: number;
    currency: Currency;
    source: PurchaseIdentity["source"];
  },
): IdentityResolution {
  const userId = asString(notes.user_id);
  if (!userId) return { kind: "unresolved", reason: "user_id note missing" };
  if (!UUID_PATTERN.test(userId)) {
    return { kind: "unresolved", reason: "user_id note is not a uuid" };
  }

  const rawProductId = notes.product_id ?? notes.product;
  let product: CatalogProduct | undefined;
  if (rawProductId !== undefined) {
    // An explicit product note must be a catalogue id (or the legacy
    // `soravo` marker together with a plan note); anything else is refused
    // instead of being silently mapped to a cheaper plan.
    product = resolveProduct(rawProductId);
    if (!product && rawProductId === "soravo") {
      const legacyPlan = resolveLegacyProduct(rawProductId, notes.plan);
      product = legacyPlan ? resolveProduct(legacyPlan) : undefined;
    }
  } else {
    // No product note at all: a plan note alone still identifies the product.
    const planProduct = planToProductId(notes.plan);
    product = planProduct ? resolveProduct(planProduct) : undefined;
  }
  if (!product) {
    return {
      kind: "unresolved",
      reason: `product note missing or unknown (${rawProductId ?? notes.plan ?? "none"})`,
    };
  }

  return {
    kind: "resolved",
    identity: {
      userId,
      productId: product.id,
      product,
      paymentId: context.paymentId,
      orderId: context.orderId,
      subscriptionId: context.subscriptionId,
      amountMinor: context.amountMinor,
      currency: context.currency,
      source: context.source,
    },
  };
}

function planToProductId(plan: string | undefined): ProductId | undefined {
  if (plan === "lifetime") return "soravo_lifetime";
  if (plan === "monthly") return "soravo_monthly";
  return undefined;
}

// Requirement 2: resolve user, product, payment and order from the payload
// relationships that actually exist. Sources are tried in order — the embedded
// order entity (order.paid), the payment entity's own notes, the subscription
// entity's notes, then the order fetched from the Razorpay API by
// payment.order_id (payment.captured ships without an order entity). Only
// `payment.captured`/`order.paid`/`subscription.charged` reach here.
export function resolvePurchaseIdentity(args: {
  payload: JsonObject | undefined;
  fetchedOrderNotes?: Record<string, string>;
}): IdentityResolution {
  const payment = extractEntity(args.payload, "payment");
  const order = extractEntity(args.payload, "order");
  const subscription = extractEntity(args.payload, "subscription");

  const paymentId = asString(payment?.id);
  const orderId = asString(payment?.order_id) ?? asString(order?.id);
  const subscriptionId = asString(subscription?.id);
  if (!payment) return { kind: "unresolved", reason: "payment entity missing" };
  if (!paymentId) return { kind: "unresolved", reason: "payment id missing" };

  const amountMinor = asNumber(payment.amount);
  const currency = asString(payment.currency) as Currency | undefined;
  if (amountMinor === undefined || !currency) {
    return { kind: "unresolved", reason: "payment amount or currency missing" };
  }

  const context = { paymentId, orderId, subscriptionId, amountMinor, currency } as const;

  const sources: Array<{ source: PurchaseIdentity["source"]; notes: Record<string, string> }> = [
    { source: "order", notes: normalizeNotes(order?.notes) },
    { source: "payment", notes: normalizeNotes(payment?.notes) },
    { source: "subscription", notes: normalizeNotes(subscription?.notes) },
    ...(args.fetchedOrderNotes
      ? [{ source: "fetched-order" as const, notes: args.fetchedOrderNotes }]
      : []),
  ];

  const reasons: string[] = [];
  for (const { source, notes } of sources) {
    const resolved = identityFromNotes(notes, { ...context, source });
    if (resolved.kind === "resolved") return resolved;
    reasons.push(`${source}: ${resolved.reason}`);
  }
  return { kind: "unresolved", reason: reasons.join("; ") };
}

// Requirement 2 + F6: the paid amount and currency must equal the catalogue
// price for the resolved product before anything is granted.
export function assertPaymentMatchesProduct(identity: PurchaseIdentity): void {
  const expected = identity.product.regionalPrices[identity.currency];
  if (!expected) {
    throw new WebhookError(
      422,
      `currency not supported in catalogue: ${identity.currency} (${identity.productId})`,
    );
  }
  if (identity.amountMinor !== expected.amountMinor) {
    throw new WebhookError(
      422,
      `amount mismatch: paid ${identity.amountMinor}, catalogue ${expected.amountMinor} (${identity.productId})`,
    );
  }
}

// F25-5: Razorpay does not serialise `captured` one way, and its own published
// samples disagree by event family:
//
//   boolean `true` — webhooks/payments.md, webhooks/orders.md, webhooks/refunds.md
//                    (payment.captured, order.paid, refund.processed)
//   string  "1"    — webhooks/subscriptions.md
//                    (subscription.charged, subscription.activated, subscription.completed)
//
// The old strict `payment.captured !== true` therefore refused every recurring
// charge and returned the self-contradictory `422 payment is not captured
// (status=captured)`. Both documented forms are now accepted.
//
// The accept-set is closed on purpose. A permissive truthiness test would also
// admit `"yes"`, `2`, `[]` or `{}` — all of which sit inside a payload an
// attacker fully controls, and any of which would grant access without money.
export type CapturedFlag =
  | { state: "captured" }
  | { state: "uncaptured" }
  | { state: "unknown"; received: string };

/** Bounded, PII-free description of an unrecognised `captured` value. */
function describeCapturedValue(value: unknown): string {
  if (value === undefined) return "absent";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const type = typeof value;
  // The field is a one-or-two character flag in practice; the 8-character cap
  // keeps the diagnostic useful without echoing arbitrary attacker text.
  if (type === "string") return `string(${(value as string).slice(0, 8)})`;
  if (type === "bigint") return "bigint";
  return type;
}

export function normalizeCapturedFlag(value: unknown): CapturedFlag {
  if (value === true) return { state: "captured" };
  if (value === "1") return { state: "captured" }; // subscriptions doc
  if (value === 1) return { state: "captured" }; // numeric variant
  if (value === false) return { state: "uncaptured" };
  if (value === "0") return { state: "uncaptured" };
  if (value === 0) return { state: "uncaptured" };
  return { state: "unknown", received: describeCapturedValue(value) };
}

// Requirement 4: an entitlement may only be derived from a payment that is
// actually captured (an `order.paid`/`payment.captured`/`subscription.charged`
// envelope carrying a non-captured payment is refused instead of trusted).
export function assertPaymentCaptured(payload: JsonObject | undefined): { paymentId: string } {
  const payment = extractEntity(payload, "payment");
  const paymentId = asString(payment?.id);
  if (!payment || !paymentId) {
    throw new WebhookError(422, "payment entity missing for a success event");
  }

  const status = asString(payment.status);
  const flag = normalizeCapturedFlag(payment.captured);

  // BOTH conditions must hold, and the status check is NOT redundant. Razorpay's
  // own `payment.failed` sample ships `"captured": true` alongside
  // `"status": "failed"` (the flag is a snapshot of an earlier transition), so a
  // flag-only test would accept a documented failure payload and grant access for
  // a payment that failed.
  if (flag.state !== "captured") {
    throw new WebhookError(
      422,
      `payment is not captured (captured=${flag.state === "unknown" ? flag.received : flag.state}, status=${status ?? "unknown"})`,
    );
  }
  if (status !== "captured") {
    throw new WebhookError(
      422,
      `payment status is not captured (captured=captured, status=${status ?? "unknown"})`,
    );
  }
  return { paymentId };
}

export function buildEntitlementRow(
  identity: PurchaseIdentity,
  payment: JsonObject | undefined,
  nowIso: string,
): EntitlementRow {
  const product = PRODUCT_CATALOG[identity.productId];
  // F7: a provider-reference column holds a provider identifier, never PII.
  // `payment.email` / `payment.contact` must never be written here. The Razorpay
  // customer id (`cust_...`) is the real customer reference; when the payment
  // carries no customer, the payment id is used so the column is still a stable,
  // non-empty, reconcilable value (`provider_customer_ref` is NOT NULL).
  const customerRef = asString(payment?.customer_id) ?? identity.paymentId;
  const isMonthly = product.plan === "monthly";
  const isSubscription = identity.subscriptionId !== undefined;
  return {
    user_id: identity.userId,
    product: product.id,
    plan: product.plan,
    status: "active",
    provider: "razorpay",
    provider_customer_ref: customerRef,
    provider_payment_ref: identity.paymentId,
    provider_order_ref: identity.orderId ?? null,
    provider_subscription_ref: identity.subscriptionId ?? null,
    starts_at: nowIso,
    // ADR-012: lifetime rows never expire; monthly rows always carry an
    // expiry. Monthly windows are measured from the grant, not the invoice.
    // For subscriptions, the expiry is set to the next billing cycle.
    expires_at: isMonthly
      ? new Date(Date.parse(nowIso) + MONTHLY_WINDOW_MS).toISOString()
      : null,
  };
}

export function buildRevocationPatch(
  plan: string,
  nowIso: string,
): RevocationPatch {
  // Lifetime: revoked, never expires. Monthly: cancelled with immediate expiry
  // so read-time validity (ADR-012) stops granting access at once. Both
  // satisfy entitlements_status_plan_consistency.
  return plan === "lifetime"
    ? { status: "revoked", expires_at: null }
    : { status: "cancelled", expires_at: nowIso };
}

// Order fetch fallback for payment.captured (requirement 1 + 2): the payment
// carries `order_id`, the order carries the notes we wrote at creation time.
// Credentials come from environment secrets only (requirement 11/12) and are
// never logged or echoed back.
export async function fetchOrderNotes(
  orderId: string | undefined,
  credentials: { keyId: string; keySecret: string },
  fetcher: typeof fetch = fetch,
): Promise<OrderFetchResult> {
  if (!credentials.keyId || !credentials.keySecret) return { ok: false, reason: "not_configured" };
  if (!orderId) return { ok: false, reason: "not_found" };

  let response: Response;
  try {
    response = await fetcher(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        Authorization: `Basic ${btoa(`${credentials.keyId}:${credentials.keySecret}`)}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    return { ok: false, reason: "transient" };
  }

  if (response.status === 404) return { ok: false, reason: "not_found" };
  if (!response.ok) return { ok: false, reason: "transient" };

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: "transient" };
  }
  const order = asObject(body);
  if (!order) return { ok: false, reason: "transient" };
  return { ok: true, notes: normalizeNotes(order.notes) };
}

// Razorpay webhooks carry no event id, so the idempotency ledger key is derived
// from the event name, the subject it is about and the event timestamp: stable
// across re-deliveries (same logical event) but distinct for a later event on
// the same payment (for example a second refund). When either part is missing
// we fall back to a digest of the raw body, which is still stable per delivery
// payload and never collides across different payloads.
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// The envelope's `payload` member IS the inner object that holds the entities
// (`payload.payment.entity`, `payload.refund.entity`, `payload.order.entity`,
// `payload.subscription.entity`). It must not be unwrapped a second time: doing
// so always yields undefined and silently downgraded every event id to the body digest.
function subjectIdFor(payload: JsonObject | undefined): string | undefined {
  return asString(extractEntity(payload, "payment")?.id) ??
    asString(extractEntity(payload, "refund")?.id) ??
    asString(extractEntity(payload, "order")?.id) ??
    asString(extractEntity(payload, "subscription")?.id);
}

export async function deriveEventId(envelope: Envelope, rawBody: string): Promise<string> {
  const subject = subjectIdFor(envelope.payload);
  if (subject && envelope.createdAt !== undefined) {
    return `${envelope.event}:${subject}:${envelope.createdAt}`;
  }
  const digest = await sha256Hex(rawBody);
  return `${envelope.event}:body:${digest.slice(0, 32)}`;
}