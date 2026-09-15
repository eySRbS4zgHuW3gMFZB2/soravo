export type ProductId = "soravo_monthly" | "soravo_lifetime";

export type EntitlementPlan = "monthly" | "lifetime";

export type Currency = "USD";

export type ProviderKind = "dev" | "razorpay";

export type ProductPricingStatus = "evaluated_target" | "confirmed";

export interface ProductPrice {
  amountMinor: number;
  currency: Currency;
  status: ProductPricingStatus;
}

export interface Product {
  id: ProductId;
  plan: EntitlementPlan;
  displayName: string;
  price: ProductPrice;
}

export interface CreateOrderRequest {
  reference: string;
  productId: ProductId;
  amountMinor: number;
  currency: Currency;
}

export interface ProviderOrder {
  providerOrderId: string;
  provider: ProviderKind;
}

export interface PaymentProvider {
  readonly kind: ProviderKind;
  createOrder(request: CreateOrderRequest): Promise<ProviderOrder>;
}