import { afterEach, describe, expect, it, vi } from "vitest";

function loadModule() {
  vi.resetModules();
  return import("./supabase");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("supabase client configuration", () => {
  it("returns null when the URL and anon key are unset", async () => {
    const { getSupabaseConfig } = await loadModule();
    expect(getSupabaseConfig()).toBeNull();
  });

  it("returns null when only one of the two values is set", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://abc.supabase.co");
    const { getSupabaseConfig } = await loadModule();
    expect(getSupabaseConfig()).toBeNull();
  });

  it("rejects non-HTTPS endpoints", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "http://abc.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "sb_publishable_1234567890abcdef");
    const { getSupabaseConfig } = await loadModule();
    expect(getSupabaseConfig()).toBeNull();
  });

  it("trims and accepts an HTTPS endpoint with a usable key", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "  https://abc.supabase.co  ");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", " sb_publishable_1234567890abcdef ");
    const { getSupabaseConfig } = await loadModule();
    expect(getSupabaseConfig()).toEqual({
      url: "https://abc.supabase.co",
      anonKey: "sb_publishable_1234567890abcdef",
    });
  });

  it("is inert (no client) when unconfigured", async () => {
    const { createSupabaseClient } = await loadModule();
    expect(createSupabaseClient()).toBeNull();
  });
});