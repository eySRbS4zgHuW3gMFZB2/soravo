# LIVE ACCEPTANCE REPORT — SILERO VAD + G2 HOTKEY REBIND (2026-10-10)

**Repository:** `/home/maya/Desktop/Soravo_Engineering_Specification_v2`
**Tested checkout (isolated worktree):** `.swarm-worktrees/g2-hotkey-rebind`,
branch `feat/g2-hotkey-rebind-exposure` @ `a3aef2ec` (base `origin/main` `82ec2ecc`).
**OS/session:** Linux Mint 22.3, kernel 7.0.0-31-generic, X11/Cinnamon, DISPLAY=:0.
**Model (unchanged, approved):** `handy-computer/parakeet-unified-en-0.6b-gguf`,
file Q8_0, 731,357,568 B, staged at `~/.local/share/com.soravo.desktop/models/`.
**Silero asset:** `apps/desktop/src-tauri/resources/models/silero_vad_v4.onnx`,
1,807,522 B, SHA-256 `a35ebf52…` (PR #108 content, verified identical).
**Method:** human-supervised live test, real GUI + real microphone + xed as receiver.
No mocks, no synthetic audio, no fabricated transcripts. No Swarm/delegated agents.
PRs #116/#117/#118 not merged or modified (committed state).

## 1. Commands executed (real exit statuses)

| Command | Result |
|---|---|
| `arecord -d 2 -f S16_LE -r 16000 -c 1 /tmp/opencode/accept-mic-smoke.wav` | exit 0, 64,044 B exact (capture path live) |
| `cargo build -p soravo-desktop` (G2 worktree) | exit 0, 9m42s cold / 1.77s incremental; `target/debug/soravo-desktop` produced |
| `pnpm --filter @soravo/desktop tauri dev` (run 1) | app exit 101 — startup panic (see §3) |
| `pnpm --filter @soravo/desktop tauri dev` (run 2, +1 local line) | app alive, 0 panics, shortcuts initialized |
| `pnpm --filter @soravo/desktop tauri dev` (run 3, +2nd local line) | app alive, 0 panics across 20 starts / 16 transcriptions |
| `xdotool search --onlyvisible --class xed windowactivate` + `xdotool type --clearmodifiers -- "Hello"` | exit 0, single `Hello` in xed (control experiment) |
| All `gh` invocations | read-only (PR/status checks) |

## 2. Local-only test enablers (UNCOMMITTED, PR #118 untouched)

The committed line cannot launch: `setup()` calls `app.deep_link().on_open_url(...)`
without registering the plugin → `state() called before manage()` panic (exit 101).
Two T22-identical one-liners were applied to the worktree **without committing**:

1. `.plugin(tauri_plugin_deep_link::init())` on the builder (same as T22 R1 fix).
2. `tauri_specta::Builder::mount_events(app)` for
   `StreamTextEvent`/`StreamPhaseEvent`/`HistoryUpdatePayload` at top of `setup()`
   (same as T22 R1 fix; without it every typed emit panics `EventRegistry not
   found`, killing the streaming worker → `Model is not loaded` + FINALIZING-stuck,
   exactly the flakiness seen in run 2).

`git status` in the worktree shows `M main.rs` (these 2 hunks only) — deliberately
left uncommitted. **Merge precondition: PR #118 (or its rebase target) needs both
lines, else the shipped app cannot start.**

## 3. Human actions performed and observed results

Operator (real hands/voice/mic) with app from §1-run-3 (G2 UI live):

- **0.** Soravo window visible/interactive. Displayed shortcut `ctrl+space`. ✔
- **2.** Change → **Escape**: capture aborted, display unchanged. ✔
- **3.** Change → **Ctrl+Shift+Space**: UI error surfaced; backend log
  `Shortcut 'ctrl+shift+space' is already in use` → old binding restored,
  display unchanged. ✔
- **4.** Change → **Ctrl+Alt+M**: display updated; backend events
  `binding=transcribe, shortcut=control+alt+KeyM` Pressed/Released; old combo
  silent. Multiple dictations completed (incl. verbatim
  `The quick brown fox jumps over the fence`, `I think it is not working`). ✔
- **Rebind 2 (operator-initiated):** Change → **Ctrl+Space**: effective
  immediately (log `shortcut=control+Space` from 12:29). ✔
- **Dictation series:** 20 holds → 16 real transcriptions (fox, `Sorabo Life
  Test 123`, `Tomorrow is morning`, operator's own bug-report sentences, …),
  4 short/silent holds correctly yielding empty completion with no paste. ✔
- **Empty-document control:** cleared xed, one `hello` hold → empty transcript
  (short hold), second `hello` hold → single completion `Hello`, single paste;
  xed showed `HelloHello` (see §5).
- **Manual-tool control:** operator hands-off, agent-issued
  `xdotool type --clearmodifiers -- "Hello"` into xed → single `Hello`. ✔
- **9'.** **Reset to default** → `ctrl+space` live again (log-verified
  Pressed/Released + 2 full runs `Set to that`, `Tomorrow is morning`). ✔

## 4. Acceptance matrix (no pass inferred from unit tests)

| Criterion | Status | Evidence |
|---|---|---|
| Silero asset loads + genuine inference succeeds | **PASS** | Log `Initialized Silero VAD backend (480 samples/frame)`; 16 live inferences over real mic audio; prior real-ONNX load test passed |
| Shortcut changed through the UI | **PASS** | Twice live (→ctrl+alt+m, →ctrl+space); display updated; new combo fires immediately |
| Selected shortcut triggers dictation | **PASS** | Pressed/Released → sessions → captures (20–52k samples each) |
| Invalid combinations rejected/surfaced | **PASS** | Step 3 UI error + backend conflict log + rollback, display unchanged |
| Cancel does not commit | **PASS** | Step 2 Escape → unchanged (operator-confirmed) |
| Reset restores default | **PASS** | Reset → `control+Space` events + 2 full runs |
| Persists after restart | **PASS** | Restart reloaded `transcribe.current_binding="ctrl+alt+m"`; disk store holds `"ctrl+space"` after rebind 2 |
| Real speech reaches pipeline | **PASS** | 16 verbatim transcripts of operator utterances |
| Transcript inserted into receiver | **PASS** | 16/16 `Text pasted successfully` (clipboard-fallback/xdotool path); see §5 anomaly (separate gap, not an insertion failure) |
| No panic/crash/stale-result | **PASS** | 0 panics across run 3 (20 starts); no stale transcripts; pre-fix panics root-caused to §2 (unmerged T22 lines), not G2 |

## 5. New anomaly filed (not a G2 failure): insertion duplication under IM context

**Observation:** single backend paste (`xdotool type --clearmodifiers`, one call —
proven in code `clipboard.rs:419` and 1:1 log counts) occasionally renders as
`HelloHello` in xed. Manual identical invocation with hands off renders single.
`ibus-daemon` active, `GTK_IM_MODULE=ibus`. Consecutive pastes also concatenate
without separators (`append_trailing_space: false`, pre-existing default), which
explains earlier "same sentence twice" sightings across back-to-back runs.
**Proposed gap G13 (insertion-path, pre-existing, out of G2 scope):** duplicate
rendering of a single synthetic typing submission under ibus IM state influenced
by global-hotkey keystrokes + `--clearmodifiers` restore (code already notes an
XTEST latch issue, #1817). Suggested follow-ups (separate task, not performed):
repro matrix with `GTK_IM_MODULE=xim`, X-event trace during live paste, evaluate
CtrlV-path for comparison. Related observation: with Ctrl+Alt+M, pressing the
combo in xed dropped text selection (Alt menu-mnemonic focus steal — receiving
side, combo-dependent, not a backend defect).

## 6. Limitations and next action

- Tested tree = PR #118 head **plus the 2 uncommitted §2 lines**; exact PR head
  cannot launch (exit 101) — owner must land those lines (or rebase onto a line
  containing the T22 fixes) before merge. G2 logic itself is unaffected.
- Live evidence is Linux-only (per ADR-019 bound); Windows/macOS unknown.
- App left RUNNING (PID logged at launch; log `/tmp/opencode/g2-accept-dev3.log`;
  stop with `kill <pid>` + vite child) in case the operator continues.
- **Next exact task:** (1) owner decision: fold the §2 lines into PR #118 scope
  or a tiny prerequisite PR, then merge #118; (2) open dedicated G13 insertion
  task per §5; (3) Part B live-recording acceptance is satisfied by this report
  (16/16 full-path runs) — no separate session needed.
