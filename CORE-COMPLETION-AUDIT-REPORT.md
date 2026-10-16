# CORE PRODUCT COMPLETION AUDIT (UI/UX DEFERRED)

**Date:** 2026-10-10 · **Branch:** `feature/r1-gap-021-desktop-auth` · **HEAD:** `18bc2133`
**origin/main:** `82ec2ecc` (fetched read-only; branch **22 behind / 0 ahead**) · **Disk:** 9.8 GB free
**Mode:** read-only audit. No code edits, builds, tests, commits, deletions. Normal session, no Swarm.
UI/UX redesign excluded throughout per owner deferral (R6; ADR-010).

## 1. Repository truth (Step 1)

- Root `/home/maya/Desktop/Soravo_Engineering_Specification_v2`. Status: 22 modified + 4 worktree-deleted
  (R1 auth/config/Silero deletions) + 31 untracked (7 DISK-CLEANUP + T10/T22/T23/FOLLOWUP-A reports, R1 auth
  sources, supabase functions, `dev-clean.tar.gz`, Q8_0 `.gguf`). No drift since the T23 audit except the
  expected FOLLOWUP-A report. Full listing in `T23-…-REPORT.md` §A (still accurate).
- 14 worktrees inventoried (unchanged); sibling R1 worktree clean; `/tmp/opencode` entries prunable (left alone).
- **Live app + watcher are now DOWN** (PIDs 21872/21750 gone; user-closed). Binary
  `target/debug/soravo-desktop` remains. Nothing needs terminating.
- Live-path implementation present: `actions.rs`, `managers/{audio,transcription,model}.rs`,
  `clipboard.rs`, `input.rs`, `transcription_coordinator.rs`, `session_pipeline.rs`, `shortcut/*`,
  `commands/soravo_ipc.rs`, `injection-feed.ts`, `ipc.ts`. Test suites present: Rust unit tests in-module,
  `crates/stt/tests/benchmark.rs`, `tests/e2e-desktop/*` (4 specs), `tests/e2e/*` (web).
- T22/T23/FOLLOWUP-A reports mutually consistent with source and app log; one hygiene flag stands:
  **T22 number collision** (`PROGRESS.md` "T22" = Sept-28 `fc56c31b` era vs `T22-LIVE-MIC-E2E-REPORT.md`).
  No content conflict. R1/auth work preserved; no destructive reconciliation attempted.
- Canonical docs: the task's root filenames **do not exist**; authority is `docs/Soravo_Engineering_Docs_v6/`
  (v6-09 gate; root `01–14` docs = HISTORICAL/STALE per O-5). Root `Soravo_Engineering_Docs_v6/` is a
  byte-divergent mirror (13/07/08/17/14 differ — citations below use `docs/…`). Read for this
  audit: canon 01, 02, 05, 06, 07(+T34-Y sequence), 08(+T34-Y order/state), 09 gate, 12, 13(+T34-Y/T15),
  14, 16, 17, 19, 21 (pin `ba10ce19`), ADR index of record (001–032, 017 absent, 027/028 PROPOSED),
  plus `R1-BLOCKER-DECISION-PACKET`, `T32-D`, `T08-PAYMENT`, `T10-COMMERCIAL-GATE-EVIDENCE-019`.

## 2. Core audit (Step 3)

### A. Desktop dictation — pipeline E2E VERIFIED (Linux); gaps around it

- VERIFIED (preserved T22 evidence, not re-tested): mic capture → local Parakeet Q8_0 inference (CPU,
  ~2–5× RT) → clipboard-fallback insertion, 5/5 runs, no panics; settings/onboarding persist;
  model idle-unload + WAV-retention cleanup observed; post-process OFF (local-only).
