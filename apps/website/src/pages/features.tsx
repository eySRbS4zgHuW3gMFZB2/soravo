import { PageIntro } from "../components/page-intro";
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const features = [
  {
    title: "Private by default",
    description: "Audio and transcription stay on your device. Soravo never uses your dictation for analytics.",
  },
  {
    title: "Built for flow",
    description: "A warmed audio pipeline and a configurable shortcut help your first word arrive with the rest of the thought.",
  },
  {
    title: "Works where you work",
    description: "Stable, final text is inserted into your active application — never a flickering partial transcript.",
  },
  {
    title: "Configurable shortcuts",
    description: "Hold-to-talk and toggle-to-talk, with a transactional shortcut recorder that keeps the previous binding if a change fails.",
  },
  {
    title: "Local history",
    description: "Dictation history lives on the device. There is no cloud transcript synchronization in V1.",
  },
  {
    title: "Benchmarked model choices",
    description: "Engine and model selection is benchmark-driven, so you are not locked into a single vendor path.",
  },
] as const;

export function Features() {
  return (
    <PageIntro
      eyebrow="FEATURES"
      title="Built for professionals."
      lede="Soravo is focused: local processing, privacy, low latency, and stable text where you type it."
    >
      <div className="card-grid">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </PageIntro>
  );
}