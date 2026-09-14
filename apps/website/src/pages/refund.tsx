import { Link } from "react-router";
import { PageIntro } from "../components/page-intro";

export function Refund() {
  return (
    <PageIntro
      eyebrow="REFUND & CANCELLATION"
      title="Refund and cancellation policy."
      lede="This policy is being prepared and will be published together with the payment flow. Nothing is billed today, and nothing below is an offer."
    >
      <p>Planned points: a defined refund window for paid plans, self-service cancellation, and clear behavior of a license after cancellation or expiry.</p>
      <p>Until the payment flow exists there are no charges, so no refund or cancellation process exists. When subscriptions are available, cancellation should be manageable from the account dashboard.</p>
      <div className="page-actions">
        <Link className="text-link" to="/support">
          Questions about refunds or billing? Contact support
        </Link>
      </div>
    </PageIntro>
  );
}