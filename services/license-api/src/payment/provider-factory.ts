import type { PaymentProvider, ProviderKind } from "./types";
import { PaymentError } from "./errors";
import { DevPaymentProvider } from "./dev-provider";
import { RazorpayProvider, type RazorpayConfig } from "./razorpay-provider";

export interface PaymentProviderConfig {
  kind: ProviderKind;
  razorpay?: RazorpayConfig;
}

export function createPaymentProvider(
  config: PaymentProviderConfig,
  nodeEnv: string
): PaymentProvider {
  if (config.kind === "razorpay") {
    if (!config.razorpay?.keyId || !config.razorpay?.keySecret) {
      throw new PaymentError({
        code: "invalid_configuration",
        message: "Razorpay credentials are required.",
        detail: "missing razorpay key_id or key_secret in config",
      });
    }
    return new RazorpayProvider(config.razorpay);
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