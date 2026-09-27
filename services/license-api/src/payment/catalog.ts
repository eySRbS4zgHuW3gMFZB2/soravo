import { PaymentError } from "./errors";
import type { Currency, Product, ProductId, RegionalPrice } from "@soravo/payment-domain";
import {
  PRODUCT_CATALOG,
  PRODUCT_IDS,
  isProductId,
  resolveProduct,
  validateCurrency,
  getRegionalPrice,
} from "@soravo/payment-domain";

// Re-export types and catalog for consumers of license-api
export type { Currency, Product, ProductId, RegionalPrice } from "@soravo/payment-domain";
export {
  PRODUCT_CATALOG,
  PRODUCT_IDS,
  isProductId,
  resolveProduct,
  validateCurrency,
  getRegionalPrice,
} from "@soravo/payment-domain";

const PLANS = new Set<string>(["monthly", "lifetime"]);
const PRICING_STATUSES = new Set<string>(["evaluated_target", "confirmed"]);
const SUPPORTED_CURRENCIES = new Set<Currency>(["USD", "INR", "CAD", "EUR", "AUD"]);
const PLAN_BY_PRODUCT: Record<string, string> = {
  soravo_monthly: "monthly",
  soravo_lifetime: "lifetime",
};
const MAX_DISPLAY_NAME_LENGTH = 200;

export class ProductCatalog {
  private readonly products: Readonly<Record<ProductId, Product>>;

  constructor(products: Readonly<Record<ProductId, Product>>) {
    assertCatalogValid(products);
    this.products = products;
  }

  resolve(productId: string): Product | undefined {
    return this.products[productId as ProductId];
  }

  list(): readonly Product[] {
    return Object.values(this.products);
  }
}

export const DEFAULT_PRODUCT_CATALOG = new ProductCatalog(PRODUCT_CATALOG);

export function assertCatalogValid(products: Readonly<Record<ProductId, Product>>): void {
  for (const [key, product] of Object.entries(products)) {
    invalidConfigurationIf(
      typeof product !== "object" || product === null,
      "catalog entry is not an object"
    );
    if (!PRODUCT_IDS.has(key)) {
      throw catalogError(`catalog entry has an invalid product id: ${String(key)}`);
    }
    invalidConfigurationIf(
      product.id !== undefined && product.id !== key,
      "catalog entry id does not match its key"
    );
    invalidConfigurationIf(
      typeof product.displayName !== "string" ||
        product.displayName.length === 0 ||
        product.displayName.length > MAX_DISPLAY_NAME_LENGTH,
      "catalog entry has an invalid display name"
    );
    invalidConfigurationIf(
      PLAN_BY_PRODUCT[key] !== undefined && product.plan !== PLAN_BY_PRODUCT[key],
      "catalog entry plan does not match its product id"
    );
    invalidConfigurationIf(!PLANS.has(product.plan), "catalog entry has an invalid plan");
    invalidConfigurationIf(
      typeof product.price !== "object" || product.price === null,
      "catalog entry has no price"
    );
    invalidConfigurationIf(
      !Number.isSafeInteger(product.price.amountMinor) || product.price.amountMinor <= 0,
      "catalog entry has an invalid price amount"
    );
    invalidConfigurationIf(
      !isValidCurrency(product.price.currency),
      "catalog entry has an invalid currency"
    );
    invalidConfigurationIf(
      !PRICING_STATUSES.has(product.price.status),
      "catalog entry has an invalid pricing status"
    );
    invalidConfigurationIf(
      typeof product.regionalPrices !== "object" || product.regionalPrices === null,
      "catalog entry has no regional prices"
    );
    for (const [currency, regionalPrice] of Object.entries(product.regionalPrices)) {
      invalidConfigurationIf(
        !isValidCurrency(currency),
        `catalog entry has an invalid regional currency: ${currency}`
      );
      invalidConfigurationIf(
        !Number.isSafeInteger(regionalPrice.amountMinor) || regionalPrice.amountMinor <= 0,
        `catalog entry has an invalid regional price amount for ${currency}`
      );
      invalidConfigurationIf(
        regionalPrice.currency !== currency,
        `catalog entry regional price currency mismatch for ${currency}`
      );
      invalidConfigurationIf(
        !PRICING_STATUSES.has(regionalPrice.status),
        `catalog entry has an invalid regional pricing status for ${currency}`
      );
    }
  }
}

function invalidConfigurationIf(condition: boolean, detail: string): void {
  if (condition) {
    throw catalogError(detail);
  }
}

function catalogError(detail: string): PaymentError {
  return new PaymentError({
    code: "invalid_configuration",
    message: "The product catalog is invalid.",
    detail,
  });
}

function isValidCurrency(value: unknown): value is Currency {
  return SUPPORTED_CURRENCIES.has(value as Currency);
}
