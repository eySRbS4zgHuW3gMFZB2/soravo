// Payment checkout request handling — runtime-agnostic pure logic.
//
// Layout: this module owns ALL checkout decisions and is directly unit-tested
// under Node/Vitest. `index.ts` owns Deno wiring only (env read + serve).
// This mirrors the razorpay-webhook layout (index = HTTP/config/DB wiring,
// decision logic in pure testable modules).
//
// Security model (authoritative: Soravo v6 §06 + §15):
//   * The Supabase platform JWT gate (`verify_jwt`, declared in
//     `supabase/config.toml`) verifies the Auth JWT before the handler runs.
//     `parseJWTClaims` below is a STRUCTURAL pre-check only (shape + expiry)
//     so malformed requests fail fast without a network call. It is NEVER
//     authentication.
//   * Authentication is established ONLY through the authoritative Supabase
//     Auth mechanism: `verifyAuthToken` calls `GET <SUPABASE_URL>/auth/v1/user`
//     (the same endpoint `auth.getUser()` uses) and the returned user id is
//     the checkout identity. A decoded `sub` that the Auth API does not
//     confirm is rejected.
//   * Product/price/currency are resolved server-side from
//     `@soravo/payment-domain`. Client input never determines the charged
//     amount; extra body fields (amount, user_id, order ids) are ignored.
//   * Razorpay credentials remain server-side only. Only TEST-mode keys
//     (`rzp_test_` prefix) are accepted; anything else fails closed.
//   * Monthly Razorpay Plan IDs are deployment configuration
//     (`RAZORPAY_PLAN_SORAVO_MONTHLY_<CURRENCY>`), never fabricated. A missing
//     plan mapping fails closed instead of inventing a provider object.

import {
  PRODUCT_CATALOG,
  getRegionalPrice,
  isProductId,
  validateCurrency,
} from "@soravo/payment-domain";
import type {
  Currency,
  Product,
  ProductId,
} from "@soravo/payment-domain";

export type CheckoutRequest = {
  productId: string;
  currency: string;
};

export type CheckoutResponse = {
  orderId?: string;
  subscriptionId?: string;
  keyId: string;
  amount?: number;
  currency: string;
  productId: string;
};

export type ErrorResponse = {
  error: string;
  code?: string;
};

export type CheckoutEnv = {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  monthlyPlanIds: Readonly<Record<string, string>>;
};

export type FetchFn = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type CheckoutDeps = {
  fetchFn?: FetchFn;
  generateReference?: () => string;
};

const MONTHLY_PLAN_ENV_BY_CURRENCY: Readonly<Record<string, string>> = {
  INR: "RAZORPAY_PLAN_SORAVO_MONTHLY_INR",
  USD: "RAZORPAY_PLAN_SORAVO_MONTHLY_USD",
  CAD: "RAZORPAY_PLAN_SORAVO_MONTHLY_CAD",
  EUR: "RAZORPAY_PLAN_SORAVO_MONTHLY_EUR",
  AUD: "RAZORPAY_PLAN_SORAVO_MONTHLY_AUD",
};

const TEST_KEY_PREFIX = "rzp_test_";
const RAZORPAY_API_VERSION = "2024-11-01";

export function respond(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "access-control-allow-origin": "https://soravo.com",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "Authorization, Content-Type",
    },
  });
}

export function errorResponse(code: string, message: string): ErrorResponse {
  return { error: message, code };
}

// Structural JWT pre-check ONLY — shape and expiry, no signature verification.
// Authentication happens in `verifyAuthToken` against the Supabase Auth API.
export function parseJWTClaims(
  token: string,
): { sub: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const encoded = parts[1];
  if (encoded === undefined || encoded.length === 0) return null;

  try {
    const payload: unknown = JSON.parse(atob(encoded));
    if (typeof payload !== "object" || payload === null) return null;
    const sub = (payload as Record<string, unknown>)["sub"];
    const exp = (payload as Record<string, unknown>)["exp"];
    if (typeof sub !== "string" || sub.length === 0) return null;
    if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
    return { sub, exp };
  } catch {
    return null;
  }
}

