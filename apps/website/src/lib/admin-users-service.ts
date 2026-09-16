import type { AppSupabaseClient } from "./supabase";

// WEB-009 owner dashboard: admin user directory reads.
//
// Consumes the CLOUD-013 `admin_users` SECURITY DEFINER RPC (ADR-025). The RPC
// is revoked from anon/service_role, EXECUTE granted to authenticated only, and
// gates the caller inside its body on auth.uid() + public.profiles.role =
// 'admin' (raising "CLOUD-013: admin access required" otherwise). It returns a
// single jsonb page envelope with a closed, server-owned per-user projection
// (public_user_id, email, display_name, role, account_status, timestamps,
// entitlement / devices / sessions summaries) plus has_more / page_size /
// offset / search / generated_at. No internal UUIDs, provider references, or
// payment data ever cross the wire; frontend rendering is never an
// authorization boundary (09_SECURITY_BASELINE.md §4), so failures collapse to
// ONE generic message (ASVS 16.5) and a non-admin can never distinguish
// "denied" from "error". Inputs are normalized/truncated client-side to the
// backend's own bounds (search ≤ 100 chars, offset 0..100_000); the RPC
// applies the identical limits server-side.

export type EntitlementSummary = {
  plan: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
};

export type DeviceSummary = {
  count: number;
  active: number;
  platforms: Record<string, number>;
  last_seen_at: string | null;
};

export type SessionSummary = {
  count: number;
  active: number;
  last_seen_at: string | null;
};

// Mirrors the CLOUD-013 per-user projection exactly (rls_assertions U1–U21).
export type AdminDirectoryUser = {
  public_user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  account_status: "active" | "banned" | "deleted";
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  entitlement: EntitlementSummary | null;
  devices: DeviceSummary;
  sessions: SessionSummary;
};

// Mirrors the CLOUD-013 page envelope exactly.
export type AdminUserDirectory = {
  users: AdminDirectoryUser[];
  has_more: boolean;
  page_size: number;
  offset: number;
  search: string | null;
  generated_at: string;
};

export type LoadAdminUserDirectoryResult = {
  data: AdminUserDirectory | null;
  error: string | null;
};

export const DIRECTORY_PAGE_SIZE = 25;
export const SEARCH_MAX_LENGTH = 100;
export const DIRECTORY_MAX_OFFSET = 100_000;

const GENERIC_MESSAGE = "We couldn't load the user directory. Please try again.";

// Mirrors account-service's awaited-chain convention: the postgrest-js caller
// chain resolves to { data, error } and the cast is applied to the awaited
// value rather than through the deprecated .returns<T>() transform.
async function rpcResult<T>(
  call: PromiseLike<unknown>,
): Promise<{ data: T | null; error: { message: string } | null }> {
  return (await call) as unknown as { data: T | null; error: { message: string } | null };
}

// Normalizes user-supplied search on the client: trims, treats empty input as
// "no filter", and clips to the backend's 100-char bound so we never send an
// unbounded string (the RPC applies the same truncation server-side).
export function normalizeDirectorySearch(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, SEARCH_MAX_LENGTH);
}

// The backend rejects negative/oversized offsets (rls_assertions U6–U7);
// mirror the bound here so the page can trust every offset it passes.
export function normalizeDirectoryOffset(raw: number): number {
  const value = Math.trunc(raw);
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), DIRECTORY_MAX_OFFSET);
}

function toSafeString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function toSafeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toSafePlatforms(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const platforms: Record<string, number> = {};
  for (const [platform, count] of Object.entries(value)) {
    if (typeof count === "number" && Number.isFinite(count)) platforms[platform] = count;
  }
  return platforms;
}

// Boundary parse of each wire row: the RPC contract guarantees these shapes
// (U18/U19 always return devices/sessions objects; U16/U17 allow null email /
// last_sign_in_at / entitlement), but a defensive canonicalization keeps the
// page rendering the full page even if a single row drifts from the contract.
function parseUser(raw: unknown): AdminDirectoryUser {
  const user = (raw ?? {}) as Record<string, unknown>;
  const devices = (user.devices ?? {}) as Record<string, unknown>;
  const sessions = (user.sessions ?? {}) as Record<string, unknown>;
  const entitlement = user.entitlement as Record<string, unknown> | null | undefined;
  return {
    public_user_id: toSafeString(user.public_user_id, ""),
    email: typeof user.email === "string" ? user.email : null,
    display_name: typeof user.display_name === "string" ? user.display_name : null,
    role: toSafeString(user.role, "user"),
    account_status:
      user.account_status === "banned" || user.account_status === "deleted"
        ? user.account_status
        : "active",
    created_at: toSafeString(user.created_at, ""),
    updated_at: toSafeString(user.updated_at, ""),
    last_sign_in_at: typeof user.last_sign_in_at === "string" ? user.last_sign_in_at : null,
    entitlement:
      entitlement && typeof entitlement === "object"
        ? {
            plan: toSafeString(entitlement.plan, ""),
            status: toSafeString(entitlement.status, ""),
            starts_at: toSafeString(entitlement.starts_at, ""),
            expires_at: typeof entitlement.expires_at === "string" ? entitlement.expires_at : null,
          }
        : null,
    devices: {
      count: toSafeNumber(devices.count),
      active: toSafeNumber(devices.active),
      platforms: toSafePlatforms(devices.platforms),
      last_seen_at: typeof devices.last_seen_at === "string" ? devices.last_seen_at : null,
    },
    sessions: {
      count: toSafeNumber(sessions.count),
      active: toSafeNumber(sessions.active),
      last_seen_at: typeof sessions.last_seen_at === "string" ? sessions.last_seen_at : null,
    },
  };
}

function isDirectoryEnvelope(value: unknown): value is RawDirectoryEnvelope {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Record<string, unknown>;
  return (
    Array.isArray(envelope.users) &&
    typeof envelope.has_more === "boolean" &&
    typeof envelope.page_size === "number" &&
    typeof envelope.offset === "number" &&
    typeof envelope.generated_at === "string"
  );
}

type RawDirectoryEnvelope = {
  users: unknown[];
  has_more: boolean;
  page_size: number;
  offset: number;
  search?: unknown;
  generated_at: string;
};

export async function getAdminDirectory(
  client: AppSupabaseClient,
  input?: { search?: string | null; offset?: number },
): Promise<LoadAdminUserDirectoryResult> {
  const { data, error } = await rpcResult<RawDirectoryEnvelope>(
    client.rpc("admin_users", {
      p_search: normalizeDirectorySearch(input?.search ?? ""),
      p_offset: normalizeDirectoryOffset(input?.offset ?? 0),
    }),
  );
  if (error || !isDirectoryEnvelope(data)) {
    return { data: null, error: GENERIC_MESSAGE };
  }
  return {
    data: {
      users: data.users.map(parseUser),
      has_more: data.has_more,
      page_size: data.page_size,
      offset: data.offset,
      search: typeof data.search === "string" ? data.search : null,
      generated_at: data.generated_at,
    },
    error: null,
  };
}