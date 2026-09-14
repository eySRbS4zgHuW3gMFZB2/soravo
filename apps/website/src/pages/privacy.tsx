import { PageIntro } from "../components/page-intro";

const commitments = [
  {
    title: "Stays on your device",
    body: "Microphone audio, dictated text, clipboard contents used for text insertion, and local dictation history do not leave your computer.",
  },
  {
    title: "No hidden telemetry",
    body: "The desktop app does not record keystrokes and does not send transcript or audio analytics.",
  },
  {
    title: "Limited network use",
    body: "Network communication is limited to explicit functions: accounts, entitlements, model downloads, software updates, support, and the website.",
  },
  {
    title: "Website analytics boundary",
    body: "Website analytics cover page views and product-page interactions only — never dictated content, clipboard, or keystrokes.",
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
      </section>
    </>
  );
}