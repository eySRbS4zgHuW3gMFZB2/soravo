// R1-GAP-021 — regression suite for the desktop-auth mint/exchange flow.
//
// Runs under plain Vitest/Node: the pure logic modules are imported
// directly; `index.ts` files are asserted structurally (they import Deno and
// a remote ESM URL, so they cannot be executed here).
//
// Scope: no network calls, no live Supabase project, no secrets. All crypto
// uses Web Crypto (available in Node 20+ and Deno); randomness is injected.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MINT_TTL_SECS,
  MintError,
  mintCode,
  validateMintBody,
  webSha256Hex,
} from "../functions/desktop-auth-mint/mint.ts";
import {
  authorizeExchange,
  ExchangeError,
  extractTokenHash,
  GENERIC_CODE_ERROR,
  validateExchangeBody,
  verifyPkce,
  webSha256Bytes,
  webSha256Hex as exchangeSha256Hex,
} from "../functions/desktop-auth-exchange/exchange.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = join(repoRoot, "supabase", "migrations");

async function sha256Bytes(data) {
  return crypto.subtle.digest("SHA-256", data);
}

function rfc7636ChallengeB64(verifier) {
  return verifyPkceChallengeForTest(verifier);
}

async function verifyPkceChallengeForTest(verifier) {
  const digest = await sha256Bytes(new TextEncoder().encode(verifier));
  const bin = String.fromCharCode(...new Uint8Array(digest));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("mint validation", () => {
  it("accepts a well-formed challenge + state", () => {
    const req = validateMintBody({ code_challenge: "c".repeat(43), state: "s" });
    expect(req.code_challenge).toHaveLength(43);
  });

  it("rejects short/long challenges and empty state", () => {
    expect(() => validateMintBody({ code_challenge: "short", state: "s" })).toThrowError(
      MintError,
    );
    expect(() => validateMintBody({ code_challenge: "c".repeat(129), state: "s" })).toThrowError(
      MintError,
    );
    expect(() => validateMintBody({ code_challenge: "c".repeat(43), state: "" })).toThrowError(
      MintError,
    );
    expect(() => validateMintBody(null)).toThrowError(MintError);
  });

  it("mint binds user + challenge and hashes the code", async () => {
    const grant = await mintCode(
      "user-1",
      { code_challenge: "c".repeat(43), state: "st" },
      {
        randomBytes: (n) => new Uint8Array(n).fill(7),
        sha256Hex: webSha256Hex,
      },
    );
    expect(grant.code).toMatch(/^[0-9a-f]{64}$/);
    expect(grant.codeHash).toBe(await webSha256Hex(grant.code));
    expect(grant.codeHash).not.toBe(grant.code);
    expect(grant.userId).toBe("user-1");
    expect(grant.expiresIn).toBe(MINT_TTL_SECS);
  });

  it("mint refuses an empty user id", async () => {
    await expect(
      mintCode("", { code_challenge: "c".repeat(43), state: "s" }, {
        randomBytes: (n) => new Uint8Array(n),
        sha256Hex: webSha256Hex,
      }),
    ).rejects.toThrowError(MintError);
  });
});

describe("pkce verification", () => {
  it("matches the RFC 7636 vector", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    expect(await verifyPkce(verifier, challenge, sha256Bytes)).toBe(true);
    expect(await verifyPkce("tampered", challenge, sha256Bytes)).toBe(false);
    expect(await verifyPkce("", challenge, sha256Bytes)).toBe(false);
  });

  it("round-trips a generated challenge", async () => {
    const verifier = "v".repeat(64);
    const challenge = await rfc7636ChallengeB64(verifier);
    expect(await verifyPkce(verifier, challenge, sha256Bytes)).toBe(true);
  });
});

describe("exchange validation", () => {
  it("accepts well-formed code + verifier", () => {
    const req = validateExchangeBody({ code: "c".repeat(64), code_verifier: "v".repeat(64) });
    expect(req.code).toHaveLength(64);
  });

  it("rejects short/empty material with the generic error", () => {
    for (const body of [
      { code: "short", code_verifier: "v".repeat(64) },
      { code: "c".repeat(64), code_verifier: "short" },
      {},
      null,
    ]) {
      try {
        validateExchangeBody(body);
        expect.unreachable();
      } catch (e) {
        expect(e.message).toBe(GENERIC_CODE_ERROR);
      }
    }
  });
});

