import { randomUUID } from "node:crypto";
import type {
  Currency,
  EntitlementPlan,
  PaymentProvider,
  Product,
  ProductId,
  ProviderKind,
  ProviderOrder,
  ProviderSubscription,
} from "./types";
import { PaymentError } from "./errors";
import { DEFAULT_PRODUCT_CATALOG, ProductCatalog } from "./catalog";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PRODUCT_ID_LENGTH = 64;

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

export interface PaymentLogger {
  info(event: string, fields: Record<string, unknown>): void;
  warn(event: string, fields: Record<string, unknown>): void;
  error(event: string, fields: Record<string, unknown>): void;
}

export interface PaymentServiceOptions {
  provider: PaymentProvider;
  catalog?: ProductCatalog;
  logger?: PaymentLogger;
  generateReference?: () => string;
}

const DEFAULT_LOGGER: PaymentLogger = {
  info: (event, fields) => console.info(`[license-api][${event}]`, JSON.stringify(fields)),
  warn: (event, fields) => console.warn(`[license-api][${event}]`, JSON.stringify(fields)),
  error: (event, fields) => console.error(`[license-api][${event}]`, JSON.stringify(fields)),
};

export class PaymentService {
  private readonly provider: PaymentProvider;
  private readonly catalog: ProductCatalog;
  private readonly logger: PaymentLogger;
  private readonly generateReference: () => string;

  constructor(options: PaymentServiceOptions) {
    if (typeof options === "object" && options !== null && options.provider === undefined) {
      throw new PaymentError({
        code: "invalid_configuration",
        message: "A payment provider is required.",
        detail: "missing provider",
      });
    }
    this.provider = options.provider;
    this.catalog = options.catalog ?? DEFAULT_PRODUCT_CATALOG;
    this.logger = options.logger ?? DEFAULT_LOGGER;
    this.generateReference = options.generateReference ?? (() => randomUUID());
  }

  async createOrder(caller: PaymentCaller, input: CreatePaymentInput): Promise<OrderInitiation> {
    const userId = assertCallerIdentity(caller);
    const product = resolveProductFromCatalog(this.catalog, input);
    const reference = this.generateReference();
    const providerOrder = await createProviderOrder(
      this.provider,
      this.logger,
      product,
      reference,
      userId,
      input.currency
    );
    this.logger.info("payment.initiated", {
      event: "payment.initiated",
      userId,
      productId: product.id,
      plan: product.plan,
      reference,
      provider: this.provider.kind,
    });
    return toOrderInitiation(product, reference, providerOrder, this.provider.kind, input.currency);
  }

  async createSubscription(caller: PaymentCaller, input: CreatePaymentInput): Promise<SubscriptionInitiation> {
    const userId = assertCallerIdentity(caller);
    const product = resolveProductFromCatalog(this.catalog, input);
    
    if (product.plan !== "monthly") {
      throw new PaymentError({
        code: "invalid_product",
        message: "Subscriptions are only available for monthly products.",
        detail: `product ${product.id} has plan ${product.plan}, expected monthly`,
      });
    }

    const providerSubscription = await createProviderSubscription(
      this.provider,
      this.logger,
      product,
      userId,
      input.currency
    );

    this.logger.info("subscription.initiated", {
      event: "subscription.initiated",
      userId,
      productId: product.id,
      plan: product.plan,
      subscriptionId: providerSubscription.subscriptionId,
      provider: this.provider.kind,
    });

    return toSubscriptionInitiation(product, providerSubscription, this.provider.kind, input.currency);
  }
}

