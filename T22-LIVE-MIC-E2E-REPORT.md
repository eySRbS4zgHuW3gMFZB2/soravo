# T22 — SORAVO LIVE MICROPHONE-TO-TEXT E2E REPORT

**Generated:** 2026-10-10
**Task:** SORAVO Live Microphone-to-Text End-to-End Test
**Branch:** `feature/r1-gap-021-desktop-auth`
**Start SHA:** `18bc2133dc5805b24874dc4f16e64817437f91e9`
**End SHA:** `18bc2133dc5805b24874dc4f16e64817437f91e9` (no commit per instructions)
**Mode:** Verification-first, interactive (user operated mic, hotkey, desktop).

---

## 0. Verdict

| Leg | Result | Evidence |
|---|---|---|
| Microphone capture (real, non-silent, in-app) | **VERIFIED** | §3 (arecord) + §5 (in-app samples every run) |
| Real local Parakeet inference | **VERIFIED** | §5 (4 transcripts, CPU backend, load/infer timings) |
| OS-level text insertion into another application | **VERIFIED** | §5 (`Text pasted successfully` ×4, `inject_text success=true` ×4, user-confirmed visible text in external app) |
| Complete flow in the running app | **VERIFIED** | 4 consecutive full journeys, zero panics after fix |
| Repeat dictation | **VERIFIED** | 4/4 consecutive runs (a repeat-use killer bug was found and fixed, §7) |
| Cancellation via Escape | **NOT VERIFIED (by design on Linux)** | §7 — dynamically-registered cancel is an explicit no-op on Linux (`shortcut/mod.rs:99-105`) |
| Exact-phrase accuracy vs prescribed test sentence | **NOT EXECUTED as specified** | User spoke their own sentences; prescribed fox sentence never uttered. No speech fabricated. |
| Insertion into **xed** specifically | **NOT EXECUTED** | Receiving app was the opencode desktop text field (user-reported), not xed |

**Punctuation/capitalization:** user-observed mid-sentence errors (run 4 transcript self-reports this). Recorded as a model-quality observation, not a defect fix — no model/gate change made.

---

## 1. Inputs read

- `01_PRD.md` (skim), `02_TDD.md` (skim — desktop contracts), `09_SECURITY_BASELINE.md` (full — §15 model checksum, §18 no-audio/transcript logging by app),
  `11_INTERRUPTION_HANDOFF.md` (full), `12_BENCHMARK_PROTOCOL.md` (full).
- `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/package.json`, root `package.json` (launch workflow).
- **The two reports named in the task were NOT FOUND in the repo** (repo-wide glob+grep):
  `T10-PARAKEET-UNIFIED-IMPL-020-REPORT.md` and `T11-PARAKEET-DEVCLEAN-SPEECH-021-REPORT.md` do not exist.
  Consequence: the "0.00% WER / deterministic / previously verified" claims are **HISTORICAL/STALE (UNVERIFIED from this session)**.
  Nothing in this report relies on them; every claim below is from this session's evidence.

## 2. Pre-test state (established, not modified)

- Branch `feature/r1-gap-021-desktop-auth` @ `18bc2133`, dirty R1 worktree — **preserved; no reset/clean/commit/push/merge**.
  Pre-existing delta (R1 auth work, Silero deletions, etc.) left untouched; my footprint is §8 only.
- Parakeet artifact `parakeet-unified-en-0.6b-Q8_0.gguf`: **731,357,568 bytes**,
  SHA-256 `4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795`
  — **matches `catalog.json` Q8_0 entry exactly** (size + hash). Artifact identity: VERIFIED.
- Environment: X11 (`DISPLAY=:0`, Cinnamon), Intel ICH capture HW,
  PipeWire `alsa_input.pci-0000_00_05.0.analog-stereo`; `xed` and `xdotool` present; ibus trigger is
  `<Super>space` (NOT Ctrl+Space — ruled out as hotkey conflict).
- Documented GUI workflow: `pnpm --filter @soravo/desktop tauri dev` (vite :1420 + cargo run).
  Discovered from code (not guessed): transcribe hotkey `ctrl+space`, cancel `escape` (Linux defaults,
  `settings.rs:863-908`); insertion = clipboard + paste chord (`clipboard::paste`, enigo/xdotool).

## 3. Microphone pre-verification (before opening SORAVO) — VERIFIED

- `arecord -d 5 -f S16_LE -r 16000 -c 1 /tmp/opencode/mic-test.wav` → **160,044 bytes**
  (= 5 s × 16,000 × 2 B + 44 B WAV header). Format = app's expected input (16 kHz mono; `WHISPER_SAMPLE_RATE`).
