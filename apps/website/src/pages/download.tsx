import { Link } from "react-router";
import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "../components/ui/card";

const platforms = [
  {
    name: "macOS",
    systems: "Recent macOS releases, Apple silicon and Intel where supported.",
    artifact: "Signed DMG",
    note: "Not yet available \u2014 publishing waits for the release pipeline.",
  },
  {
    name: "Windows",
    systems: "Windows 10 and 11 (x64).",
    artifact: "Signed installer",
    note: "Not yet available \u2014 publishing waits for the release pipeline.",
  },
] as const;

export function Download() {
  return (
    <PageIntro
      eyebrow="DOWNLOAD"
      title="Install Soravo on your desktop."
      lede="Soravo is a desktop application. Downloads are published here after signed release artifacts exist."
    >
      <div className="card-grid">
        {platforms.map((platform) => (
          <Card key={platform.name}>
            <CardHeader>
              <h2 className="text-base leading-snug font-medium">
                {platform.name}
              </h2>
              <CardDescription>{platform.systems}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="plan-terms">
                <strong>{platform.artifact}</strong>{" "}— {platform.note}
              </p>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button disabled>No build yet</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <p className="verification-note">
        Release artifacts are code-signed and published with SHA-256 checksums from the release page. Verify
        the checksum before installing.
      </p>
      <p className="verification-note">Linux is deferred and is not part of the V1 release.</p>
      <div className="page-actions">
        <Button render={<Link to="/support" />} nativeButton={false}>Get notified when downloads open</Button>
        <Link className="text-link" to="/faq">
          Read the FAQ
        </Link>
      </div>
    </PageIntro>
  );
}
