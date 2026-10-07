# R1-GAP-004 — Permission/Capability Runtime Checklist

Task: R1-GAP-004 · 2026-10-07 · branch `r1-gap-004/permission-capability-checklist`
Starting `origin/main`: `e5b1e35d8401fff8c9838218cd82a57ff06f0138` (CI run `37621893391` success, 7/7 jobs green incl. both macOS legs + Windows).

## 1. Authoritative definition

T34-AI (2026-10-06, STAGE B re-audit) — R1-GAP-004 *"permissions/platform config"*,
class **IMPLEMENTED+NOT VERIFIED**, executable-now item *"004 permission/capability
runtime checklist"*. No per-item acceptance text exists beyond that; acceptance is
reconstructed from the governing contracts (§2 below). This task executes exactly
that checklist item. Nothing else.

## 2. Governing contracts (authority ladder applied)

- `05_DESKTOP_CONTRACTS.md` — Tauri: least privilege, restrictive CSP, typed IPC,
  validated paths, no arbitrary process execution.
- `12_SECURITY_BASELINE.md` — restrictive CSP + least-privilege Tauri capabilities;
  typed/validated IPC; no arbitrary process/shell execution; no secrets in desktop.
- `13_DEFINITION_OF_DONE_AND_QA.md` — desktop acceptance incl. microphone, settings,
  model install; build + launch.
- `02_PRODUCT_REQUIREMENTS.md` — macOS/Windows primary; Linux optional/development.
- `04_HANDY_FORK_AND_REUSE_POLICY.md` — ADOPT/ADAPT platform plumbing; V1 preservation
  (no STT-behavior change); Handy reuse first, smallest Soravo delta.
- ADR-031 §5.5 — risk classification for the change record (§9).

## 3. Scope reconstruction (required ten points)

1. **Exact acceptance criteria.** Declarations match runtime requirements per
   platform; least privilege holds (no unneeded command/capability exposed, no
   debug/test capability in prod, no secrets through capabilities, desktop-only
   privileges not granted to the website); E2E doubles excluded from prod builds;
   each item VERIFIED only with cited evidence.
2. **Relevant permissions/capabilities.** `capabilities/default.json` (12 core
   permissions, `windows: ["main"]`); CSP in `tauri.conf.json`;
   `Entitlements.plist`; macOS `Info.plist` usage description; Linux deb/rpm
   deps + lib-file maps; Windows NSIS/WiX + `tauri.windows.conf.json` resources.
3. **Declaring manifests.** `apps/desktop/src-tauri/capabilities/default.json`,
   `tauri.conf.json`, `Entitlements.plist`, `tauri.windows.conf.json`
   (+ `Info.plist`, added by this task — was absent).
4. **Exercised at runtime.** 20 registered app commands via `invoke`; `core`
   event listen/unlisten; Rust-side plugin use only (store/os/clipboard/opener/
   log); cpal mic capture; global-shortcut; autostart; single-instance.
5. **Required by windows/plugins/commands.** Single `main` window; all plugins
   server-side (frontend invokes zero plugin commands); registered commands are
   all app-defined.
6. **Platform split.** macOS: usage description (was missing — corrected here),
   entitlements posture, accessibility-gated Enigo/input, secure-input monitor.
   Windows: mic-privacy registry reader exists but is unregistered (dormant,
   other gaps own it); no manifest requirement. Linux: no permission model;
   layer-shell + shared-lib deps. Cross-platform: capability file, CSP.
7. **Handy vs Soravo.** Table in §5. One genuine omission found (Info.plist);
   corrected by byte-identical reuse, not invention.
8. **Verification-only or code change.** Minimal config correction (one static
   plist, Handy-identical) + focused regression tests. No production behavior
   changed; no capability weakened or broadened.
9. **Blocked items.** macOS/Windows *runtime* proof (no Apple/Windows host, mic,
   or TCC/consent UI on this Linux host) — marked NOT EXECUTED, never VERIFIED.
10. **Evidence per item.** Command outputs, file reads, SHAs, CI run IDs in §4.

