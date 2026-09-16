import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "../components/ui/card";
import { PageIntro } from "../components/page-intro";
import { useAuth } from "../lib/auth-context";
import { DISPLAY_NAME_MAX } from "../lib/auth-service";
import {
  loadAccountDashboard,
  type AccountDashboardData,
  type AccountDevice,
  type AccountSession,
  type Entitlement,
} from "../lib/account-service";

type DashboardState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: AccountDashboardData }
  | { status: "error"; message: string; data: AccountDashboardData };

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

const downloads = [
  {
    name: "macOS",
    systems: "Recent macOS releases, Apple silicon and Intel where supported.",
    artifact: "Signed DMG",
  },
  {
    name: "Windows",
    systems: "Windows 10 and 11 (x64).",
    artifact: "Signed installer",
  },
] as const;

const resources = [
  { label: "Downloads", to: "/download" },
  { label: "Support centre", to: "/support" },
  { label: "Privacy policy", to: "/privacy" },
  { label: "Terms of service", to: "/terms" },
] as const;

function EntitlementsSection({ entitlements }: { entitlements: Entitlement[] }) {
  return (
    <>
      <h2 className="form-heading">Subscription and licensing</h2>
      {entitlements.length === 0 ? (
        <p className="form-note" role="status">
          No license records to show yet. Purchase and billing arrive in a later milestone.
        </p>
      ) : (
        <div className="card-grid">
          {entitlements.map((entitlement) => (
            <Card key={entitlement.product}>
              <CardHeader>
                <h3 className="text-base leading-snug font-medium">{entitlement.product}</h3>
                <CardDescription>{entitlement.plan}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="plan-terms">
                  <strong>Status:</strong> {entitlement.status}
                </p>
                <p className="plan-terms">
                  <strong>Starts:</strong> {formatDate(entitlement.starts_at)}
                </p>
                <p className="plan-terms">
                  <strong>{entitlement.expires_at ? "Expires" : "Validity"}:</strong>{" "}
                  {entitlement.expires_at ? formatDate(entitlement.expires_at) : "Lifetime — no renewal"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function DevicesSection({ devices }: { devices: AccountDevice[] }) {
  return (
    <>
      <h2 className="form-heading">Devices</h2>
      {devices.length === 0 ? (
        <p className="form-note" role="status">
          No devices recorded yet. This one appears once the desktop app signs in.
        </p>
      ) : (
        <div className="card-grid">
          {devices.map((device) => (
            <Card key={device.device_public_id}>
              <CardHeader>
                <h3 className="text-base leading-snug font-medium">{device.platform}</h3>
                <CardDescription>{device.app_version}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="plan-terms">
                  <strong>Device ID:</strong> <code className="session-id">{device.device_public_id}</code>
                </p>
                <p className="plan-terms">
                  <strong>First seen:</strong> {formatDate(device.first_seen_at)}
                </p>
                <p className="plan-terms">
                  <strong>Last seen:</strong> {formatDate(device.last_seen_at)}
                </p>
                {device.revoked_at ? (
                  <p className="form-error" role="status">
                    Revoked {formatDate(device.revoked_at)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function SessionsSection({ sessions }: { sessions: AccountSession[] }) {
  return (
    <>
      <h2 className="form-heading">Active sessions</h2>
      {sessions.length === 0 ? (
        <p className="form-note" role="status">
          No active sessions to show.
        </p>
      ) : (
        <ul className="session-list">
          {sessions.map((session) => {
            const deviceName = session.devices
              ? `${session.devices.platform} · ${session.devices.app_version}`
              : "Device not recorded";
            return (
              <li key={session.session_public_id}>
                <strong>{deviceName}</strong>
                <span>Started {formatDate(session.created_at)}</span>
                <span>Last active {formatDate(session.last_seen_at)}</span>
                <span className="session-id">{session.session_public_id}</span>
                {session.revoked_at ? (
                  <span className="form-error" role="status">
                    Revoked {formatDate(session.revoked_at)}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export function Account() {
  const { client, user, loading, profile, updateDisplayName, updatePassword, signOut, requestReauthentication } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [displayNameMessage, setDisplayNameMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [submittingName, setSubmittingName] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [reauthNonce, setReauthNonce] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);
  const [sendingReauth, setSendingReauth] = useState(false);
  const [otherSessionsMessage, setOtherSessionsMessage] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardState>({ status: "idle" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!client || !user) {
      setDashboard({ status: "idle" });
      return;
    }
    let cancelled = false;
    setDashboard({ status: "loading" });
    loadAccountDashboard(client).then((result) => {
      if (cancelled) return;
      setDashboard(
        result.error
          ? { status: "error", message: result.error, data: result.data }
          : { status: "ready", data: result.data },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [client, user, reloadToken]);

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
        lede="Your account dashboard shows your email, display name, devices, sessions, and subscription status."
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
    setNeedsReauth(false);
    setReauthNonce("");
    setSubmittingPassword(true);
    try {
      const result = await updatePassword({ password });
      if (result.error) {
        setPasswordError(result.error);
      } else if (result.reauthRequired) {
        setNeedsReauth(true);
        setSendingReauth(true);
        try {
          const send = await requestReauthentication();
          if (send.error) {
            setPasswordError(send.error);
            setNeedsReauth(false);
          }
        } finally {
          setSendingReauth(false);
        }
      } else {
        setPassword("");
        setPasswordMessage("Password updated. Use it next time you sign in.");
      }
    } finally {
      setSubmittingPassword(false);
    }
  }

  async function handleConfirmReauth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    setSubmittingPassword(true);
    try {
      const result = await updatePassword({ password, nonce: reauthNonce });
      if (result.error) {
        setPasswordError(result.error);
      } else if (result.reauthRequired) {
        setPasswordError("We need a fresh code. Try again.");
        setNeedsReauth(false);
        setReauthNonce("");
      } else {
        setPassword("");
        setReauthNonce("");
        setNeedsReauth(false);
        setPasswordMessage("Password updated. Use it next time you sign in.");
      }
    } finally {
      setSubmittingPassword(false);
    }
  }

  async function handleSignOut() {
    await signOut({ scope: "local" });
  }

  async function handleSignOutOtherSessions() {
    setOtherSessionsMessage(null);
    await signOut({ scope: "others" });
    setOtherSessionsMessage("Signed out of all other sessions.");
  }

  const currentName = profile?.display_name ?? "";
  const showDashboard =
    dashboard.status === "ready" || dashboard.status === "error";

  return (
    <PageIntro
      eyebrow="ACCOUNT"
      title="Your account dashboard."
      lede="Manage your subscription, devices, sessions, and password. Dictation history never appears here — it stays on your device (01_PRD.md §10)."
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

      {dashboard.status === "loading" ? (
        <p className="form-note" role="status">
          Loading your subscription, devices, and sessions…
        </p>
      ) : null}

      {dashboard.status === "error" ? (
        <div role="alert">
          <p className="form-error">{dashboard.message}</p>
          <div className="page-actions">
            <Button type="button" variant="outline" onClick={() => setReloadToken((token) => token + 1)}>
              Try again
            </Button>
          </div>
        </div>
      ) : null}

      {showDashboard ? (
        <>
          <EntitlementsSection entitlements={dashboard.data.entitlements} />
          <DevicesSection devices={dashboard.data.devices} />
          <SessionsSection sessions={dashboard.data.sessions} />
        </>
      ) : null}

      <h2 className="form-heading">Downloads</h2>
      <div className="card-grid">
        {downloads.map((download) => (
          <Card key={download.name}>
            <CardHeader>
              <h3 className="text-base leading-snug font-medium">{download.name}</h3>
              <CardDescription>{download.systems}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="plan-terms">
                <strong>{download.artifact}</strong>{" "}— Not yet available; publishing waits for the release pipeline.
              </p>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button disabled>No build yet</Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <h2 className="form-heading">Help and resources</h2>
      <ul className="link-list">
        {resources.map((resource) => (
          <li key={resource.to}>
            <Link className="text-link" to={resource.to}>
              {resource.label}
            </Link>
          </li>
        ))}
      </ul>

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
      {!needsReauth ? (
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
      ) : (
        <form className="auth-form" onSubmit={handleConfirmReauth}>
          <p className="field-description">
            {sendingReauth
              ? "Sending verification code…"
              : "We sent a verification code to your email. Enter it below to confirm your new password."}
          </p>
          <p className="field">
            <label htmlFor="reauth-nonce">Verification code</label>
            <input
              id="reauth-nonce"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={reauthNonce}
              onChange={(event) => setReauthNonce(event.target.value)}
              required
            />
          </p>
          {passwordError ? <p className="form-error" role="alert">{passwordError}</p> : null}
          {passwordMessage ? <p className="form-success" role="status">{passwordMessage}</p> : null}
          <div className="page-actions">
            <Button type="submit" disabled={submittingPassword || sendingReauth}>
              {submittingPassword ? "Verifying…" : "Verify and update password"}
            </Button>
          </div>
        </form>
      )}

      <h2 className="form-heading">Sign out</h2>
      {otherSessionsMessage ? <p className="form-success" role="status">{otherSessionsMessage}</p> : null}
      <form className="auth-form" onSubmit={(event) => { event.preventDefault(); handleSignOutOtherSessions(); }}>
        <div className="page-actions">
          <Button type="submit" variant="outline">Sign out other sessions</Button>
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