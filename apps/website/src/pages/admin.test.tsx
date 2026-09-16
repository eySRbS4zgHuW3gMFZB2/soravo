import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthProvider } from "../lib/auth-context";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import Admin from "./admin";
import { Login } from "./login";
import type { AppSupabaseClient } from "../lib/supabase";
import type { AdminTotals, GrowthBucket } from "../lib/admin-metrics-service";

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

const adminProfile = {
  id: "user-1",
  display_name: null,
  role: "admin" as const,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const userProfile = {
  id: "user-1",
  display_name: null,
  role: "user" as const,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const totals: AdminTotals = {
  total_users: 128,
  paid_users: 12,
  subscriptions: { active: 6, cancelled: 3, expired: 2, total: 11 },
  lifetime: { active: 3, revoked: 1, total: 4 },
  devices: { total: 44, revoked: 2, by_platform: { macos: 30, windows: 10, linux: 4 } },
  generated_at: "2026-09-16T09:30:00Z",
};

const growth: GrowthBucket[] = [
  { bucket: "2026-08-18T00:00:00Z", new_users: 2 },
  { bucket: "2026-08-19T00:00:00Z", new_users: 5 },
  { bucket: "2026-08-20T00:00:00Z", new_users: 0 },
];

function renderAdmin(client: ReturnType<typeof createMockSupabaseClient>) {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <AuthProvider client={client as unknown as AppSupabaseClient}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<div>account placeholder</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function adminClient() {
  return createMockSupabaseClient({
    session: mockSession(),
    existingProfile: adminProfile,
    adminTotals: totals,
    adminGrowth: growth,
    adminActiveUsers: 17,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

afterEach(cleanup);

describe("admin page", () => {
  it("guards the dashboard behind a session", async () => {
    const client = createMockSupabaseClient();
    renderAdmin(client);
    expect(await screen.findByText(/sign in to view the owner dashboard/i)).toBeTruthy();
    expect(screen.queryByText(/registered users/i)).toBeNull();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("denies access to a signed-in non-admin without calling the admin RPCs", async () => {
    const client = createMockSupabaseClient({ session: mockSession(), existingProfile: userProfile });
    renderAdmin(client);
    expect(await screen.findByText(/owner access required/i)).toBeTruthy();
    expect(screen.getByText(/go to your account/i)).toBeTruthy();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("renders the dashboard for an admin", async () => {
    const client = adminClient();
    renderAdmin(client);
    expect(await screen.findByText("128")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("17")).toBeTruthy();
    expect(screen.getByText("44")).toBeTruthy();
    expect(screen.getByText(/30 macOS · 10 Windows · 4 Linux · 2 revoked/i)).toBeTruthy();
    expect(screen.getByText(/snapshot generated 2026-09-16 09:30:00z/i)).toBeTruthy();
  });

  it("renders the growth chart and distribution breakdowns", async () => {
    const client = adminClient();
    renderAdmin(client);
    expect(await screen.findByText(/new user growth/i)).toBeTruthy();
    expect(screen.getByText(/2026-08-18: 2 new users/i)).toBeTruthy();
    expect(screen.getByText(/2026-08-19: 5 new users/i)).toBeTruthy();
    expect(screen.getByText("55%")).toBeTruthy();
    expect(screen.getByText("27%")).toBeTruthy();
    expect(screen.getByText("18%")).toBeTruthy();
    expect(screen.getByText("75%")).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
  });

  it("renders an accessible, labelled chart", async () => {
    const client = adminClient();
    renderAdmin(client);
    const chart = await screen.findByRole("img", { name: /new registered users per day/i });
    expect(chart).toBeTruthy();
    const dayButton = screen.getByRole("button", { name: /per day/i });
    expect(dayButton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /per week/i }).getAttribute("aria-pressed")).toBe("false");
  });

  it("refetches with the selected granularity", async () => {
    const client = adminClient();
    renderAdmin(client);
    await screen.findByText("128");
    fireEvent.click(screen.getByRole("button", { name: /per month/i }));
    await waitFor(() => {
      const growthCalls = client.rpc.mock.calls.filter(([name]) => name === "admin_metrics_growth");
      expect(growthCalls.at(-1)?.[1]).toMatchObject({ p_bucket: "month" });
    });
  });

  it("shows a loading state while owner metrics are pending", async () => {
    const client = adminClient();
    const totalsGate = deferred<{ data: AdminTotals | null; error: null }>();
    const growthGate = deferred<{ data: GrowthBucket[]; error: null }>();
    const activeGate = deferred<{ data: number; error: null }>();
    client.rpc = vi.fn((fn: string) => {
      if (fn === "admin_metrics_totals") return totalsGate.promise;
      if (fn === "admin_metrics_growth") return growthGate.promise;
      return activeGate.promise;
    });
    renderAdmin(client);
    expect(await screen.findByText(/loading owner metrics/i)).toBeTruthy();
    totalsGate.resolve({ data: totals, error: null });
    growthGate.resolve({ data: growth, error: null });
    activeGate.resolve({ data: 17, error: null });
    expect(await screen.findByText(/overview/i)).toBeTruthy();
    expect(screen.getByText("128")).toBeTruthy();
  });

  it("surfaces ONE generic error and supports retry", async () => {
    const client = createMockSupabaseClient({
      session: mockSession(),
      existingProfile: adminProfile,
      adminTotalsError: { message: "CLOUD-007: admin access required" },
      adminGrowth: growth,
      adminActiveUsers: 17,
    });
    renderAdmin(client);
    const alert = await screen.findByRole("alert");
    expect(alert).toBeTruthy();
    expect(screen.getByText(/we couldn't load owner metrics/i)).toBeTruthy();
    expect(screen.queryByText(/cloud-007/i)).toBeNull();
    client.__update({ adminTotals: totals, adminTotalsError: null });
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("128")).toBeTruthy();
  });

  it("handles an empty growth window and zero distributions", async () => {
    const emptyTotals: AdminTotals = {
      ...totals,
      subscriptions: { active: 0, cancelled: 0, expired: 0, total: 0 },
      lifetime: { active: 0, revoked: 0, total: 0 },
    };
    const client = createMockSupabaseClient({
      session: mockSession(),
      existingProfile: adminProfile,
      adminTotals: emptyTotals,
      adminGrowth: [],
      adminActiveUsers: 0,
    });
    renderAdmin(client);
    expect(await screen.findByText(/no new-user activity in this window yet/i)).toBeTruthy();
    expect((await screen.findAllByText("—")).length).toBeGreaterThan(0);
  });

  it("does not expose user search, identities, or sensitive fields", async () => {
    const client = adminClient();
    renderAdmin(client);
    await screen.findByText("128");
    expect(screen.getByText(/searchable per-user details aren't available yet/i)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText("user-1")).toBeNull();
    expect(screen.queryByText("alice@soravo.app")).toBeNull();
    expect(screen.queryByText(/card/i)).toBeNull();
    expect(screen.queryByText(/cvv/i)).toBeNull();
    expect(screen.queryByText(/billing|payment/i)).toBeNull();
  });
});