import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";

export function Admin() {
  return (
    <PageIntro
      eyebrow="ADMINISTRATION"
      title="Owner dashboard."
      lede="Owner-only metrics for users, entitlements, and devices are served from server-side role checks. This page is not linked from site navigation and returns content only for authorized accounts once the account system is live."
    >
      <Button disabled aria-disabled="true">Not available</Button>
    </PageIntro>
  );
}