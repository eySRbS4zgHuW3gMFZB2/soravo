import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_ENV = "VITE_SUPABASE_URL";
const ANON_KEY_ENV = "VITE_SUPABASE_ANON_KEY";

export type AppSupabaseClient = SupabaseClient;

// Resolves the client-safe Supabase configuration from the build environment.
// Returns null when either value is missing so the integration stays inert
// (mirrors the analytics module's env gating). Only HTTPS endpoints are
// accepted; the service-role key, database password, and JWT secret are never
// read here.
export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const rawUrl = import.meta.env[URL_ENV];
  const rawKey = import.meta.env[ANON_KEY_ENV];
  if (typeof rawUrl !== "string" || typeof rawKey !== "string") return null;
  const url = rawUrl.trim();
  const anonKey = rawKey.trim();
  if (!url || !anonKey) return null;
  try {
    if (new URL(url).protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { url, anonKey };
}

let client: AppSupabaseClient | null = null;

export function createSupabaseClient(): AppSupabaseClient | null {
  if (client) return client;
  const config = getSupabaseConfig();
  if (!config) return null;
  client = createClient(config.url, config.anonKey, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export function getSupabaseClient(): AppSupabaseClient | null {
  return createSupabaseClient();
}