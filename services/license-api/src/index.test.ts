import { describe, expect, it } from "vitest";
import * as api from "./index";
import {
  PRODUCT_CATALOG,
  ProductCatalog,
  PaymentError,
  PaymentService,
  createPaymentProvider,
} from "./index";

describe("public package entry (index.ts)", () => {
  it("exports the intended public surface", () => {
    expect(api.PaymentService).toBe(PaymentService);
    expect(api.createPaymentProvider).toBe(createPaymentProvider);
    expect(api.ProductCatalog).toBe(ProductCatalog);
    expect(api.PaymentError).toBe(PaymentError);
    expect(api.PRODUCT_CATALOG).toBe(PRODUCT_CATALOG);
    expect(api.DEFAULT_PRODUCT_CATALOG).toBeInstanceOf(ProductCatalog);
    expect(api.PAYMENT_ERROR_CODES.providerUnavailable).toBe("provider_unavailable");
  });

  it("does not export internal provider machinery (K)", () => {
    expect(api).not.toHaveProperty("DevPaymentProvider");
    expect(api).not.toHaveProperty("DevProviderFailure");
    expect(api).not.toHaveProperty("createPaymentProviderFromEnv");
  });

  it("keeps the razorpay boundary out of the public surface (D)", () => {
    expect(JSON.stringify(Object.keys(api))).not.toMatch(/razorpay|dev-provider|DevPayment/i);
  });

  it("supports an end-to-end skeleton flow from the public entry", async () => {
    const provider = createPaymentProvider({ kind: "dev" }, "test");
    const service = new PaymentService({ provider });
    const initiation = await service.createOrder(
      { userId: "11111111-1111-4111-8111-111111111111" },
      { productId: "soravo_monthly" }
    );
    expect(initiation.amountMinor).toBe(1200);
    expect(initiation.currency).toBe("USD");
    expect(initiation.provider).toBe("dev");
  });
});