// Mirror of services/license-api/src/payment/catalog.ts (PRODUCT_CATALOG).
//
// The webhook must know the exact product / plan / price that license-api
// charged for, because a captured payment only becomes an entitlement when the
// paid amount and currency match the catalogue entry for the ordered product
// (021 finding F7: the webhook never validated what it was granting).
//
// This file is a deliberate duplicate of the licence catalogue (the Edge
// Function cannot import across package boundaries at deploy time). It is kept
// honest by supabase/tests/webhook-hardening.test.mjs, which parses the licence
// catalogue and fails if the two ever drift.
//
// Pure TypeScript: no Deno APIs and no remote imports, so the webhook logic is
// unit-testable under Vitest.

export type ProductId = "soravo_monthly" | "soravo_lifetime";
export type Plan = "monthly" | "lifetime";
export type Currency = "USD" | "INR" | "CAD" | "EUR" | "AUD";

export type ProductPrice = {
  amountMinor: number;
  currency: Currency;
  status: "evaluated_target" | "confirmed";
};

export type RegionalPrice = ProductPrice;

export type CatalogProduct = {
  id: ProductId;
  plan: Plan;
  displayName: string;
  price: ProductPrice;
  regionalPrices: Readonly<Record<Currency, RegionalPrice>>;
};

export const PRODUCT_CATALOG: Readonly<Record<ProductId, CatalogProduct>> = {
  soravo_monthly: {
    id: "soravo_monthly",
    plan: "monthly",
    displayName: "Soravo Monthly",
    price: {
      amountMinor: 1200,
      currency: "USD",
      status: "evaluated_target",
    },
    regionalPrices: {
      USD: { amountMinor: 1200, currency: "USD", status: "evaluated_target" },
      INR: { amountMinor: 9900, currency: "INR", status: "evaluated_target" },
      CAD: { amountMinor: 1600, currency: "CAD", status: "evaluated_target" },
      EUR: { amountMinor: 1100, currency: "EUR", status: "evaluated_target" },
      AUD: { amountMinor: 1800, currency: "AUD", status: "evaluated_target" },
    },
  },
  soravo_lifetime: {
    id: "soravo_lifetime",
    plan: "lifetime",
    displayName: "Soravo Lifetime",
    price: {
      amountMinor: 5000,
      currency: "USD",
      status: "evaluated_target",
    },
    regionalPrices: {
      USD: { amountMinor: 5000, currency: "USD", status: "evaluated_target" },
      INR: { amountMinor: 41500, currency: "INR", status: "evaluated_target" },
      CAD: { amountMinor: 6700, currency: "CAD", status: "evaluated_target" },
      EUR: { amountMinor: 4600, currency: "EUR", status: "evaluated_target" },
      AUD: { amountMinor: 7500, currency: "AUD", status: "evaluated_target" },
    },
  },
};

export const PRODUCT_IDS: readonly ProductId[] = ["soravo_monthly", "soravo_lifetime"];

const PRODUCT_ID_SET: ReadonlySet<string> = new Set(PRODUCT_IDS);

export function isProductId(value: unknown): value is ProductId {
  return typeof value === "string" && PRODUCT_ID_SET.has(value);
}

export function resolveProduct(value: unknown): CatalogProduct | undefined {
  return isProductId(value) ? PRODUCT_CATALOG[value] : undefined;
}

const PLAN_BY_LEGACY_PRODUCT: Readonly<Record<string, Plan>> = {
  lifetime: "lifetime",
  monthly: "monthly",
};

// Orders created before this hardening (or by hand in the dashboard) may carry
// the legacy `product = 'soravo'` marker. Its plan can still be recovered from
// a `plan` note; without one we refuse to guess rather than defaulting everyone
// to monthly (021 finding F7 / F8).
export function resolveLegacyProduct(value: unknown, planNote: unknown): ProductId | undefined {
  if (value !== "soravo") return undefined;
  const plan = PLAN_BY_LEGACY_PRODUCT[typeof planNote === "string" ? planNote : ""];
  return plan === "lifetime" ? "soravo_lifetime" : plan === "monthly" ? "soravo_monthly" : undefined;
}