## 4. Checklist (evidence-backed)

| # | Item | Evidence | Status |
|---|---|---|---|
| C-01 | Capability file exists, scoped to `main` window only | Read `capabilities/default.json`: `identifier: default`, `windows: ["main"]`, 12× `core:*` permissions, zero plugin permissions | VERIFIED |
| C-02 | Granted core permissions cover actual frontend use | Frontend imports only `@tauri-apps/api/core` (`invoke`) + `@tauri-apps/api/event` (`listen`) — `ipc.ts:1-2`, 8 test files mock the same two modules; zero `@tauri-apps/plugin-*` imports in `apps/desktop/src` | VERIFIED |
| C-03 | No plugin command reachable from frontend | 9 plugins initialized in `main.rs:54-68` (log/store/os/clipboard/fs/dialog/global-shortcut/autostart/single-instance); all plugin use is Rust-side (`settings.rs` StoreExt, `tray.rs`/`clipboard.rs`/`paste_tx/macos.rs` ClipboardExt, `commands/mod.rs` OpenerExt on fixed app-data paths, `settings.rs:637` os locale). Capability grants no `plugin:*` permission, so any future frontend plugin call fails closed | VERIFIED |
| C-04 | Registered command surface = 20 app-defined commands | `main.rs:116-139` `generate_handler!` lists exactly 20; all app-defined (no `plugin:` command). Unregistered-but-defined commands (e.g. `hotkey_*` in `hotkey.rs`, model/audio commands) are unreachable — fail-closed by construction; their wiring belongs to R1-GAP-003/017, not here | VERIFIED |
| C-05 | Opener/file opening cannot take arbitrary frontend paths | `open_recordings_folder`/`open_log_dir`/`open_app_data_dir` (`commands/mod.rs:101-140`) derive paths server-side from `portable::app_data_dir`; frontend supplies no path | VERIFIED |
| C-06 | CSP restrictive | `tauri.conf.json` `app.security.csp`: `default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; connect-src ipc: http://ipc.localhost; img-src 'self' asset:; style-src 'self' 'unsafe-inline'; script-src 'self'` (vs Handy `csp: null`) | VERIFIED |
| C-07 | macOS mic usage description declared | **Was absent** (no `Info.plist`, no `infoPlist` config key). Added `src-tauri/Info.plist`, byte-identical to Handy @ pin (§5). Mechanism verified against locked-family sources: `tauri-cli` auto-merges `tauri_dir/Info.plist` on macOS builds; `tauri-bundler` merges `bundle.macOS.infoPlist` — no config change needed | VERIFIED (static; runtime NOT EXECUTED) |
| C-08 | Entitlements posture unchanged and sufficient | `Entitlements.plist`: `app-sandbox=false`, user-selected/downloads read-only, network client. Device mic/audio-input entitlements are a *sandboxed*-app requirement; with sandbox off, the C-07 usage description is operative. `Entitlements.plist` deliberately untouched; posture pinned by new regression test | VERIFIED |
| C-09 | Linux packaging deps match Handy-proven set | deb `depends: [libgtk-layer-shell0, libopenblas0]`, rpm equivalents, `transcribe-libs` file maps — identical names to Handy @ pin (install prefix adapted `Handy`→`Soravo`, expected rebrand) | VERIFIED |
| C-10 | Windows config minimal, no extra privilege | `tauri.windows.conf.json` = resources map only (`transcribe-libs: .`); NSIS/WiX block carries no capabilities, no elevation, no sign-command (vs Handy `signCommand`, distribution-owned) | VERIFIED |
| C-11 | `core:event:allow-emit` granted but frontend never emits | `grep emit(` over `apps/desktop/src` (non-test): zero hits. Granted-but-unused. Left untouched per no-churn rule (removing it to "look cleaner" is prohibited churn; future use stays available) | VERIFIED (observation, no change) |
| C-12 | No debug/test capability shipped to prod | `e2e-doubles.ts`/`e2e-harness.tsx` referenced only from `*.test.*`/dev-gated `main.tsx` (R1-GAP-028 evidence: zero harness strings in `dist/`) | VERIFIED |
| C-13 | No secrets through capabilities/IPC | `15_ENVIRONMENT_AND_SECRETS.md` boundary holds: no secret-typed command among the 20 registered; account commands carry snapshots, not keys | VERIFIED |
| C-14 | Desktop-only privileges not granted to website | `apps/website/src` contains zero `tauri` imports; website is a separate Vite app with no capability surface | VERIFIED |
| C-15 | macOS runtime permission prompt (TCC) observed | No macOS host/mic on this Linux host; cannot trigger or observe the prompt | NOT EXECUTED |
| C-16 | Windows mic-privacy runtime behavior observed | No Windows host; `get_windows_microphone_permission_status` additionally unregistered (dormant) | NOT EXECUTED |
| C-17 | Linux mic permission runtime | No permission model on Linux (device-node access); covered by R1-GAP-007 device evidence, not here | N/A (no OS gate exists) |

