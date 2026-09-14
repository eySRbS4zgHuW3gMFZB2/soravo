import { Link } from "react-router";
import { PageIntro } from "../components/page-intro";

const commitments = [
  {
    title: "Stays on your device",
    body: "Microphone audio, dictated transcripts, keystrokes, clipboard contents used for text insertion, and local dictation history never leave your computer.",
  },
  {
    title: "No hidden telemetry",
    body: "The desktop app does not record keystrokes, does not log raw audio or transcripts, and never silently collects clipboard data. There is no hidden tracking.",
  },
  {
    title: "Explicit account and server functions",
    body: "The only functions that reach a server are accounts and authentication, payments and entitlements, model downloads, software updates, and support. Account-related storage covers account, entitlement, device, and session metadata — never audio, transcripts, or dictation history.",
  },
  {
    title: "Website analytics boundary",
    body: "Website analytics, when present, are limited to page views and product-page interactions provided through Umami, and they stay separate from product and account data. They never receive dictated content, clipboard contents, or keystrokes.",
  },
  {
    title: "Local history default",
    body: "Your dictation history is stored on the device. There is no cloud transcript synchronization in V1.",
  },
] as const;

export function Privacy() {
  return (
    <>
      <PageIntro
        eyebrow="PRIVACY"
        title="Your words are not our product."
        lede="Soravo is built local-first. These commitments apply from V1 unless a published scope change says otherwise."
      />
      <section className="page">
        <div className="commit-list">
          {commitments.map((item) => (
            <div key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
        <div className="page-actions">
          <Link className="text-link" to="/support">
            Questions about privacy? Contact support
          </Link>
        </div>
      </section>
    </>
  );
}