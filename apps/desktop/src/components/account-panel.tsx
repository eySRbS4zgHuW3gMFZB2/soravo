import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import {
  getAccountSnapshot,
  accountBeginSignIn,
  accountRefreshSession,
  accountSignOut,
  onAuthChanged,
  type AccountSnapshot,
} from "../ipc";

type AccountState = "idle" | "loading" | "ready" | "offline" | "error";

export function AccountPanel() {
  const [state, setState] = useState<AccountState>("idle");
  const [data, setData] = useState<AccountSnapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAccount();
    // R1-GAP-021: the browser PKCE flow completes asynchronously via the
    // `soravo://auth/callback` deep link; reload when Rust emits the change.
    let unlisten: (() => void) | undefined;
    onAuthChanged(() => {
      loadAccount();
    }).then((stop) => {
      unlisten = stop;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  async function loadAccount() {
    setState("loading");
    try {
      const snapshot = await getAccountSnapshot();
      setData(snapshot);
      if (snapshot.is_offline) {
        setState("offline");
      } else if (snapshot.state === "SignedIn") {
        setState("ready");
      } else if (snapshot.state === "NeedsRefresh") {
        setState("ready");
        setMessage("Session needs refresh");
      } else {
        setState("idle");
      }
    } catch {
      setState("error");
      setMessage("Failed to load account");
    }
  }

  async function handleSignIn() {
    setMessage(null);
    try {
      // Opens the system browser on the website login; completion arrives
      // via the deep-link event above.
      const result = await accountBeginSignIn();
      setMessage(result.message);
    } catch {
      setMessage("Sign in failed");
    }
  }

  async function handleRefresh() {
    setMessage(null);
    try {
      const result = await accountRefreshSession();
      if (result.success) {
        await loadAccount();
      } else {
        setMessage(result.message);
      }
    } catch {
      setMessage("Session refresh failed");
    }
  }

  async function handleSignOut() {
    setMessage(null);
    try {
      const result = await accountSignOut();
      if (result.success) {
        await loadAccount();
      } else {
        setMessage(result.message);
      }
    } catch {
      setMessage("Sign out failed");
    }
  }

  if (state === "loading" || state === "idle") {
    return (
      <Card>
        <CardHeader>
          <p className="eyebrow">ACCOUNT</p>
          <h2>Sign in to your account</h2>
        </CardHeader>
        <CardContent>
          <p>Account access enables entitlements and sync across devices.</p>
          {message && <p className="text-muted-foreground">{message}</p>}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSignIn}>Sign in</Button>
        </CardFooter>
      </Card>
    );
  }

  if (state === "offline") {
    return (
      <Card>
        <CardHeader>
          <p className="eyebrow">ACCOUNT</p>
          <h2>Offline</h2>
        </CardHeader>
        <CardContent>
          <p>Unable to reach the server. Dictation remains available locally.</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={loadAccount}>Retry</Button>
        </CardFooter>
      </Card>
    );
  }

  if (state === "error") {
    return (
      <Card>
        <CardHeader>
          <p className="eyebrow">ACCOUNT</p>
          <h2>Error</h2>
        </CardHeader>
        <CardContent>
          <p>{message ?? "Unknown error"}</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={loadAccount}>Retry</Button>
        </CardFooter>
      </Card>
    );
  }

  if (state === "ready" && data) {
    return (
      <Card>
        <CardHeader>
          <p className="eyebrow">ACCOUNT</p>
          <h2>{data.user_id ?? "Account"}</h2>
          {message && <p className="text-muted-foreground">{message}</p>}
        </CardHeader>
        <CardContent>
          <div>
            <p><strong>Entitlement:</strong> {data.entitlement_active ? "Active" : "Inactive"}</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={handleRefresh}>Refresh session</Button>
          <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}
