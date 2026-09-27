// Shared product catalog - single source of truth for all Soravo pricing
// Used by: license-api, payment-checkout Edge Function, webhook Edge Function

import type { Currency, Product, ProductId, RegionalPrice } from "./types";

export const PRODUCT_IDS = new Set<string>(["soravo_monthly", "soravo_lifetime"]);
const SUPPORTED_CURRENCIES = new Set<Currency>(["USD", "INR", "CAD", "EUR", "AUD"]);

const REGIONAL_PRICING: Readonly<Record<ProductId, Readonly<Record<Currency, RegionalPrice>>>> = {
  soravo_monthly: {
    USD: { amountMinor: 1200, currency: "USD", status: "evaluated_target" },
    INR: { amountMinor: 9900, currency: "INR", status: "evaluated_target" },
    CAD: { amountMinor: 1600, currency: "CAD", status: "evaluated_target" },
    EUR: { amountMinor: 1100, currency: "EUR", status: "evaluated_target" },
    AUD: { amountMinor: 1800, currency: "AUD", status: "evaluated_target" },
  },
  soravo_lifetime: {
    USD: { amountMinor: 5000, currency: "USD", status: "evaluated_target" },
    INR: { amountMinor: 41500, currency: "INR", status: "evaluated_target" },
    CAD: { amountMinor: 6700, currency: "CAD", status: "evaluated_target" },
    EUR: { amountMinor: 4600, currency: "EUR", status: "evaluated_target" },
    AUD: { amountMinor: 7500, currency: "AUD", status: "evaluated_target" },
  },
};

export const PRODUCT_CATALOG: Readonly<Record<ProductId, Product>> = {
  soravo_monthly: {
    id: "soravo_monthly",
    plan: "monthly",
    displayName: "Soravo Monthly",
    price: REGIONAL_PRICING.soravo_monthly.USD,
    regionalPrices: REGIONAL_PRICING.soravo_monthly,
  },
  soravo_lifetime: {
    id: "soravo_lifetime",
    plan: "lifetime",
    displayName: "Soravo Lifetime",
    price: REGIONAL_PRICING.soravo_lifetime.USD,
    regionalPrices: REGIONAL_PRICING.soravo_lifetime,
  },
};

export function isProductId(value: unknown): value is ProductId {
  return typeof value === "string" && PRODUCT_IDS.has(value);
}

export function resolveProduct(value: unknown): Product | undefined {
  return isProductId(value) ? PRODUCT_CATALOG[value] : undefined;
}

export function getRegionalPrice(product: Product, currency: unknown): RegionalPrice | undefined {
  if (!SUPPORTED_CURRENCIES.has(currency as Currency)) {
    return undefined;
  }
  return product.regionalPrices[currency as Currency];
}

export function validateCurrency(currency: unknown): currency is Currency {
  return SUPPORTED_CURRENCIES.has(currency as Currency);
}
