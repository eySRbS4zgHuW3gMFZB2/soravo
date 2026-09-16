import type { AppSupabaseClient } from "../lib/supabase";
import type { Profile } from "../lib/auth-service";
import type { AccountDevice, AccountSession, Entitlement } from "../lib/account-service";
import type { AdminTotals, GrowthBucket } from "../lib/admin-metrics-service";
import type { AdminDirectoryUser } from "../lib/admin-users-service";

// WEB-010 deterministic browser test doubles.
//
// These fixtures only ever load through the dev-only E2E harness
// (src/test-utils/e2e-harness.tsx), which main.tsx gates behind
// `import.meta.env.DEV && VITE_E2E_TEST_MODE === "true"`. They replace the
// Supabase network stack with an in-memory client that emits auth state like
// the real SDK so Playwright can drive the shipped pages deterministically.
// Nothing here bypasses a production boundary: server-side authorization is
// still enforced by the Supabase RLS/RPC suites and the Vitest service tests,
// and this module ships in no production bundle.

export type E2EScenario = "anon" | "user" | "admin";

export const E2E_LOGIN_EMAIL = "ada@example.com";
export const E2E_LOGIN_PASSWORD = "correct-horse-battery";

const GENERATED_AT = "2026-09-16T12:00:00.000Z";

const ANON_USER_ID = "e2e-user-ada";
const USER_ID = "e2e-user-test";
const OWNER_ID = "e2e-owner-test";

type FakeUser = { id: string; email: string };
type FakeSession = { user: FakeUser };

type FakeEnvelope<T = unknown> = {
  data: T | null;
  error: { message: string; code?: string } | null;
};

type ScenarioState = {
  session: FakeSession | null;
  profiles: Map<string, Profile>;
  entitlements: Entitlement[];
  devices: AccountDevice[];
  sessions: AccountSession[];
  totals: AdminTotals | null;
  growth: GrowthBucket[];
  activeUsers: number;
  directoryUsers: AdminDirectoryUser[];
};

