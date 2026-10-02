# ADR-026 — Provision Handy-proven x86_64 macOS ONNX Runtime

Status: Accepted (owner-authorized implementation task T33-P-FOLLOWUP-4I)
Date: 2026-10-02 (UTC)
Sequence: v6 pack sequence. The index of record is
`docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`, which governs. Root
`10_ADR_INDEX.md` and `decisions/` files belong to a different, older sequence
and are unaffected by this entry.

## 1. Exact failure

Soravo's macOS x86_64 CI leg fails inside the third-party
`ort-sys 2.0.0-rc.12` build script at **binary-resolution time** (before any
download, compile, link, or packaging step).

Dependency path (all pinned, current `Cargo.lock`):

```text
soravo-stt (crates/stt/Cargo.toml — transcribe-rs = { version = "0.3", features = ["onnx"] })
  └─ transcribe-rs 0.3.11 (checksum fb9d5cfb…)
      └─ ort 2.0.0-rc.12 (checksum d7de3af3…)
          └─ ort-sys 2.0.0-rc.12 (checksum d7b497d2…)
              └─ build/download/dist.txt — 17 rows, zero x86_64-apple-* rows
```

Authoritative CI evidence (run `36996608640`, job
`desktop build (macOS, x86_64-apple-darwin)`):

```text
warning: ort-sys@2.0.0-rc.12: [ort-sys] [WARN] can't do xcframework linking for target 'x86_64-apple-darwin'
error: ort-sys@2.0.0-rc.12: ort does not provide prebuilt binaries for the target `x86_64-apple-darwin` with feature set (no features).
```

No feature combination can satisfy the lookup: the embedded distribution
table contains zero `x86_64-apple-*` rows under any feature set. This is an
upstream prebuilt-binary coverage gap, not a Soravo configuration error.
Full forensics: `T33-P-FOLLOWUP-4-MACOS-X86_64-ORT-STRATEGY-FORENSICS.md`.

## 2. Exact Handy source revision

`https://github.com/cjpais/Handy` @
`ba10ce1943ef34e93c09494027fc0b9ced2e8a44` (pin of record per
`21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`). Mechanism verified identical at the
pin AND current main (zero drift).

Lockfile comparison at the pin (verified first-hand via authenticated
`gh api` in T33-P-FOLLOWUP-4I):

| Crate | Handy (pin) | Soravo | Match |
|---|---|---|---|
| `ort 2.0.0-rc.12` | `d7de3af3…` | `d7de3af3…` | identical version AND checksum |
| `ort-sys 2.0.0-rc.12` | `d7b497d2…` | `d7b497d2…` | identical version AND checksum |
| `transcribe-rs` | `0.3.8` (`b231bc9b…`) | `0.3.11` (`fb9d5cfb…`) | differs, immaterial: both resolve `ort = "=2.0.0-rc.12"` |

## 3. Exact Handy mechanism (reused verbatim)

Handy `.github/workflows/build.yml`, step `Install ONNX Runtime (x86_64 macOS)`
(`if: inputs.target == 'x86_64-apple-darwin'`):

```bash
ORT_VERSION="1.24.2"
curl -L -o ort.tgz "https://blob.handy.computer/onnxruntime-osx-x86_64-${ORT_VERSION}.tgz"
tar xzf ort.tgz
ORT_DIR="$(pwd)/onnxruntime-osx-x86_64-${ORT_VERSION}"
echo "ORT_LIB_LOCATION=$ORT_DIR/lib" >> $GITHUB_ENV
echo "ORT_PREFER_DYNAMIC_LINK=1" >> $GITHUB_ENV
# Bundle the versioned dylib (matches the install name @rpath/libonnxruntime.1.24.2.dylib)
jq --arg lib "$ORT_DIR/lib/libonnxruntime.${ORT_VERSION}.dylib" \
  '.bundle.macOS.frameworks = [$lib]' \
  src-tauri/tauri.conf.json > tmp.json && mv tmp.json src-tauri/tauri.conf.json
```

The `ort-sys` build script honors `ORT_LIB_LOCATION`/`ORT_LIB_PATH`
**before** consulting the download table, so the external dylib fully
bypasses the missing-row failure. ORT 1.24.2 is exactly the ORT release
family `ort-sys 2.0.0-rc.12` distributes on every other target, so there is
no ORT-version skew. Handy builds x86_64 macOS green with this mechanism
(run `36990021232`).

## 4. Why Strategy A is implemented

T33-P-FOLLOWUP-4 evaluated seven strategies. Strategy A (Handy reuse) is
the only technically PROVEN path: same `ort`/`ort-sys` bytes, same failure
mode, green Handy builds with the exact provisioning step. Alternatives
(version move, source build, fork, leg removal, dynamic loading) are
UNVERIFIED, REJECTED, or require unrelated changes. This task implements
Strategy A per owner authorization, with the smallest possible diff.

## 5. Exact ORT version and relationship to ort/ort-sys

- Provisioned binary: ONNX Runtime macOS x86_64 **1.24.2**.
- Consumed by: `ort-sys 2.0.0-rc.12` via `ORT_LIB_LOCATION` +
  `ORT_PREFER_DYNAMIC_LINK=1` (dynamic-link posture, same as Handy).