describe("exchange authorization", () => {
  it("authorizes on PKCE match and consumes once", async () => {
    const verifier = "v".repeat(64);
    const challenge = await rfc7636ChallengeB64(verifier);
    const seen = new Set();
    const deps = {
      sha256Hex: async () => "hash",
      sha256Bytes,
      readUnexpiredUnconsumed: async () => ({
        user_id: "user-9",
        code_challenge: challenge,
        state: "s",
      }),
      consume: async (h) => {
        if (seen.has(h)) return false;
        seen.add(h);
        return true;
      },
    };
    const first = await authorizeExchange({ code: "c".repeat(64), code_verifier: verifier }, deps);
    expect(first.userId).toBe("user-9");
    // Second exchange of the same code fails (single-use).
    await expect(
      authorizeExchange({ code: "c".repeat(64), code_verifier: verifier }, deps),
    ).rejects.toThrowError(GENERIC_CODE_ERROR);
  });

  it("rejects PKCE mismatch with the generic error", async () => {
    await expect(
      authorizeExchange(
        { code: "c".repeat(64), code_verifier: "v".repeat(64) },
        {
          sha256Hex: async () => "hash",
          sha256Bytes,
          readUnexpiredUnconsumed: async () => ({
            user_id: "user-9",
            code_challenge: "wrong-challenge",
            state: "s",
          }),
          consume: async () => true,
        },
      ),
    ).rejects.toThrowError(GENERIC_CODE_ERROR);
  });

  it("rejects missing rows and failed consumes generically", async () => {
    const verifier = "v".repeat(64);
    const challenge = await rfc7636ChallengeB64(verifier);
    const deps = (row, consumeSucceeds) => ({
      sha256Hex: async () => "hash",
      sha256Bytes,
      readUnexpiredUnconsumed: async () =>
        row ? { user_id: "u", code_challenge: challenge, state: "s" } : null,
      consume: async () => consumeSucceeds,
    });
    await expect(
      authorizeExchange({ code: "c".repeat(64), code_verifier: verifier }, deps(false, true)),
    ).rejects.toThrowError(GENERIC_CODE_ERROR);
    await expect(
      authorizeExchange({ code: "c".repeat(64), code_verifier: verifier }, deps(true, false)),
    ).rejects.toThrowError(GENERIC_CODE_ERROR);
  });
});

describe("token-hash extraction", () => {
  it("extracts token from a generateLink action link", () => {
    expect(
      extractTokenHash("https://proj.supabase.co/auth/v1/verify?token=abc123&type=magiclink"),
    ).toBe("abc123");
  });

  it("returns null for malformed links", () => {
    expect(extractTokenHash("not a url")).toBeNull();
    expect(extractTokenHash("https://x.example/?type=magiclink")).toBeNull();
  });
});

describe("migration + wiring structure", () => {
  const migration = readFileSync(
    join(migrationsDir, "20260928090000_desktop_auth_codes.sql"),
    "utf8",
  );
  const stripped = migration
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

  it("creates the codes table with RLS and least privilege", () => {
    expect(stripped).toMatch(/create table public\.desktop_auth_codes/);
    expect(stripped).toMatch(/enable row level security/);
    // No client grants: only the service role (Edge Functions) touches rows.
    expect(stripped).not.toMatch(/to authenticated/);
    expect(stripped).not.toMatch(/to anon/);
    expect(stripped).toMatch(/to service_role/);
    // No DELETE grant or policy: rows are never client-deleted.
    expect(stripped).not.toMatch(/grant[^;]*delete/);
    expect(stripped).not.toMatch(/for delete/);
    // Single-use + expiry guardrails are schema-enforced.
    expect(stripped).toMatch(/code_hash/);
    expect(stripped).toMatch(/consumed_at/);
    expect(stripped).toMatch(/expires_at/);
  });

  it("declares verify_jwt per function in config.toml", () => {
    const config = readFileSync(join(repoRoot, "supabase", "config.toml"), "utf8");
    expect(config).toMatch(/\[functions\.desktop-auth-mint\][\s\S]*?verify_jwt = true/);
    expect(config).toMatch(/\[functions\.desktop-auth-exchange\][\s\S]*?verify_jwt = false/);
  });

  it("index files keep secrets out of logs and fail closed", () => {
    for (const fn of ["desktop-auth-mint", "desktop-auth-exchange"]) {
      const src = readFileSync(
        join(repoRoot, "supabase", "functions", fn, "index.ts"),
        "utf8",
      );
      expect(src).not.toMatch(/console\.log/);
      expect(src).toMatch(/503/);
      expect(src).not.toMatch(/SERVICE_ROLE_KEY.{0,40}["'][A-Za-z0-9]/);
    }
  });
});
