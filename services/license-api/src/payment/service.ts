import { randomUUID } from "node:crypto";
import type {
  Currency,
  EntitlementPlan,
  PaymentProvider,
  Product,
  ProductId,
  ProviderKind,
  ProviderOrder,
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
    const providerOrder = await createProviderOrder(this.provider, this.logger, product, reference);
    this.logger.info("payment.initiated", {
      event: "payment.initiated",
      userId,
      productId: product.id,
      plan: product.plan,
      reference,
      provider: this.provider.kind,
    });
    return toOrderInitiation(product, reference, providerOrder, this.provider.kind);
  }
}

async function createProviderOrder(
  provider: PaymentProvider,
  logger: PaymentLogger,
  product: Product,
  reference: string
): Promise<ProviderOrder> {
  try {
    return await provider.createOrder({
      reference,
      productId: product.id,
      amountMinor: product.price.amountMinor,
      currency: product.price.currency,
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
    input.productId.length > MAX_PRODUCT_ID_LENGTH
  ) {
    throw new PaymentError({
      code: "invalid_product",
      message: "A valid product identifier is required.",
      detail: "missing or malformed product id",
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
  return product;
}

function toOrderInitiation(
  product: Product,
  reference: string,
  providerOrder: ProviderOrder,
  provider: ProviderKind
): OrderInitiation {
  return {
    orderId: providerOrder.providerOrderId,
    reference,
    productId: product.id,
    plan: product.plan,
    amountMinor: product.price.amountMinor,
    currency: product.price.currency,
    provider,
  };
}