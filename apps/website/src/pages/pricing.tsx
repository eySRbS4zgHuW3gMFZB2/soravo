import { Link } from "react-router";
import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";

const plans = [
  {
    kicker: "EVALUATED TARGET",
    title: "Monthly",
    price: "≈ $12",
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
    price: "≈ $50",
    interval: "once",
    terms: "Pay once and keep the desktop app on your device.",
    features: [
      "Same desktop app, no expiration",
      "Local-first guarantees unchanged",
      "Priced for long-term productivity use",
    ],
  },
] as const;

export function Pricing() {
  return (
    <PageIntro
      eyebrow="PRICING"
      title="Transparent pricing. No data trade."
      lede="Soravo is sold as software, not as access to your words. For every option, dictation stays local."
    >
      <div className="card-grid">
        {plans.map((plan) => (
          <Card key={plan.title}>
            <CardHeader>
              <span className="plan-kicker">{plan.kicker}</span>
              <CardTitle role="heading" aria-level={2}>
                {plan.title}
              </CardTitle>
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
              <Button disabled>Coming soon</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <p className="plan-disclaimer">
        The prices above are evaluated targets from early planning, not an offer. Final prices, billing, and
        terms will be published when the payment flow is live — nothing is billed today.
      </p>
      <div className="page-actions">
        <Button render={<Link to="/support" />}>Join the launch list</Button>
        <Link className="text-link" to="/refund">
          Refund &amp; cancellation policy
        </Link>
      </div>
    </PageIntro>
  );
}