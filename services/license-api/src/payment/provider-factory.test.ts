import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createPaymentProvider } from "./provider-factory";
import { DevPaymentProvider } from "./dev-provider";
import { RazorpayProvider } from "./razorpay-provider";
import { PaymentError } from "./errors";
import type { PaymentErrorCode } from "./errors";

function expectConfigError(fn: () => unknown, code: PaymentErrorCode): void {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(PaymentError);
    expect((err as PaymentError).code).toBe(code);
    return;
  }
  throw new Error(`expected PaymentError with code ${code} to be thrown`);
}

const FACTORY_SOURCE = readFileSync(new URL("./provider-factory.ts", import.meta.url), "utf8");

describe("createPaymentProvider", () => {
  it("returns the dev provider outside production", () => {
    const provider = createPaymentProvider({ kind: "dev" }, "development");
    expect(provider).toBeInstanceOf(DevPaymentProvider);
    expect(provider.kind).toBe("dev");
  });

  it("refuses the dev provider in production (K)", () => {
    expectConfigError(
      () => createPaymentProvider({ kind: "dev" }, "production"),
      "invalid_configuration"
    );
  });

  it("constructs a Razorpay provider with valid credentials", () => {
    const provider = createPaymentProvider(
      { kind: "razorpay", razorpay: { keyId: "rzp_test_key", keySecret: "secret" } },
      "development"
    );
    expect(provider).toBeInstanceOf(RazorpayProvider);
    expect(provider.kind).toBe("razorpay");
  });

  it("rejects Razorpay provider without keyId", () => {
    expectConfigError(
      () =>
        createPaymentProvider(
          { kind: "razorpay", razorpay: { keyId: "", keySecret: "secret" } },
          "development"
        ),
      "invalid_configuration"
    );
  });

  it("rejects Razorpay provider without keySecret", () => {
    expectConfigError(
      () =>
        createPaymentProvider(
          { kind: "razorpay", razorpay: { keyId: "rzp_test_key", keySecret: "" } },
          "development"
        ),
      "invalid_configuration"
    );
  });

  it("rejects Razorpay provider with missing razorpay config", () => {
    expectConfigError(
      () => createPaymentProvider({ kind: "razorpay" }, "development"),
      "invalid_configuration"
    );
  });

  it("rejects an unknown provider kind", () => {
    expectConfigError(
      () => createPaymentProvider({ kind: "stripe" } as never, "development"),
      "invalid_configuration"
    );
  });

  it("reads no Razorpay credentials from the environment (K)", () => {
    expect(FACTORY_SOURCE).not.toMatch(/process\.env|RAZORPAY_(KEY|WEBHOOK)/i);
  });

  it("accepts only an explicit kind, never credentials", () => {
    expect(TypeSourceHasCredentials()).toBe(false);
  });
});

function TypeSourceHasCredentials(): boolean {
  const source = readFileSync(new URL("./types.ts", import.meta.url), "utf8");
  return /apikey|api_key|secret|token|webhook/i.test(source);
}