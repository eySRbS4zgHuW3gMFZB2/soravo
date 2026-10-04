# T10-B — DESKTOP TAURI COMMAND RECOVERY REPORT

**Generated:** 2026-09-28
**Task:** T10-B — DESKTOP TAURI COMMAND RECOVERY
**Objective:** Recover the 11 Tauri commands referenced by the desktop frontend without redesigning the app
**Branch:** `main`
**Start SHA:** `ede495b55efd95cedd882d90a19d12b4777da852`
**End SHA:** `ede495b55efd95cedd882d90a19d12b4777da852` (no commit per instructions)
**Mode:** Audit + minimal behavior-preserving recovery. No commit, no push.

---

## 1. Skill-selection gate record

Loaded before any planning or editing (task instruction: awake the skill-selection gate FIRST):

| Skill | Domain trigger |
|---|---|
| `tauri` | Tauri IPC commands, invoke_handler, capabilities |
| `tauri-development` | Tauri + TypeScript + Rust desktop integration |
| `rust-engineer` | Rust command restoration, ownership, tests |
| `rust-review` | Security review of restored IPC surface |

Deliberately NOT loaded: `shadcn`, `react`, `frontend-design`, `web-design-guidelines`,
`frontend-accessibility` (task forbids frontend redesign), `tauri-setup` (no toolchain
change), `cloudflare-deploy` (no deployment), `supabase` / `supabase-postgres-best-practices`
(no cloud/payment work), `github`/`gh-cli` (git CLI used directly; no PR/issue action),
`semgrep`/`codeql` (not required for this IPC recovery), `security-guidance` (covered by
`rust-review`; no new auth/crypto boundary introduced).

## 2. Inputs read

- `Soravo_Engineering_Docs_v6/` full pack skimmed; closely read: `00_README.md`,
  `03_TECHNICAL_DESIGN.md`, `04_HANDY_FORK_AND_REUSE_POLICY.md`,
  `05_DESKTOP_CONTRACTS.md`, `09_AI_AGENT_INSTRUCTIONS.md`,
  `13_DEFINITION_OF_DONE_AND_QA.md`, `16_TEST_AND_BENCHMARK_PROTOCOL.md`
- `docs/Soravo_Engineering_Docs_v6/22_IMPLEMENTATION_COMPLETION_MATRIX.md` and
  `22_IMPLEMENTATION_COMPLETION_MATRIX_UPDATE.md` (T08 scope update)
- `T09-B-DESKTOP-FUNCTIONAL-INTEGRATION-REPORT.md` (blocker definition: 11 missing commands)
- `T09-C-CI-HEALTH-REPORT.md` (§5.9 bin blocker, §5.10/§5.11 out-of-scope blockers upheld)
- `SORAVO_HANDY_CODE_REUSE_REPORT.md` (§11 typing, §13 settings reuse guidance)
- `T08-DESKTOP-INTEGRATION-REPORT.md` (audited; §4 IMPLEMENTED_VERIFIED claim for Tauri
  commands is contradicted by source — agrees with T09-C, not re-litigated)
- Task-relevant source only: `apps/desktop/src-tauri/src/main.rs`, `commands/mod.rs`,
  `commands/audio.rs`, `commands/transcription.rs`, `commands/models.rs`,
  `commands/history.rs`, `commands/account.rs`, `session.rs`, `events.rs`, `settings.rs`,
  `clipboard.rs`, `input.rs`, `lib.rs`, `apps/desktop/src/ipc.ts`, `app.test.ts`,
  `app.tsx`, settings components, `crates/config`, `crates/typing`

## 3. Blocker confirmed

`cargo check -p soravo-desktop --all-targets` failed with 22 errors, all in
`apps/desktop/src-tauri/src/main.rs:30-42`: `generate_handler!` referenced 11 commands
that existed nowhere in the crate (repo-wide grep: only hits were the `main.rs`
references). This matches T09-B Gap 1 and T09-C §5.9 exactly.

## 4. Provenance (git history + Handy chain)

- `83a506e8` ("port Handy shell, wire Rust session machine"): created
  `src/commands.rs` with `runtime_status`, `ping`, `session_snapshot`,
  `session_transition`, `session_reset`, `emit_ping` over the Soravo `SessionMachine`
  + typed event bus (`session://changed`, `runtime://ping`). Handy pin recorded in
  message: `ba10ce1943ef34e93c09494027fc0b9ced2e8a44`.
