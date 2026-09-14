import { Link } from "react-router";
import { PageIntro } from "../components/page-intro";

export function Terms() {
  return (
    <PageIntro
      eyebrow="TERMS"
      title="Terms of service."
      lede="These terms are being prepared and will be published when the payment flow is live. Nothing below is a binding offer, and nothing is billed today."
    >
      <p>Soravo is in active development. Final terms of service will cover the license grant, acceptable use, the subscription and lifetime model, disclaimers, and limits of liability.</p>
      <p>Until the payment flow exists, the public website and any evaluation builds are provided as-is, without warranty, for evaluation. The pricing discussed on this site is an evaluated target, not an offer.</p>
      <div className="page-actions">
        <Link className="text-link" to="/support">
          Questions about terms? Contact support
        </Link>
      </div>
    </PageIntro>
  );
}