- No analysis tools on VM (`sox`/`ffprobe`/`mediainfo` absent; inline `python3 -c` blocked by session policy),
  so verified non-silence via `od` spot-checks: offset ~1.25 s all-zero (leading silence),
  offset ~2.5 s strong periodic signal (peak ≈ 5,420), offset ~3.75 s peak ≈ **7,420** (≈ −13 dBFS).
  Verdict: genuine speech-level signal on the Intel MIC ADC via system default. Not a virtual/zero device.
- Recording kept local, never uploaded.

## 4. GUI build & launch

- `cargo check -p soravo-desktop` PASS (10 s); `cargo build -p soravo-desktop` PASS (91 s).
- Direct binary launch fails two ways, both diagnosed (not app bugs):
  1. `libtranscribe.so.0.2` missing → resolved with `LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs`
     (18 staged runtime libs; rpath only covers installed layout).
  2. White screen "could not connect to local host" → debug binary needs the Vite dev server;
     fixed by using the documented `tauri dev` workflow.
- **Launch blocker found + fixed (§8.1):** first GUI launch panicked
  `state() called before manage() for tauri_plugin_deep_link` — the KNOWN CLI panic **does**
  affect GUI launch (contrary to the task's do-not-assume note; now proven). Cause: R1-GAP-021 added
  `app.deep_link().on_open_url(...)` in `main.rs` setup without registering
  `.plugin(tauri_plugin_deep_link::init())`. One-line fix; relaunch clean
  (69 catalog models seeded, history DB migrated v4, shortcuts OK).
- Disk incident: `/` hit 99% (linker needs ~2 GB); agent-side deletion blocked by policy and
  `/media/sf_1` (47 GB free) **cannot host a Cargo target** (no symlinks: `ln -s` → EPERM; C++ `.so`
  chains require them). User freed ~10 GB another way (→ 12 GB free); empty probe dir
  `/media/sf_1/soravo-target-test/` left behind (outside repo, harmless).
- Model staging (user-ran, outside repo): exact verified bytes copied to
  `~/.local/share/com.soravo.desktop/models/` (731,357,568 B). App discovered it — no re-download.
- Settings at launch: `selected_model="handy-computer/.../parakeet-unified-en-0.6b-Q8_0.gguf"`,
  `onboarding_completed=true` (persisted), `post_process_enabled=false` (local-only kept),
  `always_on_microphone=false`, `selected_microphone=None` → system default (the verified mic).
- UX note: user had to press **Start Session** in the app before the hotkey worked. Worth a UX look (not changed here).

## 5. Live dictation — 4/4 full journeys VERIFIED

All runs: HOLD `ctrl+space` → speak → release → local streaming inference → clipboard-fallback inject →
`Text pasted successfully`. Zero panics after the §8.2 fix. Transcripts are verbatim backend log lines
(`Transcription completed ...: '...'`); spoken content is the user's own (prescribed sentence never used).

| # | Log time | Samples | Audio | Transcript (verbatim) | inject_text | Paste |
|---|---|---|---|---|---|---|
| 1 | 07:08:41 | 36,960 | 2.31 s streamed, 3.70× RT | `Fox jumped over the fence` | success=true, ClipboardFallback, 25 chars | pasted OK (479 ms) |
| 2 | 07:08:48 | 28,320 | 1.77 s streamed, 5.65× RT | `Hey, now it's okay` | success=true, ClipboardFallback, 18 chars | pasted OK (354 ms) |
| 3 | 07:09:02 | 161,760 | 10.11 s streamed, 1.87× RT, 322 frames, 7 updates | `Yeah, yeah, it is working. The punctuation is wrong, sometimes it gets the capital letters in between of sentences, but otherwise it's fine.` | success=true, ClipboardFallback, 140 chars | pasted OK (1.1 s) |
| 4 | 07:09:21 | 88,320 | 5.52 s streamed, 2.38× RT, 169 frames, 4 updates | `Finally after so many weeks of work finally it is working Thank you` | success=true, ClipboardFallback, 67 chars | pasted OK (631 ms) |

- Pre-fix session also produced one real inference (`Is Sarabu okay`, 1.65 s, 553 ms) before the repeat-use bug bit.
- Model loads: 1253 ms cold / 652 ms warm; backend `CPU` (AMD Ryzen 5 5600), arch `parakeet` variant `unified-en-0.6b`.
- In-app capture: 44.1 kHz F32 mono system-default device, first samples 31–61 ms after stream start every run.
- Receiving application: **opencode desktop text field** (user-operated, user-confirmed visible text each run).
  xed was ready but not the app used — xed insertion is NOT EXECUTED.
- Insertion path honestly characterized: native injection `NotImplemented` on Linux (expected WARN),
  success came from the xclip+`xdotool` clipboard fallback (`Using xdotool for direct text input`).
- VAD: Silero initialized every run. The worktree `.onnx` is deleted (R1 state, untouched), but the genuine
  asset (SHA `a35ebf52…`, matches R1-GAP-008 provenance) resolves from the dev-staged copy at
  `target/debug/resources/models/silero_vad_v4.onnx`. No code or asset change made for this.

## 6. Local-inference & no-cloud evidence

- Transcription backend is transcribe-cpp in-process (CPU); model identity in every load line is the staged Q8_0 file.
- `post_process_enabled=false` in all settings dumps; all post-process API keys empty; no STT network path exists
  in code (only optional LLM post-process providers). No transcript/audio leaves the machine beyond local
  history DB + WAVs under `~/.local/share/com.soravo.desktop/` (app's normal local store).
- Global model gate untouched; no model approved/added.

## 7. Error recovery findings

- **Repeat-use killer bug (found, fixed, §8.2):** pre-fix, attempts 2+ failed with
  `Transcription failed: Model is not loaded for transcription.` Mechanism proven from logs: typed
  tauri-specta emits (`StreamTextEvent`, history updates) panicked with `EventRegistry not found`
  (events never mounted), killing the streaming worker thread, dropping the leased engine with it.
  Post-fix: 4/4 consecutive runs, zero panics. Repeat use: VERIFIED.
- **Escape-cancel test (user-ran):** HOLD `ctrl+space` → speak → press `Escape` → release → **text still
  appeared**. Explained, not a regression: `reconcile_cancel_shortcut` is an explicit no-op on Linux
  (`shortcut/mod.rs:99-105`: "Cancel shortcut is disabled on Linux due to instability with dynamic
  shortcut registration"). Cancellation on Linux: NOT VERIFIED — platform limitation, DEFERRED to owning task.
- No recovery retest beyond the above; no crash observed in 4 runs.

## 8. Code changes (minimal, in-scope only)

`git status` before/after: identical except the two already-modified files below (no new repo files except this report).

1. `apps/desktop/src-tauri/src/main.rs`
   - `+ .plugin(tauri_plugin_deep_link::init())` — fixes GUI startup panic (§4).
   - `+ tauri_specta::Builder::<tauri::Wry>::new().events(collect_events![StreamTextEvent, StreamPhaseEvent, HistoryUpdatePayload]).mount_events(app)` at top of `setup()` — fixes worker-killing panics + repeat-use failure (§7).
   - `+ #[cfg(test)] mod startup_registration_tests` — 2 source-level tripwires (deep-link registration order;
     specta mount coverage). Honestly scoped: they guard registration, live launch is the behavioral proof.
2. `apps/desktop/src-tauri/src/commands/soravo_ipc.rs`
   - `+ log::debug!("inject_text: success=... method=... message=...")` — makes clipboard-fallback outcome
     visible in logs (this is how §5's inject column was evidenced). Diagnostics only, no behavior change.

Verification of changes: `cargo test -p soravo-desktop --bin soravo-desktop startup_registration` → **2 passed**.
Full `cargo test` / clippy / frontend suites after the edit: **NOT EXECUTED** (disk incident + live-test priority;
`cargo check`/`cargo build` green). No tests weakened; no unrelated components touched.

## 9. Tests not executed / limitations

- Prescribed fox-sentence accuracy comparison (speaker used own sentences); xed as paste target;
  Escape-cancel success path (fails by Linux design); full Rust/clippy/frontend/Playwright suites post-fix;
  benchmarking, release, payment, website work (all out of scope, none started).
- No mocks/fixtures in the verified path: real GUI, real mic, real model, real X11 insertion.
  (Repo unit/e2e doubles exist but were not used for any claim here.)
- Prior WER/determinism claims: HISTORICAL/STALE (§1).

## 10. Deferred observations (no action taken)

- UI/Hotkey-editor Handy parity (user request): product redesign, out of scope for verification task.
- Mid-sentence punctuation/capitalization quality (user + run-3 transcript): model-quality note; LLM polish
  exists but is cloud-based and was deliberately left OFF.
- `Start Session` gating before hotkey works: UX friction note.
- R1 worktree items (auth, Silero worktree deletion, config mirror deletion): untouched, owned by R1 tasks.

## 11. Handoff

- App last ran under the user's `tauri dev` terminal (build with §8 fixes). To rerun: same launch command (§4).
- Model stays staged in `~/.local/share/com.soravo.desktop/models/`; onboarding/selection persist.
- This report (`T22-LIVE-MIC-E2E-REPORT.md`, new, root) is the only repo file added by this task.
- Suggested next (other tasks): Linux cancel-shortcut restoration; xed-target insertion check; prescribed-phrase
  WER run; full post-fix test matrix; UI parity proposal.