- `69999112` ("Implement settings foundation"): added `inject_text` (via
  `soravo-typing` `TypingEngine`) and `load_settings` / `save_settings` /
  `update_microphone_settings` / `update_hotkey_settings` / `update_model_settings`
  (via `soravo-config` `Settings::load/save`) to the same `commands.rs`.
- `842acdf9` / `557cfb66` / `5f56260c`, integrated by `a156c8c9` ("integrate PR #55
  Handy-derived desktop foundation"): replaced `commands.rs` with `commands/` +
  Handy-derived `settings.rs` (`AppSettings`, 150+ fields, tauri-plugin-store),
  `clipboard.rs`, `input.rs`, managers, etc. The 11 Soravo-owned commands were
  never re-added. `main.rs` was later edited to reference them, producing the
  current compile blocker.
- `soravo-config` and `soravo-typing` crates still exist and are still workspace
  dependencies of `soravo-desktop` (`apps/desktop/src-tauri/Cargo.toml:43,45`).
  Nothing in Handy replaces their contract role: per v6 §04, session/transcript/
  typed-IPC are SORAVO-OWNED; audio/toolkit/VAD/hotkeys/clipboard/settings-mechanics
  are ADOPT/ADAPT. The reuse report §11 prescribes wrapping Handy typing mechanics
  in a Soravo typing abstraction — `soravo-typing` IS that abstraction.

Conclusion: all 11 commands existed in the Handy-derived Soravo implementation lineage
and were lost in the foundation migration — a regression, not a new feature. Recovery
restores them; nothing is invented.

## 5. Per-command recovery ledger

Frontend contract source: `apps/desktop/src/ipc.ts`. Rust search: repo-wide grep +
`commands/` read. History: §4 above. Intended behavior: v6 §03/`05_DESKTOP_CONTRACTS.md`
(session ladder, transcript commit/final-only injection, typed IPC, validate inputs,
structured errors, no secrets).

| # | Command | Frontend caller | Expected TS contract | Rust search | Existed in Handy-derived impl? | Intended Soravo behavior (v6) | Restoration |
|---|---|---|---|---|---|---|---|
| 1 | `runtime_status` | `getRuntimeStatus()` (`ipc.ts:97`), used in `app.tsx:42`, tested `app.test.ts:46` | `RuntimeStatus{version,phase,sessionId,sequence,localOnly,ready}` | MISSING (only `main.rs` ref) | YES (`83a506e8` `commands.rs`) | Session read model: report authoritative phase/id/sequence | Restored verbatim + `specta::Type`; `version` is `String` (was `&'static str`) for specta compat, value identical |
| 2 | `ping` | `ping()` (`ipc.ts:101`), tested | `PingReply{sequence,timestampMs}` | MISSING | YES (same) | IPC round-trip probe; monotonic seq/ts | Restored verbatim + specta |
| 3 | `session_snapshot` | `sessionSnapshot()` (`ipc.ts:105`; no other caller — diagnostics path) | `SessionSnapshot{sessionId,phase,sequence}` | MISSING | YES (same) | Read-only render/diagnostics snapshot | Restored verbatim + specta |
| 4 | `session_transition` | `sessionTransition(target)` (`ipc.ts:109`), tested | `(target: SessionPhase) -> SessionTransition` | MISSING | YES (same) | Validated transition; broadcast `session://changed`; invalid → structured error | Restored verbatim (JSON-encoded `SessionError`) + specta |
| 5 | `session_reset` | `sessionReset()` (`ipc.ts:113`), tested | `() -> SessionTransition` (returns transition, not `()`) | MISSING; T09-B table signature `Result<(),String>` is stale — history + frontend both return the transition | YES (same) | Imperative IDLE reset without path validation; emits event | Restored verbatim (returns `SessionTransition`) + specta |
| 6 | `inject_text` | NO frontend wrapper in `ipc.ts` (backend/pipeline contract; `PROGRESS.md` + T08 list it; `main.rs` expects it) | Historical: `(text: String) -> TypingResult` + `typing://result` event | MISSING | YES (`69999112` via `soravo-typing`) | Committed/final-only injection; native-or-clipboard-fallback; snapshot/restore; report failure | Restored via `soravo-typing` verbatim + `MAX_INJECT_TEXT_LEN=100_000` DoS guard (validation per v6 IPC rules, not a product limit) + specta; Handy `clipboard::paste()` untouched |
| 7 | `load_settings` | `loadSettings()` (`ipc.ts:205`), used by all 4 settings components | `() -> SettingsResponse{success,message,data:Settings\|null}` | MISSING | YES (`69999112` via `soravo-config`) | Load Soravo settings doc (simplified V1 settings UI model) | Restored verbatim + specta |
| 8 | `save_settings` | `saveSettings(settings)` (`ipc.ts:209`; no component calls it yet — contract kept for parity) | `(settings: Settings) -> SettingsResponse` | MISSING | YES (same) | Persist whole settings doc | Restored verbatim + specta |
| 9 | `update_microphone_settings` | `updateMicrophoneSettings()` (`ipc.ts:213`), used `microphone-settings.tsx` | `(settings: MicrophoneSettings) -> SettingsResponse` | MISSING (distinct from Handy `update_microphone_mode`) | YES (same) | Partial update: microphone slice | Restored verbatim + specta |
| 10 | `update_hotkey_settings` | `updateHotkeySettings()` (`ipc.ts:217`), used `shortcut-settings.tsx` | `(settings: HotkeySettings) -> SettingsResponse` | MISSING | YES (same) | Partial update: hotkey slice | Restored verbatim + specta |
| 11 | `update_model_settings` | `updateModelSettings()` (`ipc.ts:221`), used `model-settings.tsx` | `(settings: ModelSettings) -> SettingsResponse` | MISSING | YES (same) | Partial update: model slice | Restored verbatim + specta |

Ancillary (not in the 11, restored to prevent a live frontend failure): `emit_ping`
— existed in the same historical module; current `emitPing()` (`ipc.ts:117`) invokes
`"emit_ping"` which was absent from `main.rs`. Added to the handler; no new behavior.

STOP decisions: NONE. No command required a genuine product decision. The one known
follow-up (unifying the Soravo `soravo-config` settings file with the Handy
`AppSettings` store) is a product/architecture decision per v6 §04 "No duplicate
stacks" and was deliberately NOT attempted — both stores coexist as they did
historically; unification needs an ADR, not a guess. Documented here instead.

## 6. Compatibility fix (not new behavior)

The historical settings path had a latent contract bug: Rust used `snake_case`
(`selected_device_index`) while the frontend sends `camelCase`
(`selectedDeviceIndex`), so every settings invoke would have failed deserialization.
(T08's IMPLEMENTED_VERIFIED claim never caught it; T09-C correctly flagged the whole
surface as missing.) The restore adds `#[serde(rename_all = "camelCase")]` with
`alias = "snake_case_name"` + `default` on `soravo-config` types: frontend camelCase
parses, legacy snake_case files still parse, serialization is camelCase to match
Specta/TS. Covered by 2 dedicated unit tests. `soravo-config`/`soravo-typing` gained
`specta::Type` derives (new `specta` dep, already in the lock graph) so
`#[specta::specta]` type-generation checks pass. `session.rs` types gained
`Type` (+ `Deserialize` on transition/error for specta completeness); semantics
unchanged (13 existing session tests still pass).

## 7. Changed files (T10-B-owned; uncommitted, unpushed)

- `apps/desktop/src-tauri/src/commands/soravo_ipc.rs` (NEW): the 11 commands +
  `emit_ping`, DTOs, `MAX_INJECT_TEXT_LEN` + `validate_inject_text`, 8 unit tests
- `apps/desktop/src-tauri/src/commands/mod.rs`: `pub mod soravo_ipc` + re-export
  for `main.rs` glob resolution
- `apps/desktop/src-tauri/src/main.rs`: import from `commands::soravo_ipc::*`
  (glob re-export does not carry Tauri's generated helper macros into the parent
  scope — full-path import is the minimal fix); added `emit_ping` to the handler;
  dropped unused `Manager` import (clippy `-D warnings`)
- `apps/desktop/src-tauri/src/session.rs`: `specta::Type` (+ `Deserialize` on
  transition/error) — no logic change
- `crates/config/Cargo.toml`, `crates/config/src/lib.rs`: specta compat (§6)
- `crates/typing/Cargo.toml`, `crates/typing/src/lib.rs`: specta compat (§6)

Unchanged relevant files: `apps/desktop/src/ipc.ts`, `app.test.ts`, `app.tsx`,
settings components (no frontend redesign), `settings.rs` (Handy `AppSettings`
untouched), `clipboard.rs`/`input.rs`/`paste_tx/` (Handy typing mechanics untouched),
`commands/{audio,history,models,transcription,account}.rs`, `events.rs`,
`transcription_coordinator.rs`, all payment files (`packages/payment-domain`,
`services/license-api`, `apps/website` checkout/webhook, `supabase/functions`),
Razorpay MCP (no MCP surface used), `capabilities/default.json` (custom commands need
no extra capability entries under `core:default`; least-privilege unchanged),
`.github/workflows/*`, `deny.toml`.

Pre-existing worktree delta (NOT this task — T03-E/T07 recovery, staged
`docs/spec-v3` deletions, `Cargo.lock` closure, other untracked reports) was left
untouched; `Cargo.lock` shows modified from prior work (specta was already in the
graph — this task adds no new locked package).

## 8. Commands — exact results

| # | Command | Result |
|---|---|---|
| 1 | `cargo fmt --all` / `--check` | PASS (`--check` exit 0) |
| 2 | `cargo check -p soravo-desktop --all-targets` | PASS (was: 22 errors in `main.rs`; now exit 0) |
| 3 | `cargo build -p soravo-desktop --lib` | PASS |
| 4 | `cargo test -p soravo-config -p soravo-typing` | PASS |
| 5 | `cargo test -p soravo-desktop --lib commands::soravo_ipc` | PASS 8/8 (new) |
| 6 | `cargo test -p soravo-desktop --lib` | 186 passed, 15 failed — the SAME 15 pre-existing failures as T09-C §5.10 (10 `catalog.json` schema + 5 transcription filler-gating); +8 new passes, zero regressions |
| 7 | `cargo clippy -p soravo-desktop --lib --all-targets -- -D warnings` | PASS (was: 19 lib errors per T09-C) |
| 8 | `cargo clippy -p soravo-desktop --all-targets -- -D warnings` | PASS (was: 22 bin errors) |
| 9 | `cargo clippy -p soravo-config -p soravo-typing --all-targets -- -D warnings` | PASS |
| 10 | `pnpm --filter @soravo/desktop typecheck` (`tsc -b`) | PASS |
| 11 | `pnpm --filter @soravo/desktop test` (vitest) | PASS 8/8 (`app.test.ts` runtime bridge suite) |
| 12 | `pnpm --filter @soravo/desktop build` (`tsc -b && vite build`) | PASS (35 modules, dist emitted) |
| 13 | `pnpm e2e` (playwright, chromium) | PASS 20/20 (13.6s) — website E2E unaffected |

Type-generation check note: the repo has no standalone `specta export` CI step; the
applicable check is that every `#[tauri::command]` carries `#[specta::specta]` and
all arg/return types implement `specta::Type` — verified by the green
`--all-targets` clippy (which type-checks the derive graph) plus `tsc -b`.

Desktop `tauri build` (NSIS/DMG packaging) was NOT executed: it requires
platform bundling toolchains beyond this Linux session and is covered by the
`desktop` CI job now that compilation is unblocked. Not claimed.

## 9. Tests / verification per command

- 1–5 (session/runtime): existing 13 `session.rs` ladder tests (unchanged, pass) +
  4 new contract-shape tests (`runtime_status`/`ping`/`session_snapshot` payload keys,
  structured `INVALID_TRANSITION` error JSON) in `soravo_ipc.rs`.
- 6 (`inject_text`): `validate_inject_text` unit test (empty/short ok, oversize err);
  engine behavior covered by `soravo-typing` 4 tests (`inject_empty`, `inject_with_text`,
  paste-method variants); full key-simulation is platform-gated and verified via build +
  existing typing integration tests, not fabricated here.
- 7–11 (settings): 2 serialization-compat tests (live camelCase frontend payload →
  parse + camelCase round-trip; legacy snake_case file → still parses) + 1
  `SettingsResponse` shape test; `soravo-config` 3 tests pass.
- Frontend: `app.test.ts` 8/8 mocks `invoke` for `runtime_status`/`session_transition`/
  `session_reset`/`ping` — passes unchanged against the restored backend names.
- E2E 20/20 confirms no website/session-guard regression.

## 10. Security

- Inputs validated: `session_transition` goes through the `SessionMachine` allow-list
  (frontend can never drive an invalid state); `inject_text` length-bounded
  (`100_000`) before engine contact; settings DTOs are typed structs (no free-form
  shell/process access, no secrets — `soravo-config` carries no tokens; Handy
  `SecretMap` untouched).
- `cargo clippy -- -D warnings` green on all touched crates/targets; `cargo fmt
  --check` green. No `unsafe` added (`workspace.lints unsafe_code=forbid` holds).
- No secrets committed; no RLS/CSP/signature path touched; payment/webhook surfaces
  untouched; Razorpay MCP untouched.

## 11. CI / deployment / external configuration

- CI: the `rust --all-targets` and `desktop` jobs were blocked on §5.9 — that blocker
  is now cleared locally. Full CI run + branch-protection enablement remain
  human-owned (per T09-C §7: do not enable until required checks are actually green
  on a clean worktree). No workflow file modified.
- Deployment: none executed, none claimed.
- External configuration: none (no Supabase/Cloudflare/Razorpay/dashboard change).

## 12. Constraint compliance

- No new product behavior invented (all logic verbatim from `83a506e8`/`69999112`;
  only specta annotations, a validation bound, and a case-compat bridge).
- No Handy architecture replaced (`settings.rs`, `clipboard.rs`, `input.rs`,
  `paste_tx/`, managers, audio toolkit untouched).
- No frontend redesign (zero frontend files modified).
- No payment infrastructure modified; Razorpay MCP untouched (no MCP call).
- No Windows/macOS V1 scope change (no platform code, no bundling config, no
  entitlement/policy change).

## 13. Blockers (residual, out of scope)

1. T09-C §5.10 (unchanged): 10 bundled `catalog.json` schema + 5 transcription
   filler-gating lib tests still fail — product-data/logic decisions, not IPC.
2. T09-C §5.11 (unchanged): `pnpm test:supabase` webhook-hardening suite
   unresolvable (`@soravo/payment-domain` from `supabase/`) — packaging decision.
3. `hotkey_*` / `account_*` IPC referenced in `ipc.ts` but absent from the handler
   (pre-existing, outside the T10-B 11) — left for their owning tasks; not touched
   per scope + payment/auth boundaries.
4. `tauri build` packaging (NSIS/DMG) + full CI green run pending (needs platform
   runners + clean worktree disposition of pre-existing delta).

## 14. ADR / docs updated

- This report (`T10-B-DESKTOP-COMMAND-RECOVERY-REPORT.md`, new).
- No ADR created (no product decision taken; the settings-store unification question
  is recorded in §5 for a future ADR, not decided here).
- No chain-of-custody file modified (provenance SHAs recorded in §4).

## 15. Commit / PR

- Commit: NONE (per instructions).
- Push: NONE.
- PR: NONE.

## 16. Next exact task

T10-C (proposed): resolve the 15 pre-existing `soravo-desktop --lib` failures as
product decisions — (a) bundled `catalog.json` `missing field models` schema vs
`catalog/mod.rs` contract, (b) 5 transcription filler-gating expectations — then run
the full CI matrix (`web`, `rust`, `e2e`, `desktop`) on a clean, owner-dispositioned
worktree per T09-C §7 before any branch-protection change. Do NOT bundle with
supabase packaging (§5.11) or settings-store unification (§5) without separate ADRs.

---

*Method: skill gate first (§1) → full v6 + T09-B/C + matrix read → frontend/Rust/grep
survey → git-history provenance (`83a506e8`, `69999112`, `842acdf9`/`a156c8c9`) →
smallest-compatible restore → `cargo fmt` → `cargo check --all-targets` → targeted +
full Rust tests → clippy → `tsc`/`vitest`/`vite build` → `pnpm e2e` → report. No commit, no push.*
