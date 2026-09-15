import { afterEach, describe, expect, it } from "vitest";
import { cleanup, act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthProvider } from "../lib/auth-context";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import { Login } from "./login";
import { Account } from "./account";
import type { AppSupabaseClient } from "../lib/supabase";

function renderLogin(client: ReturnType<typeof createMockSupabaseClient>) {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider client={client as unknown as AppSupabaseClient}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function fillEmail(value: string) {
  fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value } });
}

function fillPassword(value: string) {
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value } });
}

afterEach(cleanup);

describe("login page", () => {
  it("renders the sign-in form with a single h1", async () => {
    renderLogin(createMockSupabaseClient());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
  });

  it("shows a generic sign-in error and never the raw upstream message", async () => {
    renderLogin(createMockSupabaseClient({ signInError: { message: "Invalid login credentials" } }));
    fillEmail("alice@soravo.app");
    fillPassword("wrong-password");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't sign you in/i);
    expect(screen.queryByText(/invalid login credentials/i)).toBeNull();
  });

  it("calls signIn and navigates to account on success", async () => {
    const client = createMockSupabaseClient({ signInEmits: true });
    renderLogin(client);
    fillEmail("alice@soravo.app");
    fillPassword("correct-password");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(client.auth.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@soravo.app" }),
    );
  });

  it("confirms sign-up without auto-signing-in and without leaking registration state", async () => {
    renderLogin(createMockSupabaseClient());
    fireEvent.click(screen.getByRole("button", { name: /create an account/i }));
    fillEmail("alice@soravo.app");
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect((await screen.findByRole("status")).textContent).toMatch(/check your inbox to confirm your email/i);
    expect(screen.queryByText("alice@soravo.app")).toBeNull();
  });

  it("always shows the neutral password-reset waiting state", async () => {
    renderLogin(createMockSupabaseClient());
    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
    fillEmail("nobody@soravo.app");
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    expect((await screen.findByRole("status")).textContent).toMatch(/password reset link is on its way/i);
  });
});