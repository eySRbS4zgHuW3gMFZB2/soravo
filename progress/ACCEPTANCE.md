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

---

# V1 Release-Gate Matrix — 2026-10-16 pass

Base: `release/v1-release-acceptance-2026-10-16` @ `6882d27c` (= `origin/main`,
the verified live head at this task's start; matches the Cloudflare production
deployment). Operator: opencode "release engineer" session, 2026-10-16.
Environment: same Linux VM as above (AMD Ryzen 5 5600, 4 CPU, 7.6 GiB RAM,
Ubuntu 24.04). macOS/Windows are the V1 primary platforms; nothing below claims
a macOS/Windows-native result from this Linux machine.

Reconciliation: PR #125 (overlay settings + streaming text) and #131 (bounded
Linux clipboard/paste helper waits) are MERGED and are **ancestors** of
`6882d27c` (confirmed `git merge-base --is-ancestor`). Their surfaces are not
reopened here. The desktop C1–C12 matrix above (2026-10-15 @ `7074c4dd`, also an
ancestor) is retained as the INHERITED desktop base; this pass widens scope to
the full V1 product (desktop + web + payment + packaging + legal) and adds fresh
VM evidence. Evidence vocabulary (`01_AUTHORITY_AND_SOURCE_OF_TRUTH.md`) is
honoured: no item is promoted on the strength of code existing alone.

Status vocabulary here: **VERIFIED** (executed, evidence cited) / **PASS**
(unit/integration executed) / **E2E VERIFIED** (real integrated path) /
**INHERITED** (prior recorded session, not re-run) / **BLOCKED** (named
prerequisite missing) / **UNKNOWN** (not measured). "CI green" is recorded
separately from release readiness (`14_CI_CD_AND_BRANCHING.md`: CI success ≠
deployment success ≠ release).

## Release-gate matrix

