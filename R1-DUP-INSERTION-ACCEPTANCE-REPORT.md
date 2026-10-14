# R1-DUP-INSERTION Acceptance Report (supervised VERIFIED RESOLVED)

Date: 2026-10-11 · Worktree: `.swarm-worktrees/r1-dup-insertion-fix` @ detached
`242e166d16c06822510e99d29624bb4256eff41e` + 2 uncommitted files (`actions.rs`
`61ef2eb0…`, `session_pipeline.rs` `d03d758e…` — hashes verified unchanged pre/post session).
Binary: `target/debug/soravo-desktop`, dev profile, rebuilt from the fix worktree
(incremental on the prior full rebuild; 50G disk headroom confirmed before launch).

## Fix under test (IMPLEMENTED, unit-scoped)

Single insertion owner per finalized transcription (v6 §05 "never duplicate"):
`announce_transcription_finalized` returns whether a canonical Final was
emitted; the success arm announces the PROCESSED final text and routes via
`route_insertion()` — `AnnouncedFeed` (feed injects, paste skipped),
`DirectPaste` (no session, backend pastes), `SkipEmpty` (neither fires).
No timing or text-equality suppression. See `R1-DUP-INSERTION` entry in
canonical `PROGRESS.md` for the static H4 wiring proof.

## Live launch readiness (VERIFIED)

- `pnpm --filter @soravo/desktop tauri dev` (canonical path): Vite ready on
  :1420 (`curl` → HTTP 200); `cargo run` compiled clean, no updater panic;
  catalog seeded (69 models); history DB migrated v4; settings loaded.
- Window `Soravo` present (xwininfo); screenshot `/tmp/opencode/r1-dup-verify/window.png`
  shows the rendered Settings → Microphone view (navigation + cards, not white).
- Config observed (read-only): `paste_method: Direct`, `post_process_enabled: false`
  (same shape as the reporting user's config). Nothing was changed.

## Supervised trials (VERIFIED — 5/5 non-empty finals inserted exactly once)

Operator session (mic capture restored per MIC-RECHECK): disposable Xed receiver on
temp file `/tmp/opencode/r1-dup-accept2-receiver.txt`, focus verified by dual signal
before trial 1, empty-start verified (0 bytes). Vite :1420 HTTP 200, Soravo window
rendered ("Ready when you are", screenshot `/tmp/opencode/r1-dup-accept2-window.png`).
No synthetic input, no playback, no loopback, no fabricated traces.

Log-proven per-final routing (dev log `/tmp/opencode/r1-dup-accept2-tauri-dev.log`):

| # | Log time | Samples | Final transcription | Insertion path |
|---|---|---|---|---|
| 1 | 08:01:55 | 20000 | `So Rabbur` | 1× feed handoff, paste skipped |
| 2 | 08:02:22 | 47520 | `Prabhu Guan Zibra` | 1× feed handoff, paste skipped |
| 3 | 08:02:30 | 41280 | `Sorabo one zebra` | 1× feed handoff, paste skipped |
| 4 | 08:03:35 | 20000 | `` (empty) | correctly skipped (no insertion) |
| 5 | 08:03:40 | 31200 | `Am I audible` | 1× feed handoff, paste skipped |
| 6 | 08:04:10 | — | `Today is morning and I have to go out at 5 p.m. I haven't been ready right now. I have to go and get a shower` | 1× feed handoff, paste skipped |

Every non-empty final logged exactly once `Direct paste skipped: canonical Final
already handed to the injection feed` — the fixed single-owner path firing live, 5/5.
Native injection `NotImplemented` WARN each time is the known Linux platform limitation
(same as T22); the feed fallback performed the insertion. No dual-fire, no second
insertion action for any final. Trials 1–3 (token attempts) are the ≤3 budget;
trials 4–6 (mic-check, real-world message) are supplementary and consistent.

Readback: Xed buffer screenshot (`/tmp/opencode/r1-dup-accept2-readback.png`) shows
the 40-word message present EXACTLY once, no doubling. (Disk file stayed 0 bytes
because the buffer was never saved — readback is visual, stated honestly.) Operator
testimony: text appeared in the Xed receiver, every appearance single, never doubled.
Transcription accuracy limits from the operator's accent (e.g. `Sorabo one zebra` for
`soravo one zebra`) are model quality, explicitly out of scope — operator fine with it.
Cancellation / stale-result exercise: DEFERRED (Linux cancel is a no-op by design, T22).

## Environmental keypresses (observed, NOT trials)

Unrelated to the two supervised attempts above: no environment-originated hotkey
events were observed during this session's launch (contrast prior session's
0-sample environmental `ctrl+Space` pairs). Both 0-sample recordings here
correlate exactly with the operator's supervised holds.

## Cancellation / stale-result handling (NOT EXECUTED live)

Preserved by construction (all `was_cancelled_since` gates, coordinator logic,
and frontend fold untouched) and covered by unit suites: `cargo test
-p soravo-desktop --lib` 297/297, `injection-feed.test.ts` 16/16,
session suites 20/20. Live exercise requires the same supervised setup as trials.

## Labels

- Cause (dual-layer wiring): VERIFIED (static).
- Fix: IMPLEMENTED (unit-scoped) + VERIFIED LIVE (single-owner routing 5/5 finals).
- Launch-with-fix readiness: VERIFIED (rebuilt + rendered this session).
- Supervised single-insertion trials: VERIFIED RESOLVED — 5/5 non-empty finals,
  exactly one insertion each (log-proven single routing, visual single readback,
  operator-confirmed single appearance, zero doublings).
- User-facing resolution: VERIFIED RESOLVED.
- G13 runtime experiment: unblocked by restored capture (this session's evidence).

## Next safe step

Acceptance COMPLETE — VERIFIED RESOLVED. Session teardown: all task-launched
processes stopped (`tauri dev` chain; :1420 freed). Operator's Xed window (with their
unsaved personal text) deliberately left running and untouched; disposable temp files
and screenshots preserved in /tmp as evidence. No commit/push/merge/deploy performed;
no secrets, audio, transcripts, or keystrokes recorded here beyond the operator-quoted
insertion readback above.
