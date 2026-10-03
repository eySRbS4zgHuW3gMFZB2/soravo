# T02 — CI BASELINE RESTORATION / DETERMINISTIC FAILURE INVENTORY — AUDIT REPORT

## 1. Task identity

- Task: T02 — CI BASELINE RESTORATION / DETERMINISTIC FAILURE INVENTORY
- Mode: AUDIT-ONLY. No fixes implemented.
- Authoritative specification: `docs/Soravo_Engineering_Docs_v6/`, authority order per `docs/Soravo_Engineering_Docs_v6/00_README.md` and `docs/Soravo_Engineering_Docs_v6/SPEC_MANIFEST.json` (v6.0.0, generated 2026-09-27).
- DESIGN.md inside the v6 pack is the authoritative Soravo UI/design specification.
- Archived v2/v3 documentation is not current requirements. No archived material was used as requirements in this report.
- Razorpay MCP: OUT OF SCOPE. No Razorpay MCP configuration, authentication, installation, removal, or modification was performed.

## 2. Repository / branch / HEAD

- Repository (local remote): recorded by `git status -b` as `main...origin/main`.
- GitHub repository (per v6 SPEC_MANIFEST.json): `eySRbS4zgHuW3gMFZB2/soravo`.
- Local branch: `main`.
- Local HEAD: `ede495b55efd95cedd882d90a19d12b4777da852`.
- `origin/main`: `ede495b55efd95cedd882d90a19d12b4777da852`.
- Relationship: local HEAD equals `origin/main`. No divergence.
- HEAD subject: `docs: persist Soravo engineering control pack v6`.
- Prior observations from T01 (branch main, HEAD `ede495b5...`, 3/4 CI jobs failing, 15 web lint errors, fmt failure, desktop build failure, E2E pass, no branch protection, Pages success despite CI failure): each item was independently re-verified in this task. Results are stated below with fresh evidence. The T01 desktop error-count observation (a rounded figure near 281 errors) is superseded: the CI log at HEAD records `279 previous errors`.

## 3. Worktree state (pre-existing, recorded; nothing modified)

- Inspection command: `git status --porcelain=v1 -b` from `/home/maya/Desktop/Soravo_Engineering_Specification_v2`.
- Result: branch `main`, in sync with `origin/main`, with staged deletions, untracked audit/report files, and untracked source/config additions.
- Staged deletions (exact paths, status `D`): all 35 tracked deletions under `docs/spec-v3/`, including `docs/spec-v3/00_README.md`, `01_PRD.md`, `02_ARCHITECTURE.md`, `03_AI_INSTRUCTIONS.md`, `04_IMPLEMENTATION_PLAN.md`, `06_DOD_QA.md`, `07_AI_SKILLS.md`, `08_MCP_AND_AGENT_TOOLING.md`, `09_SECURITY_BASELINE.md`, `10_ADR_INDEX.md`, `11_INTERRUPTION_HANDOFF.md`, `12_BENCHMARK_PROTOCOL.md`, `13_RELEASE_RUNBOOK.md`, `14_ENVIRONMENT_AND_SECRETS.md`, `15_HANDY_REUSE_POLICY.md`, `16_HANDY_MIGRATION_STATUS.md`, `17_MODEL_LICENSE_AND_PROVENANCE.md`, `18_DESKTOP_ARCHITECTURE.md`, `19_DOCUMENT_GOVERNANCE.md`, `RAZORPAY-*` (11 files), `SPEC_MANIFEST.json`, and `decisions/ADR-027-handy-derived-desktop-foundation.md`.
- Untracked entries (`??`) relevant to this audit:
  - Report/draft files at repo root: `CI-BASELINE-AUDIT-002.md`, `CURRENT-STATE-AUDIT-T01-REPORT.md`, `DOCUMENTATION-ARCHIVE-003-REPORT.md`, `DOCUMENTATION-ARCHIVE-004-REPORT.md`, `DOCUMENTATION-ARCHIVE-005-REPORT.md`, `DOCUMENTATION-HYGIENE-001-REPORT.md`, `DOCUMENTATION-HYGIENE-002-REPORT.md`, `DOCUMENTATION-RECONCILIATION-002-REPORT.md`, `DOCUMENTATION-STATE-AUDIT-FINAL.md`, `DOCUMENTATION-STATE-AUDIT-V6-001.md`, `MCP-ENVIRONMENT-AUDIT-001.md`, `RAZORPAY-MCP-SETUP-001-PLAN.md`, `RAZORPAY-MCP-SETUP-002-REPORT.md`, `RAZORPAY-MCP-SETUP-003-REPORT.md`, `STATE-AUDIT-V6-002.md`.
  - `Soravo_Engineering_Docs_v6/` (untracked directory copy at repo root; authoritative pack lives at `docs/Soravo_Engineering_Docs_v6/`).
  - `apps/desktop/.env.example` (untracked).
  - `apps/desktop/src-tauri/src/audio_toolkit/post_process.rs` (untracked).
  - `apps/desktop/src-tauri/src/commands/account.rs` (untracked).
  - `apps/desktop/src-tauri/src/helpers/` (untracked directory).
  - `apps/website/src/lib/payment-service.test.ts` (untracked).
  - `deno.lock` (untracked).
  - `docs/archive/` (untracked directory).
- Audit rule compliance: no reset, clean, checkout, stash, commit, deletion, or modification of source, documentation, workflows, manifests, or MCP configuration was performed. All commands executed were read-only (`git status/rev-parse/log`, `gh run/workflow/api`, file reads, `cargo metadata --no-deps`, `cargo fmt --check`, `pnpm lint`, `grep/sed/ls`).

