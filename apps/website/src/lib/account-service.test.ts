import { describe, expect, it } from "vitest";
import type { AppSupabaseClient } from "./supabase";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import {
  getDevices,
  getEntitlements,
  getSessions,
  loadAccountDashboard,
  type AccountDevice,
  type AccountSession,
  type Entitlement,
} from "./account-service";

const GENERIC_MESSAGE = "We couldn't load your account data. Please try again.";

const entitlement: Entitlement = {
  product: "Soravo Membership",
  plan: "Lifetime",
  status: "Active",
  starts_at: "2026-01-01T00:00:00Z",
  expires_at: null,
  updated_at: "2026-01-02T00:00:00Z",
};

const device: AccountDevice = {
  device_public_id: "device-public-1",
  platform: "macOS",
  app_version: "1.4.2",
  first_seen_at: "2026-01-01T00:00:00Z",
  last_seen_at: "2026-01-03T00:00:00Z",
  revoked_at: null,
};

const session: AccountSession = {
  session_public_id: "session-public-1",
  created_at: "2026-01-01T00:00:00Z",
  last_seen_at: "2026-01-03T00:00:00Z",
  revoked_at: null,
  devices: { device_public_id: "device-public-1", platform: "macOS", app_version: "1.4.2" },
};

const ENTITLEMENTS_SELECT = "product, plan, status, starts_at, expires_at, updated_at";
const DEVICES_SELECT =
  "device_public_id, platform, app_version, first_seen_at, last_seen_at, revoked_at";
const SESSIONS_SELECT =
  "session_public_id, created_at, last_seen_at, revoked_at, devices(device_public_id, platform, app_version)";

function selectStringFor(
  client: ReturnType<typeof createMockSupabaseClient>,
  fromIndex: number,
): string {
  const builder = client.from.mock.results[fromIndex].value;
  return builder.select.mock.calls[0][0] as string;
}

describe("account-service", () => {
  it("loads entitlements selecting only the granted columns", async () => {
    const client = createMockSupabaseClient({ entitlements: [entitlement] });
    const result = await getEntitlements(client as unknown as AppSupabaseClient);
    expect(selectStringFor(client, 0)).toBe(ENTITLEMENTS_SELECT);
    expect(client.from).toHaveBeenCalledWith("entitlements");
    expect(result).toEqual({ data: [entitlement], error: null });
  });

  it("surfaces one generic error when entitlements cannot load", async () => {
    const client = createMockSupabaseClient({ entitlementsError: { message: "permission denied" } });
    const result = await getEntitlements(client as unknown as AppSupabaseClient);
    expect(result).toEqual({ data: [], error: GENERIC_MESSAGE });
  });

  it("loads devices selecting only the granted columns", async () => {
    const client = createMockSupabaseClient({ devices: [device] });
    const result = await getDevices(client as unknown as AppSupabaseClient);
    expect(selectStringFor(client, 0)).toBe(DEVICES_SELECT);
    expect(client.from).toHaveBeenCalledWith("devices");
    expect(result).toEqual({ data: [device], error: null });
  });

  it("surfaces one generic error when devices cannot load", async () => {
    const client = createMockSupabaseClient({ devicesError: { message: "permission denied" } });
    const result = await getDevices(client as unknown as AppSupabaseClient);
    expect(result).toEqual({ data: [], error: GENERIC_MESSAGE });
  });

  it("loads sessions with only the granted columns and safe device embed", async () => {
    const client = createMockSupabaseClient({ sessions: [session] });
    const result = await getSessions(client as unknown as AppSupabaseClient);
    expect(selectStringFor(client, 0)).toBe(SESSIONS_SELECT);
    expect(client.from).toHaveBeenCalledWith("sessions");
    expect(result).toEqual({ data: [session], error: null });
  });

  it("never selects internal identifiers or provider/payment fields", () => {
    const combinedSelects = [
      ENTITLEMENTS_SELECT,
      DEVICES_SELECT,
      SESSIONS_SELECT,
    ].join(" ");
    expect(combinedSelects).not.toMatch(/\bid\b/);
    expect(combinedSelects).not.toContain("user_id");
    expect(combinedSelects).not.toContain("provider");
    expect(combinedSelects).not.toContain("customer");
    expect(combinedSelects).not.toContain("billing");
  });

  it("surfaces one generic error when sessions cannot load", async () => {
    const client = createMockSupabaseClient({ sessionsError: { message: "permission denied" } });
    const result = await getSessions(client as unknown as AppSupabaseClient);
    expect(result).toEqual({ data: [], error: GENERIC_MESSAGE });
  });

  it("aggregates all three reads into a dashboard payload", async () => {
    const client = createMockSupabaseClient({
      entitlements: [entitlement],
      devices: [device],
      sessions: [session],
    });
    const result = await loadAccountDashboard(client as unknown as AppSupabaseClient);
    expect(result.error).toBeNull();
    expect(result.data.entitlements).toEqual([entitlement]);
    expect(result.data.devices).toEqual([device]);
    expect(result.data.sessions).toEqual([session]);
  });

  it("keeps partial data when one read fails and reports one generic error", async () => {
    const client = createMockSupabaseClient({
      entitlements: [entitlement],
      devices: [device],
      sessionsError: { message: "permission denied" },
    });
    const result = await loadAccountDashboard(client as unknown as AppSupabaseClient);
    expect(result.error).toBe(GENERIC_MESSAGE);
    expect(result.data.entitlements).toEqual([entitlement]);
    expect(result.data.devices).toEqual([device]);
    expect(result.data.sessions).toEqual([]);
  });

  it("returns empty arrays when no records exist yet", async () => {
    const client = createMockSupabaseClient();
    const result = await loadAccountDashboard(client as unknown as AppSupabaseClient);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ entitlements: [], devices: [], sessions: [] });
  });
});