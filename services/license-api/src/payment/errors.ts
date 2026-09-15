export const PAYMENT_ERROR_CODES = {
  invalidRequest: "invalid_request",
  invalidIdentity: "invalid_identity",
  invalidProduct: "invalid_product",
  invalidConfiguration: "invalid_configuration",
  providerUnavailable: "provider_unavailable",
  providerNotImplemented: "provider_not_implemented",
} as const;

export type PaymentErrorCode = (typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES];

export interface PaymentErrorOptions {
  code: PaymentErrorCode;
  message: string;
  detail?: string;
}

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;
  readonly detail?: string;

  constructor(options: PaymentErrorOptions) {
    super(options.message);
    this.name = "PaymentError";
    this.code = options.code;
    this.detail = options.detail;
  }
}