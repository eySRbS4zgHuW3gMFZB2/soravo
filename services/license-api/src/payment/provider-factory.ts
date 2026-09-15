import type { PaymentProvider, ProviderKind } from "./types";
import { PaymentError } from "./errors";
import { DevPaymentProvider } from "./dev-provider";

export interface PaymentProviderConfig {
  kind: ProviderKind;
}

export function createPaymentProvider(
  config: PaymentProviderConfig,
  nodeEnv: string
): PaymentProvider {
  if (config.kind === "razorpay") {
    throw new PaymentError({
      code: "provider_not_implemented",
      message: "The Razorpay provider is not available yet.",
      detail: "razorpay provider reserved for CLOUD-010",
    });
  }
  if (config.kind === "dev") {
    if (nodeEnv === "production") {
      throw new PaymentError({
        code: "invalid_configuration",
        message: "The development payment provider cannot be used in production.",
        detail: "dev provider rejected in production",
      });
    }
    return new DevPaymentProvider("success");
  }
  throw new PaymentError({
    code: "invalid_configuration",
    message: "Unknown payment provider kind.",
    detail: `unknown provider kind: ${String(config.kind)}`,
  });
}