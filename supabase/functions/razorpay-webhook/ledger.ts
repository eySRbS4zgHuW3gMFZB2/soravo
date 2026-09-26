// Idempotency claim ledger for the Razorpay webhook (021 findings F2 and F12).
//
// The state machine is deliberately isolated from the database driver: the
// handler owns HTTP and Supabase wiring, this module owns the *decision* about
// whether a delivery may run, and the store abstraction owns the compare-and-
// swap. That split is what makes "exactly one grant per logical event" a
// property we can actually test (supabase/tests/webhook-hardening.test.mjs)
// instead of an aspiration.
//
// States (migration 20260926140000):
//
//   (absent) --insert--> processing --release(completed)--> completed
//                                  \--release(failed)-----> failed
//   completed  : terminal. A duplicate delivery is acknowledged, never reprocessed.
//   failed     : reclaimable. A later delivery retries from the start.
//   processing : leased. A retry may take it over only after `leaseMs`, which
//                covers a worker that died mid-run without releasing the claim.
//
// Only `completed` may answer 2xx. Every other path either retries (5xx) or is
// refused (4xx/409), so money is never silently dropped.
//
// Concurrency: `claim` reads the row, then writes with a compare-and-swap on
// the exact `(status, claimed_at)` it observed. Two simultaneous deliveries
// therefore cannot both win — the loser's CAS matches zero rows and it is told
// the event is in flight (409) so Razorpay retries later.

export const LEDGER_LEASE_MS = 5 * 60 * 1000;
export const MAX_ERROR_LENGTH = 500;

export type LedgerRelease = "completed" | "failed";

export type LedgerRow = {
  status: string;
  claimed_at: string | null;
  attempts: number | null;
};

export type LedgerClaimPatch = {
  claimedAt: string;
  attempts: number;
};

export type LedgerStore = {
  /** Returns the stored row, or null when the event has never been seen. */
  read(eventId: string): Promise<LedgerRow | null>;
  /** Returns true when the row was created, false on a unique-violation race. */
  insert(
    eventId: string,
    eventType: string,
    claim: LedgerClaimPatch,
  ): Promise<boolean>;
  /** Atomic update guarded by the exact row state the caller observed. */
  compareAndSwap(
    eventId: string,
    expected: { status: string; claimedAt: string | null },
    claim: LedgerClaimPatch,
  ): Promise<boolean>;
  /** Terminal write for the claim identified by `claimedAt`. */
  release(
    eventId: string,
    claim: { claimedAt: string },
    outcome: LedgerRelease,
    reason: string | undefined,
    nowIso: string,
  ): Promise<boolean>;
};

export type Claim =
  | { kind: "claimed"; token: string }
  | { kind: "duplicate" }
  | { kind: "inflight" };

export type Ledger = {
  claim(eventId: string, eventType: string): Promise<Claim>;
  release(
    eventId: string,
    token: string,
    outcome: LedgerRelease,
    reason?: string,
  ): Promise<boolean>;
};

export class LedgerError extends Error {
  readonly operation: string;

  constructor(operation: string, detail: string) {
    super(`${operation}: ${detail}`);
    this.name = "LedgerError";
    this.operation = operation;
  }
}

export type LedgerOptions = {
  leaseMs?: number;
  maxErrorLength?: number;
  now?: () => number;
};

export function isTerminalFailure(status: string): boolean {
  return status === "completed";
}

export function isLeaseActive(
  row: LedgerRow,
  nowMs: number,
  leaseMs: number,
): boolean {
  if (row.status !== "processing") return false;
  const claimedAtMs = Date.parse(row.claimed_at ?? "");
  if (!Number.isFinite(claimedAtMs)) return false;
  return nowMs - claimedAtMs < leaseMs;
}

/**
 * Truncates a failure reason for the ledger. Reasons are operator-facing
 * diagnostics only: they are built from our own error codes, never from the
 * raw payload, and are length-bounded so a provider payload can never be
 * smuggled into the ledger.
 */
export function sanitizeReason(
  reason: string | undefined,
  maxErrorLength = MAX_ERROR_LENGTH,
): string {
  return (reason ?? "").slice(0, maxErrorLength);
}

