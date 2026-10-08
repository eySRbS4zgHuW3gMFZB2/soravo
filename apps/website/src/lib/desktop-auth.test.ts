import { describe, expect, it } from "vitest";
import {
  buildDesktopCallbackUrl,
  desktopMintUrl,
  parseDesktopConnectParams,
} from "./desktop-auth";

describe("desktop-auth helpers", () => {
  it("parses a well-formed handshake", () => {
    const challenge = "c".repeat(64);
    const result = parseDesktopConnectParams(`?code_challenge=${challenge}&state=abc`);
    expect(result.error).toBeNull();
    expect(result.params).toEqual({ codeChallenge: challenge, state: "abc" });
  });

  it("rejects short challenges, missing state, and empty input", () => {
    expect(parseDesktopConnectParams("?code_challenge=short&state=s").params).toBeNull();
    expect(parseDesktopConnectParams("?code_challenge=" + "c".repeat(64)).params).toBeNull();
    expect(parseDesktopConnectParams("").params).toBeNull();
    const bad = parseDesktopConnectParams("?code_challenge=x&state=");
    expect(bad.error).toMatch(/invalid or expired/i);
  });

  it("builds a callback carrying only code + state", () => {
    const url = buildDesktopCallbackUrl("code-123", "state-456");
    expect(url).toBe("soravo://auth/callback?code=code-123&state=state-456");
    // Session tokens must never be embedded in the callback URL.
    expect(url).not.toMatch(/access_token|refresh_token/i);
  });

  it("targets the mint function under the project URL", () => {
    expect(desktopMintUrl("https://proj.supabase.co/")).toBe(
      "https://proj.supabase.co/functions/v1/desktop-auth-mint",
    );
  });
});
