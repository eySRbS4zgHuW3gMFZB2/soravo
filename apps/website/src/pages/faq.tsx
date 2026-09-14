import { Link } from "react-router";
import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";

const faqs = [
  {
    question: "Does Soravo send my speech to the cloud?",
    answer:
      "No. V1 is designed for local speech recognition. Network communication is limited to explicit functions such as accounts, entitlements, updates, and model downloads.",
  },
  {
    question: "Which platforms will be supported?",
    answer: "V1 targets macOS and Windows. Linux support has not been announced.",
  },
  {
    question: "How does Soravo choose its speech engine?",
    answer:
      "By benchmark. Candidate engines are compared on latency, quality, memory, packaging, license, and platform support before one is selected — not by convenience.",
  },
  {
    question: "Can I use my own shortcut?",
    answer:
      "Yes. The desktop application will support configurable hold-to-talk and toggle-to-talk shortcuts with a transactional shortcut recorder.",
  },
  {
    question: "Will text be typed automatically into other apps?",
    answer:
      "Final text is inserted at your cursor in the active application. Tentative text is shown in the pill but never typed. If your clipboard is used as a fallback, it is restored afterwards.",
  },
  {
    question: "What data does Soravo use over the network?",
    answer:
      "Only what is needed for explicit functions: signing in, entitlements, downloads and updates, model download, and support. Microphone audio, dictated text, keystrokes, and clipboard contents never leave your device.",
  },
  {
    question: "Do I need an account to dictate?",
    answer:
      "Local dictation is designed to work without uploading audio or transcripts. Accounts support downloads, entitlements, and device management.",
  },
  {
    question: "How is my dictation history stored?",
    answer:
      "History is local-only by default in V1 and stays on your device. There is no cloud synchronization of dictated text.",
  },
  {
    question: "How much will Soravo cost?",
    answer:
      "A low monthly subscription and a one-time lifetime option are under evaluation as targets. Final prices and terms will be announced when the payment flow is live; nothing is billed before then.",
  },
  {
    question: "How will downloads be verified?",
    answer:
      "Artifacts are code-signed and published with SHA-256 checksums. Verify the checksum against the release page before installing.",
  },
] as const;

export function Faq() {
  return (
    <PageIntro eyebrow="FAQ" title="Good questions.">
      <div>
        {faqs.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
      <div className="page-actions">
        <Button render={<Link to="/support" />}>Still have questions?</Button>
        <Link className="text-link" to="/privacy">
          Read the privacy commitment
        </Link>
      </div>
    </PageIntro>
  );
}