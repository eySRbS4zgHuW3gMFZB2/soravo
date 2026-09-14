import { PageIntro } from "../components/page-intro";

export function Terms() {
  return (
    <PageIntro
      eyebrow="TERMS"
      title="Terms of service."
      lede="These terms are being prepared and will be published before the first paid release. Nothing below is a binding offer."
    >
      <p>Soravo is in active development. Final terms of service will cover license grants, acceptable use, the subscription and lifetime model, disclaimers, and liability limits.</p>
      <p>Until then, the public website and any evaluation builds are provided as-is, without warranty, for evaluation.</p>
    </PageIntro>
  );
}