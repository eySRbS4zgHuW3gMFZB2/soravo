import type { CreateOrderRequest, PaymentProvider, ProviderOrder } from "./types";
import { PaymentError } from "./errors";

const RAZORPAY_API_VERSION = "2024-11-01";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id: string | null;
  status: string;
  attempts: number;
  notes: Record<string, unknown>;
  created_at: number;
}

export class RazorpayProvider implements PaymentProvider {
  readonly kind = "razorpay" as const;

  private readonly keyId: string;
  private readonly keySecret: string;

  constructor(config: RazorpayConfig) {
    if (!config.keyId || !config.keySecret) {
      throw new PaymentError({
        code: "invalid_configuration",
        message: "Razorpay credentials are required.",
        detail: "missing key_id or key_secret",
      });
    }
    this.keyId = config.keyId;
    this.keySecret = config.keySecret;
  }

  async createOrder(request: CreateOrderRequest): Promise<ProviderOrder> {
    const url = "https://api.razorpay.com/v1/orders";
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");

    const payload = {
      amount: request.amountMinor,
      currency: request.currency,
      receipt: request.reference,
      notes: {
        product_id: request.productId,
        user_id: request.userId,
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          "X-Razorpay-Version": RAZORPAY_API_VERSION,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new PaymentError({
        code: "provider_unavailable",
        message: "The payment provider is temporarily unavailable.",
        detail: "razorpay network error",
      });
    }

    if (!response.ok) {
      await response.text().catch(() => {});
      throw new PaymentError({
        code: "provider_unavailable",
        message: "The payment provider is temporarily unavailable.",
        detail: `razorpay order creation failed: ${response.status}`,
      });
    }

    const data = (await response.json()) as RazorpayOrderResponse;
    return {
      provider: "razorpay",
      providerOrderId: data.id,
    };
  }
}

export function createRazorpayProvider(config: RazorpayConfig): PaymentProvider {
  return new RazorpayProvider(config);
}