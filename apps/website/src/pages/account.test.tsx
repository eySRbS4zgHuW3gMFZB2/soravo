import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthProvider } from "../lib/auth-context";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import { Account } from "./account";
import { Login } from "./login";
import type { AppSupabaseClient } from "../lib/supabase";

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

function renderAccount(client: ReturnType<typeof createMockSupabaseClient>) {
  return render(
    <MemoryRouter initialEntries={["/account"]}>
      <AuthProvider client={client as unknown as AppSupabaseClient}>
        <Routes>
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("account page", () => {
  it("guards private content behind a session", async () => {
    renderAccount(createMockSupabaseClient());
    expect(await screen.findByText(/sign in to view your account/i)).toBeTruthy();
    expect(screen.queryByText(/signed in as/i)).toBeNull();
  });

  it("shows the signed-in email and profile state", async () => {
    renderAccount(
      createMockSupabaseClient({
        session: mockSession(),
        existingProfile: {
          id: "user-1",
          display_name: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      }),
    );
    expect(await screen.findByText(/signed in as/i)).toBeTruthy();
    expect(screen.getByText("alice@soravo.app")).toBeTruthy();
    expect(await screen.findByText(/profile ready/i)).toBeTruthy();
  });

  it("updates the display name and confirms", async () => {
    renderAccount(
      createMockSupabaseClient({
        session: mockSession(),
        existingProfile: {
          id: "user-1",
          display_name: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      }),
    );
    await screen.findByText(/signed in as/i);
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Alice" } });
    fireEvent.click(screen.getByRole("button", { name: /save display name/i }));
    expect(await screen.findByText(/display name updated/i)).toBeTruthy();
    expect(screen.getByText("Display name updated.")).toBeTruthy();
  });

  it("changes the password and clears the field", async () => {
    renderAccount(
      createMockSupabaseClient({
        session: mockSession(),
        existingProfile: {
          id: "user-1",
          display_name: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      }),
    );
    await screen.findByText(/signed in as/i);
    const passwordInput = screen.getByLabelText(/new password/i) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "new-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    expect(await screen.findByText(/password updated/i)).toBeTruthy();
    expect(passwordInput.value).toBe("");
  });

  it("signs out back to the sign-in prompt", async () => {
    renderAccount(
      createMockSupabaseClient({
        session: mockSession(),
        signOutEmits: true,
        existingProfile: {
          id: "user-1",
          display_name: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      }),
    );
    await screen.findByText(/signed in as/i);
    fireEvent.click(screen.getByRole("button", { name: /^sign out$/i }));
    expect(await screen.findByText(/sign in to view your account/i)).toBeTruthy();
  });

  it("uses local scope for the current-session sign out", async () => {
    const client = createMockSupabaseClient({
      session: mockSession(),
      existingProfile: {
        id: "user-1",
        display_name: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    });
    renderAccount(client);
    await screen.findByText(/signed in as/i);
    const button = screen.getByRole("button", { name: /^sign out$/i });
    fireEvent.click(button);
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("signs out other sessions without clearing the current session", async () => {
    const client = createMockSupabaseClient({
      session: mockSession(),
      existingProfile: {
        id: "user-1",
        display_name: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    });
    renderAccount(client);
    await screen.findByText(/signed in as/i);
    fireEvent.click(screen.getByRole("button", { name: /sign out other sessions/i }));
    expect(await screen.findByText(/signed out of all other sessions/i)).toBeTruthy();
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "others" });
    expect(screen.getByText(/signed in as/i)).toBeTruthy();
  });

  it("prompts for a verification code when the server requires reauthentication", async () => {
    const client = createMockSupabaseClient({
      session: mockSession(),
      updateUserError: { message: "Reauthentication needed", code: "reauthentication_needed" },
      existingProfile: {
        id: "user-1",
        display_name: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    });
    renderAccount(client);
    await screen.findByText(/signed in as/i);
    const passwordInput = screen.getByLabelText(/new password/i) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "new-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    expect(await screen.findByLabelText(/verification code/i)).toBeTruthy();
    expect(client.auth.reauthenticate).toHaveBeenCalledTimes(1);
  });

  it("confirms a verified password change with the code", async () => {
    const client = createMockSupabaseClient({
      session: mockSession(),
      existingProfile: {
        id: "user-1",
        display_name: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    });
    client.auth.updateUser.mockResolvedValueOnce({
      error: { message: "Reauthentication needed", code: "reauthentication_needed" },
    });
    renderAccount(client);
    await screen.findByText(/signed in as/i);
    const passwordInput = screen.getByLabelText(/new password/i) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "new-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    const codeInput = await screen.findByLabelText(/verification code/i);
    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify and update password/i }));
    expect(await screen.findByText(/password updated/i)).toBeTruthy();
    expect(client.auth.updateUser).toHaveBeenCalledWith({
      password: "new-password-123",
      nonce: "123456",
    });
  });

  it("shows the empty state when no license records exist", async () => {
    renderAccount(createMockSupabaseClient({ session: mockSession() }));
    expect(await screen.findByText(/no license records to show yet/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /subscription and licensing/i })).toBeTruthy();
  });

  it("renders the active entitlement with plan, status, and dates", async () => {
    renderAccount(
      createMockSupabaseClient({
        session: mockSession(),
        entitlements: [
          {
            product: "Soravo Membership",
            plan: "Lifetime",
            status: "Active",
            starts_at: "2026-01-01T00:00:00Z",
            expires_at: null,
            updated_at: "2026-01-02T00:00:00Z",
          },
        ],
      }),
    );
    expect(await screen.findByText("Soravo Membership")).toBeTruthy();
    expect(screen.getByText("Lifetime")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText(/lifetime — no renewal/i)).toBeTruthy();
  });

  it("shows the empty state when no devices are recorded", async () => {
    renderAccount(createMockSupabaseClient({ session: mockSession() }));
    expect(await screen.findByText(/no devices recorded yet/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /devices/i })).toBeTruthy();
  });

  it("lists each signed-in device with platform and version", async () => {
    renderAccount(
      createMockSupabaseClient({
        session: mockSession(),
        devices: [
          {
            device_public_id: "device-public-1",
            platform: "macOS",
            app_version: "1.4.2",
            first_seen_at: "2026-01-01T00:00:00Z",
            last_seen_at: "2026-01-03T00:00:00Z",
            revoked_at: null,
          },
        ],
      }),
    );
    expect(await screen.findByText("device-public-1")).toBeTruthy();
    expect(screen.getAllByText("macOS").length).toBe(2);
    expect(screen.getByText("1.4.2")).toBeTruthy();
    expect(screen.getByText("First seen:")).toBeTruthy();
    expect(screen.getByText("2026-01-01")).toBeTruthy();
    expect(screen.getByText("Last seen:")).toBeTruthy();
    expect(screen.getByText("2026-01-03")).toBeTruthy();
  });

  it("shows the empty state when no sessions are recorded", async () => {
    renderAccount(createMockSupabaseClient({ session: mockSession() }));
    expect(await screen.findByText(/no active sessions to show/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /active sessions/i })).toBeTruthy();
  });

  it("lists active sessions with the linked device details", async () => {
    renderAccount(
      createMockSupabaseClient({
        session: mockSession(),
        sessions: [
          {
            session_public_id: "session-public-1",
            created_at: "2026-01-01T00:00:00Z",
            last_seen_at: "2026-01-03T00:00:00Z",
            revoked_at: null,
            devices: { device_public_id: "device-public-1", platform: "macOS", app_version: "1.4.2" },
          },
        ],
      }),
    );
    expect(await screen.findByText("macOS · 1.4.2")).toBeTruthy();
    expect(screen.getByText(/started 2026-01-01/i)).toBeTruthy();
    expect(screen.getByText(/last active 2026-01-03/i)).toBeTruthy();
    expect(screen.getByText("session-public-1")).toBeTruthy();
  });

  it("shows a generic error banner with a retry action when data fails to load", async () => {
    renderAccount(
      createMockSupabaseClient({
        session: mockSession(),
        entitlementsError: { message: "permission denied" },
      }),
    );
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/we couldn't load your account data/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
  });

  it("recovers after retrying once data becomes available", async () => {
    const client = createMockSupabaseClient({
      session: mockSession(),
      entitlementsError: { message: "transient failure" },
    });
    renderAccount(client);
    expect(await screen.findByRole("alert")).toBeTruthy();
    client.__update({
      entitlementsError: null,
      entitlements: [
        {
          product: "Soravo Membership",
          plan: "Lifetime",
          status: "Active",
          starts_at: "2026-01-01T00:00:00Z",
          expires_at: null,
          updated_at: "2026-01-02T00:00:00Z",
        },
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Soravo Membership")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps downloads staged with no release artifacts available", async () => {
    renderAccount(createMockSupabaseClient({ session: mockSession() }));
    expect((await screen.findAllByText("No build yet")).length).toBe(2);
    expect(screen.getAllByText(/not yet available/i).length).toBe(2);
    expect(screen.getByRole("heading", { name: /downloads/i })).toBeTruthy();
  });

  it("links to downloads, support, privacy, and terms from the account page", async () => {
    renderAccount(createMockSupabaseClient({ session: mockSession() }));
    expect(await screen.findByRole("heading", { name: /help and resources/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /downloads/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /support centre/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /terms of service/i })).toBeTruthy();
  });
});