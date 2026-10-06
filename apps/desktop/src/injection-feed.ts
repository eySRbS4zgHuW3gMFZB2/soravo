import {
  injectText,
  onSessionChanged,
  onTranscriptUpdate,
  type SessionSnapshot,
  type SessionTransition,
  type TranscriptUpdate,
  type TypingResult,
} from "./ipc";
import {
  applySessionSnapshot,
  applySessionTransition,
  applyTranscriptUpdate,
  createSessionFeed,
  type SessionFeedState,
} from "./session-feed";

/**
 * R1-GAP-015 — frontend `inject_text` wiring over the EXISTING canonical
 * session/transcript event bus.
 *
 * Reused contracts (nothing reinvented, no second system):
 * - `inject_text` command + `injectText` wrapper (`ipc.ts`) + `TypingResult`
 *   (`soravo-typing`: native insertion with clipboard fallback, server-side
 *   100KB bound, result emitted on `typing://result`). This module never
 *   types, normalizes, or pastes text itself.
 * - Transcript/session semantics (`soravo-transcript`: `TranscriptOrder` /
 *   `TranscriptState`; `SessionMachine::is_current`) as folded by the
 *   R1-GAP-012 pure fold (`session-feed.ts`). Injection NEVER re-interprets
 *   ordering, identity, or staleness: it observes the fold's accept/reject
 *   verdict (reference equality) and adds exactly one concern — identity-keyed
 *   exactly-once delivery.
 *
 * Canonical injection rule (mirrors `TranscriptState::update` + v6 §05:
 * tentative = UI only; committed = stable/injectable; final =
 * complete/injectable):
 * - `Tentative` → never injected (UI preview only).
 * - `Committed` / `Final` → injected exactly once per unique
 *   `session_id:sequence` identity, and only when the canonical fold ACCEPTED
 *   the update for the CURRENT active session (wrong-session, inactive, and
 *   duplicate/stale-sequence updates are rejected by the fold first, so they
 *   can never reach `inject_text`).
 *
 * Delivery guarantees:
 * - Exactly-once is keyed by deterministic transcript identity
 *   (`session_id:sequence`), never by timing/debounce, so duplicate bus
 *   delivery, React rerender/remount, re-subscription, and replayed state
 *   cannot double-inject while the controller (key set) is retained.
 * - The key is consumed on the FIRST attempt even when the backend reports
 *   failure: failures never retry (no retry loop) and never claim success.
 * - Failures preserve session state (the fold is untouched), are recorded on
 *   the controller (`lastError`, observable/testable), and are routed to the
 *   caller's `onInjectionError`. No product contract specifies broader
 *   injection-error session semantics, so no new notification surface or
 *   session transition is invented here.
 * - No backend modification: Handy-derived typing/clipboard behavior in
 *   `soravo-typing` is preserved verbatim.
 */

/** Deterministic identity of one injectable transcript delivery. */
export type InjectionKey = string;

/** Terminal record of one failed injection attempt. */
export type InjectionFailure = {
  key: InjectionKey;
  sessionId: number;
  sequence: number;
  text: string;
  reason: string;
};

/** One deliverable injection decided from an accepted transcript update. */
export type InjectionDecision = {
  key: InjectionKey;
  text: string;
};

/**
 * Mutable holder owned by ONE subscriber (component `useRef` / test). The
 * folds it applies stay pure (`session-feed.ts`); only the holder fields are
 * reassigned, so re-subscribing the same controller never loses exactly-once
 * memory.
 */
export type InjectionController = {
  feed: SessionFeedState;
  /** Consumed `session_id:sequence` identities (current session only). */
  injected: Set<InjectionKey>;
  lastError: InjectionFailure | null;
  injectedCount: number;
};

export function createInjectionController(): InjectionController {
  return {
    feed: createSessionFeed(),
    injected: new Set<InjectionKey>(),
    lastError: null,
    injectedCount: 0,
  };
}

/** Deterministic identity key — the duplicate/stale rejection key. */
export function injectionKey(update: TranscriptUpdate): InjectionKey {
  return `${update.session_id}:${update.sequence}`;
}

function pruneToSession(controller: InjectionController): void {
  const current = controller.feed.sessionId;
  if (current === null) {
    controller.injected.clear();
    return;
  }
  const prefix = `${current}:`;
  for (const key of controller.injected) {
    if (!key.startsWith(prefix)) {
      controller.injected.delete(key);
    }
  }
}

/** Fold a canonical session transition; prunes stale-session keys on epoch change. */
export function applyInjectionSession(
  controller: InjectionController,
  transition: SessionTransition
): void {
  controller.feed = applySessionTransition(controller.feed, transition);
  pruneToSession(controller);
}

