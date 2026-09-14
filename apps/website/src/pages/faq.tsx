import { PageIntro } from "../components/page-intro";

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
    question: "Can I use my own shortcut?",
    answer:
      "Yes. The desktop application will support configurable hold-to-talk and toggle-to-talk shortcuts with a transactional shortcut recorder.",
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
    </PageIntro>
  );
}