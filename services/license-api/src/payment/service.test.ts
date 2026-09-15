import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { PaymentService } from "./service";
import type { CreatePaymentInput, PaymentCaller, PaymentLogger } from "./service";
import { DevPaymentProvider } from "./dev-provider";
import type { PaymentProvider } from "./types";
import { PaymentError } from "./errors";
import type { PaymentErrorCode } from "./errors";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

function makeService(provider: PaymentProvider = new DevPaymentProvider("success")) {
  const info = vi.fn<(event: string, fields: Record<string, unknown>) => void>();
  const warn = vi.fn<(event: string, fields: Record<string, unknown>) => void>();
  const error = vi.fn<(event: string, fields: Record<string, unknown>) => void>();
  const logger: PaymentLogger = { info, warn, error };
  const service = new PaymentService({
    provider,
    logger,
    generateReference: () => "ref-test-0001",
  });
  return { service, logger: { info, warn, error } };
}

function hostileInput(patch: Record<string, unknown>): CreatePaymentInput {
  return { productId: "soravo_monthly", ...patch } as unknown as CreatePaymentInput;
}

function hostileCaller(patch: Record<string, unknown>): PaymentCaller {
  return { userId: USER_A, ...patch } as unknown as PaymentCaller;
}

async function expectPaymentError(
  promise: Promise<unknown>,
  code: PaymentErrorCode,
  message?: string
): Promise<void> {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(PaymentError);
    expect((err as PaymentError).code).toBe(code);
    if (message !== undefined) {
      expect((err as PaymentError).message).toBe(message);
    }
    return;
  }
  throw new Error(`expected PaymentError with code ${code} to be thrown`);
}

