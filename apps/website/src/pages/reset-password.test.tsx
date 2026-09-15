import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../lib/auth-context";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import { ResetPassword } from "./reset-password";
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

function renderReset(client: ReturnType<typeof createMockSupabaseClient>) {
  return render(
    <MemoryRouter initialEntries={["/reset-password"]}>
      <AuthProvider client={client as unknown as AppSupabaseClient}>
        <ResetPassword />
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("reset-password page", () => {
  it("requires a reset link when no session is present", async () => {
    renderReset(createMockSupabaseClient());
    expect(await screen.findByText(/reset link required/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /update password/i })).toBeNull();
  });

  it("updates the password when reached through a valid reset link", async () => {
    renderReset(createMockSupabaseClient({ session: mockSession() }));
    await screen.findByText(/choose a new password/i);
    fireEvent.change(await screen.findByLabelText(/new password/i), { target: { value: "new-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
    expect(await screen.findByText(/your password has been updated/i)).toBeTruthy();
  });

  it("shows a generic message when the update fails", async () => {
    renderReset(createMockSupabaseClient({ session: mockSession(), updateUserError: { message: "JWT expired" } }));
    await screen.findByText(/choose a new password/i);
    fireEvent.change(await screen.findByLabelText(/new password/i), { target: { value: "new-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't update your password/i);
    expect(screen.queryByText(/JWT expired/i)).toBeNull();
  });
});