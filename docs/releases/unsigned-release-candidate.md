# Unsigned release-candidate pipeline

Status: **code-controlled implementation**. This documents what the repository can
do reproducibly now. It does **not** authorize a public release, production
distribution, live signing/notarization, or automatic updates.

## Scope

`.github/workflows/release-candidate.yml` is a manual-only pipeline for internal
validation. It builds native installers for the V1 priority platforms:

- macOS Apple Silicon (`darwin-aarch64`)
- macOS Intel (`darwin-x86_64`)
- Windows x64 (`windows-x86_64`)

Linux remains optional/development under `02_PRODUCT_REQUIREMENTS.md`; it is not
a release-candidate target.

The workflow never creates a GitHub Release. All candidates are uploaded only as
workflow-run artifacts and are labeled:

> `UNSIGNED — NOT FOR GENERAL DISTRIBUTION`

## Explicit unsigned acknowledgment

A dispatch must use:

- `candidate-suffix: unsigned-rc`
- `acknowledge-unsigned: UNSIGNED-RC`

The validator rejects any other label or acknowledgment before checkout-heavy
build work begins. Workflow text from `workflow_dispatch` is treated as
untrusted: it is passed to Node through process environment variables, not
through shell interpolation.

## Reproducible inputs

Each candidate records:

- application version from canonical `apps/desktop/src-tauri/tauri.conf.json`
- full source commit
- target triple, host OS/architecture, and GitHub run ID/number/attempt
- actual `rustc`, `cargo`, Node.js, pnpm, and Tauri CLI versions
- SHA-256 values for `Cargo.lock` and `pnpm-lock.yaml`
- SHA-256 of the canonical `tauri.conf.json`
- SHA-256 of any temporary macOS x86_64 overlay used only to attach the
  provisioned ONNX Runtime framework

Frontend dependencies use `pnpm install --frozen-lockfile`. The Tauri build uses:

```text
pnpm tauri build --target <rust-target> --ci --no-sign [--config <temporary-overlay>]
```

`--no-sign` is explicit because signing credentials are unavailable. It does not
make an unsigned candidate safe for distribution.

## Platform outputs

The validator requires all expected outputs and rejects missing, empty,
ambiguous, or unexpected installer-like outputs.

| Target | Required outputs | Runtime/resource validation |
|---|---|---|
| `darwin-aarch64` | `Soravo.app`, `Soravo.dmg` | Bundled VAD model, MIT notice, and provenance are byte-compared between the repository and `Soravo.app/Contents/Resources`. |
| `darwin-x86_64` | `Soravo.app`, `Soravo.dmg` | Same app-resource validation, plus byte comparison of the SHA-pinned ONNX Runtime dylib between its verified download location and `Contents/Frameworks`. |
| `windows-x86_64` | `Soravo.msi`, NSIS `Soravo-*-setup.exe` | Repository resource files are verified as present and non-empty, but installer-internal layout cannot be inspected from the packaged installer. Installed layout remains `UNKNOWN`. |

The macOS x86_64 ONNX Runtime mechanism is unchanged from ADR-026: version
1.24.2, SHA-256
`590cee05699047b85e4a8115b4cec792073c2972ce78de383356a552a296a9c4`,
`ORT_LIB_LOCATION` plus `ORT_PREFER_DYNAMIC_LINK=1`.

A canonical directory digest is recorded for `.app` bundles alongside the
ordinary SHA-256 file for `.dmg`, `.msi`, and `.exe` artifacts. The checksum
file uses `sha256sum`-compatible `checksum  path` lines for regular files.

## Signing readiness

