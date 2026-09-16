import type { AppSupabaseClient } from "./supabase";

// WEB-009 owner dashboard reads.
//
// Consumes the three server-authoritative product-metrics RPCs delivered by
// CLOUD-007 / ADR-016. Each function is SECURITY DEFINER, revoked from
// anon/service_role, EXECUTE granted to authenticated only, and gates the
// caller inside its body on auth.uid() + public.profiles.role = 'admin'
// (raising "CLOUD-007: admin access required" otherwise). Only aggregates cross
// the wire — never raw user rows, identifiers, provider references, payment
// data, or PII. Frontend rendering is never an authorization boundary
// (09_SECURITY_BASELINE.md §4): the page gates on the signed-in user's own
// immutable role column for UX, while every RPC re-enforces the admin check
// server-side. All failures collapse to ONE generic message (ASVS 16.5) so a
// non-admin or anonymous caller can never distinguish "denied" from "error".

export type GrowthUnit = "day" | "week" | "month";

export type SubscriptionTotals = {
  active: number;
  cancelled: number;
  expired: number;
  total: number;
};

export type LifetimeTotals = {
  active: number;
  revoked: number;
  total: number;
};

export type DeviceTotals = {
  total: number;
  revoked: number;
  by_platform: { macos: number; windows: number; linux: number };
};

// Mirrors admin_metrics_totals() jsonb exactly (CLOUD-007 / rls_assertions M3).
export type AdminTotals = {
  total_users: number;
  paid_users: number;
  subscriptions: SubscriptionTotals;
  lifetime: LifetimeTotals;
  devices: DeviceTotals;
  generated_at: string;
};

// Mirrors admin_metrics_growth() rows: UTC calendar-aligned (day|week|month).
export type GrowthBucket = {
  bucket: string;
  new_users: number;
};

export type AdminMetricsData = {
  totals: AdminTotals | null;
  growth: GrowthBucket[];
  activeUsers: number;
};

export type LoadAdminMetricsResult = {
  data: AdminMetricsData;
  error: string | null;
};

export const GROWTH_WINDOW_DAYS = 30;

const GENERIC_MESSAGE = "We couldn't load owner metrics. Please try again.";

// Mirrors account-service's awaited-chain convention: the postgrest-js caller
// chain resolves to { data, error } and the cast is applied to the awaited
// value rather than through the deprecated .returns<T>() transform.
async function rpcResult<T>(
  call: PromiseLike<unknown>,
): Promise<{ data: T | null; error: { message: string } | null }> {
  return (await call) as unknown as { data: T | null; error: { message: string } | null };
}

function openWindow(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function getAdminTotals(
  client: AppSupabaseClient,
): Promise<{ data: AdminTotals | null; error: string | null }> {
  const { data, error } = await rpcResult<AdminTotals>(client.rpc("admin_metrics_totals"));
  if (error || !data) return { data: null, error: GENERIC_MESSAGE };
  return { data, error: null };
}

export async function getAdminGrowth(
  client: AppSupabaseClient,
  unit: GrowthUnit,
  window: { from: string; to: string },
): Promise<{ data: GrowthBucket[]; error: string | null }> {
  const { data, error } = await rpcResult<GrowthBucket[]>(
    client.rpc("admin_metrics_growth", {
      p_bucket: unit,
      p_from: window.from,
      p_to: window.to,
    }),
  );
  if (error) return { data: [], error: GENERIC_MESSAGE };
  return { data: data ?? [], error: null };
}

export async function getAdminActiveUsers(
  client: AppSupabaseClient,
  window: { from: string; to: string },
): Promise<{ data: number; error: string | null }> {
  const { data, error } = await rpcResult<number>(
    client.rpc("admin_metrics_active_users", {
      p_from: window.from,
      p_to: window.to,
    }),
  );
  if (error) return { data: 0, error: GENERIC_MESSAGE };
  return { data: data ?? 0, error: null };
}

export async function loadAdminMetrics(
  client: AppSupabaseClient,
  input?: { unit?: GrowthUnit; days?: number },
): Promise<LoadAdminMetricsResult> {
  const unit = input?.unit ?? "day";
  const window = openWindow(input?.days ?? GROWTH_WINDOW_DAYS);
  const [totals, growth, activeUsers] = await Promise.all([
    getAdminTotals(client),
    getAdminGrowth(client, unit, window),
    getAdminActiveUsers(client, window),
  ]);
  const firstError = [totals.error, growth.error, activeUsers.error].find(
    (value): value is string => typeof value === "string",
  );
  return {
    data: {
      totals: totals.data,
      growth: growth.data,
      activeUsers: activeUsers.data,
    },
    error: firstError ?? null,
  };
}