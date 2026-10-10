# T10-PARAKEET-UNIFIED-IMPL-020 — Parakeet Unified EN 0.6B Q8_0 Implementation Report

**Date:** 2026-10-09 (UTC)
**Task:** Bounded implementation of the owner-approved Parakeet Unified EN 0.6B Q8_0 model in SORAVO
**Branch:** `feature/parakeet-unified-en06b-impl` (worktree `.swarm-worktrees/parakeet-unified-impl`), based at PR #115 head `17f34870`
**Type:** Implementation (gate exception + verification tests). No unrelated refactors, no UI redesign, no merges, no pushes.

---

## 1. Summary of implementation — IMPLEMENTED

The existing SORAVO transcription architecture already carries Parakeet models end-to-end through the local
transcribe-cpp path (catalog → `ModelManager` → `TranscriptionManager` → session → shared post-processing →
existing text insertion). The only missing piece was eligibility: PR #115's fail-closed commercial gate
(`MODEL_LICENSES.json` + `catalog::commercial`) blocks all 69 catalog models, including the owner-approved
artifact. This task implements the smallest safe exception for exactly that artifact, keyed on the stable
catalog repo id (never a display-name match), and proves it with real-model load + inference.

- Gate exception: `handy-computer/parakeet-unified-en-0.6b-gguf` → `COMMERCIAL-CLEAR-WITH-ATTRIBUTION` with an
  exact NVIDIA/CC-BY-4.0 notice. All 68 other entries keep their existing blocked classifications.
- Runtime: no engine changes required — verified, not assumed (see §5). Inference stays local; no audio or
  transcript leaves the machine (the transcribe path contains zero network calls; downloads are HF/mirror with
  catalog-sha256 verification).
- Robustness paths (missing file, invalid audio, load failure, inference failure, cancellation, repeated use,
  panic isolation) already exist in the pipeline and are now covered by targeted tests.

## 2. Exact artifact identity and runtime — VERIFIED

| Field | Value |
|---|---|
| Catalog id (stable identity) | `handy-computer/parakeet-unified-en-0.6b-gguf` |
| Catalog revision | `7e948f21b7bdbac698d3318db9d350f1096f3b6c` |
| Quant file (default_quant `Q8_0`) | `parakeet-unified-en-0.6b-Q8_0.gguf` |
| Size / SHA-256 | 731357568 bytes / `4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795` (matches `catalog.json` byte-for-byte; local file at main-worktree root `parakeet-unified-en-0.6b-Q8_0.gguf` hashes identically) |
| Container / arch / name | GGUF v3 / `parakeet` / `Parakeet Unified EN 0.6B` (variant `parakeet-rnnt`, from file header strings) |
| Upstream | `https://huggingface.co/nvidia/parakeet-unified-en-0.6b` (`base_model: nvidia/parakeet-unified-en-0.6b`, catalog license `cc-by-4.0`) |
| Catalog profile | English-only (`["en"]`), `streaming: true`, `translate: false`, speed 79 / accuracy 90, `recommended: true`, rank 1 |
| Runtime | transcribe-cpp `0.2.4` via `EngineType::TranscribeCpp` (catalog route); `parakeet` is in `KNOWN_ARCHES`; non-whisper arch handling (no whisper run-extension, translate gated off, language gated on advertised caps) already in `transcription.rs` |

Display name, slug, neighboring `parakeet-*` variants, and unknown ids do NOT clear (pinned by test).

## 3. Changed files and rationale (6 files, +308/−54)

1. `MODEL_LICENSES.json` — single entry changed: parakeet-unified `INSUFFICIENT-PROVENANCE` →
   `COMMERCIAL-CLEAR-WITH-ATTRIBUTION` + exact `attribution_text` + owner-approval evidence in `notes`
   (artifact pin, scope limit, website-credit deferral, residual-risk flag). No other entry touched.
2. `MODEL_LICENSES.md` — §3 counts (approved 1 / blocked 68 / INSUFFICIENT-PROVENANCE 60), new §3a
   owner-exception record (scope = exact repo id), §4 evidence-basis correction. Policy and enforcement
   sections unchanged.
3. `apps/desktop/src-tauri/src/catalog/commercial.rs` — tests only: counts test → 69/1/68;
   `t10_recon005_zero_clearance_regression` → `t10_recon005_single_exception_regression` (exactly one cleared
   id, 60 provenance-blocked); new `t10_owner_approved_parakeet_unified_exception` (exact-id clearance, exact
   notice contents, 7 impostor ids stay blocked). Gate logic untouched.
4. `apps/desktop/src-tauri/src/managers/model.rs` — tests only: seed test expects exactly the approved artifact
   with its exact notice; alternate-quant discovery test selects a blocked multi-quant model explicitly
   (future-proof against the now-cleared first entry); download-gate test asserts the approved id resolves and
   display-name/slug do not; stale zero-clearance comments corrected. Production gate logic untouched.
5. `apps/desktop/src-tauri/src/managers/model_capabilities.rs` — test-only `parakeet_unified_artifact_path()`
   helper (`SORAVO_PARAKEET_UNIFIED_GGUF` override → repo-root drop-in; `None` = loud SKIP); real-header probe
   test (Compatible / `parakeet` / `Parakeet Unified EN 0.6B` / `["en"]`); missing/garbage-file rejection test.
