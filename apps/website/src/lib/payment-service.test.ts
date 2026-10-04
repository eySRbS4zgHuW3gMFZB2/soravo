import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import { createCheckoutOrder } from "./payment-service";

describe("payment-service", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("createCheckoutOrder", () => {
    it("returns unauthenticated error when no session exists", async () => {
      const client = createMockSupabaseClient({
        session: null,
      });

      const result = await createCheckoutOrder(client, {
        productId: "soravo_lifetime",
        currency: "INR",
      });

      expect(result.error).toEqual({
        code: "unauthenticated",
        message: "User must be authenticated to checkout",
      });
      expect(result.data).toBeNull();
    });

    it("calls payment-checkout endpoint with correct payload", async () => {
      const client = createMockSupabaseClient({
        session: { user: { id: "user-1" } },
      });

      const mockResponse = {
        orderId: "order_abc123",
        keyId: "rzp_test_xxx",
        amount: 41500,
        currency: "INR",
        productId: "soravo_lifetime",
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createCheckoutOrder(client, {
        productId: "soravo_lifetime",
        currency: "INR",
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        success: true,
        ...mockResponse,
      });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/functions/v1/payment-checkout",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": expect.stringContaining("Bearer "),
          }),
        }),
      );
    });

    it("returns provider error from server", async () => {
      const client = createMockSupabaseClient({
        session: { user: { id: "user-1" } },
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: "Payment provider error",
          code: "provider_failure",
        }),
      });

      const result = await createCheckoutOrder(client, {
        productId: "soravo_lifetime",
        currency: "INR",
      });

      expect(result.error).toEqual({
        code: "provider_failure",
        message: "Payment provider error",
      });
      expect(result.data).toBeNull();
    });

    it("returns invalid product error from server", async () => {
      const client = createMockSupabaseClient({
        session: { user: { id: "user-1" } },
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: "Invalid product: soravo_unknown",
          code: "invalid_product",
        }),
      });

      const result = await createCheckoutOrder(client, {
        productId: "soravo_unknown",
        currency: "INR",
      });

      expect(result.error).toEqual({
        code: "invalid_product",
        message: "Invalid product: soravo_unknown",
      });
      expect(result.data).toBeNull();
    });

    it("returns subscription response for monthly product", async () => {
      const client = createMockSupabaseClient({
        session: { user: { id: "user-1" } },
      });

      const mockResponse = {
        subscriptionId: "sub_abc123",
        keyId: "rzp_test_xxx",
        currency: "INR",
        productId: "soravo_monthly",
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createCheckoutOrder(client, {
        productId: "soravo_monthly",
        currency: "INR",
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        success: true,
        ...mockResponse,
      });
    });

    it("returns malformed response error when server data invalid", async () => {
      const client = createMockSupabaseClient({
        session: { user: { id: "user-1" } },
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          // Missing required fields
          productId: "soravo_lifetime",
        }),
      });

      const result = await createCheckoutOrder(client, {
        productId: "soravo_lifetime",
        currency: "INR",
      });

      expect(result.error).toEqual({
        code: "malformed_request",
        message: "Server response was malformed",
      });
      expect(result.data).toBeNull();
    });
  });
});