**Result: 14 VERIFIED · 0 NOT VERIFIED · 2 NOT EXECUTED (C-15/C-16, platform-blocked) · 1 N/A.**

## 5. Handy comparison / reuse findings

Pin of record `https://github.com/cjpais/Handy @ ba10ce19` (verified live via
authenticated `gh` API). All upstream blobs fetched at the pin, never inferred.

| Area | Handy @ pin | Soravo (before → after this task) | Classification |
|---|---|---|---|
| `capabilities/default.json` | broad: `core:default, opener/store/updater/process/dialog:default, global-shortcut ×4, macos-permissions:default, fs scopes ($APPDATA)`; windows `["main","recording_overlay"]` | narrow core-only (12 perms); windows `["main"]` | HANDY-ADAPT (deliberate least-privilege narrowing; Soravo frontend needs no plugin IPC) |
| `Info.plist` | `NSMicrophoneUsageDescription: "Request microphone access to transcribe audio locally"` | absent → **restored byte-identical** (SHA-256 `c408cb9d…fb8df9`, `cmp` clean) | HANDY-REUSE |
| `Entitlements.plist` | `device.microphone + device.audio-input = true` (no sandbox key) | `app-sandbox=false` + files/network (no device keys) | HANDY-ADAPT (equivalent non-sandboxed posture, leaner; device keys are sandboxed-app requirements) |
| `macos-permissions` plugin | `tauri-plugin-macos-permissions` + onboarding UI (accessibility check/request) | plugin absent; accessibility handled lazily via `initialize_enigo`/`initialize_shortcuts` commands + Enigo error surfacing | HANDY-ADAPT (partial consumer-side gap belongs to onboarding scope, not 004) |
| `process`/`updater`/`opener`/`store`/`fs`/`dialog` plugin perms | granted to frontend | server-side only; frontend denied by default | HANDY-ADAPT (strictly narrower; correct) |
| CSP | `null` | explicit restrictive (see C-06) | SORAVO-OWNED (security contract) |
| `tauri.conf.json` resources | `["resources/**/*"]` (Silero VAD asset) | none (asset absent — R1-GAP-008 BLOCKED, unchanged) | N/A (blocked prerequisite, untouched) |

Correction to an interim hypothesis (recorded, not hidden): Handy's `Info.plist`
was first suspected to be dead config (no `tauri.conf` reference). Verification
against the locked-family `tauri-cli` source (`interface/rust.rs`: `tauri_dir.join(
"Info.plist")` auto-merged on macOS builds) proves it ships in real macOS
bundles. The omission in Soravo was therefore genuine, and the fix follows the
proven mechanism. No history rewritten.

## 6. Runtime verification performed (safe, deterministic)

- `cargo test -p soravo-desktop --lib platform_config` → **2 passed, 0 failed**
  (272 others filtered; full lib suite green in CI below).
