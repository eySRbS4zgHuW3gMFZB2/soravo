import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { trackEvent } from "../lib/analytics";

const included = [
  "Your operating system and version",
  "The Soravo build or version, if you have one",
  "What you were doing, and what you expected to happen",
  "The exact steps to reproduce the problem",
] as const;

export function Support() {
  return (
    <PageIntro
      eyebrow="SUPPORT"
      title="We will help you get started."
      lede="Email is the fastest way to reach the team. We aim to reply within two business days."
    >
      <div className="card-grid">
        <Card>
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>
              Email support
            </CardTitle>
            <CardDescription>Reach the team directly at support@soravo.app.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button render={<a href="mailto:support@soravo.app" />}>Email the team</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>
              What to include
            </CardTitle>
            <CardDescription>These details help us reproduce and fix issues faster.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="plan-list">
              {included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>
              Launch list
            </CardTitle>
            <CardDescription>Get notified when downloads and accounts open.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button render={<a href="mailto:support@soravo.app" />} onClick={() => trackEvent("signup cta", { source: "support" })}>
              Join the list
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>
              Documentation
            </CardTitle>
            <CardDescription>Setup, privacy, and troubleshooting guides arrive with the desktop release.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button disabled>Coming soon</Button>
          </CardFooter>
        </Card>
      </div>
      <p className="verification-note">
        You never need to send audio or dictated transcripts to get help — those stay on your device.
      </p>
    </PageIntro>
  );
}