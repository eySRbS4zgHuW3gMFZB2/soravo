import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { PageIntro } from "../components/page-intro";
import { useAuth } from "../lib/auth-context";

export function ResetPassword() {
  const { user, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const result = await updatePassword({ password });
      if (result.error) {
        setError(result.error);
      } else {
        setPassword("");
        setMessage("Your password has been updated. You can now sign in.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <PageIntro
        eyebrow="ACCOUNT"
        title="Reset link required."
        lede="This page sets a new password when you arrive from a password-reset email. Request a fresh link if yours has expired."
      >
        <div className="page-actions">
          <Link className="button small" to="/login">
            Back to sign in
          </Link>
        </div>
      </PageIntro>
    );
  }

  return (
    <PageIntro
      eyebrow="ACCOUNT"
      title="Choose a new password."
      lede="Enter a new password for your account. It must be at least 8 characters."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
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
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-success" role="status">{message}</p> : null}
        <div className="page-actions">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </PageIntro>
  );
}