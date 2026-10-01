# ADR-022 — macOS minimum supported version 10.15 (Tauri `minimumSystemVersion` floor for the aarch64 ggml build)

Status: Accepted (owner-authorized 2026-10-01 as the T33-P-FOLLOWUP-3 project decision: ACCEPT macOS 10.15 as Soravo's minimum supported macOS version)
Date: 2026-10-01 (UTC)
Sequence: v6 pack sequence. The index of record is
`docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`, which governs. Root
`10_ADR_INDEX.md` (`ADR-022 — Supabase admin role / authorization`) belongs to
a different, older sequence and is unaffected by this entry.

Context:

- T33-P-FOLLOWUP-1 §B (forensics only, no repair) established the complete
  causal chain for the macOS aarch64 failure, re-derived first-hand this
  session on the current HEAD and on authoritative CI run `36807093893`,
  job `desktop build (macOS, aarch64-apple-darwin)` (`110193759040`):
  1. `apps/desktop/src-tauri/tauri.conf.json` `bundle.macOS` contained only
     `entitlements` — `minimumSystemVersion` was unset.
  2. The repo's pinned Tauri CLI 2.12.0 defaults `minimumSystemVersion` to
     `"10.13"` (`config.schema.json` in
     `node_modules/.pnpm/@tauri-apps+cli@2.12.0`, `bundle.macOS` default
     block), and `tauri build` exports `MACOSX_DEPLOYMENT_TARGET` from it
     (CLI CHANGELOG: "Set the `MACOSX_DEPLOYMENT_TARGET` environment
     variable with the configuration `minimum_system_version` value").
  3. `cc 1.4.7` (the `Cargo.lock`-pinned version) computes the Apple
     deployment target as `MACOSX_DEPLOYMENT_TARGET` first
     (`lib.rs:4530`), and injects it into `CMAKE_C/CXX_FLAGS`.
  4. The CI log shows the exact injected flags:
     `-DCMAKE_C_FLAGS= ... --target=arm64-apple-macosx
     -mmacosx-version-min=10.13 ...` (identical for CXX/ASM).
  5. The crate's bundled ggml uses `std::filesystem` (`ggml-backend-dl.h:14`,
     `ggml-backend-dl.cpp`, `ggml-backend-reg.cpp:7`, vendored
     `transcribe-cpp-sys-0.2.3` sources verified first-hand), which libc++
     marks `unavailable: introduced in macOS 10.15`. The errors
     (`'path' is unavailable: introduced in macOS 10.15`, `too many errors
     emitted`, `transcribe-cpp-sys v0.2.3` build script exit 101) follow.
  6. So: **10.13 (Soravo Tauri default) < 10.15 (ggml requirement)**.
- Dependency path (all pinned in `Cargo.lock`): `soravo-stt`
  (`transcribe-cpp = { version = "0.2", default-features = false }`) →
  `transcribe-cpp 0.2.3` → `transcribe-cpp-sys 0.2.3` → `cmake 0.1.58` →
  `cc 1.4.7` Apple flags → bundled ggml C++ vs
  `MACOSX_DEPLOYMENT_TARGET=10.13`.
- A repo-wide grep finds no published minimum-macOS claim
  (`apps/website/src`, docs, `SORAVO_PLAN.md`, v6 pack,
  `tauri.conf.json`): the change documents a new floor rather than
  contradicting a shipped promise. It still narrows the user-visible
  support scope and alters release artifact metadata
  (`LSMinimumSystemVersion` in the bundle `Info.plist`), so it is treated
  as a support-scope decision requiring this ADR plus the recorded owner
  authorization above.
- This ADR explicitly does NOT decide the x86_64 `ort-sys` failure
  (FOLLOWUP-1 §A, FOLLOWUP-4): `ort-sys 2.0.0-rc.12` ships zero
  `x86_64-apple-*` rows in its prebuilt-binary distribution table under any
  feature set, re-verified first-hand on job `110193759114`
  (`ort does not provide prebuilt binaries for the target
  'x86_64-apple-darwin'`). Raising the deployment target does not create
  ORT binaries, and resolving the ORT question does not raise the flag.
  The two failures are independent and are validated separately.

Decision:

- Set `bundle.macOS.minimumSystemVersion` to `"10.15"` in
  `apps/desktop/src-tauri/tauri.conf.json` — a config-only change (one
  key; no source, no dependency, no lockfile, no workflow).
- This is preferred over a CI-job-only `MACOSX_DEPLOYMENT_TARGET` env
  addition because the Tauri default applies to **release builds too**: a
  CI-env-only fix would leave `release.yml` packaging artifacts built
  against 10.13 and broken the same way. One config line fixes both paths
  consistently. No `release.yml` change accompanies this decision.
- Drops install/run support for macOS 10.13 (High Sierra) and 10.14
  (Mojave). Minimum supported macOS is now **10.15 (Catalina)** — the
  minimum at which `std::filesystem` is available per the libc++
  availability markers in the CI error. A higher floor (e.g. 11.0/13.0)
  is a separate product decision, not taken here.

Alternatives:

1. `env: MACOSX_DEPLOYMENT_TARGET: "10.15"` on the `desktop-macos` CI job
   only. REJECTED as the primary fix: fixes verification but not release
   packaging (the same 10.13 default flows into `tauri-action` builds).
   Incomplete.
2. Downgrade/replace `transcribe-cpp-sys` or ggml to a
   pre-`std::filesystem` vintage. REJECTED: dependency regression with
   unknown STT-behavior parity; Handy-preservation STOP.
3. Patch bundled ggml to avoid `std::filesystem`. REJECTED: modifies
   third-party vendored source — unsustainable, unreviewable
   supply-chain posture.
4. `minimumSystemVersion: null` (remove the env var entirely). REJECTED:
   falls back to the `cc` arch default (11.0 for aarch64) or SDK version —
   builds, but silently re-floors support without a declared product
   decision and weakens reproducibility.
5. Do nothing / defer. REJECTED: the aarch64 leg is red on the exact
   ggml floor error; deferral normalizes a broken primary-platform leg.

Security impact:

- None beyond the status quo: identical dependency tree, identical native
  code; only the Mach-O deployment floor changes. No secret, capability,
  CSP, IPC, or entitlement surface is touched. `Entitlements.plist`
  reference unchanged.

Performance impact: none claimed. Identical codegen inputs apart from the
availability floor; no benchmark is invalidated or required by this
decision.

Operational impact:

- The `desktop-macos aarch64` CI leg is expected to progress past the
  ggml `std::filesystem` errors. The `x86_64` leg is expected to remain
  red on the independent `ort-sys` error (FOLLOWUP-4) — that is not this
  ADR's failure.
- Release packaging (`release.yml`, `tauri-action`) inherits the same
  10.15 floor automatically; no release workflow change is made or needed.
  No signing, notarization, updater, or artifact-upload change rides along.

Testing impact:

- No test created, modified, or masked. Linux `cargo fmt --check`,
  `cargo clippy`, `cargo test` must stay green (config-only change;
  shared code untouched). Authoritative proof is the GitHub
  `desktop-macos aarch64` leg green plus unchanged-or-better
  `web`/`e2e`/`desktop`(Linux).

Rollback:

- Remove the `minimumSystemVersion` key (restoring the 10.13 default) and
  flip this ADR to `Superseded` with reason + date. No source, test,
  dependency, lockfile, catalog, workflow, or release change rides along
  in either direction.

Files/modules covered: `apps/desktop/src-tauri/tauri.conf.json`
(`bundle.macOS.minimumSystemVersion` only) + this ADR + the ADR index
entry.

Files/modules explicitly NOT covered: every Rust source file; every
`Cargo.toml` / `Cargo.lock` / `pnpm-lock.yaml`; `ci.yml` (no job added,
removed, or weakened); `release.yml` (untouched, never dispatched);
`Entitlements.plist`; Windows sources and legs; the x86_64 `ort-sys`
strategy (FOLLOWUP-4); `yoke-derive`; catalog/model assets; Handy
`paste_tx/` and transcription behavior; UI; all tests; signing/release
configuration.

Consequences:

- Soravo's minimum supported macOS version is 10.15, recorded here and
  enforced by the authoritative Tauri configuration for both CI
  verification and release packaging.
- The aarch64 leg becomes compilable through the ggml floor with
  transcription behavior untouched (the change only declares which macOS
  releases the existing behavior ships on). V1 Handy-preservation impact:
  none.
- First platform-scope narrowing of the Handy-derived desktop surface:
  future floor moves require the same evidence (dependency floor proof +
  owner decision + ADR).
