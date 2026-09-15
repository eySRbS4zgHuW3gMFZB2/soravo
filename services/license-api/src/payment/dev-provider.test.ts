import { describe, expect, it } from "vitest";
import { DevPaymentProvider, DevProviderFailure } from "./dev-provider";
import type { CreateOrderRequest } from "./types";

const REQUEST: CreateOrderRequest = {
  reference: "ref-test-0001",
  productId: "soravo_monthly",
  amountMinor: 1200,
  currency: "USD",
};

describe("DevPaymentProvider", () => {
  it("produces deterministic success orders", async () => {
    const provider = new DevPaymentProvider("success");
    const order = await provider.createOrder(REQUEST);
    expect(provider.kind).toBe("dev");
    expect(order).toEqual({ provider: "dev", providerOrderId: "dev_order_ref-test-0001" });
  });

  it("is deterministic across repeated calls", async () => {
    const provider = new DevPaymentProvider("success");
    expect(await provider.createOrder(REQUEST)).toEqual(await provider.createOrder(REQUEST));
  });

  it("fails deterministically when configured to fail", async () => {
    const provider = new DevPaymentProvider("always_fail");
    await expect(provider.createOrder(REQUEST)).rejects.toBeInstanceOf(DevProviderFailure);
    await expect(provider.createOrder(REQUEST)).rejects.toThrow("dev provider simulated failure");
  });

  it("emits only safe identifiers (alphanumeric, dash, underscore)", async () => {
    const provider = new DevPaymentProvider("success");
    const order = await provider.createOrder({
      ...REQUEST,
      reference: "ref! with/special; chars",
    });
    expect(order.providerOrderId).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});