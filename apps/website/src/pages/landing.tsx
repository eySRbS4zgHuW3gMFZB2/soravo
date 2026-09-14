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
        <p className="lede">
          Fast, accurate speech-to-text that runs on your computer, keeps audio and transcripts private, and
          feels instantaneous.
        </p>
        <div className="actions">
          <Link className="button" to="/download">
            Download for desktop <span aria-hidden="true">→</span>
          </Link>
          <Link className="text-link" to="/features">
            See what it does
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
          <p>Recognition runs on your device. No audio upload, no transcript sync, no training your work on cloud models.</p>
        </article>
        <article>
          <span className="number">02</span>
          <h2>Feels instantaneous</h2>
          <p>A continuously warmed audio pipeline and a configurable shortcut cut the gap between thought and first word.</p>
        </article>
        <article>
          <span className="number">03</span>
          <h2>Delivers finished words</h2>
          <p>Only stable, final text is injected into the active application — never a flickering partial transcript.</p>
        </article>
      </section>
      <section className="privacy" aria-labelledby="focus-title">
        <p className="eyebrow">FOCUSED, BY DESIGN</p>
        <h2 id="focus-title">One job, done properly.</h2>
        <p>Soravo is professional desktop dictation — nothing broader.</p>
        <ul className="scope-list">
          <li>Not a meeting intelligence platform.</li>
          <li>Not a cloud transcription SaaS.</li>
          <li>Not a chat assistant or RAG companion.</li>
          <li>Not a team collaboration suite.</li>
        </ul>
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
          <p>We are evaluating a low monthly subscription and a one-time lifetime option. Prices will be published when the payment flow is live — nothing is billed before then.</p>
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
          <summary>How does Soravo choose its speech engine?</summary>
          <p>By benchmark. Candidate engines are compared on latency, quality, memory, packaging, license, and platform support before one is selected — not by convenience.</p>
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