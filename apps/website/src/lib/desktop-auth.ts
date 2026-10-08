// Desktop connect helpers (R1-GAP-021).
//
// Pure contract shared by the `/desktop/connect` page: parsing the desktop's
// PKCE handshake parameters and building the deep-link callback URL. The
// authorization `code` travels in the query (single-use, 5-minute, consumed
// on first exchange); session tokens NEVER appear in any URL here.

export type ConnectParams = {
  codeChallenge: string;
  state: string;
};

export type ConnectParamsResult = { params: ConnectParams; error: null } | { params: null; error: string };

const INVALID_MESSAGE = "This desktop sign-in link is invalid or expired. Start sign-in again from the desktop app.";

export function parseDesktopConnectParams(search: string): ConnectParamsResult {
  const query = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const codeChallenge = query.get("code_challenge") ?? "";
  const state = query.get("state") ?? "";
  if (codeChallenge.length < 43 || codeChallenge.length > 128) {
    return { params: null, error: INVALID_MESSAGE };
  }
  if (state.length < 1 || state.length > 256) {
    return { params: null, error: INVALID_MESSAGE };
  }
  return { params: { codeChallenge, state }, error: null };
}

/// Build the deep-link callback URL carrying ONLY the single-use code.
/// Tokens must never be embedded here — see module docs.
export function buildDesktopCallbackUrl(code: string, state: string): string {
  const params = new URLSearchParams({ code, state });
  return `soravo://auth/callback?${params.toString()}`;
}

/// Mint endpoint for the website's own Supabase project configuration.
export function desktopMintUrl(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/desktop-auth-mint`;
}
