import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";

export function Support() {
  return (
    <PageIntro
      eyebrow="SUPPORT"
      title="We will help you get started."
      lede="Before release, email is the fastest way to reach the team."
    >
      <div className="card-grid">
        <Card>
          <CardHeader>
            <CardTitle>Launch list</CardTitle>
            <CardDescription>Get notified when downloads and accounts open.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button render={<a href="mailto:support@soravo.app" />}>Email the team</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Documentation</CardTitle>
            <CardDescription>Setup, privacy, and troubleshooting guides arrive with the desktop release.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button disabled>Coming soon</Button>
          </CardFooter>
        </Card>
      </div>
    </PageIntro>
  );
}