- `cargo fmt --check -p soravo-desktop` → clean.
- `cargo clippy -p soravo-desktop --lib --tests` → zero warnings.
- `git diff --check` → clean (at commit time).
- Live reads: capability/CSP/entitlements/tauri.conf/`.windows.conf`/registered
  commands/frontend imports/plugin use-sites/website imports — all cited above.
- Full validation (all 4 required checks + 3 platform bundle legs incl. the
  macOS `Info.plist` merge path) runs as PR CI, recorded in PROGRESS.md.

NOT performed by design: real mic access, model download, production
credentials, disabling OS prompts, bypassing TCC/consent systems.

## 7. Files changed

- `apps/desktop/src-tauri/Info.plist` (new; Handy-byte-identical, SHA-256
  `c408cb9da38ccc7524c9169f10e06a646bd30f12d09c3bd5323eced312fb8df9`).
- `apps/desktop/src-tauri/src/platform_config_tests.rs` (new; 2 regression
  tests, std-only — no dependency added).
- `apps/desktop/src-tauri/src/lib.rs` (+5: `#[cfg(test)]` module wiring only;
  zero production code).
- `R1-GAP-004-PERMISSION-CAPABILITY-CHECKLIST.md` (new; this file).
- `PROGRESS.md` (entry; on record branch per T34-AL pattern).

Deliberately unchanged: `capabilities/default.json`, `Entitlements.plist`,
`tauri.conf.json`, `tauri.windows.conf.json`, `main.rs`, all commands/managers,
all Handy behavior files, `catalog.json`, workflows, manifests/lockfiles,
website, Supabase, payment, ADRs.

Worktree note (preserved, not staged): at commit time the worktree carries
pre-existing UNCOMMITTED hunks that are not this task's work and are not part
of this PR — `commands/mod.rs` model-command re-exports (R1-GAP-017
re-verification comment) + `main.rs` `models::*` import and 10 model commands
in `generate_handler`. They appeared in the worktree independent of this task
(this task's `main.rs` read showed the 20-command handler; C-04 above describes
the PR base). Per the dirty-worktree rule they are classified unrelated/unknown
work: preserved verbatim, never staged (`git add` lists §7 paths explicitly),
never committed. Consequence for evidence: the local `cargo test/clippy/fmt`
runs compiled with those hunks present; the two new tests are file-content
guards with no dependency on them, and PR CI re-runs everything on the clean
base. The 017 registration follow-up stays with its owning task.

## 8. Security review

Least privilege unchanged-or-improved: the diff *adds* one user-facing macOS
disclosure string (grants the app nothing; informs the TCC prompt) and two
static guards. No command exposed or unexposed; no capability broadened;
no IPC shape changed; no secret touched; no control removed (HR-7 NO);
no CI/workflow/protection/dependency change (HR-2/3/4 NO).

## 9. Risk classification (ADR-031 §5.5, deterministic)

HR-1 NO (no auth/session/entitlement/payment/secret/CSP/capability/IPC/download/
telemetry touch — Info.plist is bundle metadata, not in the trigger list).
HR-2 NO · HR-3 NO · HR-4 NO (zero dependency declarations; test is std-only) ·
HR-5 **MATCH (ambiguity fails safe)** — the diff touches the Handy-derived
`apps/desktop/src-tauri` tree (one `#[cfg(test)]` wiring line in `lib.rs`;
precedent R1-GAP-007/009 classified test-only additions inside a Handy-derived
tree identically) · HR-6 NO · HR-7 NO · HR-8 recording-label if applied.
**Higher-risk wins → HIGH-RISK → §5.10 High-Risk AI Self-Review path**
(C1–C18 on the final head, evidence comment, never an APPROVE).

## 10. Exact next task

Merge this PR by the ordinary HR path (§5.10 PASS + all green + no bypass),
verify post-merge `origin/main`, then record-progress PR. Remaining map after
004: BLOCKED 008 (Silero asset), 011 (downloaded model), 021 (Supabase/PKCE
owner decision); DEFERRED 022/027/029/030; MISSING 026 (real-model E2E
dictation proof). Do not start R2/R3, payment, or UI redesign. Do not touch
R1-GAP-008/011/021.
