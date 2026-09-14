import { Link } from "react-router";

export function Landing() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">LOCAL-FIRST DICTATION</p>
        <h1 id="hero-title">
          Say it once.
          <br />
          <em>Keep it yours.</em>
        </h1>
        <p className="lede">Fast, private speech-to-text for the work that cannot leave your computer.</p>
        <div className="actions">
          <Link className="button" to="/download">
            Download for desktop <span aria-hidden="true">→</span>
          </Link>
          <Link className="text-link" to="/privacy">
            How privacy works
          </Link>
        </div>
        <div className="signal-card" aria-label="Soravo transcription demonstration">
          <div className="signal-head">
            <span className="live-dot" /> Listening locally <span>00:08</span>
          </div>
          <p>
            “Let&rsquo;s make this <strong>clear, concise, and ready</strong> to send.”
          </p>
          <div className="wave" aria-hidden="true">
            ▁▂▄▆█▇▄▂▁▂▄▆▇▄▂▁
          </div>
        </div>
      </section>
      <section id="product" className="feature-grid" aria-label="Product features">
        <article>
          <span className="number">01</span>
          <h2>Private by default</h2>
          <p>Audio and transcription stay on your device. Soravo never uses your dictation for analytics.</p>
        </article>
        <article>
          <span className="number">02</span>
          <h2>Built for flow</h2>
          <p>A warmed audio pipeline and configurable shortcut help your first word arrive with the rest of the thought.</p>
        </article>
        <article>
          <span className="number">03</span>
          <h2>Works where you work</h2>
          <p>Stable, final text is inserted into your active application—never a flickering partial transcript.</p>
        </article>
      </section>
      <section id="privacy" className="privacy">
        <p className="eyebrow">A SMALLER DATA FOOTPRINT</p>
        <h2>Your words are not our product.</h2>
        <p>Soravo performs speech recognition locally. We do not upload microphone audio, dictated text, keystrokes, clipboard contents, or dictation history.</p>
        <Link className="text-link" to="/privacy">
          Read the privacy commitment
        </Link>
      </section>
      <section id="pricing" className="pricing">
        <div>
          <p className="eyebrow">SIMPLE PRICING</p>
          <h2>A professional tool without a data trade.</h2>
          <p>Pricing will be published when the payment flow is live. No price or availability claim is made before then.</p>
        </div>
        <div className="price-card">
          <p>Early access</p>
          <strong>Coming soon</strong>
          <span>Join the launch list from the support page.</span>
        </div>
      </section>
      <section id="faq" className="faq">
        <p className="eyebrow">FAQ</p>
        <h2>Good questions.</h2>
        <details>
          <summary>Does Soravo send my speech to the cloud?</summary>
          <p>No. V1 is designed for local speech recognition. Network communication is limited to explicit functions such as accounts, entitlements, updates, and model downloads.</p>
        </details>
        <details>
          <summary>Which platforms will be supported?</summary>
          <p>V1 targets macOS and Windows. Linux support has not been announced.</p>
        </details>
        <details>
          <summary>Can I use my own shortcut?</summary>
          <p>Yes. The desktop application will support configurable hold-to-talk and toggle-to-talk shortcuts.</p>
        </details>
      </section>
      <section id="download" className="download">
        <h2>Made for the conversations that become work.</h2>
        <p>Desktop downloads will appear here after signed release artifacts are available.</p>
        <button className="button" disabled aria-disabled="true">
          Downloads coming soon
        </button>
      </section>
    </>
  );
}