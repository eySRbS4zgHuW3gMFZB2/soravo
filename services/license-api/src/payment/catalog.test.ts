import { describe, expect, it } from "vitest";
import { DEFAULT_PRODUCT_CATALOG, PRODUCT_CATALOG, ProductCatalog } from "./catalog";
import type { Product, ProductId } from "./types";
import { PaymentError } from "./errors";
import type { PaymentErrorCode } from "./errors";

function expectCatalogError(build: () => ProductCatalog, code: PaymentErrorCode): void {
  try {
    build();
  } catch (err) {
    expect(err).toBeInstanceOf(PaymentError);
    expect((err as PaymentError).code).toBe(code);
    return;
  }
  throw new Error(`expected PaymentError with code ${code} to be thrown`);
}

const LIVING_PRICE = {
  amountMinor: 1200,
  currency: "USD",
  status: "evaluated_target",
} as Product["price"];

describe("product catalog", () => {
  it("documents only evaluated pricing targets, never live offers", () => {
    expect(PRODUCT_CATALOG.soravo_monthly.price).toEqual({
      amountMinor: 1200,
      currency: "USD",
      status: "evaluated_target",
    });
    expect(PRODUCT_CATALOG.soravo_lifetime.price).toEqual({
      amountMinor: 5000,
      currency: "USD",
      status: "evaluated_target",
    });
    for (const product of Object.values(PRODUCT_CATALOG)) {
      expect(Number.isSafeInteger(product.price.amountMinor)).toBe(true);
      expect(product.price.amountMinor).toBeGreaterThan(0);
      expect(product.price.status).not.toBe("confirmed");
    }
  });

  it("resolves known products and rejects unknown ones", () => {
    expect(DEFAULT_PRODUCT_CATALOG.resolve("soravo_monthly")?.id).toBe("soravo_monthly");
    expect(DEFAULT_PRODUCT_CATALOG.resolve("soravo_lifetime")?.id).toBe("soravo_lifetime");
    expect(DEFAULT_PRODUCT_CATALOG.resolve("soravo_weekly")).toBeUndefined();
  });

  it("accepts the shipped catalog at construction", () => {
    expect(() => new ProductCatalog(PRODUCT_CATALOG)).not.toThrow();
  });

  it("rejects catalogs with unsafe prices", () => {
    for (const amountMinor of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expectCatalogError(
        () =>
          new ProductCatalog({
            ...PRODUCT_CATALOG,
            soravo_monthly: {
              ...PRODUCT_CATALOG.soravo_monthly,
              price: { ...LIVING_PRICE, amountMinor },
            },
          }),
        "invalid_configuration"
      );
    }
  });

  it("rejects catalogs with unsupported currencies", () => {
    expectCatalogError(
      () =>
        new ProductCatalog({
          ...PRODUCT_CATALOG,
          soravo_monthly: {
            ...PRODUCT_CATALOG.soravo_monthly,
            price: {
              ...LIVING_PRICE,
              currency: "INR",
            } as unknown as Product["price"],
          },
        }),
      "invalid_configuration"
    );
  });

  it("rejects catalogs whose plan mismatches the product id", () => {
    expectCatalogError(
      () =>
        new ProductCatalog({
          ...PRODUCT_CATALOG,
          soravo_monthly: { ...PRODUCT_CATALOG.soravo_monthly, plan: "lifetime" },
        }),
      "invalid_configuration"
    );
  });

  it("rejects catalogs with live-sounding pricing statuses", () => {
    expectCatalogError(
      () =>
        new ProductCatalog({
          ...PRODUCT_CATALOG,
          soravo_monthly: {
            ...PRODUCT_CATALOG.soravo_monthly,
            price: { ...LIVING_PRICE, status: "live" } as unknown as Product["price"],
          },
        }),
      "invalid_configuration"
    );
  });

  it("rejects catalogs with unknown product ids", () => {
    expectCatalogError(
      () =>
        new ProductCatalog({
          soravo_weekly: {
            id: "soravo_weekly",
            plan: "weekly",
            displayName: "Weekly",
            price: LIVING_PRICE,
          },
        } as unknown as Record<ProductId, Product>),
      "invalid_configuration"
    );
  });
});