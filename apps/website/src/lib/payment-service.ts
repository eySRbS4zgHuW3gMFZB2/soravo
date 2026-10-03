import type { AppSupabaseClient } from "./supabase";

export type CheckoutRequest = {
  productId: string;
  currency: string;
};

export type CheckoutResponse =
  | {
      success: true;
      orderId: string;
      keyId: string;
      amount: number;
      currency: string;
      productId: string;
    }
  | {
      success: true;
      subscriptionId: string;
      keyId: string;
      currency: string;
      productId: string;
    };

export type CheckoutError =
  | { code: "unauthenticated"; message: string }
  | { code: "malformed_request"; message: string }
  | { code: "invalid_product"; message: string }
  | { code: "provider_failure"; message: string }
  | { code: "unknown"; message: string };

const ENDPOINT = "/functions/v1/payment-checkout";

export async function createCheckoutOrder(
  client: AppSupabaseClient,
  request: CheckoutRequest,
): Promise<{ data: CheckoutResponse | null; error: CheckoutError | null }> {
  const { data: { session } } = await client.auth.getSession();

  if (!session) {
    return {
      data: null,
      error: { code: "unauthenticated", message: "User must be authenticated to checkout" },
    };
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(request),
  });

  const body = (await response.json()) as unknown;

  if (!response.ok) {
    const error = body as { error?: string; code?: string };
    const code = error.code ?? "unknown";
    const message = error.error ?? "Payment checkout failed";

    return {
      data: null,
      error: { code: code as CheckoutError["code"], message },
    };
  }

  const result = body as {
    orderId?: string;
    subscriptionId?: string;
    keyId: string;
    amount?: number;
    currency: string;
    productId: string;
  };

  if (!result.keyId || !result.currency || !result.productId) {
    return {
      data: null,
      error: { code: "malformed_request", message: "Server response was malformed" },
    };
  }

  if (result.orderId) {
    return {
      data: {
        success: true,
        orderId: result.orderId,
        keyId: result.keyId,
        amount: result.amount!,
        currency: result.currency,
        productId: result.productId,
      },
      error: null,
    };
  }

  if (result.subscriptionId) {
    return {
      data: {
        success: true,
        subscriptionId: result.subscriptionId,
        keyId: result.keyId,
        currency: result.currency,
        productId: result.productId,
      },
      error: null,
    };
  }

  return {
    data: null,
    error: { code: "malformed_request", message: "Invalid server response" },
  };
}
