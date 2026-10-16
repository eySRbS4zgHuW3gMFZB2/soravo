# T23 — T22 EVIDENCE RECONCILIATION & ENGINEERING STATE AUDIT

**Date:** 2026-10-10 (audit session; log times UTC, system IST = UTC+5:30)
**Auditor:** normal OpenCode session (no Swarm, no delegation — per instructions)
**Branch:** `feature/r1-gap-021-desktop-auth`
**HEAD:** `18bc2133dc5805b24874dc4f16e64817437f91e9` (unchanged by this audit)
**origin/main:** `82ec2ecc1ba279dfa9176f1612943368d65d3616` (fetched read-only; branch is **22 behind / 0 ahead**)
**Disk:** `/` 108 G, 93 G used, **9.8 G free (91%)** — healthy headroom; no cleanup performed.
**Constraints honored:** no commit/push/merge/branch switch; no reset/clean/forced checkout; no deletions;
no rebuilds or test runs; no application-code changes. All checks read-only.

---

## STEP 1 — CURRENT STATE: VERIFIED

- `git status --short --branch`: branch `feature/r1-gap-021-desktop-auth`; 22 modified, 4 deleted-staged
  (`D` = worktree deletions), 30 untracked — full listing recorded in §A below. R1 dirty work preserved.
- `T22-LIVE-MIC-E2E-REPORT.md` present as untracked root file (added by the live-test session, uncommitted — as reported).
- Linked worktrees: 14 entries (main + 13 linked incl. 2 prunable `/tmp/opencode` entries). No worktree
  entered, modified, or removed. Sibling `.swarm-worktrees/r1-gap-021-desktop-auth` is **clean**.
- Active processes (observed, untouched): PID 21872 `target/debug/soravo-desktop` plus its `tauri dev`
  watcher chain (`pnpm`, `tauri dev`, `vite`). The live-test app session is still running.
- **Fix 1 present:** `.plugin(tauri_plugin_deep_link::init())` in `main.rs` builder (diff hunk confirmed).
- **Fix 2 present:** `tauri_specta::Builder::<tauri::Wry>::new().events(collect_events![StreamTextEvent, StreamPhaseEvent, HistoryUpdatePayload]).mount_events(app)` at top of `setup()` (diff hunk confirmed).
- **Diagnostic line present:** `inject_text: success=...` debug log in `commands/soravo_ipc.rs` (8-line hunk confirmed).
- **Regression tests present in source:** `deep_link_plugin_is_registered_before_setup_uses_it` and
  `specta_events_are_mounted_before_use` in `main.rs::startup_registration_tests` (diff confirmed).
  Results (2/2 pass) are **REPORTED, NOT RE-EXECUTED** in this audit (no builds/tests per constraints).
- Unrelated unfinished changes remain throughout the tree (R1 auth stack, config mirror, supabase functions,
  website, tests) — all pre-existing, none attributable to the live test. Details §A.

## STEP 2 — T22 EVIDENCE RECONCILIATION

Checked the report against source diffs and the persistent app log
(`/home/maya/.local/share/com.soravo.desktop/logs/Soravo.log`, 07:08:23→07:15:27 UTC):

| T22 claim | Independent check | Label |
|---|---|---|
| 4/4 runs, transcripts `Fox jumped over the fence` / `Hey, now it's okay` / 140-char punctuation remark / `Finally … Thank you` | All four lines present verbatim with matching `inject_text: success=true … ClipboardFallback` + `Text pasted successfully` lines | **VERIFIED** |
| 5th post-report run `Brown fox jumped over the fence` (07:15:26, after report) | Present in log; consistent extension, not claimed in T22 | **VERIFIED** (supplementary) |
| Real microphone input | `Microphone is receiving samples` ×5; per-run sample counts (28k–162k); device = system default (the pre-verified Intel MIC ADC) | **VERIFIED** |
| Selected Parakeet Q8_0 used locally | Every `Starting to load model` / `Successfully loaded` line names `handy-computer/…/parakeet-unified-en-0.6b-Q8_0.gguf`, CPU backend; `post_process_enabled: false` ×2 | **VERIFIED** |
| Text reached receiving app | Backend `Text pasted successfully` ×5 VERIFIED; **glyphs-in-app rests on the user's report** (opencode text field, not xed) — T22 states this correctly | **VERIFIED (backend) / user-reported (receipt)** |
| Fix scope = 2 files, no unrelated changes | `git diff --stat`: only `main.rs` (+110/−: R1-hunks pre-existing + T22 hunks) and `soravo_ipc.rs` (+8). No other file touched by live test | **VERIFIED** |
| Zero panics after fix | `panicked` and `Model is not loaded` patterns: **0 matches** in current log | **VERIFIED** |
| Prescribed fox-phrase accuracy NOT EXECUTED | No fox sentence in log; report discloses this | **NOT EXECUTED** (correctly labeled) |
| xed coverage NOT EXECUTED | Receiving app per user = opencode field; report discloses | **NOT EXECUTED** (correctly labeled) |
| Linux Escape-cancel unsupported by design | Confirmed in source: `shortcut/mod.rs:99-105` explicit Linux no-op with rationale comment | **VERIFIED (as design limitation)** |
| T10/T11 reports missing → old WER claims STALE | Glob for `T10-PARAKEET*`/`T11-PARAKEET*`: still no files | **HISTORICAL/STALE** (stands) |
| Model SHA/size/catalog match | Re-checked in Step 1 context: 731,357,568 B + `4b50b6dd…2f38795` = catalog Q8_0 entry | **VERIFIED** |
| VAD asset explanation (staged copy, SHA `a35ebf52…`) | `target/debug/resources/models/silero_vad_v4.onnx` exists with matching hash prefix; worktree copy still deleted (R1 state, untouched) | **VERIFIED** |
| Live E2E ⇒ release readiness | T22 does not claim this; T10 commercial gate still **BLOCKED** (see Step 4) | **DEFERRED — no release inference** |

