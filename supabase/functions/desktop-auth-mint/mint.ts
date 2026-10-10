// Desktop-auth mint logic — runtime-agnostic pure module.
//
// The website calls this after its own Supabase login (ADR-011): the caller's
// user JWT is already verified by the platform gate (`verify_jwt = true`,
// declared in `supabase/config.toml`) AND re-confirmed here against the
// authoritative Auth API (`GET /auth/v1/user`), exactly like payment-checkout.
// The confirmed user id is the only identity used; the client never supplies
// user_id, email, tokens, or expiry.
//
// The minted code is single-use, 5-minute, and bound to the desktop's PKCE
// S256 challenge + CSRF state. Only its SHA-256 is persisted.

export type MintRequest = {
  code_challenge: string;
  state: string;
};

export type MintGrant = {
  code: string;
  codeHash: string;
  userId: string;
  codeChallenge: string;
  state: string;
  expiresIn: number;
};

export const MINT_TTL_SECS = 300;

export class MintError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function validateMintBody(body: unknown): MintRequest {
  if (typeof body !== "object" || body === null) {
    throw new MintError(400, "malformed request");
  }
  const { code_challenge: challenge, state } = body as Record<string, unknown>;
  if (typeof challenge !== "string" || challenge.length < 43 || challenge.length > 128) {
    throw new MintError(400, "malformed request");
  }
  if (typeof state !== "string" || state.length < 1 || state.length > 256) {
    throw new MintError(400, "malformed request");
  }
  return { code_challenge: challenge, state };
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/// Mint a fresh authorization code. `randomHex`/`sha256Hex` are Web-Crypto
/// backed in production (`index.ts`) and deterministic fakes in tests.
export async function mintCode(
  userId: string,
  req: MintRequest,
  deps: {
    randomBytes: (n: number) => Uint8Array;
    sha256Hex: (text: string) => Promise<string>;
  },
): Promise<MintGrant> {
  if (!userId) throw new MintError(401, "unauthorized");
  const raw = deps.randomBytes(32);
  const code = [...raw].map((b) => b.toString(16).padStart(2, "0")).join("");
  const codeHash = await deps.sha256Hex(code);
  return {
    code,
    codeHash,
    userId,
    codeChallenge: req.code_challenge,
    state: req.state,
    expiresIn: MINT_TTL_SECS,
  };
}

export async function webSha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return toHex(digest);
}