- Gaps: (1) **Hotkey rebinding unexposed** — backend `change_binding` works but has no Tauri command and
  the settings UI is display-only (`shortcut-settings.tsx` shows binding, edits only mode/enabled).
  PRD-02 requires "configurable shortcut". Functional gap, not visual. (2) **Linux Escape-cancel
  disabled by explicit design** (`shortcut/mod.rs:99-105`) — cross-platform contract (05: "cancellation is
  safe") UNSATISFIED on Linux. (3) **CLI `--list-models`/`--transcribe-file` are parsed-but-ignored
  stubs** (FOLLOWUP-A: INCONCLUSIVE, no handling code). (4) **Fresh-clone VAD fragility**: worktree
  `silero_vad_v4.onnx` deleted (R1 state); dev works only via stale staged copy
  `target/debug/resources/…` (hash-verified `a35ebf52…`). A clean checkout build would fail ALL recording
  at `SileroVad::new`. (5) No `todo!/unimplemented!`/TODO in core path files; native Linux
  injection `NotImplemented` by design with working fallback. (6) Windows/macOS builds: UNKNOWN (ADR-019);
  tentative overlay: IMPLEMENTED, visual confirmation NOT EXECUTED; entitlement gating in dictation path:
  absent (expected pre-paywall); `tests/e2e-desktop` exists but R1-dirty `failure.spec.ts` unexamined here.

### B. Transcription quality and benchmark readiness — cause NOT established; pipeline leaning model

- Owner concern: mid-sentence commas/full-stops/capitalization.
- Established by code read (facts): live path runs `apply_custom_words` (skipped — list empty) →
  `remove_filler_words` (default ON; deletes whole filler tokens via regex; cannot invent commas/case) →
  `normalize_transcription_output` (stutter-collapse, space-collapse, trim; case/punct-preserving), all
  fail-open (`catch_unwind` → raw text). Cloud LLM polish (which WOULD fix punctuation) is OFF.
  Insertion pastes bytes verbatim (xdotool). **None of these rewrite punctuation or capitalization.**
- Hypothesis (not fact): the errors come from **model output**. Requires fixed-corpus runs to confirm.
  Policy note: PRD-02 forbids adding a Soravo punctuation-rewriting layer without justification — a fix here
  needs evidence first, then direction, not silent normalization.
- Benchmark readiness: `crates/stt` file-based harness exists (`PARAKEET_MODEL_PATH`/`WHISPER_MODEL_PATH`
  env-gated; avoids broken CLI) — viable T11 route. No LibriSpeech/sample corpus on disk (`tests/fixtures`
  absent; old "3 samples" claim STALE). No protocol execution recorded (T34-Y R3 REMAINING stands).

### C. Model commercial readiness — BLOCKED (unchanged)

- Selected artifact exact: `handy-computer/parakeet-unified-en-0.6b-gguf`, rev `7e948f21…`, file Q8_0
  731,357,568 B / SHA `4b50b6dd…` (matches staged bytes), catalog license field `cc-by-4.0`,
  base `nvidia/parakeet-unified-en-0.6b`, mirror `blob.handy.computer`.
- Per `T10-COMMERCIAL-GATE-EVIDENCE-019`: **INCOMPLETE — BLOCKED** for commercial/redistribution/hosting
  (conversion linkage → redistribution grant → hosting authorization unproven). Inference success and owner
  model approval confer zero distribution rights. Q8_0 stays approved for local test only.

### D. Accounts, entitlements, payments — IMPLEMENTED (dirty) / NOT EXECUTED E2E

- Desktop auth R1-GAP-021 implemented dirty on this branch (PKCE begin/callback/keychain) + untracked
  supabase `desktop-auth-{mint,exchange}` + migration + web pages + proposal; **never E2E-run**,
  uncommitted, branch 22 behind main (merge/rebase owner-gated).
- Payments: `payment-checkout` + `razorpay-webhook` (ledger/HMAC) functions present; per T08 audit the
  checkout 500s on valid requests and **no Razorpay TEST transaction was ever observed**. T12 NOT EXECUTED;
  no production credentials touched. Desktop entitlement recognition: no evidence.

### E. Release readiness — NOT READY (multiple named blockers)

- CI on main RED (latest `CI` run 37805540732 FAILED 2026-10-08; Pages deploy green ≠ CI green per doc 14).
  `17_RELEASE_RUNBOOK` preconditions fail on: CI green (no), model licenses (BLOCKED), payment E2E (no),
  security complete (open — secretscan this audit: **no repo-source findings**, third-party-comment
  false positives only, coverage PARTIAL with 36k files unscanned), clean-machine validation (no),
  signing credentials (external, absent). Workflows (`ci/pages/release/security-audit`) exist; capabilities
  least-privilege as-shipped works at runtime. Release depends on R1→R2→R3→R4→R5 order (table below).

## 3. Gap register (Step 4)

| # | Gap (canonical ID) | Status | Files/worktree | Blocker/dependency | Impact if unaddressed |
|---|---|---|---|---|---|
| G1 | Punctuation/capitalization source attribution (T11-A, new ID — avoids T-number collision) | UNKNOWN (hypothesis: model) | `managers/transcription.rs:1771+`, `audio_toolkit/text.rs`, `crates/stt/tests/benchmark.rs`; main worktree | Needs fixed corpus + harness run | Ships wrong punctuation; a hasty "fix" would violate PRD-02 |
| G2 | Hotkey rebinding unexposed (R1 functional; PRD-02 "configurable shortcut") | IMPLEMENTED (backend) / NOT EXECUTED (IPC+UI) | `shortcut/mod.rs:164+`, `main.rs` handler, `shortcut-settings.tsx`; main worktree | Command registration + settings UI wiring; keep out of R6 visuals | Users cannot change hotkey (owner-raised) |
| G3 | Linux cancel disabled by design (R1; contract 05) | DEFERRED-by-code (needs owner direction) | `shortcut/mod.rs:99-105`; main worktree | Dynamic-registration instability note; parity decision | Failed-cancel confusion (observed in test) |
| G4 | CLI file/model commands unimplemented (R1; blocks T11 automation) | NOT EXECUTED (=stubs) | `cli.rs`, `main.rs:40`; main worktree | Scoping decision: implement vs GUI-driven benchmarks | No scripted benchmarking route |
| G5 | Fresh-clone VAD asset missing (R1 external-asset class) | BLOCKED (asset absent from worktree) | `resources/models/` (deleted, R1 state), `managers/audio.rs:286+`; main worktree | R1-GAP-008 restoration decision (untouched here) | Clean builds cannot record |
| G6 | Desktop auth E2E (R1-GAP-021) | IMPLEMENTED / NOT EXECUTED | R1 auth files (dirty+untracked); branch 22 behind main | Owner merge/rebase direction; Supabase TEST config | No sign-in/entitlement path proven |
| G7 | Model commercial chain (R2/T10) | BLOCKED | Catalog + T10 evidence reports | External grants (NVIDIA/HF/handy-computer), hosting decision | No legal shipment |
| G8 | Reproducible benchmark (R3/T11) | NOT EXECUTED | `crates/stt` harness + missing corpus | G1 corpus + G4 route decision | No perf/quality claims allowed |
| G9 | Payment TEST E2E (T12) | NOT EXECUTED | `supabase/functions/payment-checkout`, webhook, payment-domain | Checkout 500 fix, then TEST transaction | No monetization proof |
| G10 | CI green on main (R4/R5 gate) | BLOCKED (latest CI FAILED 37805540732) | `.github/workflows/ci.yml` | Failing-job diagnosis (not done here) | Every later gate frozen |
| G11 | Windows/macOS build+launch (V1 platforms) | UNKNOWN | Tauri targets; T33 ADRs | Platform runners/credentials | Linux-only evidence (ADR-019 bound) |
| G12 | T22 number collision (hygiene) | Flagged, unrenamable (no deletions) | `T22-LIVE-MIC-E2E-REPORT.md`, `PROGRESS.md` | None — use full filenames / new T-IDs | Future mis-citation |

Deferred (not core gaps): R6 visual redesign (owner-deferred), T15 final E2E (post-R6 by definition),
PROGRESS/STATUS linkage edits (rejected — R1-dirty files; this report is the connector).
Disk math for future tasks: incremental link peak ≈ 2–3 GB (measured); 9.8 GB free → builds/tests
affordable now; full clean-rebuild peak UNKNOWN (never measured; `target/` = 21 GB).
All register items proceed without a build except G6/G10/G11 execution steps.

## 4. Recommended next task (Step 5): T11-A punctuation attribution (G1)

**Why this one:** the owner's explicit open quality question on the verified pipeline; dependency-free
(no owner/legal/merge decision needed); evidence-first (prevents a PRD-02-violating rewrite);
and it produces the fixed-corpus + harness baseline R3/T11 needs next. It closes a functional unknown
instead of rechecking the working pipeline. Preferred over G2 (touches deferred-UI boundary), G4
(bigger, automation-only), G6/G9/G10 (blocked on owner/merge/external), G7 (not engineering-completable).

- **Scope:** (1) assemble 2–4 short fixed WAVs with reference transcripts (mic-test.wav may serve as one;
  synthetic/TTS labeled per doc-16 fixture rules — no private audio); (2) run each through the file-based
  `crates/stt` harness against the EXACT Q8_0 bytes (`PARAKEET_MODEL_PATH`, no GUI, no mic); (3) diff raw
  outputs vs references on punctuation/case; (4) exercise the same outputs through
  `post_process_transcription_text` unit surface to prove pipeline neutrality; (5) verdict MODEL vs
  PIPELINE with evidence. **No code fix in this task** — a transform bug, if found, becomes its own task.
- **Worktree/branch:** main worktree, current branch; only addition is the evidence report.
- **Acceptance:** report with corpus hashes, raw model outputs, diff table, pipeline-neutrality proof
  (or named transform culprit), and the resulting direction question for the owner (accept model behavior /
  opt-in cloud polish / custom-words mitigation). Q8_0 selection and distribution limits unchanged.
- **Disk/execution:** `cargo test -p soravo-stt --test benchmark` peak ≈ 2–3 GB (assessed against 9.8 GB
  free — permitted for the future task, NOT run in this audit). Code-read portions need no build.
- **Interruption recovery:** stateless and rerunnable; corpus + env vars re-declared in the report; partial
  outputs kept as new files only.
- **Explicitly not recommended now:** G2 (waits until R6 boundary clarified), G4 (needs scoping decision),
  G6/G10 (need owner direction), G7 (needs external grants), any UI work (deferred), any benchmark claim
  before G1/G8 corpus exists.

## Amendment 2026-10-10 — G1 CLOSED (owner decision, T11-A evidence)

G1 acceptance (corpus hashes, raw outputs, diff table, pipeline-neutrality proof, direction question) is
satisfied by `T11-A-PUNCTUATION-ATTRIBUTION-REPORT.md` (raw: fox WER 0.0; hello word-variation/punct-correct;
paris minus one comma; 43+18 transform tests green). Owner decision recorded: punctuation variation
ACCEPTED as model behavior; NO pipeline fix warranted; cloud polish stays OFF/deferred; custom-words
mitigation stays deferred; accuracy conclusions limited to the three tested clips. Harness mismatch
(`ParakeetEngine` ONNX-only vs GGUF artifact) remains an outstanding follow-up — see
`G1-CLOSURE-GGUF-BENCHMARK-PATH-REPORT.md`. Nothing above this line rewritten.