## 4. GitHub CI run identity (HEAD run)

- HEAD CI run (`CI` workflow): ID `36339104443`.
- Head SHA bound to run: `ede495b55efd95cedd882d90a19d12b4777da852` (equals local HEAD and `origin/main`).
- Head branch: `main`. Event: `push`. Created: `2026-09-27T18:01:39Z`.
- Run conclusion: `failure`. Duration: 4m8s.
- Per-job conclusions from `gh api .../actions/runs/36339104443/jobs`:
  - `rust` (ID `108675557751`): `failure`.
  - `web` (ID `108675557873`): `failure`.
  - `e2e` (ID `108675557935`): `success`.
  - `desktop` (ID `108675557961`): `failure`.
- Failed-job count at HEAD: 3 of 4 CI jobs (`web`, `rust`, `desktop`). `e2e` passes.
- Deployment run at same HEAD (`Deploy website to Cloudflare Pages`, ID `36339104444`): conclusion `success`, duration 35s. Deployment success coexists with CI failure at the identical HEAD.
- Evidence source: `gh run list --branch main`, `gh run view 36339104443 --json ...jobs`, `gh run view 36339104443 --log-failed` (2829 lines, saved to `/tmp/t02-failed.log` for this audit; not a repo artifact).

## 5. Workflow inventory (`.github/workflows/`)

Files present: `ci.yml`, `pages-deployment.yaml`, `release.yml`, `security-audit.yml`.

### 5.1 `ci.yml` — name `CI`

- Triggers: `pull_request` (all), `push` branches `[main]`.
- Permissions: `contents: read`.
- Job dependency: none declared; all four jobs run independently (no `needs`). A failure in one job does not skip the others at the workflow level; within a job, steps after a failed `run` step are skipped except `Post`/`Complete` steps and the e2e artifact step (`if: failure()`).
- Jobs:
  - `web`, `runs-on: ubuntu-latest`. Steps: checkout@v4; pnpm/action-setup@v4; setup-node@v4 (node 22, cache pnpm); `pnpm install --frozen-lockfile`; `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm build`; `pnpm audit --prod`. Working directory: repository root (no per-step `working-directory`).
  - `e2e`, `runs-on: ubuntu-latest`. Steps: checkout; pnpm setup; setup-node 22 + pnpm cache; `pnpm install --frozen-lockfile`; `pnpm playwright install --with-deps chromium`; `pnpm e2e`; upload-artifact@v4 (`if: failure()`, path `playwright-report/`, retention 14d).
  - `rust`, `runs-on: ubuntu-latest`. Steps: checkout; dtolnay/rust-toolchain@stable; apt install Tauri Linux system dependencies (libwebkit2gtk-4.1-dev, build-essential, curl, wget, file, libxdo-dev, libssl-dev, libayatana-appindicator3-dev, librsvg2-dev, libasound2-dev, libgraphene-1.0-dev, libgtk-4-dev, libadwaita-1-dev); `cargo fmt --all -- --check`; `cargo clippy --workspace --all-targets -- -D warnings`; `cargo test --workspace`; install cargo-audit (taiki-e/install-action@cargo-audit); `cargo audit --deny warnings --ignore GHSA-q83h-524g-xf6h --ignore RUSTSEC-2024-0370 --ignore RUSTSEC-2025-0081 --ignore RUSTSEC-2025-0075 --ignore RUSTSEC-2025-0080 --ignore RUSTSEC-2025-0100 --ignore RUSTSEC-2025-0098 --ignore RUSTSEC-2024-0429`; install cargo-deny (EmbarkStudios/cargo-deny-action@v2, `command: check`).
  - `desktop`, `runs-on: ubuntu-latest`. Steps: checkout; pnpm setup; setup-node 22 + pnpm cache; dtolnay/rust-toolchain@stable; same apt Tauri system dependencies; `pnpm install --frozen-lockfile`; `pnpm tauri build` with `working-directory: apps/desktop`.
- Package-manager setup: pnpm via `pnpm/action-setup@v4`; Node 22 via `setup-node@v4` with pnpm cache. Rust via `dtolnay/rust-toolchain@stable` (no pinned toolchain version, no `components`, no `targets` in CI).
- Cache behavior: Node/pnpm cache enabled on `web`, `e2e`, `desktop`. No `swatinem/rust-cache` in CI (release.yml uses it; ci.yml does not).
- Required secrets: none for the four CI jobs. No secrets context referenced in `ci.yml`.
- Deployment gates in `ci.yml`: none. CI does not deploy and does not gate deployment.

### 5.2 `pages-deployment.yaml` — name `Deploy website to Cloudflare Pages`

- Triggers: `push` branches `[main]`; `workflow_dispatch`.
- Permissions: `contents: read`, `deployments: write`. Concurrency group `pages-deploy`, `cancel-in-progress: false`.
- Job `deploy` (`ubuntu-latest`): checkout; pnpm setup; setup-node 22 + pnpm cache; `pnpm install --frozen-lockfile`; `pnpm build` with env `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_UMAMI_HOST_URL`, `VITE_UMAMI_WEBSITE_ID` from GitHub Actions `vars`; `cloudflare/wrangler-action@v3` running `pages deploy apps/website/dist --project-name=soravo --branch=main`, executed only `if: env.CLOUDFLARE_API_TOKEN != ''` with `apiToken: secrets.CLOUDFLARE_API_TOKEN`, `accountId: secrets.CLOUDFLARE_ACCOUNT_ID`, `gitHubToken: secrets.GITHUB_TOKEN`.
- Gate behavior: CI failure does not block this workflow. It triggers on the same `push to main` event independently of the `CI` workflow result. This is the mechanism by which deployment succeeded (run `36339104444`) while CI failed (run `36339104443`) at the same HEAD.
- Required secrets/variables for a real deploy: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (secrets); `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_UMAMI_HOST_URL`, `VITE_UMAMI_WEBSITE_ID` (vars). Values were not inspected in this task.

