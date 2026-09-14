import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "../components/ui/card";
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
            <h2 className="text-base leading-snug font-medium">
              Email support
            </h2>
            <CardDescription>Reach the team directly at support@soravo.app.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button render={<a href="mailto:support@soravo.app" />} nativeButton={false}>Email the team</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-base leading-snug font-medium">
              What to include
            </h2>
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
            <h2 className="text-base leading-snug font-medium">
              Launch list
            </h2>
            <CardDescription>Get notified when downloads and accounts open.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button render={<a href="mailto:support@soravo.app" />} nativeButton={false} onClick={() => trackEvent("signup cta", { source: "support" })}>
              Join the list
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-base leading-snug font-medium">
              Documentation
            </h2>
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
