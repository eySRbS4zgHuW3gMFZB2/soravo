import type { AppSupabaseClient } from "./supabase";

// WEB-008 account dashboard reads.
//
// Every query selects ONLY the fields the signed-in user is authorized to read
// (ADR-012 / ADR-013):
//   * entitlements — the column-level SELECT grant: product, plan, status,
//     starts_at, expires_at, updated_at. Identity columns (id, user_id) and
//     provider/payment references are un-granted and never requested.
//   * devices / sessions — the granted safe public identifiers
//     (device_public_id / session_public_id). Internal database ids
//     (id, user_id, device_id) are never selected; the session→device
//     association is embedded through the PostgREST resource so only the safe
//     device projection crosses the wire.
// Row scoping is enforced server-side by RLS (auth.uid()); the client never
// filters by another user and frontend rendering is never an authorization
// boundary (09_SECURITY_BASELINE.md §4). Failures surface one generic message
// and never leak server/internal error detail (ASVS 16.5).

export type Entitlement = {
  product: string;
  plan: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  updated_at: string;
};

export type AccountDevice = {
  device_public_id: string;
  platform: string;
  app_version: string;
  first_seen_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

export type DeviceAssociation = {
  device_public_id: string;
  platform: string;
  app_version: string;
};

export type AccountSession = {
  session_public_id: string;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
  devices: DeviceAssociation | null;
};

export type AccountDashboardData = {
  entitlements: Entitlement[];
  devices: AccountDevice[];
  sessions: AccountSession[];
};

export type LoadAccountResult = {
  data: AccountDashboardData;
  error: string | null;
};

type QueryOutcome<T> = { data: T[]; error: string | null };

const GENERIC_LOAD_MESSAGE =
  "We couldn't load your account data. Please try again.";

export async function getEntitlements(
  client: AppSupabaseClient,
): Promise<QueryOutcome<Entitlement>> {
  const { data, error } = await client
    .from("entitlements")
    .select("product, plan, status, starts_at, expires_at, updated_at")
    .order("updated_at", { ascending: false })
    .returns<Entitlement[]>();
  if (error) return { data: [], error: GENERIC_LOAD_MESSAGE };
  return { data: data ?? [], error: null };
}

export async function getDevices(
  client: AppSupabaseClient,
): Promise<QueryOutcome<AccountDevice>> {
  const { data, error } = await client
    .from("devices")
    .select(
      "device_public_id, platform, app_version, first_seen_at, last_seen_at, revoked_at",
    )
    .order("last_seen_at", { ascending: false })
    .returns<AccountDevice[]>();
  if (error) return { data: [], error: GENERIC_LOAD_MESSAGE };
  return { data: data ?? [], error: null };
}

export async function getSessions(
  client: AppSupabaseClient,
): Promise<QueryOutcome<AccountSession>> {
  const { data, error } = await client
    .from("sessions")
    .select(
      "session_public_id, created_at, last_seen_at, revoked_at, devices(device_public_id, platform, app_version)",
    )
    .order("last_seen_at", { ascending: false })
    .returns<AccountSession[]>();
  if (error) return { data: [], error: GENERIC_LOAD_MESSAGE };
  return { data: data ?? [], error: null };
}

export async function loadAccountDashboard(
  client: AppSupabaseClient,
): Promise<LoadAccountResult> {
  const [entitlements, devices, sessions] = await Promise.all([
    getEntitlements(client),
    getDevices(client),
    getSessions(client),
  ]);
  const firstError = [
    entitlements.error,
    devices.error,
    sessions.error,
  ].find((value): value is string => typeof value === "string");
  return {
    data: {
      entitlements: entitlements.data,
      devices: devices.data,
      sessions: sessions.data,
    },
    error: firstError ?? null,
  };
}