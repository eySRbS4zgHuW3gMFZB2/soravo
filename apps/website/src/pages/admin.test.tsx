import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthProvider } from "../lib/auth-context";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import Admin from "./admin";
import { Login } from "./login";
import type { AppSupabaseClient } from "../lib/supabase";
import type { AdminTotals, GrowthBucket } from "../lib/admin-metrics-service";
import type { AdminDirectoryUser, AdminUserDirectory } from "../lib/admin-users-service";

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

const aliceUser: AdminDirectoryUser = {
  public_user_id: "user-11111111111111111111111111111111",
  email: "alice@soravo.app",
  display_name: "Alice",
  role: "user",
  account_status: "active",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  last_sign_in_at: "2026-09-01T00:00:00Z",
  entitlement: {
    plan: "monthly",
    status: "active",
    starts_at: "2026-01-01T00:00:00Z",
    expires_at: "2026-10-01T00:00:00Z",
  },
  devices: { count: 1, active: 1, platforms: { macos: 1 }, last_seen_at: "2026-09-01T00:00:00Z" },
  sessions: { count: 1, active: 1, last_seen_at: "2026-09-01T00:00:00Z" },
};

const ginaUser: AdminDirectoryUser = {
  public_user_id: "user-22222222222222222222222222222222",
  email: "gina@soravo.app",
  display_name: null,
  role: "user",
  account_status: "banned",
  created_at: "2026-02-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
  last_sign_in_at: null,
  entitlement: null,
  devices: { count: 0, active: 0, platforms: {}, last_seen_at: null },
  sessions: { count: 0, active: 0, last_seen_at: null },
};

const bobUser: AdminDirectoryUser = {
  public_user_id: "user-33333333333333333333333333333333",
  email: "bob@soravo.app",
  display_name: "Bob",
  role: "user",
  account_status: "active",
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
  last_sign_in_at: "2026-08-01T00:00:00Z",
  entitlement: null,
  devices: { count: 0, active: 0, platforms: {}, last_seen_at: null },
  sessions: { count: 0, active: 0, last_seen_at: null },
};

const carolUser: AdminDirectoryUser = {
  public_user_id: "user-44444444444444444444444444444444",
  email: "carol@soravo.app",
  display_name: "Carol",
  role: "user",
  account_status: "active",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
  last_sign_in_at: "2026-07-01T00:00:00Z",
  entitlement: null,
  devices: { count: 0, active: 0, platforms: {}, last_seen_at: null },
  sessions: { count: 0, active: 0, last_seen_at: null },
};

function directoryPage(
  users: AdminDirectoryUser[],
  offset: number,
  hasMore: boolean,
  search: string | null,
): AdminUserDirectory {
  return {
    users,
    has_more: hasMore,
    page_size: 25,
    offset,
    search,
    generated_at: "2026-09-16T10:00:00Z",
  };
}

const directoryPayload = directoryPage([aliceUser, ginaUser], 0, false, null);

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
    adminDirectory: directoryPayload,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function directoryClient(
  respond: (args: { p_search?: string | null; p_offset?: number }) => AdminUserDirectory,
) {
  const client = adminClient();
  const originalRpc = client.rpc;
  client.rpc = vi.fn((fn: string, args?: { p_search?: string | null; p_offset?: number }) => {
    if (fn === "admin_users") {
      return Promise.resolve({ data: respond(args ?? {}), error: null });
    }
    return originalRpc(fn);
  });
  return client;
}

afterEach(cleanup);

