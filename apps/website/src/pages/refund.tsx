import { PageIntro } from "../components/page-intro";

export function Refund() {
  return (
    <PageIntro
      eyebrow="REFUND & CANCELLATION"
      title="Refund and cancellation policy."
      lede="This policy will be finalized together with the payment flow. We will aim for a clear, fair policy and publish it here before any charges are taken."
    >
      <p>Planned points: a defined refund window for paid plans, self-service cancellation, and behavior of a license after cancellation or expiry.</p>
      <p>Nothing is billed today, so no refund or cancellation flow exists yet.</p>
    </PageIntro>
  );
}