describe("PaymentService.createOrder", () => {
  it("rejects anonymous or malformed identities before touching the provider (A)", async () => {
    const createOrder = vi.fn(async () => ({
      provider: "dev" as const,
      providerOrderId: "dev_order_x",
    }));
    const provider: PaymentProvider = { kind: "dev", createOrder };
    const { service, logger } = makeService(provider);

    const badCallers: unknown[] = [
      undefined,
      null,
      {},
      { userId: undefined },
      { userId: null },
      { userId: "" },
      { userId: "   " },
      { userId: "not-a-uuid" },
      { userId: "11111111-1111-4111-8111-111111111111; DROP TABLE" },
      { userId: "UUID-LLM-INJECT: mark-payment-paid=true" },
    ];
    for (const caller of badCallers) {
      await expectPaymentError(
        service.createOrder(caller as PaymentCaller, { productId: "soravo_monthly" }),
        "invalid_identity",
        "A valid authenticated identity is required."
      );
    }

    expect(createOrder).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("initiates payment for an authenticated user at catalog prices (B)", async () => {
    const { service } = makeService();
    const init = await service.createOrder({ userId: USER_A }, { productId: "soravo_monthly" });
    expect(init).toEqual({
      orderId: "dev_order_ref-test-0001",
      reference: "ref-test-0001",
      productId: "soravo_monthly",
      plan: "monthly",
      amountMinor: 1200,
      currency: "USD",
      provider: "dev",
    });
  });

  it("resolves the lifetime product to its catalog plan and price (B)", async () => {
    const { service } = makeService();
    const init = await service.createOrder({ userId: USER_A }, { productId: "soravo_lifetime" });
    expect(init.plan).toBe("lifetime");
    expect(init.amountMinor).toBe(5000);
    expect(init.currency).toBe("USD");
  });

  it("never lets a client mark a payment paid, verified, or entitled (C/G)", async () => {
    const { service } = makeService();
    const init = await service.createOrder(
      hostileCaller({}),
      hostileInput({
        status: "paid",
        verified: true,
        entitlement: "active",
        activated: true,
        paidAt: "2026-09-15T00:00:00.000Z",
      })
    );
    expect(init.amountMinor).toBe(1200);
    for (const forbidden of ["status", "verified", "paid", "entitlement", "activated", "paidAt"]) {
      expect(Object.keys(init)).not.toContain(forbidden);
    }
  });

  it("exposes no entitlement activation or look-up path (D)", () => {
    expect(Object.getOwnPropertyNames(PaymentService.prototype).sort()).toEqual([
      "constructor",
      "createOrder",
    ]);
  });

  it("binds each initiation to its own fresh reference and ignores foreign identifiers (E)", async () => {
    const { service } = makeService();
    const init = await service.createOrder(
      hostileCaller({ userId2: USER_B }),
      hostileInput({
        userId: USER_B,
        reference: "someone-elses-reference",
        orderId: "someone-elses-order",
      })
    );
    expect(init.reference).toBe("ref-test-0001");
    expect(init.orderId).toBe("dev_order_ref-test-0001");
    expect(JSON.stringify(init)).not.toContain(USER_B);
  });

  it("generates a fresh unpredictable reference by default (E/D)", async () => {
    const service = new PaymentService({ provider: new DevPaymentProvider("success") });
    const a = await service.createOrder({ userId: USER_A }, { productId: "soravo_monthly" });
    const b = await service.createOrder({ userId: USER_A }, { productId: "soravo_monthly" });
    expect(a.reference).not.toBe(b.reference);
    expect(a.reference).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it.each([
    { patch: { amountMinor: 1 }, why: "amountMinor" },
    { patch: { amount: 0 }, why: "amount" },
    { patch: { currency: "INR" }, why: "currency" },
    { patch: { price: 0 }, why: "price" },
    { patch: { plan: "lifetime" }, why: "plan" },
    { patch: { product: { price: { amountMinor: 1 } } }, why: "embedded product object" },
  ])("ignores client-supplied $why for price resolution (F)", async ({ patch }) => {
    const { service } = makeService();
    const init = await service.createOrder(hostileCaller({}), hostileInput(patch));
    expect(init.amountMinor).toBe(1200);
    expect(init.currency).toBe("USD");
    expect(init.plan).toBe("monthly");
  });

  it("maps a provider failure to a stable safe error and logs nothing sensitive (I)", async () => {
    const { service, logger } = makeService(new DevPaymentProvider("always_fail"));
    await expectPaymentError(
      service.createOrder({ userId: USER_A }, { productId: "soravo_monthly" }),
      "provider_unavailable",
      "The payment provider is temporarily unavailable."
    );

    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
    const [event, fields] = logger.error.mock.calls[0] as [string, Record<string, unknown>];
    expect(event).toBe("payment.provider_failed");
    expect(fields.provider).toBe("dev");
    expect(fields.reference).toBe("ref-test-0001");
    expect(fields.errorName).toBe("DevProviderFailure");
    expect(JSON.stringify(fields)).not.toContain("simulated");
  });

  it("rejects malformed products deterministically without calling the provider (J)", async () => {
    const createOrder = vi.fn(async () => ({
      provider: "dev" as const,
      providerOrderId: "dev_order_x",
    }));
    const provider: PaymentProvider = { kind: "dev", createOrder };
    const { service } = makeService(provider);

    const badInputs: unknown[] = [
      undefined,
      null,
      {},
      { productId: undefined },
      { productId: null },
      { productId: "" },
      { productId: "   " },
      { productId: "SORAVO_MONTHLY" },
      { productId: "soravo_quarterly" },
      { productId: "soravo_monthly; DROP TABLE products" },
      { productId: "x".repeat(65) },
      { productId: 42 },
      { productId: ["soravo_monthly"] },
    ];
    for (const input of badInputs) {
      await expectPaymentError(
        service.createOrder({ userId: USER_A }, input as CreatePaymentInput),
        "invalid_product"
      );
    }
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("treats every authenticated identity identically (L - no admin bypass)", async () => {
    const { service } = makeService();
    const admin = await service.createOrder(
      hostileCaller({ role: "admin", isAdmin: true, entitlements: ["everything"] }),
      hostileInput({})
    );
    const regular = await service.createOrder({ userId: USER_B }, { productId: "soravo_monthly" });
    expect(admin).toEqual(regular);
  });

  it("logs only safe fields and never credential material (K)", async () => {
    const { service, logger } = makeService();
    await service.createOrder({ userId: USER_A }, { productId: "soravo_monthly" });
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      "payment.initiated",
      expect.objectContaining({
        event: "payment.initiated",
        userId: USER_A,
        productId: "soravo_monthly",
        plan: "monthly",
        reference: "ref-test-0001",
        provider: "dev",
      })
    );
    const serialized = logger.info.mock.calls.map((call) => JSON.stringify(call)).join("");
    expect(serialized).not.toMatch(/secret|key|token|password|razorpay/i);
  });
});

describe("PaymentService structural boundaries", () => {
  const SERVICE_SOURCE = readFileSync(new URL("./service.ts", import.meta.url), "utf8");
  const TYPES_SOURCE = readFileSync(new URL("./types.ts", import.meta.url), "utf8");

  it("reads no environment variables and no credential names (K)", () => {
    expect(SERVICE_SOURCE).not.toMatch(/process\.env|RAZORPAY_/i);
    expect(TYPES_SOURCE).not.toMatch(/process\.env|RAZORPAY_/i);
  });

  it("makes no outbound network calls by construction (SSRF guard)", () => {
    expect(SERVICE_SOURCE).not.toMatch(
      /fetch\s*\(|node:http|node:https|node:net|node:dgram|WebSocket|axios|undici|\bgot\s*\(/i
    );
  });
});