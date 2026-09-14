import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";

export function Login() {
  return (
    <PageIntro
      eyebrow="ACCOUNT"
      title="Sign in arrives with the account foundation."
      lede="Soravo accounts will support email sign-in, secure password reset, devices, sessions, and sign-out. The account system is scheduled after the desktop and website foundations."
    >
      <Button disabled>Sign in — coming soon</Button>
      {" "}
      <a className="text-link" href="mailto:support@soravo.app">Questions? Contact support</a>
    </PageIntro>
  );
}