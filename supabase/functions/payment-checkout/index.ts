// Payment checkout Edge Function — authenticated HTTP boundary between
// website and PaymentService. Uses shared @soravo/payment-domain package.
//
// Security model:
//   * Requests must carry a valid Supabase Auth JWT in the Authorization header.
//   * The authenticated user ID is extracted from the JWT payload — the browser
//     never provides user_id, amount, or Razorpay order/subscription IDs.
//   * Product and currency are validated against the server-authoritative catalog.
//   * Razorpay credentials (keyId, keySecret) remain server-side only.
//   * Only TEST-mode Razorpay credentials are used.
//
// API contract:
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
//   Response (200):
//   {
//     orderId: string |      — only for lifetime purchases
//     subscriptionId: string |  only for monthly subscriptions
//     keyId: string,
//     amount: number,
//     currency: string,
//     productId: string
//   }
//
// Error responses:
//   401 — missing or invalid JWT
//   400 — malformed request, unsupported product/currency
//   500 — provider failure (safe error without credential leakage)

import { PRODUCT_CATALOG, isProductId, validateCurrency, type Product, type ProductId, type Currency, type ProductPrice } from "@soravo/payment-domain";

type CheckoutRequest = {
  productId: string;
  currency: string;
};

type CheckoutResponse = {
  orderId?: string;
  subscriptionId?: string;
  keyId: string;
  amount?: number;
  currency: string;
  productId: string;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

function respond(status: number, body: object): Response {
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

function errorResponse(code: string, message: string): ErrorResponse {
  return { error: message, code };
}

function parseJWT(token: string): { sub: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(atob(parts[1]));
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.exp !== "number") return null;
    return { sub: payload.sub, exp: payload.exp };
  } catch {
    return null;
  }
}

function readConfig(): {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
} | null {
  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  if (!razorpayKeyId || !razorpayKeySecret || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return { razorpayKeyId, razorpayKeySecret, supabaseUrl, supabaseAnonKey };
}

function getProduct(productId: string, currency: string): Product {
  if (!isProductId(productId)) {
    throw new Error(`Invalid product: ${productId}`);
  }
  if (!validateCurrency(currency)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  const product = PRODUCT_CATALOG[productId as ProductId];
  const regionalPrice = getRegionalPrice(product, currency as Currency);
  if (!regionalPrice) {
    throw new Error(`No regional price for ${productId} in ${currency}`);
  }
  return product;
}

function createPaymentProvider(
  config: { kind: "razorpay"; razorpay: { keyId: string; keySecret: string } }
): PaymentProvider {
  if (!config.razorpay?.keyId || !config.razorpay?.keySecret) {
    throw new Error("Razorpay credentials are required.");
  }
  return new RazorpayProvider(config.razorpay);
}

interface PaymentProvider {
  readonly kind: "razorpay";
  createOrder(request: {
    reference: string;
    productId: ProductId;
    amountMinor: number;
    currency: Currency;
    userId: string;
  }): Promise<{ providerOrderId: string; provider: "razorpay" }>;
  createSubscription(request: {
    planId: string;
    userId: string;
    productId: ProductId;
  }): Promise<{ subscriptionId: string; provider: "razorpay" }>;
}

class RazorpayProvider implements PaymentProvider {
  readonly kind = "razorpay" as const;
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor(config: { keyId: string; keySecret: string }) {
    this.keyId = config.keyId;
    this.keySecret = config.keySecret;
  }

  async createOrder(request: {
    reference: string;
    productId: ProductId;
    amountMinor: number;
    currency: Currency;
    userId: string;
  }): Promise<{ providerOrderId: string; provider: "razorpay" }> {
    const url = "https://api.razorpay.com/v1/orders";
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");

    const payload = {
      amount: request.amountMinor,
      currency: request.currency,
      receipt: request.reference,
      notes: {
        product_id: request.productId,
        user_id: request.userId,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "X-Razorpay-Version": "2024-11-01",
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
  }): Promise<{ subscriptionId: string; provider: "razorpay" }> {
    const url = "https://api.razorpay.com/v1/subscriptions";
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");

    const payload = {
      plan_id: request.planId,
      customer_notify: 1,
      total_count: null,
      notes: {
        product_id: request.productId,
        user_id: request.userId,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "X-Razorpay-Version": "2024-11-01",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Razorpay subscription creation failed: ${response.status}`);
    }

    const data = (await response.json()) as { id: string };
    return {
      provider: "razorpay",
      subscriptionId: data.id,
    };
  }
}

async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight
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
    return respond(405, errorResponse("method_not_allowed", "Only POST is allowed"));
  }

  const config = readConfig();
  if (!config) {
    console.error("payment checkout endpoint not configured");
    return respond(500, errorResponse("not_configured", "Payment service not configured"));
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return respond(401, errorResponse("unauthenticated", "Missing or invalid Authorization header"));
  }

  const token = authHeader.slice(7);
  const claims = parseJWT(token);
  if (!claims) {
    return respond(401, errorResponse("unauthenticated", "Invalid JWT"));
  }

  const userId = claims.sub;
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now) {
    return respond(401, errorResponse("unauthenticated", "JWT expired"));
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return respond(400, errorResponse("malformed_request", "Invalid JSON body"));
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as any).productId !== "string" ||
    typeof (body as any).currency !== "string"
  ) {
    return respond(400, errorResponse("malformed_request", "Request body must contain productId and currency"));
  }

  const request = body as CheckoutRequest;
  const productId = request.productId.trim();
  const currency = request.currency.trim();

  try {
    const product = getProduct(productId, currency);
    const regionalPrice = product.regionalPrices[currency as Currency];

    const provider = createPaymentProvider({
      kind: "razorpay",
      razorpay: {
        keyId: config.razorpayKeyId,
        keySecret: config.razorpayKeySecret,
      },
    });

    const reference = generateReference();

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
        keyId: config.razorpayKeyId,
        amount: regionalPrice.amountMinor,
        currency: currency,
        productId: product.id,
      };
    } else {
      const planId = `plan_${product.id}_${currency.toLowerCase()}`;
      const providerSubscription = await provider.createSubscription({
        planId,
        userId,
        productId: product.id,
      });
      checkoutResponse = {
        subscriptionId: providerSubscription.subscriptionId,
        keyId: config.razorpayKeyId,
        currency: currency,
        productId: product.id,
      };
    }

    return respond(200, checkoutResponse);
  } catch (err) {
    console.error("payment checkout failed", err);

    if (err instanceof Error && err.message.includes("Invalid product")) {
      return respond(400, errorResponse("invalid_product", err.message));
    }

    if (err instanceof Error && err.message.includes("Unsupported currency")) {
      return respond(400, errorResponse("invalid_product", err.message));
    }

    if (err instanceof Error && err.message.includes("No regional price")) {
      return respond(400, errorResponse("invalid_product", err.message));
    }

    if (err instanceof Error && err.message.includes("Razorpay")) {
      return respond(500, errorResponse("provider_failure", "Payment provider error"));
    }

    return respond(500, errorResponse("provider_failure", "Payment provider error"));
  }
}

function generateReference(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(handleRequest);
