import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../components/ui/card";
import { useAuth } from "../lib/auth-context";
import { createCheckoutOrder, type CheckoutResponse, type CheckoutError } from "../lib/payment-service";
import { trackEvent } from "../lib/analytics";

const PLAN_CURRENCIES: Record<string, string> = {
  Monthly: "INR",
  "One-time": "INR",
};

const plans = [
  {
    kicker: "EVALUATED TARGET",
    title: "Monthly",
    price: "\u2248 $12",
    interval: "per month",
    terms: "Billed monthly. Cancel anytime. Includes the full desktop app on macOS and Windows.",
    features: [
      "All V1 features while subscribed",
      "Updates for the duration of the subscription",
      "Signed, checksummed downloads",
    ],
  },
  {
    kicker: "EVALUATED TARGET",
    title: "One-time",
    price: "\u2248 $50",
    interval: "once",
    terms: "Pay once and keep the desktop app on your device.",
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

    if ("orderId" in checkout) {
      const rzp = (window as any).Razorpay;
      if (rzp) {
        rzp.open({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: "Soravo",
        description: "Lifetime License",
        order_id: checkout.orderId,
        handler: function (_: any) {
          setSuccess(true);
          setLoading(false);
        },
          modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      });
      }
    } else if ("subscriptionId" in checkout) {
      const rzp = (window as any).Razorpay;
      if (rzp) {
        rzp.open({
        key: checkout.keyId,
        subscription_id: checkout.subscriptionId,
        currency: checkout.currency,
        name: "Soravo",
        description: "Monthly Subscription",
        handler: function (_: any) {
          setSuccess(true);
          setLoading(false);
        },
          modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      });
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