**Discrepancy found (documentation hygiene, no evidence impact): T22 NUMBER COLLISION.**
`T22-LIVE-MIC-E2E-REPORT.md` reuses the `T22` slot: `PROGRESS.md` already uses "T22" for the Sept-28
`fc56c31b` Handy-boundary commit era (11 mentions). Renaming is prohibited (no deletions), so both
meanings now coexist. Future reports must avoid bare `T22`; refer to the live-mic file by full name.
No content contradiction found — T22's claims match source and logs throughout.

## STEP 3 — DOCUMENTATION UPDATES: NONE MADE (justified)

- `PROGRESS.md`/`progress/STATUS.md`/`progress/NEXT.md` contain no pointer to the live-mic T22, but:
  (a) this audit report itself is the connector (quotes the full filename, SHAs, and log paths);
  (b) `PROGRESS.md` is R1-dirty — editing it would entangle the audit with unfinished auth work;
  (c) duplicating T22's tables into a second document is prohibited by the task.
- The authoritative ADR index (`docs/…/20_ADR_INDEX.md`) needs no entry: both fixes are bug-level
  restorations (missing registration/mount), not architecture decisions per `01` §Architecture changes.
- Conclusion: report already properly integrated via this audit. **No documentation update necessary.**

## STEP 4 — CANONICAL PLAN RECONCILIATION

- The Step-4 filenames (`00_README.md`, `01_AUTHORITY…` at root, etc.) **do not exist at root** (all 11
  probed paths missing; only `SPEC_MANIFEST.json` exists there). Actual canon per `SPEC_MANIFEST.json`
  §documents: root `01_PRD.md`…`14_ENVIRONMENT_AND_SECRETS.md` + the v6 pack
  `Soravo_Engineering_Docs_v6/` (authoritative: `01` Authority, `07` Plan, `08` Breakdown, `13` DoD,
  `16` Benchmark, `18` Handoff, `19` State audit, `20` ADR index = non-authoritative mirror pointing at
  `docs/…/20_ADR_INDEX.md` index of record, `21` chain-of-custody). Inspected: v6 `01`, `07`, `08`,
  `19`, `20`(mirror notice), index-of-record ADR list (ADRs 001–032, 017 absent by numbering gap,
  027/028 PROPOSED, rest ACCEPTED), `R1-BLOCKER-DECISION-PACKET`, `T32-D` blocker report,
  `T10-COMMERCIAL-GATE-EVIDENCE-019` verdict line.
- Roadmap position after T22 (mapped to `08` tasks):
  - **Phase 3 (functional desktop integration):** advanced — live mic→Parakeet→insert path is now
    E2E VERIFIED on Linux (`08` has no explicit live-dictation checkbox; T22 fills an evidence gap, not a task box).
  - **T10 Model licensing:** still **BLOCKED** — `T10-COMMERCIAL-GATE-EVIDENCE-019` verdict:
    "INCOMPLETE — BLOCKED for any commercial-use, redistribution, or hosting reliance"
    (artifact-level chain unproven). T22 changes nothing here; Q8_0 approval stays local-test-only.
  - **T11 Benchmark:** **NOT EXECUTED** — no fixed-corpus/hardware measurements; T22 explicitly non-benchmark.
    ADR-019's note ("only x86_64-unknown-linux-gnu compiled and launched") still bounds all claims to Linux.
  - **R1-GAP-021 desktop auth:** implementation exists dirty on this branch (PKCE/deep-link/keychain +
    supabase functions + proposal), uncommitted, branch 22 behind origin/main. GUI deep-link path now
    launch-tested; **CLI `--transcribe-file`/`--list-models` path state is UNKNOWN** (never rerun on fixed binary).
  - **T12 payment / T13 website / T14 release:** untouched; release gates unsatisfied (unchanged).