/** Fold an initial snapshot (e.g. hydrated from `getRuntimeStatus`). */
export function applyInjectionSnapshot(
  controller: InjectionController,
  snapshot: SessionSnapshot
): void {
  controller.feed = applySessionSnapshot(controller.feed, snapshot);
  pruneToSession(controller);
}

/**
 * Pure injection decision for one transcript update.
 *
 * The caller folds FIRST (`next = applyTranscriptUpdate(feed, update)`) and
 * passes both states: `next === before` means the canonical fold rejected the
 * update (wrong session / no active session / duplicate-stale sequence), so
 * there is nothing to inject. Only an ACCEPTED `Committed`/`Final` whose
 * identity was not already consumed may reach `inject_text`. Returns `null`
 * otherwise. No side effects.
 */
export function decideInjection(
  before: SessionFeedState,
  after: SessionFeedState,
  update: TranscriptUpdate,
  injected: ReadonlySet<InjectionKey>
): InjectionDecision | null {
  if (update.kind !== "Committed" && update.kind !== "Final") {
    return null;
  }
  if (after === before) {
    return null;
  }
  if (after.sessionId !== update.session_id) {
    return null;
  }
  const key = injectionKey(update);
  if (injected.has(key)) {
    return null;
  }
  return { key, text: update.text };
}

/**
 * Fold a transcript update into the controller and return the injection
 * decision. Convenience over `applyTranscriptUpdate` + `decideInjection` for
 * subscribers; tests may use the pieces directly.
 */
export function applyInjectionTranscript(
  controller: InjectionController,
  update: TranscriptUpdate
): InjectionDecision | null {
  const before = controller.feed;
  const after = applyTranscriptUpdate(before, update);
  controller.feed = after;
  return decideInjection(before, after, update, controller.injected);
}

export type InjectionDependencies = {
  /** Defaults to the existing `injectText` wrapper. Override only in tests. */
  inject?: (text: string) => Promise<TypingResult>;
  /** Failure sink. Defaults to recording on the controller only. */
  onInjectionError?: (failure: InjectionFailure) => void;
};

/**
 * Perform one decided injection. The identity key is consumed BEFORE the IPC
 * call so a concurrent duplicate delivery can never double-invoke; a failure
 * (rejected promise OR `success: false`) is terminal for that identity —
 * recorded on the controller and routed to `onInjectionError`, never
 * retried, never reported as success. Session state is preserved in all
 * cases. Never throws.
 */
export async function fireInjection(
  controller: InjectionController,
  decision: InjectionDecision,
  update: TranscriptUpdate,
  dependencies: InjectionDependencies = {}
): Promise<TypingResult | null> {
  const inject = dependencies.inject ?? injectText;
  controller.injected.add(decision.key);
  let result: TypingResult;
  try {
    result = await inject(decision.text);
  } catch (error) {
    const failure: InjectionFailure = {
      key: decision.key,
      sessionId: update.session_id,
      sequence: update.sequence,
      text: decision.text,
      reason: error instanceof Error ? error.message : String(error),
    };
    controller.lastError = failure;
    dependencies.onInjectionError?.(failure);
    return null;
  }
  if (!result.success) {
    const failure: InjectionFailure = {
      key: decision.key,
      sessionId: update.session_id,
      sequence: update.sequence,
      text: decision.text,
      reason: result.message,
    };
    controller.lastError = failure;
    dependencies.onInjectionError?.(failure);
    return result;
  }
  controller.injectedCount += 1;
  return result;
}

/**
 * Subscribe once to each canonical bus and inject accepted committed/final
 * transcript text through the existing `inject_text` contract. Exactly one
 * `listen` per bus (same architecture as `subscribePillFeed`); resolves to a
 * single combined unsubscribe. In-flight invoke outcomes after unsubscribe
 * only touch controller bookkeeping — no new bus event can fire post-cleanup
 * (internal active flag + removed listeners; the caller's disposed flag
 * remains the React-side guard, as in `app.tsx`).
 */
export function subscribeInjectionFeed(
  controller: InjectionController,
  dependencies: InjectionDependencies = {}
): Promise<() => void> {
  let active = true;
  return Promise.all([
    onSessionChanged((payload) => {
      if (!active) return;
      applyInjectionSession(controller, payload.transition);
    }),
    onTranscriptUpdate((update) => {
      if (!active) return;
      const decision = applyInjectionTranscript(controller, update);
      if (decision === null) return;
      void fireInjection(controller, decision, update, dependencies);
    }),
  ]).then(([unSession, unTranscript]) => () => {
    active = false;
    unSession();
    unTranscript();
  });
}
