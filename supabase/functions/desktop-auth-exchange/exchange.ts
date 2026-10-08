// Desktop-auth exchange logic — runtime-agnostic pure module.
//
// The desktop POSTs `{code, code_verifier}` (both high-entropy secrets sent
// over TLS, never in URLs). The exchange:
//   1. looks up the row by SHA-256(code) — the code itself is never stored;
//   2. rejects missing/consumed/expired rows with ONE generic error (no
//      distinction, so callers cannot probe code validity);
//   3. verifies `BASE64URL(SHA256(code_verifier)) == code_challenge` (PKCE);
//   4. atomically consumes the row (consumed_at IS NULL compare-and-swap);
//   5. mints a Supabase session for the bound user via the Admin API
//      (`generateLink` magiclink -> `/verify`), entirely server-side.
//
// The service role never leaves this function family; the desktop holds only
// the publishable anon key plus the session it is issued.

export type ExchangeRequest = {
  code: string;
  code_verifier: string;
};

export type CodeRow = {
  user_id: string;
  code_challenge: string;
  state: string;
};

export type SessionTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: string;
};

export class ExchangeError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/// Generic rejection used for every code-path failure (missing, consumed,
/// expired, PKCE mismatch): callers learn nothing about which check fired.
export const GENERIC_CODE_ERROR = "invalid or expired code";

export function validateExchangeBody(body: unknown): ExchangeRequest {
  if (typeof body !== "object" || body === null) {
    throw new ExchangeError(400, GENERIC_CODE_ERROR);
  }
  const { code, code_verifier: verifier } = body as Record<string, unknown>;
  if (typeof code !== "string" || code.length < 16 || code.length > 256) {
    throw new ExchangeError(400, GENERIC_CODE_ERROR);
  }
  if (typeof verifier !== "string" || verifier.length < 43 || verifier.length > 128) {
    throw new ExchangeError(400, GENERIC_CODE_ERROR);
  }
  return { code, code_verifier: verifier };
}

function base64Url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/// PKCE S256 verification (constant-shape exact match; empty never matches).
export async function verifyPkce(
  verifier: string,
  challenge: string,
  sha256: (data: Uint8Array) => Promise<ArrayBuffer>,
): Promise<boolean> {
  if (!verifier || !challenge) return false;
  const digest = await sha256(new TextEncoder().encode(verifier));
  return base64Url(digest) === challenge;
}

/// Extract the `token` (token_hash) query parameter from a `generateLink`
/// `action_link`. Returns null when the link is not the expected shape.
export function extractTokenHash(actionLink: string): string | null {
  let url: URL;
  try {
    url = new URL(actionLink);
  } catch {
    return null;
  }
  const token = url.searchParams.get("token");
  if (!token) return null;
  return token;
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function webSha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return toHex(digest);
}

export async function webSha256Bytes(data: Uint8Array): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
}

/// Full validation sequence over injected seams (memory store in tests,
/// PostgREST compare-and-swap in production). Returns the bound user id on
/// success; every failure is the generic code error.
export async function authorizeExchange(
  req: ExchangeRequest,
  deps: {
    sha256Hex: (text: string) => Promise<string>;
    sha256Bytes: (data: Uint8Array) => Promise<ArrayBuffer>;
    readUnexpiredUnconsumed: (codeHash: string) => Promise<CodeRow | null>;
    consume: (codeHash: string) => Promise<boolean>;
  },
): Promise<{ userId: string }> {
  const codeHash = await deps.sha256Hex(req.code);
  const row = await deps.readUnexpiredUnconsumed(codeHash);
  if (!row) throw new ExchangeError(400, GENERIC_CODE_ERROR);
  const ok = await verifyPkce(req.code_verifier, row.code_challenge, deps.sha256Bytes);
  if (!ok) throw new ExchangeError(400, GENERIC_CODE_ERROR);
  const consumed = await deps.consume(codeHash);
  if (!consumed) throw new ExchangeError(400, GENERIC_CODE_ERROR);
  return { userId: row.user_id };
}