async function createProviderOrder(
  provider: PaymentProvider,
  logger: PaymentLogger,
  product: Product,
  reference: string,
  userId: string,
  currency: Currency
): Promise<ProviderOrder> {
  const regionalPrice = product.regionalPrices[currency];
  if (regionalPrice === undefined) {
    throw new PaymentError({
      code: "invalid_product",
      message: "The requested currency is not supported for this product.",
      detail: `unsupported currency: ${currency}`,
    });
  }
  try {
    return await provider.createOrder({
      reference,
      productId: product.id,
      amountMinor: regionalPrice.amountMinor,
      currency: regionalPrice.currency,
      userId,
    });
  } catch (cause) {
    logger.error("payment.provider_failed", {
      event: "payment.provider_failed",
      reference,
      provider: provider.kind,
      errorName: cause instanceof Error ? cause.name : "unknown",
    });
    throw new PaymentError({
      code: "provider_unavailable",
      message: "The payment provider is temporarily unavailable.",
      detail: "provider failed",
    });
  }
}

async function createProviderSubscription(
  provider: PaymentProvider,
  logger: PaymentLogger,
  product: Product,
  userId: string,
  currency: Currency
): Promise<ProviderSubscription> {
  if (typeof provider.createSubscription !== "function") {
    throw new PaymentError({
      code: "provider_unavailable",
      message: "The payment provider does not support subscriptions.",
      detail: `provider ${provider.kind} has no createSubscription method`,
    });
  }

  const regionalPrice = product.regionalPrices[currency];
  if (regionalPrice === undefined) {
    throw new PaymentError({
      code: "invalid_product",
      message: "The requested currency is not supported for this product.",
      detail: `unsupported currency: ${currency}`,
    });
  }

  try {
    return await provider.createSubscription({
      planId: `plan_${product.id}_${currency.toLowerCase()}`,
      userId,
      productId: product.id,
    });
  } catch (cause) {
    logger.error("subscription.provider_failed", {
      event: "subscription.provider_failed",
      provider: provider.kind,
      errorName: cause instanceof Error ? cause.name : "unknown",
    });
    throw new PaymentError({
      code: "provider_unavailable",
      message: "The payment provider is temporarily unavailable.",
      detail: "provider failed",
    });
  }
}

function assertCallerIdentity(caller: PaymentCaller): string {
  if (
    typeof caller !== "object" ||
    caller === null ||
    typeof caller.userId !== "string" ||
    !UUID_PATTERN.test(caller.userId)
  ) {
    throw new PaymentError({
      code: "invalid_identity",
      message: "A valid authenticated identity is required.",
      detail: "missing or malformed user id",
    });
  }
  return caller.userId;
}

function resolveProductFromCatalog(
  catalog: ProductCatalog,
  input: CreatePaymentInput
): Product {
  if (
    typeof input !== "object" ||
    input === null ||
    typeof input.productId !== "string" ||
    input.productId.length === 0 ||
    input.productId.length > MAX_PRODUCT_ID_LENGTH ||
    typeof input.currency !== "string"
  ) {
    throw new PaymentError({
      code: "invalid_product",
      message: "A valid product identifier and currency are required.",
      detail: "missing or malformed product id or currency",
    });
  }
  const product = catalog.resolve(input.productId);
  if (product === undefined) {
    throw new PaymentError({
      code: "invalid_product",
      message: "The requested product is not available.",
      detail: "unknown product id",
    });
  }
  const regionalPrice = product.regionalPrices[input.currency as Currency];
  if (regionalPrice === undefined) {
    throw new PaymentError({
      code: "invalid_product",
      message: "The requested currency is not supported for this product.",
      detail: `unsupported currency: ${input.currency}`,
    });
  }
  return product;
}

function toOrderInitiation(
  product: Product,
  reference: string,
  providerOrder: ProviderOrder,
  provider: ProviderKind,
  currency: Currency
): OrderInitiation {
  const regionalPrice = product.regionalPrices[currency];
  const amountMinor = regionalPrice?.amountMinor ?? product.price.amountMinor;
  return {
    orderId: providerOrder.providerOrderId,
    reference,
    productId: product.id,
    plan: product.plan,
    amountMinor,
    currency,
    provider,
  };
}

function toSubscriptionInitiation(
  product: Product,
  providerSubscription: ProviderSubscription,
  provider: ProviderKind,
  currency: Currency
): SubscriptionInitiation {
  return {
    subscriptionId: providerSubscription.subscriptionId,
    productId: product.id,
    plan: product.plan,
    currency,
    provider,
  };
}