6. `apps/desktop/src-tauri/src/managers/transcription.rs` — tests only: parakeet run-plan profile test
   (translate degrades to transcribe; unsupported language → auto); missing-file load rejection test;
   `#[ignore]`d real-model test (sha256+size identity → `init_transcribe_backend` → CPU load → arch/languages
   asserts → 2× inference on 2 s synthetic 16 kHz audio → empty-audio handling). Production transcribe path untouched.

No production (non-test) Rust code changed. No frontend, settings, auth, payment, or download-validation code changed.

## 4. Commands and tests executed with actual outcomes

All in worktree `.swarm-worktrees/parakeet-unified-impl` (dirty R1 worktree never entered for edits):

- `cargo test -p soravo-desktop --lib` (with `SORAVO_PARAKEET_UNIFIED_GGUF` pointing at the verified artifact):
  **320 passed, 0 failed, 1 ignored** — includes all T10 gate regression tests and the real-header probe
  (ran against the real file, not skipped).
- `cargo test -p soravo-desktop --lib -- --ignored …realmodel_parakeet_unified_load_and_transcribe --exact`:
  **1 passed (20.90 s)** — real Q8_0 load + 2× inference + empty-audio handling. Two test-code defects found and
  fixed along the way (missing `mut session`; missing `init_transcribe_backend()` — production calls it at
  startup; the test now mirrors that).
- `cargo clippy -p soravo-desktop --lib --tests`: **clean** (only the pre-existing transcribe-cpp staging notice).
- `cargo fmt -- --check`: **clean**.
- `sha256sum` + `stat` + `xxd`/`strings` on the artifact: hash/size/header all match the catalog entry (§2).
- PR #115 inspected before gate work: OPEN, MERGEABLE, all 7 checks green — treated as review signal only,
  **not merged** per task boundaries.

## 5. Real-model versus mocked verification status

- Model discovery + artifact validation: **VERIFIED** (real file: catalog hash/size match; header probe on real
  bytes; seeded-entry + attribution assertions run against the real embedded registry).
- Actual model loading: **VERIFIED** (real 700 MB Q8_0 via production `Model::load_with` + session creation).
- Actual inference with audio: **VERIFIED** (2× `session.run` on synthetic 16 kHz PCM, same session — repeated use
  without reload; empty audio handled without crash).
- Clear failures for missing/invalid files: **VERIFIED** (missing-file load → `Err`; garbage header → `Unsupported`;
  production `loading_failed` events + `anyhow` errors already in place).
- Continued blocking of unknown/unapproved models: **VERIFIED** (full T10 suite green: seed, custom-dir, HF-cache,
  rescan, listing, selection, download-gate refusal paths).
- Recovery after failure / cancellation: **IMPLEMENTED** (pre-existing: catch_unwind panic isolation, engine-drop
  semantics, download cancellation tokens, `.partial` hygiene) — failure-injection paths covered by existing tests;
  live cancellation drill **NOT EXECUTED**.
- Microphone capture and OS text insertion: **NOT EXECUTED** (no mic/GUI in this environment); code paths unchanged
  and reused as-is.

## 6. Unexecuted tests, blockers, and residual risks

- **NOT EXECUTED:** microphone end-to-end, OS text-insertion end-to-end, streaming-overlay run with this model,
  frontend `pnpm` build/typecheck (no frontend files changed — not applicable), live download-from-HF drill for
  this id (artifact was validated from the local owner-placed copy; download path enforces the same sha256).
- **BLOCKED (by design, not to be bypassed here):** commercial release still requires legal sign-off — Handy
  redistribution/hosting authorization (`handy-computer/*` + `blob.handy.computer`) and GGUF conversion-record
  linkage remain evidence-unverified (recorded in the entry `notes` and `MODEL_LICENSES.md` §4/§3a).
- **DEFERRED:** NVIDIA website credit (owner: during website redesign); T10-021, payment work, release work —
  explicitly not started.
- Residual risk: the exception rests on direct owner authorization rather than complete weight-level evidence;
  scope is confined to the exact repo id so a future catalog regeneration that changes the id/revision fails
  closed (registry-coverage test forces explicit re-registration).

## 7. Task tracking and resumable handoff

- Todo tracker: prep / worktree / identity / gate / runtime done; validation done; this report closes deliverables.
- Worktree state: branch `feature/parakeet-unified-en06b-impl`, 6 modified files, nothing staged, nothing committed,
  nothing pushed. Main-worktree R1 dirt (`feature/r1-gap-021-desktop-auth`) preserved untouched.
- To resume: open `.swarm-worktrees/parakeet-unified-impl`, `git status`/`git diff` to review; rerun
  `cargo test -p soravo-desktop --lib` and the `#[ignore]`d real-model test with `SORAVO_PARAKEET_UNIFIED_GGUF`
  set; next decision needed is reviewer sign-off + (for release) legal sign-off — then PR creation against
  `main` (do NOT merge PR #115 as part of that; rebase coordination with its author required since both touch
  the gate).
- Do NOT change: any other registry entry, gate decision logic, engine/transcribe/audio/insertion code, the R1
  worktree, or PR #115's merge state.
