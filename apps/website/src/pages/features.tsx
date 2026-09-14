import { Link } from "react-router";
import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const capabilities = [
  {
    title: "Configurable global hotkey",
    description:
      "Hold-to-talk and toggle-to-talk with a transactional shortcut recorder — if a new binding fails to register, the previous one stays active.",
  },
  {
    title: "Low-latency capture",
    description:
      "An always-warmed audio pipeline with pre-roll means the first phoneme is never lost because the microphone started late.",
  },
  {
    title: "Local recognition",
    description:
      "Speech-to-text runs on your device. The engine and model are chosen by benchmark — latency, quality, memory, license, packaging, and platform support.",
  },
  {
    title: "Stable, final text only",
    description:
      "Tentative text is shown in the pill but never typed. Committed text is injected once — no duplicates, no unstable retyping.",
  },
  {
    title: "Safe text insertion",
    description:
      "Native insertion first, clipboard fallback when needed, and your clipboard contents are restored afterwards.",
  },
  {
    title: "Verified model installs",
    description:
      "Models are downloaded, size- and checksum-verified, installed atomically, and the previous working model is preserved if anything fails.",
  },
] as const;

const personas = [
  { role: "LAWYERS", title: "Briefs, notes, and correspondence", copy: "Professional prose that leaves drafts clean and confidential." },
  { role: "EXECUTIVES & FOUNDERS", title: "Fast, private correspondence", copy: "Compose quickly without sending board minutes or strategy to a cloud model." },
  { role: "CONSULTANTS", title: "Client-ready drafting", copy: "Capture thinking on the move and deliver polished, finished text." },
  { role: "WRITERS", title: "Keep the voice on the page", copy: "Dictate first drafts in your own words, keep every transcript on the device." },
] as const;

export function Features() {
  return (
    <PageIntro
      eyebrow="FEATURES"
      title="Built for professionals."
      lede="Soravo is focused: local processing, privacy, low latency, and stable text where you type it."
    >
      <h2>What Soravo does</h2>
      <div className="card-grid">
        {capabilities.map((capability) => (
          <Card key={capability.title}>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                {capability.title}
              </CardTitle>
              <CardDescription>{capability.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <h2>Made for demanding desks</h2>
      <div className="persona-grid">
        {personas.map((persona) => (
          <div className="persona" key={persona.role}>
            <strong>{persona.role}</strong>
            <h2>{persona.title}</h2>
            <p>{persona.copy}</p>
          </div>
        ))}
      </div>
      <div className="page-actions">
        <Button render={<Link to="/download" />}>Get Soravo</Button>
        <Link className="text-link" to="/faq">
          Read the FAQ
        </Link>
      </div>
    </PageIntro>
  );
}
