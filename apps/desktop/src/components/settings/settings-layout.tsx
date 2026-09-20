import { ReactNode, useState } from "react";
import { GeneralSettings } from "./general-settings";
import { MicrophoneSettings } from "./microphone-settings";
import { ShortcutSettings } from "./shortcut-settings";
import { ModelSettings } from "./model-settings";

type SettingsSection = "overview" | "general" | "microphone" | "shortcut" | "models" | "privacy" | "diagnostics";

const SECTIONS: { key: SettingsSection; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "general", label: "General" },
  { key: "microphone", label: "Microphone" },
  { key: "shortcut", label: "Shortcut" },
  { key: "models", label: "Models" },
  { key: "privacy", label: "Privacy" },
  { key: "diagnostics", label: "Diagnostics" },
];

export function SettingsLayout() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("overview");

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="settings-section">
            <h2>Overview</h2>
            <p>Configure Soravo to work with your devices and preferences.</p>
          </div>
        );
      case "general":
        return <GeneralSettings />;
      case "microphone":
        return <MicrophoneSettings />;
      case "shortcut":
        return <ShortcutSettings />;
      case "models":
        return <ModelSettings />;
      case "privacy":
        return (
          <div className="settings-section">
            <h2>Privacy</h2>
            <p>Privacy settings will be available in a future phase.</p>
          </div>
        );
      case "diagnostics":
        return (
          <div className="settings-section">
            <h2>Diagnostics</h2>
            <p>Diagnostics tools will be available in a future phase.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="shell">
      <aside>
        <div className="logo">
          <span>◉</span> Soravo
        </div>
        <nav aria-label="Settings sections">
          {SECTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={activeSection === key ? "active" : ""}
              onClick={() => setActiveSection(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <small>Local-first dictation</small>
      </aside>
      <section className="content">
        <header>
          <div>
            <p className="eyebrow">SETTINGS</p>
            <h1>Configure your experience.</h1>
          </div>
        </header>
        {renderSection()}
      </section>
    </main>
  );
}
