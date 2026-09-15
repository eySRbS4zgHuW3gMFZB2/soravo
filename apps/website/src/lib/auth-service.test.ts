import { describe, expect, it } from "vitest";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import {
  DISPLAY_NAME_MAX,
  ensureProfile,
  getProfile,
  requestPasswordReset,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updateDisplayName,
  updatePassword,
} from "./auth-service";
import type { AppSupabaseClient } from "./supabase";

function asClient(mock: ReturnType<typeof createMockSupabaseClient>): AppSupabaseClient {
  return mock as unknown as AppSupabaseClient;
}

describe("auth service sign-in", () => {
  it("surfaces a generic message when sign-in fails", async () => {
    const mock = createMockSupabaseClient({ signInError: { message: "Invalid login credentials" } });
    const result = await signInWithEmail(asClient(mock), {
      email: "alice@soravo.app",
      password: "wrong-password",
    });
    expect(result.error).toMatch(/couldn't sign you in/i);
    expect(result.error).not.toMatch(/invalid login credentials/i);
  });

  it("reports success without error", async () => {
    const mock = createMockSupabaseClient();
    const result = await signInWithEmail(asClient(mock), {
      email: "alice@soravo.app",
      password: "correct-password",
    });
    expect(result.error).toBeNull();
  });
});

describe("auth service sign-up", () => {
  it("does not leak 'already registered' details", async () => {
    const mock = createMockSupabaseClient({ signUpError: { message: "User already registered" } });
    const result = await signUpWithEmail(asClient(mock), {
      email: "alice@soravo.app",
      password: "password123",
    });
    expect(result.error).toMatch(/couldn't create your account/i);
    expect(result.error).not.toMatch(/already registered/i);
  });

  it("reports success without error", async () => {
    const mock = createMockSupabaseClient();
    const result = await signUpWithEmail(asClient(mock), {
      email: "alice@soravo.app",
      password: "password123",
    });
    expect(result.error).toBeNull();
  });
});

describe("auth service password reset", () => {
  it("returns a neutral message even when the backend errors (anti-enumeration)", async () => {
    const mock = createMockSupabaseClient({ resetEmailError: { message: "User not found" } });
    const result = await requestPasswordReset(asClient(mock), {
      email: "nobody@soravo.app",
      redirectTo: "https://soravo.app/reset-password",
    });
    expect(result.error).toMatch(/password reset link is on its way/i);
    expect(result.error).not.toMatch(/not found/i);
  });

  it("reports the neutral waiting state on success", async () => {
    const mock = createMockSupabaseClient();
    const result = await requestPasswordReset(asClient(mock), {
      email: "alice@soravo.app",
      redirectTo: "https://soravo.app/reset-password",
    });
    expect(result.error).toBeNull();
  });
});

describe("auth service password update", () => {
  it("maps failures to a generic message", async () => {
    const mock = createMockSupabaseClient({ updateUserError: { message: "JWT expired" } });
    const result = await updatePassword(asClient(mock), { password: "x".repeat(12) });
    expect(result.error).toMatch(/couldn't update your password/i);
  });

  it("succeeds without error", async () => {
    const mock = createMockSupabaseClient();
    const result = await updatePassword(asClient(mock), { password: "x".repeat(12) });
    expect(result.error).toBeNull();
  });
});

describe("auth service sign-out", () => {
  it("maps failures to a generic message", async () => {
    const mock = createMockSupabaseClient({ signOutError: { message: "connection reset" } });
    const result = await signOut(asClient(mock));
    expect(result.error).toMatch(/couldn't sync your account/i);
  });

  it("succeeds without error", async () => {
    const mock = createMockSupabaseClient();
    const result = await signOut(asClient(mock));
    expect(result.error).toBeNull();
  });
});

describe("auth service profile", () => {
  it("returns an existing profile", async () => {
    const existing = {
      id: "user-1",
      display_name: "Alice",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    const mock = createMockSupabaseClient({ existingProfile: existing });
    const loaded = await getProfile(asClient(mock), "user-1");
    expect(loaded).toEqual(existing);
  });

  it("returns null when the profile row is absent", async () => {
    const mock = createMockSupabaseClient();
    const loaded = await getProfile(asClient(mock), "user-1");
    expect(loaded).toBeNull();
  });

  it("creates the profile on first access when it is missing", async () => {
    const mock = createMockSupabaseClient();
    const user = { id: "user-1" } as Parameters<typeof ensureProfile>[1];
    const loaded = await ensureProfile(asClient(mock), user);
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe("user-1");
  });

  it("reuses an existing profile instead of inserting", async () => {
    const existing = {
      id: "user-1",
      display_name: "Alice",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    const mock = createMockSupabaseClient({ existingProfile: existing });
    const user = { id: "user-1" } as Parameters<typeof ensureProfile>[1];
    const loaded = await ensureProfile(asClient(mock), user);
    expect(loaded).toEqual(existing);
  });

  it("validates display name length before calling the API", async () => {
    const mock = createMockSupabaseClient();
    const result = await updateDisplayName(asClient(mock), {
      userId: "user-1",
      displayName: "x".repeat(DISPLAY_NAME_MAX + 1),
    });
    expect(result.error).toMatch(/limited to 80 characters/i);
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("accepts a display name within the length limit", async () => {
    const mock = createMockSupabaseClient();
    const result = await updateDisplayName(asClient(mock), {
      userId: "user-1",
      displayName: "Alice",
    });
    expect(result.error).toBeNull();
  });
});