### 5.3 `release.yml` — name `Release`

- Trigger: `workflow_dispatch` only. Not part of the HEAD push CI signal.
- Permissions: `contents: write`.
- Jobs: `create-release` (draft GitHub release from `apps/desktop/src-tauri/tauri.conf.json` version) then matrix `build` (macOS aarch64, macOS x86_64, Windows x86_64) via `tauri-apps/tauri-action@v0` with `projectPath: apps/desktop`. Signing secrets are commented out (not active).

### 5.4 `security-audit.yml` — name `Security Audit`

- Triggers: `pull_request` touching `Cargo.lock`, `Cargo.toml`, `crates/**/Cargo.toml`, `apps/desktop/src-tauri/Cargo.toml`; weekly Sunday schedule. Not triggered by the HEAD push unless those paths change on PR.
- Permissions: `contents: read`.
- Jobs: `cargo-audit` (same ignore list as CI plus `--ignore RUSTSEC-2024-0422 --ignore RUSTSEC-2024-0423 --ignore RUSTSEC-2026-0186`), `cargo-deny` (`check`), `npm-audit` (`pnpm audit --prod --audit-level=high` after frozen install).
- Workflow syntax validation: `actionlint` binary is not installed in this environment, so static workflow lint was not executed. Syntax evidence is direct file reads plus the observed GitHub execution (all four CI jobs started and executed steps; no workflow-parse error occurred). No workflow-parse failure is recorded for run `36339104443`.

## 6. Failed jobs (exact step and error)

### 6.1 `web` — failed at step `Run pnpm lint` (step 6)

- Exact CI command: `pnpm lint` (repo root), expanding per root `package.json` to `pnpm --filter @soravo/website lint && pnpm --filter @soravo/desktop lint && pnpm --filter @soravo/license-api lint && pnpm --filter @soravo/payment-domain lint`. Failure occurred in the first filter (`@soravo/website`: `eslint src --max-warnings=0`), exit status 1. Subsequent filters, `typecheck`, `test`, `build`, `audit --prod` were skipped.
- Exact CI errors (15 errors, 0 warnings, identical locally):
  - `apps/website/src/lib/payment-service.ts`: `1:15 'Currency' is defined but never used`, `1:25 'ProductId' is defined but never used` (`@typescript-eslint/no-unused-vars`).
  - `apps/website/src/pages/account.tsx`: `10:3 'refreshEntitlements' is defined but never used`, `292:18 'handleRefresh' is defined but never used` (`@typescript-eslint/no-unused-vars`).
  - `apps/website/src/pages/pricing.test.tsx`: `1:64 'Mock' is defined but never used`, `3:24 'useNavigate' is defined but never used` (`@typescript-eslint/no-unused-vars`); `25:16`, `72:23`, `101:25`, `172:25 Unexpected any` (`@typescript-eslint/no-explicit-any`).
  - `apps/website/src/pages/pricing.tsx`: `1:25 'FormEvent' is defined but never used` (`@typescript-eslint/no-unused-vars`); `95:30`, `104:31`, `116:30`, `124:31 Unexpected any` (`@typescript-eslint/no-explicit-any`).

### 6.2 `rust` — failed at step `Run cargo fmt --all -- --check` (step 6)

- Exact CI command: `cargo fmt --all -- --check` (repo root). Exit code 1.
- Exact CI diff file: `apps/desktop/src-tauri/src/audio_toolkit/mod.rs:3` (import reordering only):
  - Current: `pub use soravo_audio::{AudioRecorder, VadPolicy};` first, then `audio::{...}`, then `vad::{EarshotVad, SileroVad, SmoothedVad, VoiceActivityDetector, VadFrame, VadTailReport, VAD_PREFILL_MS, VAD_OFFLINE_HANGOVER_MS, VAD_STREAMING_HANGOVER_MS, VAD_ONSET_MS, frames_for_duration_ms,}`.
  - Required by `cargo fmt`: `audio::{...}` first, then `vad::{frames_for_duration_ms, EarshotVad, SileroVad, SmoothedVad, VadFrame, VadTailReport, VoiceActivityDetector, VAD_OFFLINE_HANGOVER_MS, VAD_ONSET_MS, VAD_PREFILL_MS, VAD_STREAMING_HANGOVER_MS,}`, then `soravo_audio::{AudioRecorder, VadPolicy};`.
