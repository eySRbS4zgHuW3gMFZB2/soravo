import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../components/ui/card";
import { useAuth } from "../lib/auth-context";
import { createCheckoutOrder, type CheckoutResponse, type CheckoutError } from "../lib/payment-service";
import { trackEvent } from "../lib/analytics";

type RazorpayCheckoutOptions = {
  key: string;
  amount?: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
  handler?: (response: unknown) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayCheckoutWindow = Window & {
  Razorpay?: { open: (options: RazorpayCheckoutOptions) => void };
};

function razorpayCheckout(): { open: (options: RazorpayCheckoutOptions) => void } | undefined {
  return (window as unknown as RazorpayCheckoutWindow).Razorpay;
}

// T14 F-03: load Razorpay checkout.js on demand. The SDK was previously read
// off `window` with no loader, so `rzp.open()` could never run in a real
// browser and the button wedged on "Processing...". This keeps the same UI
// and only adds the missing script load plus an explicit failure path.
const RAZORPAY_SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";

function ensureRazorpaySDK(): Promise<boolean> {
  if (razorpayCheckout()) return Promise.resolve(true);
  if (typeof document === "undefined") return Promise.resolve(false);
  const existing = document.querySelector(`script[src="${RAZORPAY_SDK_URL}"]`);
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      // If the script already finished loading, `load` already fired.
      if (razorpayCheckout()) resolve(true);
    });
  }
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SDK_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

// T14 F-04: displayed prices are the INR catalog rows actually charged
// (packages/payment-domain/src/catalog.ts: INR 9900 minor = ₹99 monthly,
// INR 41500 minor = ₹415 lifetime), not the USD literals previously shown
// while checkout requested INR. Both rows are `evaluated_target` — the page
// disclaimer below still states these are not a final offer.
const PLAN_CURRENCIES: Record<string, string> = {
  Monthly: "INR",
  "One-time": "INR",
};

const plans = [
  {
    kicker: "EVALUATED TARGET",
    title: "Monthly",
    price: "₹99",
    interval: "per month",
    terms: "Billed monthly in INR. Cancel anytime. Includes the full desktop app on macOS and Windows.",
    features: [
      "All V1 features while subscribed",
      "Updates for the duration of the subscription",
      "Signed, checksummed downloads",
    ],
  },
  {
    kicker: "EVALUATED TARGET",
    title: "One-time",
    price: "₹415",
    interval: "once",
    terms: "Pay once in INR and keep the desktop app on your device.",
    features: [
      "Same desktop app, no expiration",
      "Local-first guarantees unchanged",
      "Priced for long-term productivity use",
    ],
  },
] as const;

function CheckoutSuccess() {
  return (
    <div role="status" className="form-success">
      <p>Thank you! Your entitlement is being processed.</p>
    </div>
  );
}

export function Pricing() {
  const { client, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleCheckout(plan: string) {
    if (!client) {
      navigate("/login");
      return;
    }

    if (!user) {
      navigate("/login");
      return;
    }

    const planIndex = plans.findIndex((p) => p.title === plan);
    if (planIndex === -1) return;

    const productId = planIndex === 0 ? "soravo_monthly" : "soravo_lifetime";
    const currency = PLAN_CURRENCIES[plan] || "INR";

    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await createCheckoutOrder(client, { productId, currency });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!result.data) {
      setError({ code: "unknown", message: "Payment checkout failed" });
      setLoading(false);
      return;
    }

    const checkout: CheckoutResponse = result.data;

    // The SDK may still be absent (offline CDN, blocked script). Surface an
    // error and release the button instead of wedging on "Processing...".
    const sdkReady = await ensureRazorpaySDK();
    if (!sdkReady) {
      setError({ code: "unknown", message: "Payment window could not be loaded. Check your connection and try again." });
      setLoading(false);
      return;
    }

    if ("orderId" in checkout) {
      const rzp = razorpayCheckout();
      if (rzp) {
        rzp.open({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: "Soravo",
        description: "Lifetime License",
        order_id: checkout.orderId,
        handler: function (_response: unknown) {
          setSuccess(true);
          setLoading(false);
        },
          modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      });
      } else {
        setError({ code: "unknown", message: "Payment window could not be loaded. Check your connection and try again." });
        setLoading(false);
      }
    } else if ("subscriptionId" in checkout) {
      const rzp = razorpayCheckout();
      if (rzp) {
        rzp.open({
        key: checkout.keyId,
        subscription_id: checkout.subscriptionId,
        currency: checkout.currency,
        name: "Soravo",
        description: "Monthly Subscription",
        handler: function (_response: unknown) {
          setSuccess(true);
          setLoading(false);
        },
          modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      });
      } else {
        setError({ code: "unknown", message: "Payment window could not be loaded. Check your connection and try again." });
        setLoading(false);
      }
    }
  }

  return (
    <PageIntro
      eyebrow="PRICING"
      title="Transparent pricing. No data trade."
      lede="Soravo is sold as software, not as access to your words. For every option, dictation stays local."
    >
      {success && (
        <div className="page-actions">
          <Button render={<Link to="/account" />} nativeButton={false}>
            View your account
          </Button>
        </div>
      )}

      <div className="card-grid">
        {plans.map((plan) => (
          <Card key={plan.title}>
            <CardHeader>
              <span className="plan-kicker">{plan.kicker}</span>
              <h2 className="text-base leading-snug font-medium">
                {plan.title}
              </h2>
            </CardHeader>
            <CardContent>
              <p className="plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.interval}</span>
              </p>
              <p className="plan-terms">{plan.terms}</p>
              <ul className="plan-list">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button
                disabled={loading || !!success}
                onClick={() => handleCheckout(plan.title)}
              >
                {loading ? "Processing..." : success ? "Purchase complete" : "Purchase"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {success && <CheckoutSuccess />}
      {error && (
        <div role="alert" className="form-error">
          <p>{error.message}</p>
        </div>
      )}

      <p className="plan-disclaimer">
        The prices above are evaluated targets from early planning, not an offer. Final prices, billing, and
        terms will be published when the payment flow is live — nothing is billed today.
      </p>
      <div className="page-actions">
        <Button render={<Link to="/support" />} nativeButton={false} onClick={() => trackEvent("signup cta", { source: "pricing" })}>
          Join the launch list
        </Button>
        <Link className="text-link" to="/refund">
          Refund &amp; cancellation policy
        </Link>
      </div>
    </PageIntro>
  );
}
