import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";

export function Download() {
  return (
    <PageIntro
      eyebrow="DOWNLOAD"
      title="Install Soravo on your desktop."
      lede="macOS and Windows are the V1 targets. Signed release artifacts with checksums will appear here once the release pipeline is live."
    >
      <div className="card-grid">
        <Card>
          <CardHeader>
            <CardTitle>macOS</CardTitle>
            <CardDescription>Targets current and recent macOS releases.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button disabled>Coming soon</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Windows</CardTitle>
            <CardDescription>Targets Windows 10 and 11.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button disabled>Coming soon</Button>
          </CardFooter>
        </Card>
      </div>
    </PageIntro>
  );
}