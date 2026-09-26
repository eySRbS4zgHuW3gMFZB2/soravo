export type ProductId = "soravo_monthly" | "soravo_lifetime";

export type EntitlementPlan = "monthly" | "lifetime";

export type Currency = "USD" | "INR" | "CAD" | "EUR" | "AUD";

export type ProviderKind = "dev" | "razorpay";

export type ProductPricingStatus = "evaluated_target" | "confirmed";

export interface ProductPrice {
  amountMinor: number;
  currency: Currency;
  status: ProductPricingStatus;
}

export interface RegionalPrice {
  amountMinor: number;
  currency: Currency;
  status: ProductPricingStatus;
}

export interface Product {
  id: ProductId;
  plan: EntitlementPlan;
  displayName: string;
  price: ProductPrice;
  regionalPrices: Readonly<Record<Currency, RegionalPrice>>;
}

export interface CreateOrderRequest {
  reference: string;
  productId: ProductId;
  amountMinor: number;
  currency: Currency;
  userId: string;
}

export interface ProviderOrder {
  providerOrderId: string;
  provider: ProviderKind;
}

export interface PaymentProvider {
  readonly kind: ProviderKind;
  createOrder(request: CreateOrderRequest): Promise<ProviderOrder>;
}