`release.yml` now fails before creating a draft release unless GitHub Actions
provides the complete external signing set:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`
- `TAURI_SIGNING_PRIVATE_KEY`

Only secret presence is tested. No certificate, private key, password, team ID,
or other credential appears in the repository, logs, artifacts, or reports.

When those secrets are configured, the signed workflow verifies:

- macOS app signature with `codesign --verify --deep --strict`
- macOS Gatekeeper acceptance with `spctl --assess --type execute`
- macOS notarization tickets with `xcrun stapler validate`
- Windows installer signatures with `signtool verify /pa /v`
- Windows timestamp countersignatures in the verification output

Those verification steps have not been executed because signing credentials are
absent. They must not be treated as passing evidence.

## Automatic-update status

Automatic updates remain **blocked and inert**:

- `tauri-plugin-updater` is a dependency, but it is **not registered** in
  `main.rs`.
- `tauri.conf.json` has no `plugins.updater.pubkey`.
- No trusted `plugins.updater.endpoints` value exists.
- No updater capability permission is granted.
- `bundle.createUpdaterArtifacts` is absent/false.
- No signed update artifact, signature, or update feed is generated.

The release tooling represents this as explicit missing prerequisites rather
than as an operable updater. The visible update-check preference remains only a
stored preference; there is no runtime update path behind it.

A future secure updater requires all of the following owner-controlled inputs:

1. A generated Tauri update-signing keypair, with the private key stored only as
   `TAURI_SIGNING_PRIVATE_KEY`.
2. Publication of the corresponding public key in `plugins.updater.pubkey`.
3. An approved HTTPS update endpoint in `plugins.updater.endpoints`.
4. Signed update artifacts and signed update metadata generated from those
   artifacts.
5. A documented key-lifecycle, rotation, and loss-recovery procedure.
6. Registration of `tauri_plugin_updater` only on desktop, plus least-privilege
   `updater:*` capability permissions.
7. Loss recovery acceptance: if the update private key is lost, existing
   installations cannot receive signed automatic updates.

No placeholder endpoint, public key, signature, or feed may be invented.

## Manual installation, upgrade, rollback, and uninstall

Until a signed updater exists, use only controlled manual handling on an
isolated validation machine:

1. Download the exact unsigned-candidate artifact set from the workflow run.
2. Recompute and compare every SHA-256 value before opening or installing.
3. Install the candidate without replacing a production installation.
4. To upgrade or roll back, retain the previously validated installer and
   reinstall it explicitly through the OS installer/uninstaller flow.
5. Do not sideload an unsigned macOS or Windows candidate onto a general user's
   machine.

Clean-machine installation, OS permission behavior, upgrade, rollback, and
uninstall remain **BLOCKED/UNKNOWN** until performed on the target platforms
with a signed candidate.

## Current platform capability table

`PASS` means already demonstrated. `READY` means repository automation exists
but has not yet produced target-platform evidence. `BLOCKED` and `UNKNOWN` are
not passes.

| Capability | darwin-aarch64 | darwin-x86_64 | windows-x86_64 |
|---|---|---|---|
| Native build/compile | PASS in CI compile legs | PASS in CI compile legs | PASS in CI compile legs |
| Bundle/installer generation | READY; workflow unexecuted | READY; workflow unexecuted | READY; workflow unexecuted |
| Code signing | BLOCKED: external secrets absent | BLOCKED: external secrets absent | BLOCKED: external secrets absent |
| macOS notarization/stapling | BLOCKED: Apple credentials absent | BLOCKED: Apple credentials absent | Not applicable |
| Windows timestamp countersignature | Not applicable | Not applicable | BLOCKED: signing key absent |
| Checksums and provenance | READY; no candidate artifact yet | READY; no candidate artifact yet | READY; no candidate artifact yet |
| Update metadata/signatures | BLOCKED: endpoint, public key, signed artifacts, and metadata absent | BLOCKED | BLOCKED |
| Installation | BLOCKED: no signed candidate or clean-machine run | BLOCKED | BLOCKED |
| Upgrade | BLOCKED: no updater or validated manual sequence | BLOCKED | BLOCKED |
| Rollback | BLOCKED: prior signed artifact/manual sequence not validated | BLOCKED | BLOCKED |
| Uninstall | BLOCKED: clean-machine run not performed | BLOCKED | BLOCKED |

Linux remains outside this candidate because it is optional/development, not a
V1 release platform.

## Evidence

- `scripts/release/release-candidate.test.mjs`: 24 deterministic tests for
  request validation, bundle discovery, manifest integrity, checksums,
  resources, runtime files, toolchain identity, temporary config overlays,
  signing preconditions, and updater-readiness classification.
- `pnpm test:release` runs that suite in required web validation.
- `release-candidate.yml` requires the same validator before and after every
  platform bundle.
- Required CI result and the manual candidate run ID are recorded in
  `progress/ACCEPTANCE.md` and `PROGRESS.md`.
