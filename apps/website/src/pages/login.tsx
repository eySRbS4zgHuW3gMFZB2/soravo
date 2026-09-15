import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { PageIntro } from "../components/page-intro";
import { useAuth } from "../lib/auth-context";

type Mode = "signin" | "signup" | "forgot";

export function Login() {
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
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
      if (mode === "signin") {
        const result = await signIn({ email, password });
        if (result.error) {
          setError(result.error);
        } else {
          navigate("/account");
        }
      } else if (mode === "signup") {
        const result = await signUp({ email, password });
        if (result.error) {
          setError(result.error);
        } else {
          setPassword("");
          setMessage("Check your inbox to confirm your email, then sign in.");
        }
      } else {
        const result = await resetPassword({ email });
        if (result.error) {
          setError(result.error);
        } else {
          setMessage(
            "If that email is registered, a password reset link is on its way.",
          );
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
  }

  const titles: Record<Mode, { eyebrow: string; title: string; lede: string }> = {
    signin: {
      eyebrow: "ACCOUNT",
      title: "Sign in to your account.",
      lede: "Dictation and settings live on your device; the account is only your identity, license, and optional sync metadata.",
    },
    signup: {
      eyebrow: "ACCOUNT",
      title: "Create your account.",
      lede: "A Soravo account identifies you for support, licensing, and future device sync. Your dictation history never leaves your device.",
    },
    forgot: {
      eyebrow: "ACCOUNT",
      title: "Reset your password.",
      lede: "Enter the email on your account and we'll send you a reset link.",
    },
  };

  const current = titles[mode];

  return (
    <PageIntro eyebrow={current.eyebrow} title={current.title} lede={current.lede}>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {mode === "forgot" ? null : (
          <p className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </p>
        )}
        {mode === "forgot" ? (
          <p className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </p>
        ) : (
          <p className="field">
            <label htmlFor="password">
              Password{mode === "signup" ? " (8+ characters)" : ""}
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </p>
        )}

        {mode === "signup" ? (
          <p className="form-note">
            Sign-up requires email confirmation. Nothing is billed today.
          </p>
        ) : null}

        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-success" role="status">{message}</p> : null}

        <div className="page-actions">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </Button>
        </div>
      </form>

      <p className="form-switch">
        {mode === "signin" ? (
          <>
            New to Soravo?{" "}
            <button type="button" className="text-link" onClick={() => switchMode("signup")}>
              Create an account
            </button>{" "}
            ·{" "}
            <button type="button" className="text-link" onClick={() => switchMode("forgot")}>
              Forgot password?
            </button>
          </>
        ) : (
          <button type="button" className="text-link" onClick={() => switchMode("signin")}>
            Back to sign in
          </button>
        )}
      </p>
    </PageIntro>
  );
}