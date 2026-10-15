# Desktop Acceptance Matrix (Linux VM — NOT a release platform)

Scope: Soravo V1 desktop product contract acceptance on the machine actually
available. Primary release platforms are macOS + Windows; this Linux VM can
execute unit/integration/model-level evidence only. Anything requiring a
supervised GUI session, live microphone capture, OS key simulation, or a
native macOS/Windows build is BLOCKED or UNKNOWN below — never claimed.

Environment (all runs 2026-10-15, branch `bench/compare-accept-profile` @
`7074c4dd` base): AMD Ryzen 5 5600 (4 CPUs visible), 7.6 GiB RAM, Ubuntu 24.04,
Linux x86_64, `transcribe-cpp 0.2.4`, approved model SHA-256
`4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795`.
`$DISPLAY=:0` exists but the session owns running operator applications, so no
GUI automation was attempted. `/dev/snd` presents capture hardware, but no
audio was captured (operator consent required).

Status vocabulary: PASS (executed here, evidence cited) / FAIL (executed,
defect — none open) / BLOCKED (needs operator/platform/manual step) /
UNKNOWN (not measured; no claim) / INHERITED (passed in a prior recorded
session, not re-executed here).

## Application contract

| ID | Case | Command / evidence | Result |
|----|------|--------------------|--------|
| C1 | App startup + clean shutdown | Tauri GUI launch on Linux | BLOCKED — needs supervised display session; Linux is not a release target. Build health is covered by CI (`desktop` + 3 platform builds green on merged heads). |
| C2 | Model discovery + hash validation | `cargo test -p soravo-models --test approved_artifact_acceptance -- --ignored` with `SORAVO_MODEL_ARTIFACT_PATH` → `approved artifact ok sha=4b50b6…f38795 bytes=731357568`; unit: verify-accept/verify-reject/verify-skip-absent + backend round-trip | PASS (live, this session). Downloader URL/SSRF/size/checksum semantics covered by pre-existing `soravo-models` lib tests (20 pass). |
| C3 | Device selection + audio capture | `cargo test -p soravo-audio` → `BENCH accept input devices: 3`; enumeration never-panics test (new) | PASS for enumeration (3 input devices listed, read-only). Capture BLOCKED (mic use requires operator consent; no stream was opened). |
| C4 | Recording start/stop + transcription invocation | `StreamRouter` FIFO/finalize + post-take-drop tests (new); pre-existing Earshot recorder suite (21 tests); compare harness invokes real `session.run` per clip (12/12) | PASS at unit + model-inference level. Live capture→transcription path BLOCKED (see C3). |
| C5 | Partial + final event flow | `stream_worker` (2 tests) + `stream_events` (4 tests) pre-existing; streaming behavior via mocks | UNKNOWN for live partial/final latency — file inference has no partials. Not claimed. |
| C6 | Cancel / errors / empty audio / silence / recovery | New: cancel delivery, empty-wav + failed-inference accounting, error classifiers; pre-existing silence/VAD recorder tests | PASS (unit). Live-device error injection BLOCKED (see C3). |
| C7 | Hotkey lifecycle + repeat press/release | Shortcut registration unit test (1) pre-existing in `apps/desktop/src-tauri` | UNKNOWN for live behavior — OS key simulation unavailable/unsafe here. Not claimed. |
| C8 | Overlay visibility / settings + restart persistence | Settings persistence/migration covered by pre-existing overlay-settings suites (prior session: 302 desktop unit + 158 vitest + e2e 17/17 on the recon tree) | INHERITED for logic; visual rendering + restart-restore BLOCKED (supervised session required; PR #125 owns the overlay surface — not touched here). |
| C9 | Text insertion via Handy path only | No new insertion path introduced (diff: tests + docs + harness only); Handy-core files untouched | PASS by construction + INHERITED e2e exactly-once evidence (prior session). No new claim. |
| C10 | Duplicate / revision / double-submit prevention | New: FIFO-before-finalize, post-take-drop, double-open-routes-newest, cancel tests | PASS (unit). Live revision flow UNKNOWN (see C5). |
| C11 | Permission denial + missing device | New classifier tests (HRESULT/unix/case variants + negatives) | PASS (unit). Live denial prompt BLOCKED (OS dialog). |
| C12 | Shutdown/restart without orphans | — | BLOCKED (needs live app lifecycle; no process was started here). |

## Model-level resource + latency profile (measured, file inference)

| Metric | Value | Conditions |
|--------|-------|-----------|
| Model load | 1.0 s (debug) / 1.0 s (release) | cold process, same artifact |
| Tier-A-12 inference total | 12/12, 0 failed, both profiles | 130.1 s audio; debug infer 16.0 s (RTF 0.123x), release infer 24.6 s (RTF 0.189x) — VM contention variance; both profiles honestly labeled |
| Per-clip latency (release) | min 0.758 / p50 2.173 / p90 2.981 / max 3.368 s | distribution, not just mean |
| WER lower (Tier-A-12) | 0.1015 (debug and release identical) | determinism across profiles; cf. Tier-B full 0.1047 |
| Peak process RSS | ~1,262 MB (VmHWM, both profiles) | model-only; system-wide peak UNKNOWN |
| Process CPU ticks | [7423,200] debug / [7812,242] release (utime,stime) | model-only; CPU% UNKNOWN |
| First-partial / finalization / capture-to-insertion latency | UNKNOWN | not measurable from file inference; no app path measured |
| Whisper side | SKIPPED (no approved model artifact; prerequisite in `engine_compare.rs` header + §B runbook) | no comparison claimed; launch model unchanged |

## Manual steps remaining (operator or macOS/Windows session)

1. Supervised GUI launch: verify pill/listening/transcribing/finalizing/done/error states + restart persistence (C1, C8-visual).
2. Live microphone dictation with operator consent, incl. permission-denied path (C3-live, C4-live, C11-live).
3. Hotkey press/release/repeat + Escape-cancel on target OS (C7-live).
4. Release-QA fresh-machine flow per `06_DOD_QA.md` §12 (never claimed here).