- Consequence: `clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, `cargo audit`, `cargo-deny` were all skipped in this run. Their status at HEAD is therefore unverified by CI execution (not passed, not failed — skipped behind the fmt gate).

### 6.3 `desktop` — failed at step `Build Tauri desktop` (working directory `apps/desktop`, command `pnpm tauri build` → `tauri build` → frontend `tsc -b && vite build` succeeded, Rust compile failed)

- Frontend build inside this step succeeded (`vite v8.3.1`, 35 modules transformed, built in 206ms).
- Rust compile failed: `could not compile soravo-desktop (lib) due to 279 previous errors; 1 warning emitted`.
- First logged Rust error (matches T01 observation and was re-verified against the CI log and the local source line):
  - Code: `E0432`, file `apps/desktop/src-tauri/src/actions.rs`, line 4: `use crate::audio_toolkit::{is_microphone_access_denied, is_no_input_device_error, VadPolicy};` — `no is_no_input_device_error in audio_toolkit` (and `is_microphone_access_denied` unresolved in the same import).
- Additional error classes in the same step (each verified as a line in `/tmp/t02-failed.log`; counts below are exact line-based counts of `error[E...]` occurrences in the failed log):
  - Total `error[E` occurrences: 279.
  - Missing/undeclared third-party crates in `apps/desktop/src-tauri/Cargo.toml` (each evidenced by `E0432`/`E0433` lines naming the crate while the crate is absent from the manifest dependency list): `soravo_audio`, `hf_hub`, `gtk`, `gtk_layer_shell`, `tauri_plugin_global_shortcut`, `tauri_plugin_clipboard_manager`, `tauri_plugin_store`, `tauri_plugin_opener`, `tauri_plugin_os`, `anyhow`, `once_cell`, `futures_util`, `sha2`, `specta`, `tauri_specta`, `rusqlite`, `rusqlite_migration`, `flate2`, `tar`, `transcribe_rs`, `transcribe_cpp`, `handy_keys`, `ferrous_opencc`.
  - Missing intra-crate modules/functions (`crate::...` resolution failures): `crate::tray_i18n`, `crate::helpers`, `crate::audio_toolkit::audio`, `crate::audio_toolkit::vad::{frames_for_duration_ms, EarshotVad, SmoothedVad, VAD_OFFLINE_HANGOVER_MS, VAD_ONSET_MS, VAD_PREFILL_MS, VAD_STREAMING_HANGOVER_MS}`, `crate::audio_toolkit::{apply_custom_words, detect_output_language, normalize_transcription_output, remove_filler_words, OutputLanguageEvidence}`, `crate::audio_toolkit::{save_wav_file, verify_wav_file, get_cpal_host, read_wav_samples}`, `crate::memory`, `crate::llm_client` (multiple), crate-root values `FILE_LOG_LEVEL`, `WEBVIEW_LOG_STREAMING`.
  - API mismatch: `rodio::OutputStreamBuilder` unresolved import (`apps/desktop/src-tauri/src/audio_feedback.rs:5`); `E0425: cannot find function play in crate rodio` (`audio_feedback.rs` usage `rodio::play`). Manifest declares `rodio = "0.19"`; `OutputStreamBuilder` is not present in the resolved rodio 0.19 API surface used here.
  - Version divergence: `cpal = "0.15"` in `apps/desktop/src-tauri/Cargo.toml` versus `cpal = "0.16"` in `crates/audio/Cargo.toml`.
  - Non-blocking diagnostic in the same log: `warning: profiles for the non root package will be ignored, specify profiles at the workspace root` (`apps/desktop/src-tauri/Cargo.toml` `[profile.release]` vs workspace root `/Cargo.toml`).

## 7. Successful jobs

- `e2e`: all steps succeeded (`pnpm install --frozen-lockfile`, `pnpm playwright install --with-deps chromium`, `pnpm e2e`). No artifact upload (upload step is `if: failure()` and was skipped).
- `Deploy website to Cloudflare Pages` (separate workflow, run `36339104444`): `success` at the same HEAD. This confirms the v6 §14 distinction: deployment success is not CI success.

## 8. Exact command inventory (CI command → local equivalent → outcome)

| # | CI job/step | Exact CI command | Local equivalent executed | Local outcome |
|---|---|---|---|---|
| 1 | web / `pnpm lint` | `pnpm lint` (root) | `pnpm lint` (repo root) | Reproduced: identical 15 errors, exit 1. Deterministic. |
| 2 | rust / fmt | `cargo fmt --all -- --check` | `cargo fmt --all -- --check` | Reproduced: same `audio_toolkit/mod.rs` diff, exit 1. Deterministic. |
| 3 | rust / clippy | `cargo clippy --workspace --all-targets -- -D warnings` | Not executed (blocked behind fmt in CI; running it here would exceed audit scope and require system deps; evidence insufficient for a local result) | UNKNOWN — EVIDENCE INSUFFICIENT (CI: skipped). |
| 4 | rust / test | `cargo test --workspace` | Not executed (same reason as #3) | UNKNOWN — EVIDENCE INSUFFICIENT (CI: skipped). |
| 5 | rust / audit | `cargo audit --deny warnings --ignore ...` (8 ignores) | Not executed (CI skipped it) | UNKNOWN — EVIDENCE INSUFFICIENT (CI: skipped). |
| 6 | rust / deny | cargo-deny `check` via EmbarkStudios action | Not executed (CI skipped it) | UNKNOWN — EVIDENCE INSUFFICIENT (CI: skipped). |
| 7 | desktop / build | `pnpm tauri build` (`working-directory: apps/desktop`) | Not executed locally (full Tauri build requires Linux system deps install and network resolves; CI log provides the deterministic failure: 279 compile errors) | CI failure adopted as source of truth; local compile not re-run. The 279-error set is deterministic for the pinned HEAD + manifests. |
| 8 | e2e | `pnpm e2e` (after playwright chromium install) | Not re-executed (CI success is the source of truth; no failure to reproduce) | CI: success. |
| 9 | web downstream | `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod` | Not executed (CI skipped behind lint failure) | UNKNOWN — EVIDENCE INSUFFICIENT (CI: skipped). |

## 9. Local reproduction results (per-failure detail)

- Web lint: command `pnpm lint`, cwd repo root, package `@soravo/website`, files/lines/codes exactly as in §6.1. Category: source error (unused imports, `any` types under `--max-warnings=0`). Deterministic: yes (byte-identical to CI output).
- Rust fmt: command `cargo fmt --all -- --check`, cwd repo root, file `apps/desktop/src-tauri/src/audio_toolkit/mod.rs`, no error code (formatting diff, exit 1). Category: source formatting error. Deterministic: yes.
- Desktop build: source of truth is the CI log (279 `error[E...]` lines, final `279 previous errors`). First failure: `E0432` at `apps/desktop/src-tauri/src/actions.rs:4` (`is_microphone_access_denied`, `is_no_input_device_error`). The import was verified to exist verbatim at that local file/line. The referenced `audio_toolkit/mod.rs` re-exports only `AudioRecorder`, `VadPolicy`, `audio::{...}`, `vad::{...subset...}` from `soravo_audio`, and `soravo_audio` itself is not a declared dependency of `soravo-desktop`, so the whole re-export chain is unresolvable. Deterministic: yes for the recorded HEAD/manifests/toolchain.
- T01 claim verification summary: branch main confirmed; HEAD `ede495b5...` confirmed equal to `origin/main`; 3/4 CI failures confirmed with run/job IDs; 15 web lint errors confirmed byte-identical; fmt failure confirmed; desktop failure confirmed with exact count 279 (T01's 281 is not confirmed and is discarded); E2E pass confirmed; no branch protection confirmed (§15); Pages success despite CI failure confirmed; first desktop error (`E0432` in `actions.rs`, the two symbols) confirmed; `soravo-audio` referenced-but-undeclared confirmed; `hf_hub` missing confirmed (zero occurrences in any `Cargo.toml`, multiple `E0433` uses in sources); `rodio`/`cpal` mismatches confirmed; invisible crates confirmed (§10, item C1).

## 10. Root-cause classification (exactly one of A–I; DERIVED marked)

- R1. Web lint 15 errors (`payment-service.ts`, `account.tsx`, `pricing.test.tsx`, `pricing.tsx`): **A. SOURCE ERROR**. Unused imports and explicit-`any` violations of the repo's own `eslint --max-warnings=0` gate. Independent root cause.
- R2. `cargo fmt` diff (`audio_toolkit/mod.rs` import order): **A. SOURCE ERROR**. Independent root cause (blocks all later rust-job steps in CI ordering, but is itself a source formatting defect, not derived).
- R3. `soravo-desktop` manifest missing ~24 direct dependencies used by its sources (`soravo_audio`, `hf_hub`, `anyhow`, `once_cell`, `futures_util`, `sha2`, `specta`, `tauri_specta`, `rusqlite`, `rusqlite_migration`, `flate2`, `tar`, `transcribe_rs`, `transcribe_cpp`, `handy_keys`, `ferrous_opencc`, `tauri_plugin_global_shortcut`, `tauri_plugin_clipboard_manager`, `tauri_plugin_store`, `tauri_plugin_opener`, `tauri_plugin_os`, `gtk`, `gtk_layer_shell` outside the `linux` feature gate): **B. DEPENDENCY/MANIFEST ERROR**. Independent root cause. It is the dominant cause: the majority of the 279 errors are `E0432`/`E0433` names that resolve to this manifest gap.
- R4. `cpal 0.15` (desktop) vs `cpal 0.16` (soravo-audio): **B. DEPENDENCY/MANIFEST ERROR**. Independent root cause for any type-level audio-device mismatch; contributes to `get_cpal_host`/device-info failures.
- R5. `rodio 0.19` manifest vs `OutputStreamBuilder`/`rodio::play` source API: **B. DEPENDENCY/MANIFEST ERROR** (manifest pins an API generation whose surface does not contain the used items) — alternatively **D** if the toolchain-era rodio is correct and the source drifted; evidence pins the mismatch but not the intended direction, so the fix direction requires the Handy source-chain record (v6 §04/§21). Classified **B** with direction flagged as evidence-insufficient in §16.
- R6. Workspace membership gap: root `Cargo.toml` members list 7 crates (`apps/desktop/src-tauri`, `crates/audio`, `config`, `hotkeys`, `models`, `stt`, `transcript`, `typing`) while `crates/` contains 14 entries; `diagnostics`, `history`, `licensing`, `scheduler`, `vad` have manifests but are not members; `transcribe-cpp` and `transcribe-rs` contain only `src/` with no `Cargo.toml`: **C. WORKSPACE CONFIGURATION ERROR**. Independent root cause for invisible-crate builds and for `transcribe_rs`/`transcribe_cpp`/`handy_keys` resolution failures to the extent those map to these directories.
- R7. Missing intra-crate items (`tray_i18n`, `helpers/`, `commands/account.rs` untracked, `audio_toolkit/post_process.rs` untracked, `memory`, `llm_client`, `FILE_LOG_LEVEL`, `WEBVIEW_LOG_STREAMING`, audio_toolkit function set): **A. SOURCE ERROR** where the item is genuinely absent from the crate, **C. WORKSPACE CONFIGURATION ERROR** where the item exists only as untracked files not yet integrated. Each unresolved-import line beyond R3 is marked **DERIVED** of R3+R6+R7 as applicable: once the manifest/workspace gaps are closed, the residual set must be re-measured; lines that persist are independent **A** items, lines that vanish were **DERIVED**.
- R8. `[profile.release]` inside `apps/desktop/src-tauri/Cargo.toml` while the workspace root owns profiles: **C. WORKSPACE CONFIGURATION ERROR** (warning only; not a failure cause).
- R9. Pages deploys while CI fails: **E. CI WORKFLOW ERROR** (architectural gate gap, not a code defect). No `needs`/status-check wiring makes deployment independent of CI. Independent root cause of the "green deploy on red CI" phenomenon.
- R10. Skipped-step statuses (`typecheck`, `test`, `build`, `audit`, `clippy`, `cargo test`, e2e artifact): **DERIVED** — absence of signal caused by ordering behind R1/R2, not independent passes or failures.
- No failure in this inventory meets **F. TEST HARNESS ERROR**, **G. ENVIRONMENT/SECRET REQUIREMENT** (CI jobs need no secrets; system deps installed successfully in all three Rust-bearing jobs), or **H. STALE/INVALID CI ASSERTION** (every failing assertion reproduces locally against the repo's own configuration). No item required **I. UNKNOWN** except the fix-direction sub-question in R5 and the post-fix residual set in R7, both explicitly flagged.

## 11. Dependency / causal graph

- R2 (`fmt`) → blocks `clippy` → blocks `cargo test` → blocks `cargo audit` → blocks `cargo-deny` (CI step ordering within `rust` job; all downstream `skipped`).
- R1 (`web lint`) → blocks `web typecheck` → blocks `web test` → blocks `web build` → blocks `web audit` (same ordering mechanism).
- R3 (desktop manifest gap) → causes the bulk of the 279 `E0432`/`E0433` errors, including the first error at `actions.rs:4` (the two symbols transitively require `soravo_audio`, which is undeclared, so even a correct `audio_toolkit` re-export cannot resolve).
- R6 (workspace gap) → causes invisible-crate errors and amplifies R3 (`transcribe_*`, potentially `handy_keys`).
- R4/R5 (cpal/rodio) → cause the audio-specific subset (`get_cpal_host`, `OutputStreamBuilder`, `rodio::play`); independent of R3 but masked by it in the current log (compiler reports missing-crate errors before type errors in unresolvable modules).
- R7 (missing modules/functions) → causes its own subset; partially masked by R3/R6.
- R9 (no CI→deploy gate) → causes deploy-on-red-CI; orthogonal to all compile/lint causes.
- R8 (profile warning) → causes nothing; cosmetic.

## 12. Minimal fix set (ordered; no fix implemented)

Conventions: `current` = verified HEAD state; `required` = smallest change restoring the gate; `verify` = exact command re-run.

- F1. File `apps/desktop/src-tauri/src/audio_toolkit/mod.rs`, import block lines 6–12. Current: unsorted import order. Required: apply `cargo fmt` ordering (move `soravo_audio::{AudioRecorder, VadPolicy}` last; sort `vad::{...}` identifiers). Why: unblocks the entire `rust` job (all later steps are skipped until fmt passes). v6: §14 CI family "Rust fmt/clippy/test", §13 DoD L0 static/typecheck-build. Verify: `cargo fmt --all -- --check` (exit 0). Depends on: none.
- F2. File `apps/website/src/lib/payment-service.ts` line 1. Current: imports `Currency`, `ProductId` unused. Required: remove the unused names or use them. Why: 2 of 15 lint errors. v6: §14 web lint/typecheck/test/build; §13 DoD L0. Verify: `pnpm --filter @soravo/website lint`. Depends on: none (parallel with F1).
- F3. File `apps/website/src/pages/account.tsx` lines 10, 292. Current: `refreshEntitlements` import and `handleRefresh` unused. Required: remove or wire to UI. Verify: same as F2. Depends on: none.
- F4. File `apps/website/src/pages/pricing.test.tsx` lines 1, 3, 25, 72, 101, 172. Current: unused `Mock`, `useNavigate`; four `any` annotations. Required: remove unused imports; replace `any` with explicit types. Verify: same as F2. Depends on: none.
- F5. File `apps/website/src/pages/pricing.tsx` lines 1, 95, 104, 116, 124. Current: unused `FormEvent`; four `any` annotations. Required: remove unused import; type the four sites. Verify: `pnpm --filter @soravo/website lint` fully green (all 15 errors cleared). Depends on: F2–F4 (same gate; any order).
- F6. File `apps/desktop/src-tauri/Cargo.toml`, `[dependencies]` section. Current: 19 declared deps; ~24 used crates undeclared (§6.3 list). Required: add each used crate with a version/path consistent with the repo's Handy source-chain record (v6 §04, §21) — including `soravo-audio` (path `../../../crates/audio`), `hf_hub`, `anyhow`, `once_cell`, `futures_util`, `sha2`, `specta`, `tauri-specta`, `rusqlite`, `rusqlite-migration`, `flate2`, `tar`, `transcribe-rs`/`transcribe-cpp` (or their real package names), `handy-keys` (or real name), `ferrous-opencc`, the five missing `tauri-plugin-*`, and non-optional treatment of `gtk`/`gtk-layer-shell` if sources use them outside `#[cfg(linux)]`. Why: resolves the dominant `E0432`/`E0433` class. v6: §03 desktop stack (Tauri → contracts → Handy-derived audio/VAD/STT/model/typing), §05 desktop contracts, §13 desktop acceptance (build). Verify: `cargo check -p soravo-desktop --all-targets` (then full `pnpm tauri build` path via CI desktop job). Depends on: F1 (fmt green keeps the signal clean); blocks measurement of the R7 residual.
- F7. Files `Cargo.toml` (workspace root) + `crates/transcribe-cpp`, `crates/transcribe-rs`. Current: 7 members; 5 manifested crates excluded; 2 directories without manifests. Required: either add manifests + membership for crates the desktop actually uses, or delete/ignore the directories and remove the corresponding source references — decision bound to the v6 §04 reuse policy and §21 chain-of-custody record, not to preference. Why: closes R6; without it `cargo clippy --workspace --all-targets` and `cargo test --workspace` assert over the wrong crate set. v6: §04, §21, §14 Rust family. Verify: `cargo metadata --no-deps --format-version 1` lists exactly the intended member set; `cargo clippy --workspace --all-targets -- -D warnings` executes over it. Depends on: F6 (manifest identities must exist before membership is meaningful).
- F8. Files `apps/desktop/src-tauri/Cargo.toml` (`cpal`, `rodio` lines) + `apps/desktop/src-tauri/src/audio_feedback.rs` + `crates/audio/Cargo.toml`. Current: desktop `cpal 0.15` vs audio `cpal 0.16`; desktop `rodio 0.19` vs `OutputStreamBuilder`/`play` API. Required: align each pair to one version whose API contains the used symbols (bump manifest or adapt call sites, per Handy source-chain record; no upgrade beyond what the used API requires). Why: clears R4/R5 audio subset. v6: §03 audio pipeline, §05 audio invariants. Verify: `cargo check -p soravo-desktop --all-targets` shows zero `cpal`/`rodio` errors. Depends on: F6.
- F9. Residual source integration (files named by the post-F6/F7/F8 compiler residual; candidate set at HEAD: `src/actions.rs:4`, `src/audio_toolkit/*`, `src/tray_i18n`, `src/helpers/*`, `src/commands/account.rs`, `src/audio_toolkit/post_process.rs`, `src/memory`, `src/llm_client`, crate-root `FILE_LOG_LEVEL`/`WEBVIEW_LOG_STREAMING`). Current: unresolved or untracked. Required: integrate (declare modules, implement or re-export the exact symbols) or remove the stale imports, per v6 §05 contracts (session/transcript/IPC/typing/audio/models/entitlements). Why: clears R7 residual. v6: §05, §13 desktop acceptance. Verify: `cargo check -p soravo-desktop --all-targets` zero errors; then `cargo clippy --workspace --all-targets -- -D warnings`; then `cargo test --workspace`. Depends on: F6, F7, F8 (residual cannot be measured until then).
- F10. File `apps/desktop/src-tauri/Cargo.toml`, `[profile.release]` block (lines 48–51). Current: non-root profile (warning). Required: move to workspace-root `Cargo.toml`. Why: removes the only warning so `-D warnings` clippy/build gates are not polluted. v6: §14 Rust family. Verify: `cargo check` emits no profile warning. Depends on: none (cosmetic; do with F6).
- F11. Files `.github/workflows/ci.yml` + `pages-deployment.yaml` (or branch-protection required-status-checks as the mechanism). Current: deployment independent of CI. Required: wire deployment behind CI success (required status checks on `main` and/or `needs`/API status gate in the deploy workflow). Why: closes R9 so Pages cannot go green on red CI. v6: §14 "Deployment success is not CI success… Record both" and CI families list. Verify: a red-CI HEAD does not deploy; a green-CI HEAD deploys (verified via run conclusions). Depends on: F1–F9 (only meaningful once CI can go green).
- Explicitly out of the minimal set: dependency upgrades beyond the used API, library replacements, architecture changes (all require an ADR per v6 determinism rules and are not needed for the baseline).

## 13. Fix ordering

1. F1 (fmt) + F2–F5 (web lint) in any order — both unblock their job pipelines; no cross-dependency.
2. F6 (desktop manifest) + F10 (profile move) — foundation for all Rust signal.
3. F7 (workspace membership) — defines the crate universe clippy/test/audit assert over.
4. F8 (cpal/rodio alignment) — clears the audio subset.
5. F9 (residual source integration) — measured only after 2–4; iterate `check → clippy → test` until zero.
6. Rust-side verification ladder: `cargo fmt --check` → `cargo clippy --workspace --all-targets -- -D warnings` → `cargo test --workspace` → `cargo audit` (CI ignore list) → `cargo-deny check` → desktop `pnpm tauri build`.
7. Web-side verification ladder: `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build` → `pnpm audit --prod`.
8. F11 (CI→deploy gate) + branch protection (§15 recommendation) — last, after green is achievable.

## 14. CI baseline contract ("CI green" for this repository)

Derived only from workflows and v6 actually present — no invented gates:

1. Workflow syntax valid (all four workflow files parse; jobs execute rather than failing at parse).
2. `web`: `pnpm install --frozen-lockfile` succeeds; `pnpm lint` exit 0; `pnpm typecheck` exit 0; `pnpm test` exit 0; `pnpm build` exit 0; `pnpm audit --prod` exit 0 (ci.yml web steps in order).
3. `e2e`: `pnpm install --frozen-lockfile`, `pnpm playwright install --with-deps chromium`, `pnpm e2e` all exit 0.
4. `rust`: `cargo fmt --all -- --check` exit 0; `cargo clippy --workspace --all-targets -- -D warnings` exit 0; `cargo test --workspace` exit 0; `cargo audit` (with the checked-in ignore list) exit 0; `cargo-deny check` exit 0.
5. `desktop`: `pnpm install --frozen-lockfile` + `pnpm tauri build` (cwd `apps/desktop`) exit 0.
6. Workspace resolves: `cargo metadata --no-deps` member set equals the intended set (post-F7); no profile warnings.
7. `security-audit.yml` gates pass when triggered (cargo-audit with its ignore list, cargo-deny, `pnpm audit --prod --audit-level=high`).
8. Deployment gate behaves correctly: Pages deploys if and only if the governing CI signal is green (post-F11; currently NOT satisfied — deploy succeeds on red CI).
9. v6 DoD overlay (§13): requirement mapping, targeted tests, security review, and recorded CI run IDs for the fixing PR — evidence recorded, not additional machine gates.

## 15. Branch-protection state

- Method: `gh api repos/eySRbS4zgHuW3gMFZB2/soravo/branches/main/protection`.
- Result: HTTP 404 `Branch not protected`.
- Recorded state: **BRANCH PROTECTION = ABSENT**.
- Nothing was enabled during this task (per stop rule).
- Recommended configuration as a later task (not applied): protect `main`; require pull requests; require status checks `CI/web`, `CI/rust`, `CI/desktop`, `CI/e2e` (exact job names from ci.yml) to pass before merge; require branches up to date; block force-pushes and history rewrites (per v6 §14: feature branches `Txx/short-description`, focused commits, never force-push shared history); restrict direct `main` pushes; require the Pages deploy workflow to run only on green CI (F11). Exact check names and admin scoping to be confirmed against the GitHub API at implementation time.

## 16. Evidence gaps

- G1. `clippy`, `cargo test`, `cargo audit`, `cargo-deny`, web `typecheck/test/build/audit`: CI skipped them; local runs were not performed (audit scope + system-dependency cost). Status: UNKNOWN — EVIDENCE INSUFFICIENT beyond "skipped behind R1/R2".
- G2. Desktop local compile: not re-run locally; CI's 279-error log is adopted as source of truth. A local `cargo check` may surface environment-specific deltas (toolchain minor version, system libs). Status: CI evidence only.
- G3. Intended direction of R5 (bump rodio vs adapt call sites) and exact intended versions for all F6 additions: requires the Handy source-chain record (v6 §04/§21) and `crates/*` manifest cross-check; not decided here.
- G4. `crates/transcribe-cpp/src` and `crates/transcribe-rs/src` contents were listed but not inventoried symbol-by-symbol; whether they are the true providers of `transcribe_cpp`/`transcribe_rs`/`handy_keys` is UNKNOWN — EVIDENCE INSUFFICIENT.
- G5. `helpers/`, `commands/account.rs`, `audio_toolkit/post_process.rs` are untracked; whether they are the intended providers of the missing modules is UNKNOWN — EVIDENCE INSUFFICIENT.
- G6. Secrets/vars state for Pages (`CLOUDFLARE_*`, `VITE_*`) was not enumerated beyond workflow references; deploy succeeded, so presence is evidenced, values were not inspected.
- G7. `actionlint` unavailable; workflow-syntax evidence is execution-based, not linter-based.

## 17. Explicit blockers

- B1. Desktop manifest gap (R3): ~24 undeclared crates make `soravo-desktop` uncompilable; nothing downstream (clippy, tests, desktop build, release) can pass until F6 lands.
- B2. Workspace membership gap + manifest-less `transcribe-*` directories (R6): the build universe is undefined; clippy/test/deny cannot assert the correct crate set until F7 lands.
- B3. Audio API alignment (R4/R5): `cpal`/`rodio` mismatches independently break the audio path even after B1/B2.
- B4. Residual source gaps (R7): missing modules/functions/symbols; exact residual measurable only after B1–B3.
- B5. Gate-ordering masking: CI stops each job at its first failed step, so `typecheck/test/build/audit/clippy/cargo-test` signals do not exist yet; each will produce its own follow-on findings once unblocked.
- B6. Deploy-on-red-CI (R9) + absent branch protection: `main` accepts red-CI pushes and deploys them; baseline restoration has no enforcement until F11 + protection land.
- B7. Dirty worktree (staged `docs/spec-v3` deletions + untracked files): the fixing task must start by dispositioning this state (restore, commit, or discard per owner intent) without mixing it into the CI-fix diff.

## 18. Exact next implementation task

- Title: T03 — CI BASELINE FIX (ordered F1–F11 execution).
- Scope: starting from a clean, owner-dispositioned worktree at HEAD `ede495b55efd95cedd882d90a19d12b4777da852` (or its fast-forward if `main` advanced; re-verify HEAD first):
  1. Execute F1–F5 (fmt + 4 web-lint files) and verify with `cargo fmt --all -- --check` and `pnpm --filter @soravo/website lint`.
  2. Execute F6+F10 (desktop manifest + profile move), F7 (workspace), F8 (cpal/rodio) per the Handy source-chain record, verifying with `cargo metadata --no-deps` and `cargo check -p soravo-desktop --all-targets`.
  3. Measure the F9 residual with `cargo check`, integrate/remove per §05 contracts, and climb `clippy --workspace --all-targets -- -D warnings` → `cargo test --workspace` → web `typecheck/test/build/audit` → `pnpm tauri build`.
  4. Open a focused PR from a `T03/short-description` feature branch citing CI run `36339104443` as the baseline and the new green run ID as proof; record both per v6 §14.
  5. In a separate follow-on (not in the fix PR unless owned): F11 deploy gate + branch-protection enablement with the §15 configuration.
- Acceptance: every item of the §14 contract passes on the PR's CI runs; Pages behavior verified consistent with CI; no architecture change without an ADR; no dependency change beyond the used API.
- Out of scope (carried over): Razorpay MCP any-action; archived-docs resurrection; release.yml signing activation.

---

*Audit method: read-only inspection (`git`, `gh`, file reads, `cargo metadata --no-deps`, `cargo fmt --check`, `pnpm lint`, `grep/sed/ls`). No source, documentation, workflow, manifest, or MCP state was modified. Report path: `T02-CI-BASELINE-AUDIT-REPORT.md`.*
