import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthProvider } from "../lib/auth-context";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import { DesktopConnect } from "./desktop-connect";
import type { AppSupabaseClient } from "../lib/supabase";

function renderConnect(client: ReturnType<typeof createMockSupabaseClient>, entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider client={client as unknown as AppSupabaseClient}>
        <Routes>
          <Route path="/desktop/connect" element={<DesktopConnect />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("desktop connect page", () => {
  it("rejects an invalid handshake without contacting any backend", async () => {
    const client = createMockSupabaseClient();
    renderConnect(client, "/desktop/connect?code_challenge=short&state=s");
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("asks signed-out users to sign in first", async () => {
    const client = createMockSupabaseClient();
    renderConnect(client, "/desktop/connect?code_challenge=" + "c".repeat(64) + "&state=s");
    expect(await screen.findByText(/sign in first/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /go to sign in/i })).toBeTruthy();
  });
});
