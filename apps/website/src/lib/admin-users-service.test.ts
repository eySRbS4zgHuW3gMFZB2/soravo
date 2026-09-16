import { describe, expect, it, vi } from "vitest";
import type { AppSupabaseClient } from "./supabase";
import { createMockSupabaseClient } from "../test-utils/supabase-mock";
import {
  DIRECTORY_MAX_OFFSET,
  DIRECTORY_PAGE_SIZE,
  SEARCH_MAX_LENGTH,
  getAdminDirectory,
  normalizeDirectoryOffset,
  normalizeDirectorySearch,
  type AdminDirectoryUser,
  type AdminUserDirectory,
} from "./admin-users-service";

const GENERIC_MESSAGE = "We couldn't load the user directory. Please try again.";

const alice: AdminDirectoryUser = {
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

const directory: AdminUserDirectory = {
  users: [alice],
  has_more: true,
  page_size: 25,
  offset: 25,
  search: "alice",
  generated_at: "2026-09-16T10:00:00Z",
};

function rpcArgs(
  client: ReturnType<typeof createMockSupabaseClient>,
  fn: string,
): unknown | undefined {
  const call = client.rpc.mock.calls.find(([name]) => name === fn);
  return call?.[1];
}

describe("admin-users-service", () => {
  it("loads a page via the admin_users RPC with search and offset", async () => {
    const client = createMockSupabaseClient({ adminDirectory: directory });
    const result = await getAdminDirectory(client as unknown as AppSupabaseClient, {
      search: "alice",
      offset: 25,
    });
    expect(client.rpc).toHaveBeenCalledWith("admin_users", { p_search: "alice", p_offset: 25 });
    expect(result).toEqual({ data: directory, error: null });
  });

  it("normalizes empty search to null and bounds the offset client-side", async () => {
    const client = createMockSupabaseClient({ adminDirectory: directory });
    const result = await getAdminDirectory(client as unknown as AppSupabaseClient, {
      search: "   ",
      offset: -5,
    });
    expect(rpcArgs(client, "admin_users")).toEqual({ p_search: null, p_offset: 0 });
    expect(result.error).toBeNull();
  });

  it("clips over-long searches to the backend's 100-char bound", async () => {
    const client = createMockSupabaseClient({ adminDirectory: directory });
    await getAdminDirectory(client as unknown as AppSupabaseClient, { search: "a".repeat(150) });
    const args = rpcArgs(client, "admin_users") as { p_search: string | null };
    expect(args.p_search?.length).toBe(SEARCH_MAX_LENGTH);
  });

  it("trims, empties, and bounds inputs through the normalizers", () => {
    expect(normalizeDirectorySearch("  alice  ")).toBe("alice");
    expect(normalizeDirectorySearch("   ")).toBeNull();
    expect(normalizeDirectorySearch("")).toBeNull();
    expect(normalizeDirectorySearch("a".repeat(SEARCH_MAX_LENGTH + 40))).toHaveLength(SEARCH_MAX_LENGTH);
    expect(normalizeDirectoryOffset(-3)).toBe(0);
    expect(normalizeDirectoryOffset(25)).toBe(25);
    expect(normalizeDirectoryOffset(DIRECTORY_MAX_OFFSET + 1)).toBe(DIRECTORY_MAX_OFFSET);
    expect(normalizeDirectoryOffset(Number.NaN)).toBe(0);
    expect(DIRECTORY_PAGE_SIZE).toBe(25);
  });

  it("collapses failures — including admin denial — to ONE generic message", async () => {
    const client = createMockSupabaseClient({
      adminDirectoryError: { message: "CLOUD-013: admin access required" },
    });
    const result = await getAdminDirectory(client as unknown as AppSupabaseClient);
    expect(result).toEqual({ data: null, error: GENERIC_MESSAGE });
  });

  it("rejects a malformed envelope as a generic error", async () => {
    const client = createMockSupabaseClient();
    client.rpc = vi.fn().mockResolvedValue({
      data: { users: "not-an-array", has_more: true, page_size: 25, offset: 0, generated_at: "2026-09-16T10:00:00Z" },
      error: null,
    });
    const result = await getAdminDirectory(client as unknown as AppSupabaseClient);
    expect(result).toEqual({ data: null, error: GENERIC_MESSAGE });
  });

  it("coerces malformed per-user rows to safe defaults instead of crashing", async () => {
    const client = createMockSupabaseClient();
    client.rpc = vi.fn().mockResolvedValue({
      data: {
        users: [null, {}, { public_user_id: "user-22222222222222222222222222222222" }],
        has_more: false,
        page_size: 25,
        offset: 0,
        search: null,
        generated_at: "2026-09-16T10:00:00Z",
      },
      error: null,
    });
    const result = await getAdminDirectory(client as unknown as AppSupabaseClient);
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      users: [
        { public_user_id: "", role: "user", account_status: "active", email: null, entitlement: null },
        { public_user_id: "", role: "user", devices: { count: 0, active: 0, platforms: {} }, sessions: { count: 0, active: 0 } },
        { public_user_id: "user-22222222222222222222222222222222" },
      ],
    });
  });
});