function makeProfile(id: string, role: Profile["role"], display_name: string | null): Profile {
  return {
    id,
    display_name,
    role,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function directoryUser(index: number): AdminDirectoryUser {
  const padded = String(index + 1).padStart(6, "0");
  const isGina = index === 16;
  const created = new Date(Date.UTC(2026, 0, 1 + (index % 27), 8, 15)).toISOString();
  const seen = new Date(Date.UTC(2026, 8, 1 + (index % 15), 9, 30)).toISOString();
  return {
    public_user_id: `usr-${padded}`,
    email: isGina ? "gina@example.com" : `user${padded}@example.com`,
    display_name: isGina ? "Gina Ricci" : `User ${index + 1}`,
    role: index === 0 ? "admin" : "user",
    account_status: "active",
    created_at: created,
    updated_at: created,
    last_sign_in_at: seen,
    entitlement:
      index % 4 === 0
        ? {
            plan: "Pro monthly",
            status: "active",
            starts_at: created,
            expires_at: null,
          }
        : null,
    devices:
      index % 5 === 0
        ? {
            count: 2,
            active: 1,
            platforms: { macOS: 1, Windows: 1 },
            last_seen_at: seen,
          }
        : { count: 0, active: 0, platforms: {}, last_seen_at: null },
    sessions:
      index % 3 === 0
        ? { count: 1, active: 1, last_seen_at: seen }
        : { count: 0, active: 0, last_seen_at: null },
  };
}

function buildDirectoryUsers(): AdminDirectoryUser[] {
  return Array.from({ length: 27 }, (_, index) => directoryUser(index));
}

function buildState(scenario: E2EScenario): ScenarioState {
  const anonSession: FakeSession | null = null;
  const userState: ScenarioState = {
    session: { user: { id: USER_ID, email: "tester@example.com" } },
    profiles: new Map([[USER_ID, makeProfile(USER_ID, "user", "Test User")]]),
    entitlements: [],
    devices: [],
    sessions: [],
    totals: null,
    growth: [],
    activeUsers: 0,
    directoryUsers: [],
  };
  const adminState: ScenarioState = {
    session: { user: { id: OWNER_ID, email: "owner@example.com" } },
    profiles: new Map([[OWNER_ID, makeProfile(OWNER_ID, "admin", "Owner")]]),
    entitlements: [
      {
        product: "Soravo Desktop",
        plan: "Lifetime licence",
        status: "active",
        starts_at: "2026-01-10T09:30:00.000Z",
        expires_at: null,
        updated_at: "2026-01-10T09:30:00.000Z",
      },
    ],
    devices: [
      {
        device_public_id: "dev-0000abcd",
        platform: "macOS",
        app_version: "1.4.2",
        first_seen_at: "2026-02-01T10:00:00.000Z",
        last_seen_at: "2026-09-10T08:00:00.000Z",
        revoked_at: null,
      },
    ],
    sessions: [
      {
        session_public_id: "ses-0000wxyz",
        created_at: "2026-09-01T07:00:00.000Z",
        last_seen_at: "2026-09-10T08:00:00.000Z",
        revoked_at: null,
        devices: {
          device_public_id: "dev-0000abcd",
          platform: "macOS",
          app_version: "1.4.2",
        },
      },
    ],
    totals: {
      total_users: 128,
      paid_users: 12,
      subscriptions: { active: 399, cancelled: 24, expired: 2, total: 425 },
      lifetime: { active: 118, revoked: 6, total: 124 },
      devices: { total: 44, revoked: 2, by_platform: { macos: 31, windows: 11, linux: 2 } },
      generated_at: GENERATED_AT,
    },
    growth: [
      { bucket: "2026-08-18", new_users: 2 },
      { bucket: "2026-08-19", new_users: 3 },
      { bucket: "2026-08-20", new_users: 1 },
      { bucket: "2026-08-21", new_users: 4 },
      { bucket: "2026-08-22", new_users: 2 },
    ],
    activeUsers: 38,
    directoryUsers: buildDirectoryUsers(),
  };

  if (scenario === "user") return userState;
  if (scenario === "admin") return adminState;
  return {
    session: anonSession,
    profiles: new Map<string, Profile>(),
    entitlements: [],
    devices: [],
    sessions: [],
    totals: null,
    growth: [],
    activeUsers: 0,
    directoryUsers: [],
  };
}

// Minimal thenable PostgREST-style chain. Every page call pattern used by the
// shipped services is supported: select/eq(…)/maybeSingle/returns, insert/
// select/single/returns, update/eq (awaited directly), and select/order/returns
// for the account lists. The object doubles as a thenable so `await` resolves
// to the { data, error } envelope the services destructure.
class FakePipe {
  private op: "select" | "insert" | "update" = "select";
  private insertData: { id?: string } | null = null;
  private updateData: { display_name?: string } | null = null;
  private idFilter: string | null = null;

  constructor(
    private readonly table: string,
    private readonly state: ScenarioState,
  ) {}

  private resolve(): Promise<FakeEnvelope> {
    if (this.op === "insert") {
      const profile = this.state.profiles.get(this.insertData?.id ?? "");
      if (profile) return Promise.resolve({ data: profile, error: null });
      const created = makeProfile(this.insertData?.id ?? "unknown", "user", null);
      this.state.profiles.set(created.id, created);
      return Promise.resolve({ data: created, error: null });
    }
    if (this.op === "update") {
      if (this.idFilter && this.updateData?.display_name !== undefined) {
        const current = this.state.profiles.get(this.idFilter);
        if (current) {
          this.state.profiles.set(this.idFilter, { ...current, display_name: this.updateData.display_name });
        }
      }
      return Promise.resolve({ data: null, error: null });
    }
    if (this.table === "profiles") {
      const profile = this.idFilter ? (this.state.profiles.get(this.idFilter) ?? null) : null;
      return Promise.resolve({ data: profile, error: null });
    }
    if (this.table === "entitlements") {
      return Promise.resolve({ data: this.state.entitlements, error: null });
    }
    if (this.table === "devices") {
      return Promise.resolve({ data: this.state.devices, error: null });
    }
    if (this.table === "sessions") {
      return Promise.resolve({ data: this.state.sessions, error: null });
    }
    return Promise.resolve({ data: [], error: null });
  }

  select(): this {
    this.op = "select";
    return this;
  }

  insert(data: { id?: string }): this {
    this.op = "insert";
    this.insertData = data;
    return this;
  }

  update(data: { display_name?: string }): this {
    this.op = "update";
    this.updateData = data;
    return this;
  }

  eq(column: string, value: unknown): this {
    if (column === "id" && typeof value === "string") this.idFilter = value;
    return this;
  }

  order(): this {
    return this;
  }

  maybeSingle(): this {
    return this;
  }

  single(): this {
    return this;
  }

  returns(): this {
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.resolve().then(onfulfilled, onrejected);
  }
}

export function createScenarioClient(scenario: E2EScenario): AppSupabaseClient {
  const state = buildState(scenario);
  const listeners = new Set<(event: string, session: FakeSession | null) => void>();

  function notify(event: string, session: FakeSession | null): void {
    for (const listener of listeners) listener(event, session);
  }

  function directoryPage(search: string | null, offset: number) {
    const total = state.directoryUsers.length;
    const searchTerm = search?.toLowerCase() ?? null;
    if (searchTerm) {
      const users = state.directoryUsers.filter(
        (user) =>
          (user.email ?? "").toLowerCase().includes(searchTerm) ||
          (user.display_name ?? "").toLowerCase().includes(searchTerm) ||
          user.public_user_id.toLowerCase().includes(searchTerm),
      );
      return {
        users,
        has_more: false,
        page_size: 25,
        offset: 0,
        search,
        generated_at: GENERATED_AT,
      };
    }
    const page = state.directoryUsers.slice(offset, offset + 25);
    return {
      users: page,
      has_more: offset + 25 < total,
      page_size: 25,
      offset,
      search: null,
      generated_at: GENERATED_AT,
    };
  }

  const auth = {
    getSession: async () => ({ data: { session: state.session }, error: null }),
    onAuthStateChange: (callback: (event: string, session: FakeSession | null) => void) => {
      const listener = (event: string, session: FakeSession | null) => callback(event, session);
      listeners.add(listener);
      return {
        data: { subscription: { unsubscribe: () => listeners.delete(listener) } },
      };
    },
    signInWithPassword: async (input: { email: string; password: string }) => {
      if (input.email !== E2E_LOGIN_EMAIL || input.password !== E2E_LOGIN_PASSWORD) {
        return { data: { session: null, user: null }, error: { message: "Invalid login credentials" } };
      }
      const user: FakeUser = { id: ANON_USER_ID, email: E2E_LOGIN_EMAIL };
      const session: FakeSession = { user };
      state.session = session;
      notify("SIGNED_IN", session);
      return { data: { session, user }, error: null };
    },
    signUp: async () => ({ data: { user: null }, error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
    signOut: async () => {
      state.session = null;
      notify("SIGNED_OUT", null);
      return { error: null };
    },
    updateUser: async () => ({ error: null }),
    reauthenticate: async () => ({ error: null }),
  };

  const client = {
    auth,
    from: (table: string) => new FakePipe(table, state),
    rpc: async (name: string, params?: Record<string, unknown>) => {
      if (name === "admin_users" && state.directoryUsers.length > 0) {
        const search = typeof params?.p_search === "string" ? params.p_search : null;
        const offset = typeof params?.p_offset === "number" ? params.p_offset : 0;
        return { data: directoryPage(search, offset), error: null };
      }
      if (name === "admin_metrics_totals") {
        return {
          data: state.totals,
          error: state.totals ? null : { message: "CLOUD-007: admin access required" },
        };
      }
      if (name === "admin_metrics_growth") {
        return { data: state.growth, error: null };
      }
      if (name === "admin_metrics_active_users") {
        return { data: state.activeUsers, error: null };
      }
      return { data: null, error: { message: "Unknown RPC" } };
    },
  };

  return client as unknown as AppSupabaseClient;
}

export function resolveScenario(raw: string | null): E2EScenario {
  if (raw === "user" || raw === "admin") return raw;
  return "anon";
}