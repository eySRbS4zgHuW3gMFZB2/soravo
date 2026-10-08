import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "../components/ui/button";
import { PageIntro } from "../components/page-intro";
import { useAuth } from "../lib/auth-context";
import { getSupabaseConfig } from "../lib/supabase";
import {
  buildDesktopCallbackUrl,
  desktopMintUrl,
  parseDesktopConnectParams,
} from "../lib/desktop-auth";

type Phase = "checking" | "needs-login" | "minting" | "opening" | "error";

const GENERIC_MINT_MESSAGE = "We couldn't connect your desktop app. Start sign-in again from the desktop app.";

/**
 * Website step of desktop sign-in (R1-GAP-021).
 *
 * The desktop opens this page in the SYSTEM browser with its PKCE challenge
 * and CSRF state. After the existing website login, the page mints a
 * single-use authorization code (bound to the challenge) and hands ONLY that
 * code back via the `soravo://auth/callback` deep link. Session tokens never
 * appear in any URL; the desktop exchanges code + verifier server-side.
 */
export function DesktopConnect() {
  const { client, user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!client) {
      setError("Account sign-in is not configured on this deployment.");
      setPhase("error");
      return;
    }
    const parsed = parseDesktopConnectParams(searchParams.toString());
    if (!parsed.params) {
      setError(parsed.error);
      setPhase("error");
      return;
    }
    if (!user) {
      setPhase("needs-login");
      return;
    }
    let cancelled = false;
    async function mint() {
      setPhase("minting");
      try {
        const { data } = await client!.auth.getSession();
        const accessToken = data.session?.access_token;
        const config = getSupabaseConfig();
        if (!accessToken || !config) throw new Error("unconfigured");
        const res = await fetch(desktopMintUrl(config.url), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: config.anonKey,
          },
          body: JSON.stringify({
            code_challenge: parsed.params!.codeChallenge,
            state: parsed.params!.state,
          }),
        });
        if (!res.ok) throw new Error(`mint failed: ${res.status}`);
        const { code } = (await res.json()) as { code?: string };
        if (!code) throw new Error("no code issued");
        if (cancelled) return;
        setPhase("opening");
        window.location.href = buildDesktopCallbackUrl(code, parsed.params!.state);
      } catch {
        if (!cancelled) {
          setError(GENERIC_MINT_MESSAGE);
          setPhase("error");
        }
      }
    }
    mint();
    return () => {
      cancelled = true;
    };
  }, [client, user, loading, searchParams]);

  return (
    <div>
      <PageIntro
        eyebrow="Desktop sign-in"
        title="Connect your desktop app"
        lede="Finish signing in here, then return to the desktop app. Dictation on your device works with or without an account."
      />
      {phase === "needs-login" && (
        <div>
          <p role="status">Sign in first, then start sign-in again from the desktop app.</p>
          <Link to="/login">Go to sign in</Link>
        </div>
      )}
      {phase === "minting" && <p role="status">Connecting your desktop app…</p>}
      {phase === "opening" && (
        <p role="status">Opening the desktop app… If nothing happens, return to it manually.</p>
      )}
      {phase === "error" && (
        <div>
          <p role="alert">{error ?? GENERIC_MINT_MESSAGE}</p>
          <Button type="button" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
