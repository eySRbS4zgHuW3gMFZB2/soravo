// Shared payment domain types - used by both license-api and Edge Functions
// This file contains only pure TypeScript with no runtime dependencies

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

export interface RegionalPrice extends ProductPrice {}

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

export interface CreateSubscriptionRequest {
  planId: string;
  userId: string;
  productId: ProductId;
}

export interface ProviderOrder {
  providerOrderId: string;
  provider: ProviderKind;
}

export interface ProviderSubscription {
  subscriptionId: string;
  provider: ProviderKind;
}

export interface PaymentProvider {
  readonly kind: ProviderKind;
  createOrder(request: CreateOrderRequest): Promise<ProviderOrder>;
  createSubscription?(request: CreateSubscriptionRequest): Promise<ProviderSubscription>;
}

export interface PaymentLogger {
  info(event: string, fields: Record<string, unknown>): void;
  warn(event: string, fields: Record<string, unknown>): void;
  error(event: string, fields: Record<string, unknown>): void;
}

export interface PaymentCaller {
  userId: string;
}

export interface CreatePaymentInput {
  productId: ProductId;
  currency: Currency;
}

export interface OrderInitiation {
  orderId: string;
  reference: string;
  productId: ProductId;
  plan: EntitlementPlan;
  amountMinor: number;
  currency: Currency;
  provider: ProviderKind;
}

export interface SubscriptionInitiation {
  subscriptionId: string;
  productId: ProductId;
  plan: EntitlementPlan;
  currency: Currency;
  provider: ProviderKind;
}
