import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { PageIntro } from "../components/page-intro";
import { useAuth } from "../lib/auth-context";
import { DISPLAY_NAME_MAX } from "../lib/auth-service";

export function Account() {
  const { user, loading, profile, updateDisplayName, updatePassword, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [displayNameMessage, setDisplayNameMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [submittingName, setSubmittingName] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  if (loading) {
    return (
      <PageIntro
        eyebrow="ACCOUNT"
        title="Your account dashboard."
        lede="Loading your account…"
      />
    );
  }

  if (!user) {
    return (
      <PageIntro
        eyebrow="ACCOUNT"
        title="Sign in to view your account."
        lede="Your account dashboard shows your email, display name, and password settings."
      >
        <div className="page-actions">
          <Link className="button small" to="/login">
            Go to sign in
          </Link>
        </div>
      </PageIntro>
    );
  }

  async function handleUpdateDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDisplayNameError(null);
    setDisplayNameMessage(null);
    setSubmittingName(true);
    try {
      const result = await updateDisplayName(displayName);
      if (result.error) {
        setDisplayNameError(result.error);
      } else {
        setDisplayNameMessage("Display name updated.");
      }
    } finally {
      setSubmittingName(false);
    }
  }

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    setSubmittingPassword(true);
    try {
      const result = await updatePassword({ password });
      if (result.error) {
        setPasswordError(result.error);
      } else {
        setPassword("");
        setPasswordMessage("Password updated. Use it next time you sign in.");
      }
    } finally {
      setSubmittingPassword(false);
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  const currentName = profile?.display_name ?? "";

  return (
    <PageIntro
      eyebrow="ACCOUNT"
      title="Your account dashboard."
      lede="Subscription and licensing status arrive in a later milestone. Dictation history never appears here — it stays on your device (01_PRD.md §10)."
    >
      <dl className="account-summary">
        <div>
          <dt>Signed in as</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Account state</dt>
          <dd>
            {profile ? "Profile ready" : "Profile pending"}
          </dd>
        </div>
      </dl>

      <h2 className="form-heading">Display name</h2>
      <form className="auth-form" onSubmit={handleUpdateDisplayName}>
        <p className="field">
          <label htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            type="text"
            autoComplete="name"
            maxLength={DISPLAY_NAME_MAX}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={currentName || "e.g. Alex"}
          />
        </p>
        {displayNameError ? <p className="form-error" role="alert">{displayNameError}</p> : null}
        {displayNameMessage ? <p className="form-success" role="status">{displayNameMessage}</p> : null}
        <div className="page-actions">
          <Button type="submit" disabled={submittingName}>
            {submittingName ? "Saving…" : "Save display name"}
          </Button>
        </div>
      </form>

      <h2 className="form-heading">Password</h2>
      <form className="auth-form" onSubmit={handleUpdatePassword}>
        <p className="field">
          <label htmlFor="new-password">New password (8+ characters)</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </p>
        {passwordError ? <p className="form-error" role="alert">{passwordError}</p> : null}
        {passwordMessage ? <p className="form-success" role="status">{passwordMessage}</p> : null}
        <div className="page-actions">
          <Button type="submit" disabled={submittingPassword}>
            {submittingPassword ? "Updating…" : "Change password"}
          </Button>
        </div>
      </form>

      <form className="auth-form" onSubmit={(event) => { event.preventDefault(); handleSignOut(); }}>
        <div className="page-actions">
          <Button type="submit" variant="outline">Sign out</Button>
        </div>
      </form>
    </PageIntro>
  );
}