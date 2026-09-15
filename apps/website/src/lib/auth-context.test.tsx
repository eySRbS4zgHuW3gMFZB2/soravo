import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    });
    renderProbe(mock as unknown as AppSupabaseClient);
    expect(await screen.findByText(/session:alice@soravo.app · profile:Alice/)).toBeTruthy();
  });
});