describe("admin page", () => {
  it("guards the dashboard behind a session", async () => {
    const client = createMockSupabaseClient();
    renderAdmin(client);
    expect(await screen.findByText(/sign in to view the owner dashboard/i)).toBeTruthy();
    expect(screen.queryByText(/registered users/i)).toBeNull();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("denies access to a signed-in non-admin without calling the admin RPCs", async () => {
    const client = createMockSupabaseClient({ session: mockSession(), existingProfile: userProfile });
    renderAdmin(client);
    expect(await screen.findByText(/owner access required/i)).toBeTruthy();
    expect(screen.getByText(/go to your account/i)).toBeTruthy();
    expect(screen.queryByRole("searchbox")).toBeNull();
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
    const directoryGate = deferred<{ data: AdminUserDirectory; error: null }>();
    client.rpc = vi.fn((fn: string) => {
      if (fn === "admin_metrics_totals") return totalsGate.promise;
      if (fn === "admin_metrics_growth") return growthGate.promise;
      if (fn === "admin_users") return directoryGate.promise;
      return activeGate.promise;
    });
    renderAdmin(client);
    expect(await screen.findByText(/loading owner metrics/i)).toBeTruthy();
    totalsGate.resolve({ data: totals, error: null });
    growthGate.resolve({ data: growth, error: null });
    activeGate.resolve({ data: 17, error: null });
    directoryGate.resolve({ data: directoryPage([], 0, false, null), error: null });
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
      lifetime: { active: 0, revoked: 1, total: 0 },
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

  it("renders authorized directory fields while never exposing internal IDs or payment data", async () => {
    const client = adminClient();
    renderAdmin(client);
    await screen.findByText("alice@soravo.app");
    expect(screen.getByText("user-11111111111111111111111111111111")).toBeTruthy();
    expect(screen.getByText("user-22222222222222222222222222222222")).toBeTruthy();
    expect(screen.getByText("monthly")).toBeTruthy();
    expect(screen.getByText("banned")).toBeTruthy();
    expect(screen.getAllByText(/1\/1 active/).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("searchbox")).toBeTruthy();
    expect(screen.queryByText("user-1")).toBeNull();
    expect(screen.queryByText(/card/i)).toBeNull();
    expect(screen.queryByText(/cvv/i)).toBeNull();
    expect(screen.queryByText(/billing|payment/i)).toBeNull();
  });

  it("shows an empty directory state when no users exist", async () => {
    const client = createMockSupabaseClient({
      session: mockSession(),
      existingProfile: adminProfile,
      adminTotals: totals,
      adminGrowth: growth,
      adminActiveUsers: 17,
      adminDirectory: directoryPage([], 0, false, null),
    });
    renderAdmin(client);
    expect(await screen.findByText(/no users found yet/i)).toBeTruthy();
  });

  it("reports when a search matches no users", async () => {
    const client = directoryClient((args) =>
      args.p_search ? directoryPage([], args.p_offset ?? 0, false, args.p_search) : directoryPage([aliceUser], 0, false, null),
    );
    renderAdmin(client);
    await screen.findByText("alice@soravo.app");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(await screen.findByText(/no users match "zzz"/i)).toBeTruthy();
  });

  it("clips over-long input and treats whitespace-only search as no filter", async () => {
    const calls: Array<{ p_search: string | null; p_offset: number }> = [];
    const client = directoryClient((args) => {
      calls.push({ p_search: args.p_search ?? null, p_offset: args.p_offset ?? 0 });
      return directoryPage([aliceUser], args.p_offset ?? 0, false, args.p_search ?? null);
    });
    renderAdmin(client);
    await screen.findByText("alice@soravo.app");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "a".repeat(150) } });
    fireEvent.submit(screen.getByRole("search"));
    await waitFor(() => expect(calls.at(-1)?.p_search?.length).toBe(100));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("search"));
    await waitFor(() => expect(calls.at(-1)).toEqual({ p_search: null, p_offset: 0 }));
  });

  it("refetches from the first page when the search changes", async () => {
    const calls: Array<{ p_search: string | null; p_offset: number }> = [];
    const client = directoryClient((args) => {
      const search = args.p_search ?? null;
      const offset = args.p_offset ?? 0;
      calls.push({ p_search: search, p_offset: offset });
      if (search) return directoryPage([bobUser], offset, false, search);
      return offset === 0 ? directoryPage([aliceUser], 0, true, null) : directoryPage([bobUser], 25, false, null);
    });
    renderAdmin(client);
    await screen.findByText("alice@soravo.app");
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    await screen.findByText("bob@soravo.app");
    expect(screen.getByText(/page 2/i)).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "bob" } });
    fireEvent.submit(screen.getByRole("search"));
    await waitFor(() => expect(calls.at(-1)).toEqual({ p_search: "bob", p_offset: 0 }));
    expect(screen.getByText(/page 1/i)).toBeTruthy();
  });

  it("pages through the directory with Previous and Next buttons", async () => {
    const calls: Array<{ p_search: string | null; p_offset: number }> = [];
    const client = directoryClient((args) => {
      const offset = args.p_offset ?? 0;
      calls.push({ p_search: args.p_search ?? null, p_offset: offset });
      if (offset === 0) return directoryPage([aliceUser], 0, true, null);
      return directoryPage([bobUser], 25, false, null);
    });
    renderAdmin(client);
    await screen.findByText("alice@soravo.app");
    expect(calls.at(-1)).toEqual({ p_search: null, p_offset: 0 });
    expect(screen.getByText(/page 1/i)).toBeTruthy();
    expect(screen.getByText(/more results available/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /previous page/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /next page/i }).hasAttribute("disabled")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    await screen.findByText("bob@soravo.app");
    expect(screen.queryByText("alice@soravo.app")).toBeNull();
    expect(screen.getByText(/page 2/i)).toBeTruthy();
    expect(screen.queryByText(/more results available/i)).toBeNull();
    expect(screen.getByRole("button", { name: /previous page/i }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: /next page/i }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /previous page/i }));
    await screen.findByText("alice@soravo.app");
    expect(screen.queryByText("bob@soravo.app")).toBeNull();
    expect(screen.getByText(/page 1/i)).toBeTruthy();
  });

  it("discards stale directory responses so the newest request always wins", async () => {
    const gates: Array<{ resolve: (value: { data: AdminUserDirectory; error: null }) => void }> = [];
    const client = adminClient();
    const originalRpc = client.rpc;
    client.rpc = vi.fn((fn: string) => {
      if (fn === "admin_users") {
        const gate = deferred<{ data: AdminUserDirectory; error: null }>();
        gates.push(gate);
        return gate.promise;
      }
      return originalRpc(fn);
    });
    renderAdmin(client);
    expect(await screen.findByText(/loading user directory/i)).toBeTruthy();
    gates[0].resolve({ data: directoryPage([aliceUser], 0, false, null), error: null });
    await screen.findByText("alice@soravo.app");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "bob" } });
    fireEvent.submit(screen.getByRole("search"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "carol" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(gates.length).toBeGreaterThanOrEqual(3);
    gates[2].resolve({ data: directoryPage([carolUser], 0, false, "carol"), error: null });
    await screen.findByText("carol@soravo.app");
    gates[1].resolve({ data: directoryPage([bobUser], 0, false, "bob"), error: null });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText("carol@soravo.app")).toBeTruthy();
    expect(screen.queryByText("bob@soravo.app")).toBeNull();
  });

  it("surfaces a generic directory error and retries successfully", async () => {
    const client = createMockSupabaseClient({
      session: mockSession(),
      existingProfile: adminProfile,
      adminTotals: totals,
      adminGrowth: growth,
      adminActiveUsers: 17,
      adminDirectoryError: { message: "CLOUD-013: admin access required" },
    });
    renderAdmin(client);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/we couldn't load the user directory/i)).toBeTruthy();
    expect(screen.queryByText(/cloud-013/i)).toBeNull();
    client.__update({ adminDirectory: directoryPage([aliceUser], 0, false, null), adminDirectoryError: null });
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("alice@soravo.app")).toBeTruthy();
  });

  it("does not render the aggregate metrics when the total call is denied", async () => {
    const client = createMockSupabaseClient({
      session: mockSession(),
      existingProfile: adminProfile,
      adminTotalsError: { message: "CLOUD-007: admin access required" },
      adminGrowth: growth,
      adminActiveUsers: 17,
    });
    renderAdmin(client);
    expect(await screen.findByText(/we couldn't load owner metrics/i)).toBeTruthy();
    expect(screen.queryByText("128")).toBeNull();
  });
});