- **No `ort` upgrade. No `ort` downgrade. No source build. No fork.**
  `Cargo.toml`/`Cargo.lock` are untouched by this ADR.

## 6. External binary provenance (measured 2026-10-02)

| Field | Value |
|---|---|
| Exact download URL | `https://blob.handy.computer/onnxruntime-osx-x86_64-1.24.2.tgz` |
| Artifact version | 1.24.2 |
| Archive identity | `onnxruntime-osx-x86_64-1.24.2/` containing `lib/libonnxruntime.1.24.2.dylib` (Mach-O 64-bit x86_64, 26,746,240 bytes) + `libonnxruntime.dylib` symlink; no LICENSE/README/headers in the archive |
| Liveness | HTTP 200, 7,264,274 bytes, ETag `"144a70f7567fe5f61afb8c0f748a60d7"`, last-modified 2026-03-21, Cloudflare-fronted |
| Upstream provenance beyond Handy's host | **UNKNOWN**: Microsoft's official v1.24.2 release publishes NO `osx-x86_64` asset (only `osx-arm64`), so the tarball is Handy-produced/hosted, not a verbatim Microsoft release asset |
| Upstream software licences (GitHub licence fields, factual only) | `microsoft/onnxruntime`: MIT; `cjpais/Handy`: MIT |
| Redistributed inside Soravo's application | **YES** — the versioned dylib is bundled via Tauri `bundle.macOS.frameworks` |

## 7. Checksum and licensing evidence status

- **No authoritative checksum exists.** Handy's step performs no
  verification; Microsoft publishes no `osx-x86_64` asset to verify
  against. A SHA-256 was measured first-hand over HTTPS on 2026-10-02:
  `590cee05699047b85e4a8115b4cec792073c2972ce78de383356a552a296a9c4`.
  This observed pin is enforced in CI (`sha256sum -c`) so any silent
  substitution fails loudly; it is tamper-evidence, NOT independent
  authoritative verification.
- **Checksum not independently established; release gate remains open.**
- **License/redistribution review is a release gate and remains open.**
  The tarball ships no licence text; the dylib is redistributed in the
  Soravo bundle. No legal conclusions are made here. Release requires an
  attribution/notice review under ADR-011 and the model-licensing gate
  discipline before any x86_64 artifact ships to users.

## 8. Exact CI scope

`.github/workflows/ci.yml`, job `desktop-macos` ONLY: one new step
`Provision ONNX Runtime (x86_64 macOS only)`, gated
`if: matrix.target == 'x86_64-apple-darwin'`, running between dependency
install and the Tauri compile step. It downloads the exact artifact,
verifies the observed SHA-256 (fail loudly), extracts, exports
`ORT_LIB_LOCATION` + `ORT_PREFER_DYNAMIC_LINK=1` via `$GITHUB_ENV`, and
applies Handy's `jq` frameworks mutation to the CI-worktree
`tauri.conf.json` (never committed). `jq` is preinstalled on
`macos-latest` runners.

## 9. Release packaging scope

`.github/workflows/release.yml`, job `build`, x86_64 macOS matrix leg ONLY
(`if: matrix.target == 'x86_64-apple-darwin'`): the identical provisioning
step before `Build with Tauri`. No other release leg is touched. Soravo's
`release.yml` previously had NO ORT step, so release x86_64 would have
failed identically; after this ADR both build paths share the same ORT
availability assumption.

## 10. ARM64 preservation

The x86_64 artifact is NEVER injected into an ARM64 build: both steps are
gated on `x86_64-apple-darwin` only, mirroring Handy's
`inputs.target == 'x86_64-apple-darwin'` guard. Untouched: `swift/`
sources, `swift/apple_intelligence_bridge.h`, `build.rs` Apple bridge,
ADR-025, macOS 10.15 floor (ADR-022), ADR-024 source-layer allowances.

## 11. Rollback

Delete the two gated steps (and revert any CI-worktree `tauri.conf.json`
mutation, which is never committed). `Cargo.toml`/`Cargo.lock`/source are
untouched, so rollback is workflow-only and cannot strand code.

## 12. Verification requirements

- macOS x86_64 CI leg progresses past the `ort-sys` resolution error and
  completes the Tauri desktop build; the built application contains
  `libonnxruntime.1.24.2.dylib`.
- macOS ARM64, Linux, Windows, web, e2e legs: SUCCESS (unchanged-or-better).
- `rust` lane may remain red ONLY on the pre-existing `yoke-derive 0.8.3`
  yanked denial (owned elsewhere); any new audit failure is STOP.
- x86_64 is NOT claimed fixed until the real macOS x86_64 CI build succeeds.

## 13. Explicit non-goals

- No `ort`/`ort-sys` upgrade or downgrade.
- No ONNX Runtime source build.
- No `ort-sys` fork or patch.
- No removal of x86_64 macOS support.
- No ARM64 build modification.
- No Windows/Linux/web/e2e/transcription/catalog/auth/payment/Supabase/UI/model-logic change.
- No Handy upstream change; no automatic Handy synchronization.
- No legal conclusion on redistribution; the licence gate stays open.
