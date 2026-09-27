// Shared catalog import - single source of truth for Soravo pricing
// This eliminates duplication between license-api, webhook, and payment-checkout
// The shared package is: packages/payment-domain

import { PRODUCT_CATALOG, PRODUCT_IDS, isProductId, resolveProduct, validateCurrency, getRegionalPrice } from "@soravo/payment-domain";

// Legacy product resolution (for backwards compatibility with pre-catalog orders)
type Plan = "monthly" | "lifetime";

const PLAN_BY_LEGACY_PRODUCT: Readonly<Record<string, Plan>> = {
  lifetime: "lifetime",
  monthly: "monthly",
};

// Export types for compatibility with existing code
export type ProductId = "soravo_monthly" | "soravo_lifetime";
export type CatalogProduct = typeof PRODUCT_CATALOG[keyof typeof PRODUCT_CATALOG];
export { PRODUCT_CATALOG, PRODUCT_IDS, isProductId, resolveProduct, validateCurrency, getRegionalPrice };

// Orders created before this hardening (or by hand in the dashboard) may carry
// the legacy `product = 'soravo'` marker. Its plan can still be recovered from
// a `plan` note; without one we refuse to guess rather than defaulting everyone
// to monthly (021 finding F7 / F8).
export function resolveLegacyProduct(value: unknown, planNote: unknown): ProductId | undefined {
  if (value !== "soravo") return undefined;
  const plan = PLAN_BY_LEGACY_PRODUCT[typeof planNote === "string" ? planNote : ""];
  return plan === "lifetime" ? "soravo_lifetime" : plan === "monthly" ? "soravo_monthly" : undefined;
}