export function createLedger(store: LedgerStore, options: LedgerOptions = {}): Ledger {
  const leaseMs = options.leaseMs ?? LEDGER_LEASE_MS;
  const maxErrorLength = options.maxErrorLength ?? MAX_ERROR_LENGTH;
  const now = options.now ?? Date.now;

  async function claim(eventId: string, eventType: string): Promise<Claim> {
    const nowIso = new Date(now()).toISOString();
    const row = await store.read(eventId);

    if (!row) {
      const created = await store.insert(eventId, eventType, {
        claimedAt: nowIso,
        attempts: 1,
      });
      // Lost the insert race against a concurrent delivery: the winner owns
      // this event, so we must not run the handler too.
      return created ? { kind: "claimed", token: nowIso } : { kind: "inflight" };
    }

    if (isTerminalFailure(String(row.status))) return { kind: "duplicate" };
    if (isLeaseActive(row, now(), leaseMs)) return { kind: "inflight" };

    // Either a `failed` row, or a `processing` row whose lease expired (the
    // worker died mid-run). Reclaim it with a compare-and-swap on the exact
    // observed state so two retries can never both win.
    const attempts = Number(row.attempts ?? 0);
    const swapped = await store.compareAndSwap(
      eventId,
      { status: String(row.status), claimedAt: row.claimed_at },
      {
        claimedAt: nowIso,
        attempts: Number.isFinite(attempts) ? attempts + 1 : 1,
      },
    );
    if (swapped) return { kind: "claimed", token: nowIso };

    // The CAS lost. Either the winner finished (answer as a duplicate) or it is
    // still running (tell Razorpay to retry). Never run the handler here.
    const after = await store.read(eventId);
    if (after && isTerminalFailure(String(after.status))) return { kind: "duplicate" };
    return { kind: "inflight" };
  }

  async function release(
    eventId: string,
    token: string,
    outcome: LedgerRelease,
    reason?: string,
  ): Promise<boolean> {
    return store.release(
      eventId,
      { claimedAt: token },
      outcome,
      outcome === "failed" ? sanitizeReason(reason, maxErrorLength) : undefined,
      new Date(now()).toISOString(),
    );
  }

  return { claim, release };
}

/**
 * In-memory LedgerStore with real compare-and-swap semantics.
 *
 * Used by the unit tests to exercise the exactly-once property, and safe to use
 * as a reference implementation of the contract the SQL store must satisfy.
 */
export function createMemoryLedgerStore(
  seed: Record<string, LedgerRow & { event_type?: string }> = {},
): LedgerStore & { snapshot(): Record<string, LedgerRow> } {
  const rows = new Map<string, LedgerRow & { event_type: string }>();
  for (const [eventId, row] of Object.entries(seed)) {
    rows.set(eventId, { ...row, event_type: row.event_type ?? "unknown" });
  }

  return {
    async read(eventId) {
      const row = rows.get(eventId);
      if (!row) return null;
      return { status: row.status, claimed_at: row.claimed_at, attempts: row.attempts };
    },
    async insert(eventId, eventType, claim) {
      if (rows.has(eventId)) return false;
      rows.set(eventId, {
        status: "processing",
        claimed_at: claim.claimedAt,
        attempts: claim.attempts,
        event_type: eventType,
      });
      return true;
    },
    async compareAndSwap(eventId, expected, claim) {
      const row = rows.get(eventId);
      if (!row) return false;
      if (row.status !== expected.status) return false;
      if ((row.claimed_at ?? null) !== (expected.claimedAt ?? null)) return false;
      row.status = "processing";
      row.claimed_at = claim.claimedAt;
      row.attempts = claim.attempts;
      return true;
    },
    async release(eventId, claim, outcome, reason, nowIso) {
      const row = rows.get(eventId);
      if (!row) return false;
      if (row.status !== "processing") return false;
      if (row.claimed_at !== claim.claimedAt) return false;
      row.status = outcome === "completed" ? "completed" : "failed";
      if (outcome === "completed") row.claimed_at = nowIso;
      return true;
    },
    snapshot() {
      const out: Record<string, LedgerRow> = {};
      for (const [eventId, row] of rows) {
        out[eventId] = {
          status: row.status,
          claimed_at: row.claimed_at,
          attempts: row.attempts,
        };
      }
      return out;
    },
  };
}
