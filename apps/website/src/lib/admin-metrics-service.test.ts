import { describe, expect, it } from "vitest";
import type { AppSupabaseClient } from "./supabase";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import {
  getAdminActiveUsers,
  getAdminGrowth,
  getAdminTotals,
  loadAdminMetrics,
  type AdminTotals,
  type GrowthBucket,
} from "./admin-metrics-service";

const GENERIC_MESSAGE = "We couldn't load owner metrics. Please try again.";

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

function rpcArgs(
  client: ReturnType<typeof createMockSupabaseClient>,
  fn: string,
): unknown | undefined {
  const call = client.rpc.mock.calls.find(([name]) => name === fn);
  return call?.[1];
}

describe("admin-metrics-service", () => {
  it("loads totals via the admin_metrics_totals RPC", async () => {
    const client = createMockSupabaseClient({ adminTotals: totals });
    const result = await getAdminTotals(client as unknown as AppSupabaseClient);
    expect(client.rpc).toHaveBeenCalledWith("admin_metrics_totals");
    expect(result).toEqual({ data: totals, error: null });
  });

  it("collapses totals failures — including admin denial — to ONE generic message", async () => {
    const client = createMockSupabaseClient({
      adminTotalsError: { message: "CLOUD-007: admin access required" },
    });
    const result = await getAdminTotals(client as unknown as AppSupabaseClient);
    expect(result).toEqual({ data: null, error: GENERIC_MESSAGE });
  });

  it("loads growth with the requested bucket and window", async () => {
    const client = createMockSupabaseClient({ adminGrowth: growth });
    const window = { from: "2026-08-01T00:00:00Z", to: "2026-09-01T00:00:00Z" };
    const result = await getAdminGrowth(client as unknown as AppSupabaseClient, "week", window);
    expect(result).toEqual({ data: growth, error: null });
    expect(rpcArgs(client, "admin_metrics_growth")).toEqual({
      p_bucket: "week",
      p_from: window.from,
      p_to: window.to,
    });
  });

  it("collapses growth failures to ONE generic message and empty data", async () => {
    const client = createMockSupabaseClient({ adminGrowthError: { message: "boom" } });
    const result = await getAdminGrowth(client as unknown as AppSupabaseClient, "day", {
      from: "2026-08-01T00:00:00Z",
      to: "2026-09-01T00:00:00Z",
    });
    expect(result).toEqual({ data: [], error: GENERIC_MESSAGE });
  });

  it("loads active users within the window", async () => {
    const client = createMockSupabaseClient({ adminActiveUsers: 17 });
    const window = { from: "2026-08-01T00:00:00Z", to: "2026-09-01T00:00:00Z" };
    const result = await getAdminActiveUsers(client as unknown as AppSupabaseClient, window);
    expect(result).toEqual({ data: 17, error: null });
    expect(rpcArgs(client, "admin_metrics_active_users")).toEqual({
      p_from: window.from,
      p_to: window.to,
    });
  });

  it("collapses active-user failures to ONE generic message and zero", async () => {
    const client = createMockSupabaseClient({ adminActiveUsersError: { message: "denied" } });
    const result = await getAdminActiveUsers(client as unknown as AppSupabaseClient, {
      from: "2026-08-01T00:00:00Z",
      to: "2026-09-01T00:00:00Z",
    });
    expect(result).toEqual({ data: 0, error: GENERIC_MESSAGE });
  });

  it("loads all three metrics with growth defaulting to per-day over 30 days", async () => {
    const client = createMockSupabaseClient({
      adminTotals: totals,
      adminGrowth: growth,
      adminActiveUsers: 17,
    });
    const result = await loadAdminMetrics(client as unknown as AppSupabaseClient);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ totals, growth, activeUsers: 17 });
    expect(rpcArgs(client, "admin_metrics_growth")).toMatchObject({ p_bucket: "day" });
    const window = rpcArgs(client, "admin_metrics_growth") as { p_from: string; p_to: string };
    const fromMs = Date.parse(window.p_from);
    const toMs = Date.parse(window.p_to);
    expect(toMs - fromMs).toBe(30 * 86_400_000);
  });

  it("honours a custom unit and window size", async () => {
    const client = createMockSupabaseClient({ adminGrowth: growth });
    await loadAdminMetrics(client as unknown as AppSupabaseClient, { unit: "month", days: 90 });
    expect(rpcArgs(client, "admin_metrics_growth")).toMatchObject({ p_bucket: "month" });
  });

  it("reports ONE generic error when any metric fails while keeping partial data", async () => {
    const client = createMockSupabaseClient({
      adminTotals: totals,
      adminGrowthError: { message: "boom" },
      adminActiveUsers: 17,
    });
    const result = await loadAdminMetrics(client as unknown as AppSupabaseClient);
    expect(result.error).toBe(GENERIC_MESSAGE);
    expect(result.data.totals).toEqual(totals);
    expect(result.data.growth).toEqual([]);
    expect(result.data.activeUsers).toBe(17);
  });
});