// Runtime-safe base64 over an ASCII credential pair. `Buffer` is a Node API
// and is NOT available in the Deno Edge runtime; `btoa` is available in Deno,
// Node 16+, and browsers. Razorpay key ids/secrets are ASCII, so a binary
// string built from UTF-8 bytes is exact here.
export function encodeBase64Ascii(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function isTestModeKeyId(keyId: string): boolean {
  return keyId.startsWith(TEST_KEY_PREFIX);
}

export function readCheckoutEnv(
  get: (name: string) => string | undefined,
): CheckoutEnv | null {
  const razorpayKeyId = get("RAZORPAY_KEY_ID") ?? "";
  const razorpayKeySecret = get("RAZORPAY_KEY_SECRET") ?? "";
  const supabaseUrl = get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = get("SUPABASE_ANON_KEY") ?? "";

  if (!razorpayKeyId || !razorpayKeySecret || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // TEST-mode enforcement (v6 §15: never substitute LIVE credentials).
  // A LIVE or otherwise non-test key fails closed here, before any provider
  // call, instead of charging against the wrong Razorpay account.
  if (!isTestModeKeyId(razorpayKeyId)) {
    return null;
  }

  const monthlyPlanIds: Record<string, string> = {};
  for (const [currency, envName] of Object.entries(
    MONTHLY_PLAN_ENV_BY_CURRENCY,
  )) {
    const planId = get(envName);
    if (planId) {
      monthlyPlanIds[currency] = planId;
    }
  }

  return {
    razorpayKeyId,
    razorpayKeySecret,
    supabaseUrl,
    supabaseAnonKey,
    monthlyPlanIds,
  };
}

// Authoritative identity check: the Supabase Auth API confirms the token and
// returns the user the token belongs to. Returns the confirmed user id when
// the token is valid, null when the Auth API rejects it (401/4xx, malformed
// response, id mismatch handled by the caller), and THROWS AuthVerificationError
// when the Auth API cannot be reached — a transient failure the caller maps to
// 500 (fail closed) rather than 401, so a network blip never forces a logout.
export class AuthVerificationError extends Error {
  constructor() {
    super("Supabase Auth verification unavailable");
    this.name = "AuthVerificationError";
  }
}

export async function verifyAuthToken(
  token: string,
  env: Pick<CheckoutEnv, "supabaseUrl" | "supabaseAnonKey">,
  fetchFn: FetchFn,
): Promise<string | null> {
  const url = `${env.supabaseUrl.replace(/\/$/, "")}/auth/v1/user`;
  let response: Response;
  try {
    response = await fetchFn(url, {
      method: "GET",
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new AuthVerificationError();
  }

  if (!response.ok) {
    return null;
  }

  try {
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null) return null;
    const id = (data as Record<string, unknown>)["id"];
    if (typeof id !== "string" || id.length === 0) return null;
    return id;
  } catch {
    return null;
  }
}

export function resolveMonthlyPlanId(
  env: CheckoutEnv,
  currency: string,
): string | null {
  return env.monthlyPlanIds[currency] ?? null;
}

function getProduct(productId: string, currency: string): Product {
  if (!isProductId(productId)) {
    throw new Error(`Invalid product: ${productId}`);
  }
  if (!validateCurrency(currency)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  const product: Product | undefined = PRODUCT_CATALOG[productId];
  const regionalPrice =
    product === undefined
      ? undefined
      : getRegionalPrice(product, currency as Currency);
  if (product === undefined || !regionalPrice) {
    throw new Error(`No regional price for ${productId} in ${currency}`);
  }
  return product;
}

export type RazorpayOrderResult = {
  provider: "razorpay";
  providerOrderId: string;
};

export type RazorpaySubscriptionResult = {
  provider: "razorpay";
  subscriptionId: string;
};

// Provider wiring owned by this Edge Function. The payment DOMAIN (products,
// prices, currencies) comes from `@soravo/payment-domain`; only the Razorpay
// HTTP calls live here because the shared license-api provider depends on
// Node APIs (`Buffer`, `node:crypto`) unavailable in the Edge runtime.
export class RazorpayProvider {
  readonly kind = "razorpay" as const;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly fetchFn: FetchFn;

  constructor(config: {
    keyId: string;
    keySecret: string;
    fetchFn: FetchFn;
  }) {
    if (!config.keyId || !config.keySecret) {
      throw new Error("Razorpay credentials are required.");
    }
    this.keyId = config.keyId;
    this.keySecret = config.keySecret;
    this.fetchFn = config.fetchFn;
  }

  async createOrder(request: {
    reference: string;
    productId: ProductId;
    amountMinor: number;
    currency: Currency;
    userId: string;
  }): Promise<RazorpayOrderResult> {
    const url = "https://api.razorpay.com/v1/orders";
    const auth = encodeBase64Ascii(`${this.keyId}:${this.keySecret}`);

    const payload = {
      amount: request.amountMinor,
      currency: request.currency,
      receipt: request.reference,
      notes: {
        product_id: request.productId,
        user_id: request.userId,
      },
    };

    const response = await this.fetchFn(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "X-Razorpay-Version": RAZORPAY_API_VERSION,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Razorpay order creation failed: ${response.status}`);
    }

    const data = (await response.json()) as { id: string };
    return {
      provider: "razorpay",
      providerOrderId: data.id,
    };
  }

  async createSubscription(request: {
    planId: string;
    userId: string;
    productId: ProductId;
  }): Promise<RazorpaySubscriptionResult> {
    const url = "https://api.razorpay.com/v1/subscriptions";
    const auth = encodeBase64Ascii(`${this.keyId}:${this.keySecret}`);

    const payload = {
      plan_id: request.planId,
      customer_notify: 1,
      total_count: null,
      notes: {
        product_id: request.productId,
        user_id: request.userId,
      },
    };

    const response = await this.fetchFn(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "X-Razorpay-Version": RAZORPAY_API_VERSION,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Razorpay subscription creation failed: ${response.status}`,
      );
    }

    const data = (await response.json()) as { id: string };
    return {
      provider: "razorpay",
      subscriptionId: data.id,
    };
  }
}

export function generateReference(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function createCheckoutHandler(
  env: CheckoutEnv | null,
  deps?: CheckoutDeps,
): (req: Request) => Promise<Response> {
  const fetchFn: FetchFn =
    deps?.fetchFn ??
    ((input: string, init?: RequestInit) => fetch(input, init));
  const makeReference = deps?.generateReference ?? generateReference;

  return async function handleRequest(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "https://soravo.com",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "Authorization, Content-Type",
          "access-control-max-age": "86400",
        },
      });
    }

    if (req.method !== "POST") {
      return respond(
        405,
        errorResponse("method_not_allowed", "Only POST is allowed"),
      );
    }

    if (!env) {
      // No detail: must not reveal which credential is missing or whether
      // a LIVE key was rejected.
      return respond(
        500,
        errorResponse("not_configured", "Payment service not configured"),
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return respond(
        401,
        errorResponse(
          "unauthenticated",
          "Missing or invalid Authorization header",
        ),
      );
    }

    // Structural pre-check only — NOT authentication (see verifyAuthToken).
    const token = authHeader.slice(7);
    const claims = parseJWTClaims(token);
    if (!claims) {
      return respond(401, errorResponse("unauthenticated", "Invalid JWT"));
    }

    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) {
      return respond(401, errorResponse("unauthenticated", "JWT expired"));
    }

    // Authoritative identity: Supabase Auth confirms the token. The confirmed
    // id — never the decoded `sub`, never a body field — is the identity.
    let confirmedUserId: string | null;
    try {
      confirmedUserId = await verifyAuthToken(token, env, fetchFn);
    } catch (err) {
      if (err instanceof AuthVerificationError) {
        return respond(
          500,
          errorResponse(
            "auth_unavailable",
            "Authentication service unavailable",
          ),
        );
      }
      throw err;
    }
    if (!confirmedUserId || confirmedUserId !== claims.sub) {
      return respond(401, errorResponse("unauthenticated", "Invalid JWT"));
    }
    const userId = confirmedUserId;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return respond(
        400,
        errorResponse("malformed_request", "Invalid JSON body"),
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as Record<string, unknown>)["productId"] !== "string" ||
      typeof (body as Record<string, unknown>)["currency"] !== "string"
    ) {
      return respond(
        400,
        errorResponse(
          "malformed_request",
          "Request body must contain productId and currency",
        ),
      );
    }

    const request = body as CheckoutRequest;
    const productId = request.productId.trim();
    const currency = request.currency.trim();

    try {
      const product = getProduct(productId, currency);
      // Resolved again (not trusted from the client): the charged amount
      // always comes from the server-authoritative catalog.
      const regionalPrice = getRegionalPrice(product, currency as Currency);
      if (!regionalPrice) {
        return respond(
          400,
          errorResponse(
            "invalid_product",
            `No regional price for ${productId} in ${currency}`,
          ),
        );
      }

      const provider = new RazorpayProvider({
        keyId: env.razorpayKeyId,
        keySecret: env.razorpayKeySecret,
        fetchFn,
      });

      const reference = makeReference();

      let checkoutResponse: CheckoutResponse;

      if (product.plan === "lifetime") {
        const providerOrder = await provider.createOrder({
          reference,
          productId: product.id,
          amountMinor: regionalPrice.amountMinor,
          currency: currency as Currency,
          userId,
        });
        checkoutResponse = {
          orderId: providerOrder.providerOrderId,
          keyId: env.razorpayKeyId,
          amount: regionalPrice.amountMinor,
          currency,
          productId: product.id,
        };
      } else {
        // Monthly plans are real Razorpay Plan IDs supplied as deployment
        // configuration. Fabricating `plan_<product>_<currency>` would charge
        // against a non-existent object (T16 F-05) — fail closed instead.
        const planId = resolveMonthlyPlanId(env, currency);
        if (!planId) {
          return respond(
            503,
            errorResponse(
              "plan_not_configured",
              "Monthly billing is not configured for this currency",
            ),
          );
        }
        const providerSubscription = await provider.createSubscription({
          planId,
          userId,
          productId: product.id,
        });
        checkoutResponse = {
          subscriptionId: providerSubscription.subscriptionId,
          keyId: env.razorpayKeyId,
          currency,
          productId: product.id,
        };
      }

      return respond(200, checkoutResponse);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Invalid product")) {
        return respond(400, errorResponse("invalid_product", err.message));
      }

      if (
        err instanceof Error &&
        err.message.includes("Unsupported currency")
      ) {
        return respond(400, errorResponse("invalid_product", err.message));
      }

      if (err instanceof Error && err.message.includes("No regional price")) {
        return respond(400, errorResponse("invalid_product", err.message));
      }

      // Provider failures answer generic 500 without credential leakage.
      return respond(
        500,
        errorResponse("provider_failure", "Payment provider error"),
      );
    }
  };
}
