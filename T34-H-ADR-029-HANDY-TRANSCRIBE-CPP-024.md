# ADR-029 — Adopt Handy transcribe-cpp 0.2.4 + per-platform backend posture

Status: **ACCEPTED (owner-directed).**
Date: 2026-10-03 (UTC). Task: T34-H. Branch: `t31/soravo-wrapper-completion`.

## Authorization

Explicit owner instruction in T34-H: **"Handy uses transcribe-cpp 0.2.4 →
Soravo uses transcribe-cpp 0.2.4"** and **"Use what Handy is currently using."**
This supersedes the T34-G deferral (which left Soravo at 0.2.3 for lack of an
authorizing ADR). This ADR is that authorization, recorded after the fact of
the directive per the T34-H order to "record the updated decision in the
appropriate ADR/PROGRESS state."

## Upstream source (verified live, not assumed)

- Handy: `https://github.com/cjpais/Handy` @
  `8605699d988ef87e7717cee28fff25c0546bb564` (main, 2026-10-03).
- Bump commit: `2d526b157953ddf9a5bb34194786cea69569b6a1`
  ("bump to transcribe-cpp-0.2.4 (#2147)", 2026-09-28). Its diff is version
  strings + lock checksums ONLY (5 `Cargo.toml` declarations, 0 feature
  changes, 0 source changes).
- Handy declarations (still current at the inspected HEAD):
  base `0.2.4` no-features; Windows x86_64 `dynamic-backends` + `vulkan`;
  Windows aarch64 static; macOS `metal`; Linux `dynamic-backends` + `vulkan`.
- License: MIT, unchanged (verified via `cargo info transcribe-cpp@0.2.4`;
  `cargo deny check` licenses ok).

## Decision

Adopt transcribe-cpp 0.2.4 with Handy's per-platform feature posture exactly:

1. `apps/desktop/src-tauri/Cargo.toml` — base `0.2` → `0.2.4` + the four
   Handy target tables verbatim.
2. `crates/stt/Cargo.toml` — base `0.2` → `0.2.4` + the same four tables
   (both manifests declare the dep; Cargo unifies them into one build).
3. `Cargo.lock` — deterministic `cargo update -p transcribe-cpp --precise
   0.2.4` (+ `-sys` follows). Result is 4 changed lines whose checksums are
   byte-identical to Handy's #2147 lock diff.
4. `apps/desktop/src-tauri/build.rs` — port Handy's Linux rpath +
   `stage_transcribe_runtime_libs()` / `split_versioned_so()` verbatim
   (mechanical renames only: lib dir `/usr/lib/Soravo`, binary references).
5. `apps/desktop/src-tauri/tauri.conf.json` — Linux deb/rpm/appimage
   `transcribe-libs` files mappings verbatim (dir renamed to `/usr/lib/Soravo`
   per `productName`; rpm `compression` and appimage `bundleMediaFramework`
   NOT carried: Handy release choices, not transcribe requirements, and
   Soravo release policy is Soravo-owned).
6. `apps/desktop/src-tauri/tauri.windows.conf.json` (new) — Windows resource
   overlay for `transcribe-libs` (Tauri v2 auto-merges it; adapted: Handy's
   `resources` mapping omitted, Soravo has no `resources/` dir).
7. `apps/desktop/src-tauri/.gitignore` (new) — ignore `/transcribe-libs/`.
8. `.github/workflows/ci.yml` — Vulkan build prerequisites mirrored from
   Handy: `libvulkan-dev glslc spirv-headers` (rust job, cf. Handy test.yml),
   full Lunarg SDK (desktop Linux job, cf. Handy build.yml), Vulkan SDK +
   vcpkg SPIRV-Headers (desktop-windows job). `rust`/`desktop` runners pinned
   `ubuntu-latest` → `ubuntu-24.04` to match Handy's tested SDK setup.
9. `.github/workflows/release.yml` — Vulkan SDK + SPIRV-Headers on the
   Windows leg (manual workflow; compile-path identical to CI).

## Deliberately out of scope (not authorized by this ADR)

- `transcribe-rs` stays at `0.3` (no owner instruction to change it).
- Handy's VC-redist / `onnxruntime.dll` staging NOT ported (not a consequence
  of this change: static Windows ggml already links OpenMP dynamically today;
  separate supply-chain/packaging concerns needing their own review).
- ADR-027 (transcription semantics #2156/#2157) and ADR-028 (Chinese-script
  selector #2186) remain PROPOSED and untouched; `text.rs` and all transcript
  semantics unchanged.
- `braces` GHSA-vfj7-8cjw-p6xm: no safe remediation exists (registry max is
  3.0.3, patched ≥3.0.4 unpublished; parents at latest; Handy has no such
  dep/gate). Left visible per T34-H Part 4; no suppression, no manifest
  surgery, no CI change.

## Verification (T34-H)

- `cargo check --workspace --locked`: exit 0; sys crate built with Vulkan in
  5m20s; build.rs staged 18 runtime libs; RUNPATH
  `$ORIGIN/../lib/Soravo:$ORIGIN/../lib` baked into the binary (readelf);
  `ldd` shows no OpenBLAS linkage (`GGML_BLAS OFF` forced upstream).
- `cargo clippy --workspace --all-targets --locked -- -D warnings`: exit 0.
- `cargo test --workspace --locked`: all suites pass, 0 failed (desktop lib
  261/261 — identical to the T34-F baseline; zero tests added/weakened).
- `cargo fmt --all -- --check`: exit 0. `cargo audit` (CI flags): exit 0.
  `cargo deny check`: exit 0.
- API compatibility: zero Soravo source edits required — 0.2.4 is a drop-in
  bump for Soravo's usage, as it was for Handy (#2147 touched no source).
- Platform validation: CI matrix post-push (rust/desktop/e2e/web + macOS
  aarch64/x86_64 + Windows x86_64); run IDs recorded in PROGRESS.md T34-H.

## Consequences

- Linux/Windows-x64 builds now compile ggml's Vulkan backend (longer CI;
  Vulkan SDK required for all future Linux/Win-x64 Rust builds — documented
  in CI, matching Handy's contributor requirements).
- Windows ARM and macOS stay static (no new SDK/packaging needs).
- Bundled Linux/Windows apps ship backend libs via the staged
  `transcribe-libs/` (same mechanism as Handy). No runtime transcription
  proof exists in CI (same as Handy — no such test on either side); desktop
  runtime remains owner-verified at release.
