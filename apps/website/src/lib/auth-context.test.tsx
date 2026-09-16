import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth-context";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import type { AppSupabaseClient } from "./supabase";

function Probe() {
  const { user, loading, profile } = useAuth();
  if (loading) return <p role="status">loading</p>;
  return (
    <p role="status">
      session:{user ? user.email : "anon"} · profile:{profile ? profile.display_name ?? "unnamed" : "none"}
    </p>
  );
}

function renderProbe(client?: AppSupabaseClient | null) {
  return render(
    <AuthProvider client={client}>
      <Probe />
    </AuthProvider>,
  );
}

function mockSession() {
  return {
    user: {
      id: "user-1",
      aud: "authenticated",
      role: "authenticated",
      email: "alice@soravo.app",
      email_confirmed_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

afterEach(cleanup);

describe("auth context", () => {
  it("throws when used without a provider", () => {
    function Misuse() {
      useAuth();
      return null;
    }
    expect(() => render(<Misuse />)).toThrow(/within an AuthProvider/i);
  });

  it("is inert and not loading when no Supabase client is available", async () => {
    renderProbe(null);
    expect(await screen.findByText(/session:anon · profile:none/)).toBeTruthy();
  });

  it("resolves a signed-out session", async () => {
    renderProbe(createMockSupabaseClient() as unknown as AppSupabaseClient);
    expect(await screen.findByText(/session:anon · profile:none/)).toBeTruthy();
  });

  it("resolves a signed-in session with its profile", async () => {
    const mock = createMockSupabaseClient({
      session: {
        user: {
          id: "user-1",
          aud: "authenticated",
          role: "authenticated",
          email: "alice@soravo.app",
          email_confirmed_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      existingProfile: {
        id: "user-1",
        display_name: "Alice",
        role: "user",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    });
    renderProbe(mock as unknown as AppSupabaseClient);
    expect(await screen.findByText(/session:alice@soravo.app · profile:Alice/)).toBeTruthy();
  });

  it("forwards a non-default sign-out scope to the service", async () => {
    const mock = createMockSupabaseClient({ session: mockSession() });
    let scopeSeen: string | undefined;
    function Actor() {
      const { signOut } = useAuth();
      return (
        <button
          onClick={async () => {
            await signOut({ scope: "others" });
            scopeSeen = (mock.auth.signOut.mock.calls[0]?.[0] as { scope?: string })?.scope;
          }}
        >
          act
        </button>
      );
    }
    render(
      <AuthProvider client={mock as unknown as AppSupabaseClient}>
        <Actor />
      </AuthProvider>,
    );
    await act(async () => {
      screen.getByRole("button", { name: /act/i }).click();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
    expect(scopeSeen).toBe("others");
  });

  it("surfaces reauthRequired from updatePassword", async () => {
    const mock = createMockSupabaseClient({
      session: mockSession(),
      updateUserError: { message: "Reauthentication needed", code: "reauthentication_needed" },
    });
    let outcome: { error: string | null; reauthRequired?: boolean } | null = null;
    function Actor() {
      const { updatePassword } = useAuth();
      return (
        <button
          onClick={async () => {
            outcome = await updatePassword({ password: "x".repeat(12) });
          }}
        >
          act
        </button>
      );
    }
    render(
      <AuthProvider client={mock as unknown as AppSupabaseClient}>
        <Actor />
      </AuthProvider>,
    );
    await act(async () => {
      screen.getByRole("button", { name: /act/i }).click();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
    expect(outcome).toEqual({ error: null, reauthRequired: true });
  });
});