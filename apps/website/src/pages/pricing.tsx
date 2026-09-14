import { PageIntro } from "../components/page-intro";

export function Pricing() {
  return (
    <PageIntro
      eyebrow="PRICING"
      title="A professional tool without a data trade."
      lede="Final pricing is a business decision and will be published when the payment flow is live. We are evaluating a low monthly plan and a one-time lifetime option; no price or availability claim is made before then."
    >
      <div className="price-card page-price-card">
        <p>Early access</p>
        <strong>Coming soon</strong>
        <span>Join the launch list from the support page.</span>
      </div>
    </PageIntro>
  );
}