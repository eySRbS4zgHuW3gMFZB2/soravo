import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";

export function Account() {
  return (
    <PageIntro
      eyebrow="DASHBOARD"
      title="Your account dashboard."
      lede="Subscription and license status, devices, and sessions will be listed here once the account system is live. Your dictation history never appears here — it stays on your device."
    >
      <Button disabled>Dashboard — coming soon</Button>
    </PageIntro>
  );
}