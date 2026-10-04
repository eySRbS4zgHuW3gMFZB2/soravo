# T03-E — DESKTOP COMPILER RECOVERY REPORT

**Status:** Fix set applied and verified to the extent permitted by two human-decision blockers. Desktop build is NOT green.
**Date:** 2026-09-28
**HEAD:** `ede495b55efd95cedd882d90a19d12b4777da852` (= `origin/main`, no divergence)
**Branch:** `main`

---

## 1. Inputs read

- `T02-CI-BASELINE-AUDIT-REPORT.md` (baseline: 279 desktop errors in CI, 15 web lint errors, fmt failure)
- `T03-D-DESKTOP-RESIDUAL-ERROR-INVENTORY.md` (residual plan; used, with deviations noted in §7)
- `docs/Soravo_Engineering_Docs_v6/03_TECHNICAL_DESIGN.md`
- `docs/Soravo_Engineering_Docs_v6/05_DESKTOP_CONTRACTS.md`
- `docs/Soravo_Engineering_Docs_v6/04_HANDY_FORK_AND_REUSE_POLICY.md`
- `docs/Soravo_Engineering_Docs_v6/13_DEFINITION_OF_DONE_AND_QA.md`
- `docs/Soravo_Engineering_Docs_v6/14_CI_CD_AND_BRANCHING.md`
- `docs/Soravo_Engineering_Docs_v6/21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` (consulted for Handy provenance questions)

**Evidence gap:** `T03-C-DESKTOP-CARGO-FORENSICS.md` does not exist in the worktree (searched repo root and full `T03*` glob; only `T03-D` is present). Its role was filled with T02 §6.3/§10-R3/R6 + T03-D §2 + live forensics: every `use <crate>::` in `apps/desktop/src-tauri/src` cross-checked against the manifest, `Cargo.lock`, the `crates/*` manifests, and (for version/API choice) the crates.io API plus vendored registry sources under `~/.cargo`.

---

## 2. Worktree handling (before editing)

- `git status` showed pre-existing staged deletions of all 35 `docs/spec-v3/` files, pre-existing untracked audit/report files, and uncommitted source edits (3 desktop files, 4 website files). None of the documentation/archive state was touched: no reset, no clean, no checkout, no stash operation, no commit, no push. All 10 pre-existing stashes left intact.
- Pre-existing source edits were treated as in-flight work and preserved, except one destructive line deletion (see §4, item R0) that broke compilation and was restored byte-identically.

## 3. Baseline compiler failure (verified before editing)

- `cargo check -p soravo-desktop --all-targets` at start state: **lib = 282 errors, lib test = 289 errors** (`error: could not compile soravo-desktop (lib) due to 282 previous errors`). T02's CI figure was 279; the local delta is `--all-targets` (test cfg) plus toolchain drift. First error identical to T02: `E0432` at `actions.rs:4`.
- `cargo fmt --all -- --check`: FAIL (same `audio_toolkit/mod.rs` diff as T02).
- `pnpm --filter @soravo/website lint`: PASS (T03-A web fixes already present in worktree; not duplicated).

---

## 4. Fix set applied (F1–F7)

### F1. Rust formatting — APPLIED
- Ran `cargo fmt --all` (only `audio_toolkit/mod.rs` differed). `cargo fmt --all -- --check` now exits 0.
- Side effect of workspace-wide fmt: pure whitespace/line-width normalization in `crates/scheduler/src/lib.rs` (required for the workspace fmt gate; no logic change).

