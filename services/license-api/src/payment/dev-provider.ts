import type { CreateOrderRequest, PaymentProvider, ProviderOrder } from "./types";

export type DevProviderBehavior = "success" | "always_fail";

export class DevProviderFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DevProviderFailure";
  }
}

export class DevPaymentProvider implements PaymentProvider {
  readonly kind = "dev" as const;

  private readonly behavior: DevProviderBehavior;

  constructor(behavior: DevProviderBehavior = "success") {
    this.behavior = behavior;
  }

  async createOrder(request: CreateOrderRequest): Promise<ProviderOrder> {
    if (this.behavior === "always_fail") {
      throw new DevProviderFailure("dev provider simulated failure");
    }
    return {
      provider: "dev",
      providerOrderId: safeId(`dev_order_${request.reference}`),
    };
  }
}

function safeId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_");
}