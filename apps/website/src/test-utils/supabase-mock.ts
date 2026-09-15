// Shared mock of the Supabase client for auth page/service tests.
// Lives under src so jsdom tests can import it; only test files use it.
import { vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "../lib/auth-service";

export type MockSessionData = { user: User } | null;

type ChainResult = { data: unknown; error: unknown };

// Returns a PostgREST-style builder that is BOTH chainable (every method
// returns itself) and awaitable (resolves to ChainResult) so calls ending in
// .returns() and calls ending in .eq()/update() both work with `await`.
type ChainNode = Record<string, (...args: unknown[]) => ChainNode> & {
  then: ((onFulfilled: (value: ChainResult) => unknown, onRejected?: (reason: unknown) => unknown) => unknown) | undefined;
  catch: (onRejected: (reason: unknown) => unknown) => unknown;
  finally: (onFinally: () => void) => unknown;
};

function chainResult(result: ChainResult): ChainNode {
  const node: ChainNode = {
    then: undefined,
  } as ChainNode;
  const pending = Promise.resolve(result);
  const methods = [
    "select",
    "eq",
    "in",
    "maybeSingle",
    "single",
    "insert",
    "update",
    "upsert",
    "delete",
    "order",
    "limit",
    "returns",
  ];
  for (const method of methods) {
    node[method] = vi.fn(() => node) as (...args: unknown[]) => ChainNode;
  }
  node.then = (onFulfilled: (value: ChainResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
    pending.then(onFulfilled, onRejected);
  node.catch = (onRejected: (reason: unknown) => unknown) => pending.catch(onRejected);
  node.finally = (onFinally: () => void) => pending.finally(onFinally);
  return node;
}

export type MockSupabaseClient = {
  auth: {
    getSession: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signUp: ReturnType<typeof vi.fn>;
    resetPasswordForEmail: ReturnType<typeof vi.fn>;
    updateUser: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    reauthenticate: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
  __emit: (event: string, session: MockSessionData) => void;
};

export function createMockSupabaseClient(options: {
  session?: MockSessionData;
  profile?: Profile | null;
  signInEmits?: boolean;
  signInError?: { message: string } | null;
  signUpError?: { message: string } | null;
  resetEmailError?: { message: string } | null;
  updateUserError?: { message: string; code?: string } | null;
  signOutError?: { message: string } | null;
  signOutEmits?: boolean;
  reauthenticateError?: { message: string } | null;
  profileError?: { message: string } | null;
  existingProfile?: Profile | null;
} = {}): MockSupabaseClient {
  const listeners = new Set<(event: string, session: MockSessionData) => void>();
  const emit = (event: string, session: MockSessionData) => {
    for (const listener of listeners) listener(event, session);
  };

  const defaultUser: User = {
    id: "user-1",
    aud: "authenticated",
    role: "authenticated",
    email: "alice@soravo.app",
    email_confirmed_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const session = options.session ?? null;
  const existingProfile = options.existingProfile ?? options.profile ?? null;
  let profileCreated = false;

  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    onAuthStateChange: vi.fn().mockImplementation((callback: (event: string, data: MockSessionData) => void) => {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(callback);
            },
          },
        },
      };
    }),
    signInWithPassword: vi.fn().mockImplementation(async () => {
      if (options.signInError) return { error: options.signInError };
      if (options.signInEmits) emit("SIGNED_IN", { user: defaultUser });
      return { error: null };
    }),
    signUp: vi.fn().mockResolvedValue(options.signUpError ? { error: options.signUpError } : { data: { user: null }, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue(options.resetEmailError ? { error: options.resetEmailError } : { error: null }),
    updateUser: vi.fn().mockResolvedValue(options.updateUserError ? { error: options.updateUserError } : { data: { user: defaultUser }, error: null }),
    signOut: vi.fn().mockImplementation(async (opts?: { scope?: string }) => {
      if (options.signOutError) return { error: options.signOutError };
      const scope = opts?.scope ?? "local";
      if (scope !== "others" && options.signOutEmits) emit("SIGNED_OUT", null);
      return { error: null };
    }),
    reauthenticate: vi.fn().mockResolvedValue(options.reauthenticateError ? { error: options.reauthenticateError } : { error: null }),
  };

  const from = vi.fn().mockImplementation((table: string) => {
    if (table !== "profiles") {
      const unsupported = chainResult({ data: null, error: { message: `unexpected table ${table}` } });
      return unsupported;
    }
    if (options.profileError) {
      return chainResult({ data: null, error: options.profileError });
    }
    if (!profileCreated) {
      profileCreated = true;
      const seen = existingProfile ? { data: existingProfile, error: null } : { data: null, error: null };
      return chainResult(seen);
    }
    const created: Profile = {
      id: defaultUser.id,
      display_name: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return chainResult({ data: created, error: null });
  });

  return { auth, from, __emit: emit };
}