### F2. Web fixes — VERIFIED PRESENT, not duplicated
- The four T02 web files already carried fixes in the worktree (`payment-service.ts`, `account.tsx`, `pricing.test.tsx`, `pricing.tsx`); website lint exits 0. No further edits made to them.
- **Beyond-T03-A discovery:** the same `pnpm lint` gate was still red behind the website filter: `services/license-api` had 9 errors of the identical classes (unused imports, `any`), and `@soravo/payment-domain` had **no lint script at all** (latent since commit `091f9e92`; the root chain always expected one). Fixed minimally, mirroring sibling convention:
  - `services/license-api/src/payment/catalog.ts`: dropped unused names from the two import statements (re-exports kept).
  - `services/license-api/src/payment/service.ts`: dropped unused `CreateSubscriptionRequest` import.
  - `services/license-api/src/payment/service.test.ts`: `as any` → `as unknown as Currency` (pattern already used in that file) + `Currency` type import.
  - `packages/payment-domain/src/types.ts`: `interface RegionalPrice extends ProductPrice {}` → `type RegionalPrice = ProductPrice` (same exported name, zero behavior change).
  - `packages/payment-domain/package.json`: added `lint` script + eslint devDeps (mirrors siblings); added `packages/payment-domain/eslint.config.js` (byte-mirror of license-api's); ran `pnpm install` (lockfile updated for `--frozen-lockfile` CI).
- `pnpm lint` (all 4 filters) now exits 0. `payment-domain` + `license-api` typechecks pass; license-api tests 71/71 pass; website tests pass.

### F3. Desktop manifest repair — APPLIED (`apps/desktop/src-tauri/Cargo.toml`)
Every addition is required by current source (verified by import survey); versions pinned by `Cargo.lock`, sibling manifests, or the used API surface:
- Path: `soravo-audio = { path = "../../../crates/audio" }` (re-export backbone).
- crates.io, versions already in lock or implied by consumers: `anyhow 1`, `once_cell 1`, `sha2 0.10`, `flate2 1`, `tar 0.4` (no 1.x exists), `futures-util 0.3`, `tempfile 3`, `clap 4 + derive` (`cli.rs` derive), `tokio-util 0.7` (see hf-hub note), `hf-hub 0.4 + tokio`, `ferrous-opencc 0.4`, `transcribe-cpp 0.2 default-features=false` + `transcribe-rs 0.3 + onnx` (both mirror `crates/stt`), `handy-keys 0.3` (verified on crates.io, handy-computer), `specta 2.0.0-rc + derive` (derive needed for `#[derive(Type)]`; default is std-only), `tauri-specta 2.0.0-rc + derive` (derive feature gates the `Event` derive macro — root cause of 3× E0433 + 4× missing `emit`), `rusqlite 0.40 + bundled` (CI has no libsqlite3-dev; `rusqlite-migration 2.6` requires rusqlite ^0.40) + `rusqlite_migration 2` (underscore crate name).
- Tauri plugins used by `main.rs`/commands (three NOT in any prior inventory): added `tauri-plugin-fs`, `tauri-plugin-dialog`, `tauri-plugin-updater`, plus `global-shortcut`, `clipboard-manager`, `store`, `opener`, `os` (all `"2"`). Tauri features extended with `image-png` (`Image::from_path` is gated behind `image-ico`/`image-png`).
- Platform-gated (all uses are cfg-gated; matches `soravo-hotkeys` precedent): linux → `gtk 0.18` (NOT gtk4: `gtk-layer-shell 0.8` depends on gtk 0.18/GTK3, as does tao's `gtk_window()` handle) + `gtk-layer-shell 0.8 + v0_6` (`is_supported` needs `v0_5`, `set_keyboard_mode` needs `v0_6`); windows → `windows 0.54`, `winreg 0.10`; macos → `objc2 0.6`, `objc2-service-management 0.3`, `tauri-nspanel 2`; unix → `signal-hook 0.3`; linux-gnu → `libc 0.2` (for `memory.rs`, see blocker B2).
- Removed the never-enabled `linux` cargo feature (nothing referenced `feature = "linux"`); moved `[profile.release]` to the workspace root (T02 F10; profile warning is gone).
- `objc2` direct use is macOS-gated (`autostart.rs` `mod macos`); no unconditional `objc2` dep added.

### F4. Workspace membership — APPLIED (`Cargo.toml` root)
- Added the 5 manifested-but-excluded crates: `diagnostics`, `history`, `licensing`, `scheduler`, `vad`. All check and test clean.
- `crates/transcribe-cpp` and `crates/transcribe-rs` contain only empty `src/` dirs with no manifests: per the rule, no `Cargo.toml` invented and no directory deleted. The `transcribe_*` imports resolve via crates.io (same specs as `soravo-stt`).

### F5. cpal/rodio — APPLIED, no source changes
- Evidence (docs.rs): `rodio 0.21.1` provides exactly the used API (`OutputStreamBuilder::{from_default_device, from_device, open_stream}`, `mixer()`, free `play`, `Sink::set_volume/sleep_until_end`); 0.19 does not and 0.22 renamed the builder. `rodio 0.21` depends on `cpal ^0.16`, matching `crates/audio`.
- Change: `cpal 0.15 → 0.16`, `rodio 0.19 → 0.21`. `audio_feedback.rs` untouched.

### F6/F7. Residual source errors — APPLIED (all except blockers)
- `lib.rs`: declared `tray_i18n`, `helpers`, `memory`, `llm_client` (T03-D §6.1) plus `apple_intelligence` (required by `actions.rs:2`, `commands/mod.rs:130`) and crate-root statics `FILE_LOG_LEVEL` (AtomicU8, default `LevelFilter::Debug`, matching settings default) and `WEBVIEW_LOG_STREAMING` (AtomicBool, default false, matching `debug_mode: false`). `apple_intelligence` module is `#[cfg(target_os = "macos")]` (Swift FFI; all call sites already macos-gated; the `use` in `actions.rs` already carried that gate).
- `audio_toolkit/audio.rs` (new): re-exports `soravo_audio::audio::{list_input_devices, list_output_devices, AudioRecorder, CpalDeviceInfo}` + `recorder::{is_microphone_access_denied, is_no_input_device_error}`.
- `audio_toolkit/vad/mod.rs`: replaced the dead `detect_speech` placeholder (zero callers) with the `soravo_audio::vad` re-exports the managers import.
- `audio_toolkit/wav.rs` (new, std-only): `save_wav_file` / `verify_wav_file` / `read_wav_samples` (16 kHz mono PCM16; signatures derived from the three call sites; `transcribe(Vec<f32>)` confirms sample type). These functions were referenced but defined nowhere.
- `audio_toolkit/mod.rs`: wires the above + `get_cpal_host() -> cpal::Host` (`cpal::default_host()`, mirroring soravo-audio's crate-private copy) + `post_process` re-exports (that untracked file already contained all five needed items).
- `managers/model.rs` + `managers/model/download.rs` (hf-hub API adaptation — beyond-T03-D discovery): no published hf-hub (0.3.2/0.4.3/0.5.0/1.0.0, all checked in the local registry) provides `api::tokio::CancellationToken`, `download_with_progress_cancellable`, or `ApiError::Cancelled`. The token usage (`new/clone/child_token/cancel/cancelled/is_cancelled`) is exactly `tokio_util::sync::CancellationToken`, so imports were repointed there and the download now uses `download_with_progress` inside the pre-existing `select!` race; a local `AttemptOutcome::{Completed, Cancelled}` enum preserves the user-cancel vs stall vs error branching unchanged.
- R0 (pre-existing worktree damage repaired): the uncommitted edit to `managers/transcription.rs` had deleted `let mut model_takes_initial_prompt = false;` while two uses remained → restored byte-identically (file is now diff-free vs HEAD).
- Warning hygiene (CI `clippy -D warnings` relevance): `SecretMap` `pub(crate)` → `pub` (fields stay private; type was already exposed via a pub field); `remove_filler_words` unused param → `_output_language`. Remaining: one benign `unused_assignments` note on the restored variable (inherent to the committed code shape).

---

## 5. Verification (F8) — exact commands and results

| Command | Result |
|---|---|
| `cargo fmt --all -- --check` | **exit 0** (was: fail) |
| `cargo check -p soravo-desktop --all-targets` | **blocked**: build script fails closed (blocker B1); with temp locale inputs: **2 errors** (blocker B2), 1 benign warning — down from **282 lib / 289 lib-test** |
| `cargo check --workspace --all-targets` | all member crates check clean; only `soravo-desktop` build script fails (B1) |
| `cargo test --workspace --exclude soravo-desktop` | **exit 0** — 95+ passed, 0 failed (incl. the 5 newly-added members) |
| `pnpm lint` (root, all 4 filters) | **exit 0** (was: fail; website 15→0 pre-existing, license-api 9→0, payment-domain script added) |
| `pnpm --filter @soravo/payment-domain typecheck`, `@soravo/license-api typecheck` | exit 0 |
| license-api tests / website tests | 71/71 pass; website suite passes |
| `pnpm tauri build` (cwd `apps/desktop`, the exact CI desktop command) | **exit 1** — fails at the build script with the B1 message (frontend + all deps build before that point) |

Against T02 baseline: fmt ✅ fixed · web lint ✅ fixed (plus latent license-api/payment-domain items) · desktop 279 errors → 2 source errors + 1 fail-closed input gate (NOT green) · profile warning ✅ gone · e2e/Pages untouched per rules.

---

## 6. Remaining failures

1. Build-script gate (B1, first failure): `tray i18n: missing translation file for locale 'en' at apps/desktop/src-tauri/../src/i18n/locales/en/translation.json`.
2. `memory.rs:32` + `memory.rs:49`: `error: usage of an unsafe block` (workspace `unsafe_code = "forbid"`). Surfaces once B1 is cleared (verified with temporary inputs: these were the only 2 remaining errors crate-wide).

## 7. Human-decision blockers (STOP items — no guessing applied)

**B1 — Tray locale source files (product/copy decision).** `tray_i18n.rs` (committed design) requires `build.rs` to generate `tray_translations.rs` from `src/i18n/locales/*/translation.json`. Those files never existed (verified: absent in worktree, in HEAD history, and on all branches; Handy upstream identity is `UNKNOWN` per §21, so nothing was inferred from Handy). The 8 field names are fixed by `tray.rs` usage (`settings`, `check_updates`, `copy_last_transcript`, `quit`, `cancel`, `model`, `unload_model`, `secure_input_warning`) and the tests require `en`, `zh-TW`, `zh`, `fr` locales — but all string VALUES are product copy with no evidence source (DESIGN.md is silent; no strings exist anywhere in the repo). What was done instead: implemented the generator in `build.rs` exactly per the documented contract (English `tray` keys → struct fields, all locales → entries, missing keys → `""`, `rerun-if-changed`, ident validation) using only `serde_json`, which **fails closed with an actionable message** rather than emitting guessed copy. Needed from a human: the four locale files (or a decision for English-only plus a test adjustment), or a Handy source manifest per §21 if the copy is to come from upstream.

**B2 — `memory.rs` unsafe vs security policy (ADR decision).** The two `unsafe` blocks (`libc::mallopt`, `libc::malloc_trim`, both with SAFETY comments, Linux-glibc-only) cannot compile under the workspace `unsafe_code = "forbid"` lint, which enforces the §12 baseline ("local unsafe Rust forbidden unless an explicit ADR changes policy", in force since foundation commit `739ea664`). There is no safe equivalent (FFI inherently requires `unsafe`; `allow` cannot override `forbid`). Needed from a human: an ADR granting a policy exception for these two calls (or a product decision to drop the #1792 allocator tuning and its `actions.rs:47` call). Related: `apple_intelligence.rs` (Swift FFI, also `unsafe`) is now macOS-gated so Linux CI is unaffected, but macOS builds will need the same ADR coverage.

**Out of scope / deferred, no action taken:** `commands/account.rs` + top-level `account.rs` (untracked/in-flight account work, referenced by nothing — left undeclared rather than wiring up a feature); `cli.rs`, `hotkey.rs`, `signal_handle.rs` (present but referenced by nothing — left undeclared); `crates/transcribe-{cpp,rs}` empty dirs (left in place); release-signing, branch protection, deploy gating (T02 F11, explicitly out of scope); Supabase/MCP/payments/models (untouched).

## 8. Exact files changed (uncommitted, nothing pushed)

- `Cargo.toml` (workspace members +5, profile moved to root)
- `Cargo.lock` (new desktop dependency closure; cpal 0.16, rodio 0.21)
- `apps/desktop/src-tauri/Cargo.toml` (F3 deps + F5 versions + platform gates + `image-png` + build-dep `serde_json`)
- `apps/desktop/src-tauri/build.rs` (tray translations generator, fail-closed)
- `apps/desktop/src-tauri/src/audio_toolkit/mod.rs`, `audio_toolkit/vad/mod.rs`, `audio_toolkit/audio.rs` (new), `audio_toolkit/wav.rs` (new)
- `apps/desktop/src-tauri/src/lib.rs` (5 module decls, 1 macOS-gated, 2 root statics)
- `apps/desktop/src-tauri/src/managers/model.rs`, `managers/model/download.rs` (hf-hub adaptation)
- `apps/desktop/src-tauri/src/managers/transcription.rs` (restored pre-existing deletion; now diff-free vs HEAD)
- `apps/desktop/src-tauri/src/settings.rs` (`SecretMap` visibility), `audio_toolkit/post_process.rs` (unused-param underscore)
- `crates/scheduler/src/lib.rs` (fmt-only side effect)
- `services/license-api/src/payment/{catalog.ts, service.ts, service.test.ts}`, `packages/payment-domain/{package.json, src/types.ts, eslint.config.js (new)}`, `pnpm-lock.yaml`
- Pre-existing worktree state preserved untouched: staged `docs/spec-v3` deletions, all untracked reports, website-file fixes, `secure_input.rs`/`tray_i18n.rs` import cleanups, all stashes.
- Transient probe only (removed): placeholder locale JSON files used to verify the full crate past the build script. Four empty dirs `apps/desktop/src/i18n/locales/{en,fr,zh,zh-TW}/` remain on the filesystem (shell guard blocked `rmdir`); they are untracked, contain no files, are invisible to git, and do not change the fail-closed outcome — safe to delete manually.

---

**Bottom line: desktop build does NOT pass.** Error mass reduced 282 → 2 (+ 1 input gate), fmt/lint/workspace-tests green, but two STOP-rule blockers require human decisions: (B1) tray locale copy for 4 locales, (B2) ADR for `memory.rs` unsafe FFI. No commit made, per instructions.