- Stale/disputed items: `PROGRESS.md` "T22" = old commit era (collision, Step 2); root `10_ADR_INDEX.md`
  is R1-modified; `Soravo_Engineering_Docs_v6/20_ADR_INDEX.md` is a declared non-authoritative mirror (by its own header).

## STEP 5 — RECOMMENDED NEXT TASK (one)

**T22-FOLLOWUP-A — CLI deep-link / file-transcription re-verification on the fixed binary (no code).**
Rationale (dependency-ordered, not numeric): the remaining known-issue question the task explicitly
poses is whether the Tauri CLI initialization failure is CLI-only or shared with the now-tested GUI path.
The `main.rs` fix (plugin registration) sits in code the CLI build shares, so the CLI may already be
healed — or still broken on a separate path. The answer gates T11: reproducible file-based benchmarks
need a working `--transcribe-file` path, and prescribing a benchmark before knowing whether the CLI
lives would be planning on UNKNOWN. It also costs nothing and risks nothing.

- **Worktree/branch/files:** main worktree, current branch; **no files modified** (read-only runs).
- **Preconditions:** existing `target/debug/soravo-desktop` binary (built with both fixes);
  `LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs`; model staged (already in app models dir);
  one LibriSpeech sample path from the earlier speech test.
- **Blockers:** none known. If the binary was rebuilt since, `cargo build -p soravo-desktop` first
  (~60–90 s incremental; peak ~2–3 GB; 9.8 GB free — verified sufficient).
- **Preservation risks:** none — no writes to repo, worktree, or app-data (history DB may append one
  entry; local-only, acceptable, or back it up first).
- **Acceptance criteria:** (1) `--list-models` exits 0 and lists the Q8_0 entry, or exact panic text
  recorded; (2) `--transcribe-file <sample>` exits 0 with transcript + RTF, or exact error recorded;
  (3) verdict CLI-HEALED or CLI-STILL-BROKEN with log evidence — no code fix attempted in this task.
- **Test commands:** `LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs ./target/debug/soravo-desktop --list-models`; then `--transcribe-file <wav> [--model <id>]` per `cli.rs` flags.
- **Without-a-build parts:** all of it (binary already built).
- **Interruption recovery:** fully stateless — rerun the two commands; nothing to checkpoint.
- **Why not the alternatives:** prescribed-phrase accuracy/xed retest needs another live user+mic session
  (heavier, schedule after CLI answer); T10 licensing needs external grants (not engineering-completable);
  Linux cancel restoration conflicts with ADR-010 UI-deferral posture (needs owner direction first);
  full post-fix test matrix is valid but broader — run it after the CLI verdict, not before.
  Do NOT reopen the Q8_0 model selection; it stays approved for local test only.

---

## §A — WORKTREE STATE APPENDIX (record, not action)

Modified (22): `Cargo.lock`, `Cargo.toml`, `PROGRESS.md`, `apps/desktop/src-tauri/Cargo.toml`,
`apps/desktop/src-tauri/src/account.rs`, `.../commands/account.rs`, `.../commands/soravo_ipc.rs` (T22: +8),
`.../lib.rs`, `.../main.rs` (T22: plugin line + specta mount + 2 tests; rest R1),
`.../tauri.conf.json`, `apps/desktop/src/components/account-panel.tsx`, `apps/desktop/src/ipc.ts`,
`apps/desktop/src/test-utils/e2e-doubles.ts`, `apps/website/src/app.tsx`, `crates/config/src/lib.rs`,
`docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`, `supabase/config.toml`, `tests/e2e-desktop/failure.spec.ts`.
Deleted in worktree (4, R1 state, preserved as-is): `R1-GAP-008-SILERO-VAD-READINESS-2026-10-08.md`,
`R1-GAP-023-ADR-032-SETTINGS-STORE-AUTHORITY.md`, `resources/models/{SILERO_VAD_LICENSE_MIT.txt,
SILERO_VAD_PROVENANCE.json,silero_vad_v4.onnx}`, `crates/config/src/mirror.rs`.
Untracked (30 + this report = 31): `.freebuff/`, 7 `DISK-CLEANUP-*-REPORT.md`, `R1-GAP-021-…-PROPOSAL.md`,
`T10-COMMERCIAL-GATE-EVIDENCE-019-REPORT.md`, `T10-PROVENANCE-BATCH-013-REPORT.md`,
`T22-LIVE-MIC-E2E-REPORT.md`, R1 auth sources (`auth_flow.rs`, `crates/desktop-auth/`, website
desktop-auth ×4, supabase functions/migrations/tests), `dev-clean.tar.gz`,
`parakeet-unified-en-0.6b-Q8_0.gguf`. `git diff --check` not run (read-only posture kept minimal;
no whitespace claims made). Live app + watcher processes running (PIDs §Step 1) — left running.