| # | Gate | Authoritative requirement | Implementation | Evidence | Status |
|---|------|---------------------------|----------------|----------|--------|
| G1 | App startup + clean shutdown | `05_DESKTOP_CONTRACTS.md` session machine; `17_RELEASE_RUNBOOK.md` "target desktop builds verified" | Tauri app `apps/desktop/src-tauri` (session state machine; `IDLE→…→IDLE`, `ANY→ERROR→IDLE`) | Build compiles (CI `desktop` + `desktop-macos`/`desktop-windows` green). No GUI session launched (BLOCKED). | **BLOCKED** — supervised GUI on release platform required (C1). Build health PASS (CI). |
| G2 | First-run + model acquisition | `03_TECHNICAL_DESIGN.md` model lifecycle; `12_SECURITY_BASELINE.md` HTTPS/SSRF/size/SHA256/atomic | `crates/models` + `apps/desktop/src-tauri/src/managers/model/download` (hf-hub, HTTPS-only, SSRF-block, size+SHA256, atomic install) | `cargo test -p soravo-models` **24 passed** this session (URL/SSRF reject, sha256, verify accept/reject/skip-absent). On-screen first-run acquisition UX not exercised (GUI). | Acquisition **logic PASS (unit)**; first-run UX **BLOCKED** (GUI). |
| G3 | Parakeet model integrity + failure recovery | `12_SECURITY_BASELINE.md` SHA256/atomic/rollback; `05_DESKTOP_CONTRACTS.md` gates before load | `ModelManager::verify`/`compute_sha256`/atomic install+rollback; `crates/models/tests/approved_artifact_acceptance.rs` | Live: `approved_launch_artifact_hash_acceptance` **ok sha=4b50b6dd…f38795 bytes=731357568** this session; `verify_rejects_substituted_artifact`/`verify_accepts_matching_artifact` PASS. | **VERIFIED** (integrity, this session). Rollback path INHERITED (unit). |
| G4 | Audio device enum / permission denial / device loss | `05_DESKTOP_CONTRACTS.md` audio; `13_DOD_QA.md` desktop acceptance | `crates/audio`, `crates/vad`, `managers/audio.rs`, error classifiers | Enumeration + never-panic + permission/device-loss classifiers PASS (inherited unit). Live denial dialogs / unplug not exercised. | Enum **PASS/INHERITED**; live permission-denial + device-loss **BLOCKED** (OS dialog/hardware). |
| G5 | Live capture + partial/final + cancellation | `05_DESKTOP_CONTRACTS.md` transcript semantics (tentative≠injected; final injectable; stale reject; cancel safe) | `StreamRouter`, `stream_worker`, `stream_events`, cancellation tests | Unit PASS (inherited: FIFO/finalize, post-take-drop, cancel delivery, double-open-routes-newest). Live partial/final latency + capture→inject path not measured on Linux. | Unit **PASS**; live partial/final + capture→insert **BLOCKED/UNKNOWN** (C5, no GUI/mic). |
| G6 | Hotkeys + text insertion + exactly-once | `05_DESKTOP_CONTRACTS.md` typing (insert OR clipboard fallback, snapshot/restore); `02_PRD.md` configurable shortcut, hold/toggle | `crates/hotkeys`, `crates/typing/tests/inject.rs`, `shortcut/mod.rs` | Shortcut registration unit PASS (**inherited**); insertion exactly-once e2e INHERITED (prior session, PR #125/‌#131 surfaces untouched). Live OS key sim unsafe on Linux. | Insertion **logic PASS/INHERITED**; live hotkey + one-shot insertion **BLOCKED** (target-OS session). |
| G7 | Overlay appearance/visibility + settings persistence across restart | `02_PRD.md` config; `05_DESKTOP_CONTRACTS.md`; store authority ADR-032 | `crates/config`, `settings.rs`, overlay (`recording_overlay` window) | Settings serde/migration/persistence: `cargo test -p soravo-config` **21 passed** this session (v0→v2 value-preserving, idempotent, missing-block default, mirror skip). Overlay 302-unit/158-vitest INHERITED. Visual + restart-restore not exercised. | Settings **logic PASS (this session)**; overlay visual + restart-restore **BLOCKED** (GUI). |
| G8 | Web build/routes/auth/account | `06_WEB_CLOUD_PAYMENT.md` (React/Vite/Router; Supabase Auth PKCE; RLS); `13_DOD_QA.md` | `apps/website` (landing/features/pricing/download/FAQ/support/legal/login/account), Supabase auth+migrations | Required CI `web` + `e2e` **green** on merged heads (lint/typecheck/test/build/audit + Playwright). RLS/auth assertions in `supabase/tests`. Not re-run locally (workspace deps not installed in this worktree; CI is authority). | Web build/routes **PASS (CI)**; auth/RLS present (inherited). Account-dashboard display is tied to the payment/entitlement gate (G9); its live rendering is **UNKNOWN** without a supervised session. |
| G9 | Razorpay TEST-mode + verified webhooks + entitlement consistency | `06_WEB_CLOUD_PAYMENT.md` (server-controlled checkout; webhook HMAC + `webhook_events` durable idempotency; server-authoritative price/user/product); `13_DOD_QA.md` payment acceptance | `supabase/functions/payment-checkout`, `razorpay-webhook`, `packages/payment-domain` catalog | Webhook semantics covered by in-tree tests (`supabase/tests/webhook-hardening.test.mjs`, `payment-checkout.test.mjs`: valid/invalid signature, duplicate, malformed, user mismatch, refund/cancellation/renewal) — **INHERITED** (CI `web` green). LIVE must never be switched on by code (`17_RELEASE_RUNBOOK.md`); LIVE keys are external secrets (human escalation). | Webhook/semantics **PASS (unit/integration, inherited + CI)**; live browser checkout→entitlement chain **BLOCKED** (supervised session + external Razorpay TEST credentials). Entitlement is server-authoritative by construction (no client writes; RLS). |
| G10 | Supported-platform compilation + installer/package generation | `13_DOD_QA.md` L0–L4; `17_RELEASE_RUNBOOK.md` reproducible artifacts, recorded checksums/signatures | `apps/desktop/src-tauri` + `ci.yml` + `release.yml`; bundle targets `app/dmg/msi/nsis` | Required CI `rust`+`desktop` **green**; `desktop-macos`(aarch64+x86_64)+`desktop-windows` compile-only (green, **non-required**). Installers for release platforms are produced ONLY by `release.yml` (manual `workflow_dispatch`) — never in required CI. | Compilation **VERIFIED (CI)**. Installable/distributable artifact **BLOCKED** — see Packaging below. |
| G11 | Install / launch / update / uninstall | `17_RELEASE_RUNBOOK.md` after publication: update download page, verify installers, verify updater, clean-machine install | `tauri-plugin-updater` is a Cargo dep but **no `plugins.updater` endpoints/pubkey**, no `createUpdaterArtifacts`, no signing; installer content untested (signed artifacts absent) | No signed installer exists to install; updater not configured. | **BLOCKED** — signing/notarization + updater config + clean-machine install all pending (post-redesign per `17_RELEASE_RUNBOOK.md` sequencing). |
| G12 | Security/privacy/secrets/legal-notices/pricing/release-docs | `12_SECURITY_BASELINE.md`; `15_ENVIRONMENT_AND_SECRETS.md`; `06_WEB_CLOUD_PAYMENT.md` | CSP least-priv (tauri.conf), RLS, HMAC webhook, secret-scan, no telemetry, pricing via `payment-domain` | Security controls present; CI `cargo-audit`/`cargo-deny`/`pnpm audit --prod` green (in `rust`/`web`). Secrets reported EXISTS/MISSING only (values never printed). MIT VAD notice bundled + integrity-guarded (new test this session). NOML Notice for launch model MISSING. | Security **PASS (controls + CI audits)**; **legal redistribution BLOCKED** (see LICENSE-GAP); pricing present (server-authoritative); release-docs present but release never executed. |

### Security/privacy notes (fresh-fact only)
- No secrets were read or printed; only EXISTS/MISSING reported (VM `env` not
  dumped). Razorpay is configured for TEST/sandbox only — no LIVE key,
  production billing, real charge/refund performed (`15_ENVIRONMENT_AND_SECRETS.md`).
- New deterministic guard (this session): `apps/desktop/src-tauri/tests/bundled_models_integrity.rs`
  binds committed VAD weights + MIT notice to their recorded provenance SHA-256,
  so a tampered bundled asset cannot ship green (`12_SECURITY_BASELINE.md`).

## Packaging & release-artifact readiness (core finding)

Required-vs-optional CI (branch protection, read this session):
- **Required (`web`, `e2e`, `rust`, `desktop`)** — all green on merged heads.
- **Non-required informational:** `desktop build (macOS, aarch64-apple-darwin)`,
  `desktop build (macOS, x86_64-apple-darwin)`,
  `desktop build (Windows, x86_64-pc-windows-msvc)` (compile-only `--no-bundle`),
  and `Deploy to Cloudflare Pages` (website only, not a desktop artifact).

What CI actually builds:
- `rust` + `desktop` (Linux) build **and bundle** the app, but Linux is **not a
  release platform** and an unsigned Linux bundle proves nothing about macOS/
  Windows distribution.
- macOS/Windows required-appearing legs are **`--no-bundle` compile-only**:
  tauri-action is **not** invoked, so **no installer/notarization/updater-manifest
  is produced there**.
- The only path that yields macOS (`.dmg`/`.app`) and Windows (`.msi`/`.nsis`)
  installers is `release.yml` (**manual `workflow_dispatch`**): creates a Draft
  release, runs `tauri-action@v0` on macos-latest (aarch64 + x86_64) and
  windows-latest. It has **never been run in required CI**.

Release-artifact blockers (exact — none cleared here):
1. **Signing/notarization absent.** All `APPLE_*` and `TAURI_SIGNING_*` env in
   `release.yml` are **commented out** → installers would be **unsigned**;
   macOS notarization is not wired. These are external secrets
   (`17_RELEASE_RUNBOOK.md`, `15_ENVIRONMENT_AND_SECRETS.md`) — human escalation.
2. **Auto-update unconfigured.** No `plugins.updater` endpoints/pubkey, no
   `createUpdaterArtifacts`; updater plugin present in code but inert. "Verify
   updater" precondition cannot be met.
3. **No recorded artifact checksums/signatures.** Runbook requires recording
   commit/toolchain/artifact names/checksums/signatures; no signed, checksummed
   artifact exists yet.
4. **Model redistribution gate** (G12/license) blocks shipping the launch model:
   commercial clearance 0/69 (PR #115), NOML Notice missing (see LICENSE-GAP).
5. **ORt/transcribe native libs**: macOS x86_64 provisions ORT 1.24.2 + bundles
   the dylib (ADR-026); Windows/Linux bundle ggml `transcribe-libs`. Installer
   *contents* for these paths are not verified on real media (needs gate 1).

Conclusion: **NOT release-ready.** Compilation is verified by CI; distributable,
signed, notarized, updatable, checksum-recording installers + clean-machine
install remain BLOCKED behind the enumerated prerequisites. No overall
completion percentage is asserted.

## Fresh local evidence — 2026-10-16 (this session, VM)
- `cargo test -p soravo-config` → **21 passed, 0 failed**.
- `cargo test -p soravo-models` → **24 passed, 0 failed** (20 lib + 4 integration).
- `cargo test -p soravo-models --test approved_artifact_acceptance -- --ignored`
  with `SORAVO_MODEL_ARTIFACT_PATH=<repo>/parakeet-unified-en-0.6b-Q8_0.gguf` →
  `approved artifact ok sha=4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795 bytes=731357568` (1 passed).
- New test `bundled_models_integrity.rs` — assertions executed against the real
  committed bytes via an equivalent standalone check: VAD sha=`a35ebf52…f5af28`
  size=1807522, license sha=`2e63e9a3…520b`, all match provenance (PASS). The
  in-tree `#[test]` compiles/runs in the required `rust`/`desktop` CI jobs
  (native toolchain present here: webkit2gtk-4.1, glslc).
- Full web/e2e/payment vitest suites were NOT run in this worktree (workspace
  `node_modules` absent; disk-constrained). They are covered authoritatively by
  the required `web` and `e2e` CI jobs on the head SHA. Recorded honestly rather
  than claimed locally.

## Distinctions recorded (per `14_CI_CD_AND_BRANCHING.md`)
- Green `e2e` CI ≠ final E2E QA (`13_DOD_QA.md` *T34-Y*); final E2E QA is a
  dedicated post-redesign pass and is **not** claimed here.
- CI green ≠ deployment green ≠ release green. All three recorded separately.
- No supervised desktop GUI, live-microphone, OS-key-simulation, signing,
  notarization, or real-charge step was performed or simulated to look real.

## Release-candidate engineering — PR #133 (2026-10-16, unmerged)

Base `33d3d4c56e2cf029835d774e47df7cbd8611dbf4`; PR head
`e98005aac7b0f6cbe49bba10fb2544fcca3d2b05`;
PR: `https://github.com/eySRbS4zgHuW3gMFZB2/soravo/pull/133`;
CI run: `https://github.com/eySRbS4zgHuW3gMFZB2/soravo/actions/runs/38897877040`.

V1 priority platforms remain macOS and Windows; Linux remains optional and
development-only (`02_PRODUCT_REQUIREMENTS.md`). This section records the new
unsigned-candidate automation as code readiness, not as executed release
artifacts.

### Platform-by-platform release contract

| Target | Build/compile | Bundle/installer generation | Code signing | macOS notarization / Windows timestamp | Checksums and provenance | Update metadata/signatures | Installation, upgrade, rollback, uninstall |
|---|---|---|---|---|---|---|---|
| `darwin-aarch64` | PASS in CI compile leg | READY in new workflow; no candidate artifact yet | BLOCKED: Apple credentials absent | BLOCKED: Apple credentials absent | READY; no candidate artifact yet | BLOCKED: no endpoint, public key, registration, signed artifact, or feed | BLOCKED: no signed candidate or clean-machine run |
| `darwin-x86_64` | PASS in CI compile leg | READY in new workflow; no candidate artifact yet | BLOCKED: Apple credentials absent | BLOCKED: Apple credentials absent | READY, including SHA-pinned ORT provisioning path; no candidate artifact yet | BLOCKED | BLOCKED |
| `windows-x86_64` | PASS in CI compile leg | READY in new workflow; no candidate artifact yet | BLOCKED: Tauri signing key absent | BLOCKED: signing key and timestamp evidence absent | READY; no candidate artifact yet | BLOCKED | BLOCKED |
| Linux x86_64 | PASS in required `desktop`; not a V1 release target | Not in candidate scope | Not applicable | Not applicable | Existing CI bundle is not release evidence | Not applicable | BLOCKED/UNKNOWN |

### New code-controlled evidence

- New unsigned-candidate automation validates exact acknowledgment text,
  required native bundle outputs, SHA-256 checksums, packaged resources,
  pinned macOS x86_64 runtime files, toolchain/lockfile identity, and
  unsigned/update-blocked status.
- Local focused suite: **25/25 passed** with Vitest 5.0.2 and Node v22.23.1.
- Required `web` and `e2e` passed on PR #133.
- `cargo fmt`, Clippy `-D warnings`, and `cargo test --workspace` passed in the
  failed `rust` job; only `cargo audit --deny warnings` failed because locked
  `zip 4.6.1` is now yanked.
- Required `desktop`, both macOS compile legs, and Windows compile leg passed.
- The manual candidate workflow was not dispatched, so no macOS/Windows
  installer was produced, installed, upgraded, rolled back, uninstalled, signed,
  notarized, timestamped, or update-tested.

### External CI blocker

`rust` job `116962626289`: `cargo audit` reports `zip 4.6.1`, warning `yanked`.
That package is transitively locked through the unchanged
`tauri-plugin-updater 2.13.0`; this PR changes no Cargo manifest or lockfile.
Local reproduction gives the same result. The audit gate was not weakened and
no unrelated dependency migration was bundled. The PR therefore remains
unmerged.
