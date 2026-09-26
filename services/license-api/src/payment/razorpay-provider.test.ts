import { readFileSync } from "node:fs";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { RazorpayProvider } from "./razorpay-provider";
import type { CreateOrderRequest, CreateSubscriptionRequest } from "./types";
import { PaymentError } from "./errors";
import type { PaymentErrorCode } from "./errors";

const REQUEST: CreateOrderRequest = {
  reference: "ref-test-0001",
  productId: "soravo_monthly",
  amountMinor: 1200,
  currency: "USD",
};

const MOCK_RAZORPAY_RESPONSE = {
  id: "order_ABC123XYZ",
  entity: "order",
  amount: 1200,
  amount_paid: 0,
  amount_due: 1200,
  currency: "USD",
  receipt: "ref-test-0001",
  offer_id: null,
  status: "created",
  attempts: 0,
  notes: { product_id: "soravo_monthly" },
  created_at: 1699999999,
};

function expectPaymentError(
  promise: Promise<unknown>,
  code: PaymentErrorCode
): Promise<void> {
  return promise
    .then(() => {
      throw new Error(`expected PaymentError with code ${code} to be thrown`);
    })
    .catch((err) => {
      expect(err).toBeInstanceOf(PaymentError);
      expect((err as PaymentError).code).toBe(code);
    });
}

describe("RazorpayProvider", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("requires keyId and keySecret", () => {
    expect(() => new RazorpayProvider({ keyId: "", keySecret: "secret" })).toThrow(
      PaymentError
    );
    expect(() => new RazorpayProvider({ keyId: "key", keySecret: "" })).toThrow(
      PaymentError
    );
  });

  it("creates an order via Razorpay API", async () => {
    const provider = new RazorpayProvider({
      keyId: "rzp_test_keyid",
      keySecret: "test_secret",
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_RAZORPAY_RESPONSE,
    });

    const order = await provider.createOrder(REQUEST);

    expect(order).toEqual({
      provider: "razorpay",
      providerOrderId: "order_ABC123XYZ",
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.razorpay.com/v1/orders");
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual(
      expect.objectContaining({
        Authorization: expect.stringMatching(/^Basic /),
        "Content-Type": "application/json",
        "X-Razorpay-Version": "2024-11-01",
      })
    );
    const body = JSON.parse(options.body as string);
    expect(body).toEqual({
      amount: 1200,
      currency: "USD",
      receipt: "ref-test-0001",
      notes: { product_id: "soravo_monthly" },
    });
  });

  it("maps Razorpay API errors to provider_unavailable", async () => {
    const provider = new RazorpayProvider({
      keyId: "rzp_test_keyid",
      keySecret: "test_secret",
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => '{"error": {"code": "BAD_REQUEST"}}',
    });

    await expectPaymentError(provider.createOrder(REQUEST), "provider_unavailable");
  });

  it("maps network errors to provider_unavailable", async () => {
    const provider = new RazorpayProvider({
      keyId: "rzp_test_keyid",
      keySecret: "test_secret",
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("network error")
    );

    await expectPaymentError(provider.createOrder(REQUEST), "provider_unavailable");
  });

  it("uses the correct amountMinor from request", async () => {
    const provider = new RazorpayProvider({
      keyId: "rzp_test_keyid",
      keySecret: "test_secret",
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...MOCK_RAZORPAY_RESPONSE, id: "order_5000" }),
    });

    await provider.createOrder({ ...REQUEST, amountMinor: 5000 });

    const body = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
    );
    expect(body.amount).toBe(5000);
  });

  it("uses the correct currency from request", async () => {
    const provider = new RazorpayProvider({
      keyId: "rzp_test_keyid",
      keySecret: "test_secret",
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_RAZORPAY_RESPONSE,
    });

    await provider.createOrder({ ...REQUEST, currency: "USD" });

    const body = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
    );
    expect(body.currency).toBe("USD");
  });

  it("includes product_id in notes", async () => {
    const provider = new RazorpayProvider({
      keyId: "rzp_test_keyid",
      keySecret: "test_secret",
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_RAZORPAY_RESPONSE,
    });

    await provider.createOrder({ ...REQUEST, productId: "soravo_lifetime" });

    const body = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
    );
    expect(body.notes).toEqual({ product_id: "soravo_lifetime" });
  });

  it("reads no environment variables directly", () => {
    const source = readFileSync(
      new URL("./razorpay-provider.ts", import.meta.url),
      "utf8"
    );
    expect(source).not.toMatch(/process\.env/);
  });

  it("contains no hardcoded credentials", () => {
    const source = readFileSync(
      new URL("./razorpay-provider.ts", import.meta.url),
      "utf8"
    );
    expect(source).not.toMatch(/rzp_live|rzp_test.*secret|key_secret.*=.*["']/);
  });

  it("creates a subscription via Razorpay API", async () => {
    const provider = new RazorpayProvider({
      keyId: "rzp_test_keyid",
      keySecret: "test_secret",
    });

    const MOCK_SUBSCRIPTION_RESPONSE = {
      id: "sub_ABC123XYZ",
      entity: "subscription",
      plan_id: "plan_soravo_monthly_usd",
      customer_id: "cust_ABC123",
      status: "created",
      current_start: 1699999999,
      current_end: 1702591999,
      remaining_count: 0,
      paid_count: 0,
      notes: { product_id: "soravo_monthly", user_id: "11111111-1111-4111-8111-111111111111" },
      created_at: 1699999999,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SUBSCRIPTION_RESPONSE,
    });

    const subscriptionRequest: CreateSubscriptionRequest = {
      planId: "plan_soravo_monthly_usd",
      userId: "11111111-1111-4111-8111-111111111111",
      productId: "soravo_monthly",
    };

    const subscription = await provider.createSubscription(subscriptionRequest);

    expect(subscription).toEqual({
      provider: "razorpay",
      subscriptionId: "sub_ABC123XYZ",
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.razorpay.com/v1/subscriptions");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body as string);
    expect(body).toEqual({
      plan_id: "plan_soravo_monthly_usd",
      customer_notify: 1,
      total_count: null,
      notes: {
        product_id: "soravo_monthly",
        user_id: "11111111-1111-4111-8111-111111111111",
      },
    });
  });

  it("maps Razorpay subscription API errors to provider_unavailable", async () => {
    const provider = new RazorpayProvider({
      keyId: "rzp_test_keyid",
      keySecret: "test_secret",
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => '{"error": {"code": "BAD_REQUEST"}}',
    });

    const subscriptionRequest: CreateSubscriptionRequest = {
      planId: "plan_soravo_monthly_usd",
      userId: "11111111-1111-4111-8111-111111111111",
      productId: "soravo_monthly",
    };

    await expectPaymentError(provider.createSubscription(subscriptionRequest), "provider_unavailable");
  });
});

describe("createRazorpayProvider", () => {
  it("returns a RazorpayProvider instance", async () => {
    const { createRazorpayProvider } = await import("./razorpay-provider");
    const provider = createRazorpayProvider({
      keyId: "rzp_test_keyid",
      keySecret: "test_secret",
    });
    expect(provider).toBeInstanceOf(RazorpayProvider);
    expect(provider.kind).toBe("razorpay");
  });
});