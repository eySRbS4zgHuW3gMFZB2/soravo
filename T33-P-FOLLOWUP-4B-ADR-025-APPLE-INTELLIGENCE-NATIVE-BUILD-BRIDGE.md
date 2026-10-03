# ADR-025 — Restore Handy Apple Intelligence native build bridge (macOS aarch64 link repair)

Status: Accepted (implementation task T33-P-FOLLOWUP-4B)
Date: 2026-10-02 (UTC)
Sequence: v6 pack sequence. The index of record is
`docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`, which governs. Root
`10_ADR_INDEX.md` and `decisions/` files belong to a different, older sequence
and are unaffected by this entry.

Context:

- T33-P-FOLLOWUP-4A (forensics only, no repair) established the exact root
  cause of the macOS aarch64 failure on authoritative CI run `36992031010`,
  job `desktop build (macOS, aarch64-apple-darwin)`: the Rust library
  compiles clean (ADR-022 deployment floor + ADR-024 unsafe exception +
  T33-P-FOLLOWUP-3B Emitter restoration + T33-P-FOLLOWUP-3C enigo 0.6.1
  realignment all hold) and the build fails **only at the final binary link**
  on three undefined symbols for architecture arm64:
  `_free_apple_llm_response`, `_is_apple_intelligence_available`,
  `_process_text_with_system_prompt_apple`.
- All three symbols are Swift `@_cdecl` exports. Soravo retained Handy's Rust
  FFI caller (`apps/desktop/src-tauri/src/apple_intelligence.rs`, 84 lines,
  byte-identical to Handy) at foundation commit `a156c8c9` but never imported
  Handy's native side: `src-tauri/swift/` (3 files) did not exist
  (`git ls-tree` swift count 0; no `.swift`/`.h` under `src-tauri`) and
  `build.rs` remained a 3-line `tauri_build::build()` stub (2 commits ever,
  both stub). No static library providing the three symbols was ever
  compiled or linked. The Rust FFI declarations are therefore
  declared/called but never provided to the linker.
- Handy's mechanism is proven working: Handy run `36990021232` (head
  `5ec58f69`), job `build-test (macos-26, aarch64-apple-darwin)` SUCCESS.
  The mechanism is byte-identical between the pin of record
  `https://github.com/cjpais/Handy` @
  `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` and current main
  `5ec58f696354fcf64ae831102e673779e0249717` (`build.rs` 24,642 bytes at
  both; all three swift files SHA-256-identical at both — verified
  first-hand via authenticated `gh api` in T33-P-FOLLOWUP-4B).
- A Rust-only restoration is insufficient by construction: no Rust source
  change can materialize the three Swift `@_cdecl` symbols. The missing
  input is a compiled native object (`apple_intelligence.o` archived as
  `libapple_intelligence.a`) plus its `cargo:rustc-link-*` directives. Only
  a build-script integration that invokes `swiftc`/`libtool` and emits the
  link directives resolves the link. Families U/M/S (3A→3D) are compile
  gates; this ADR owns the link gate.

Decision:

- Restore Handy's working mechanism verbatim. Do NOT invent a new Apple
  Intelligence implementation.
- Create exactly three files, byte-identical to the verified Handy source
  (pin `ba10ce19` == main `5ec58f69`, SHA-256 recorded below):
  1. `apps/desktop/src-tauri/swift/apple_intelligence.swift` (real
     FoundationModels path; SHA-256
     `e70c4d8ac405456b209cd9f5659d54ea50a82f1515eae74613ba3ab676caddcf`)
  2. `apps/desktop/src-tauri/swift/apple_intelligence_stub.swift` (fallback
     path; SHA-256
     `fc27b08896751bb90cd1f954df32268eb620be3c202a5caef33846e0a45df2cd`)
  3. `apps/desktop/src-tauri/swift/apple_intelligence_bridge.h` (C ABI
     header; SHA-256
     `1ab6faa9029f18fe02feb1fb0ab94b51a37b954ef58551fa1addb391f95f5a5e`)
- Modify `apps/desktop/src-tauri/build.rs` minimally: keep Soravo's
  existing `tauri_build::build()` tail untouched; add only the
  `#[cfg(all(target_os = "macos", target_arch = "aarch64"))]`-gated call
  plus Handy's `build_apple_intelligence_bridge()` and
  `is_command_line_tools_only()` functions verbatim. The restored logic
  keeps Handy's behavior exactly: `rerun-if-changed` on all three swift
  files; SDK locate via `SDKROOT` override else `xcrun --sdk macosx
  --show-sdk-path`; FoundationModels detection with `HANDY_FORCE_AI_STUB`
  escape hatch and CLT-only auto-detection; real-vs-stub selection with
  `cargo:warning` each way; `swiftc -parse-as-library -target
  arm64-apple-macosx11.0 -sdk … -O -import-objc-header <bridge> -c <src>`;
  `libtool -static -o libapple_intelligence.a`; link directives
  (`link-search native=$OUT_DIR`, `link-lib static=apple_intelligence`,
  toolchain + SDK swift lib search paths, `framework=Foundation`,
  conditional `-weak_framework FoundationModels`, `-Wl,-rpath,/usr/lib/swift`).
- Byte-identical restoration is preferred because the Rust caller is
  already byte-identical to Handy: Handy's native side plugs into it with
  zero interface work, zero new FFI contract design, zero renamed symbols,
  and zero renamed env vars (Handy `HANDY_FORCE_AI_STUB`/`SDKROOT`/`SWIFTC`
  names are kept to preserve upstream mergeability). Any future Soravo
  behavioral change to Apple Intelligence goes through the Handy-core
  preservation policy, not this repair.
- `build.rs` requires only minimal integration (not a wholesale copy)
  because Soravo's `build.rs` is already Soravo-owned by divergence and
  Handy `build.rs` carries unrelated subsystems Soravo deliberately does
  not share. The tray-translation generator (`generate_tray_translations()`
  + its `serde/derive` build-dep) is explicitly PROHIBITED: Soravo's
  `tray_i18n.rs` owns that subsystem and builds green. Likewise NOT
  restored: `stage_transcribe_runtime_libs()`, `stage_onnxruntime_dll()`,
  `stage_vc_runtime_dlls()`, and the Linux `$ORIGIN` rpath hunk. The bridge
  itself needs no new build-dependency (`std` + `Command` only), so
  `Cargo.toml` build-deps are unchanged.

Real vs stub (not two implementations — one mechanism, two selections):

- The real path (`apple_intelligence.swift`) requires full Xcode with the
  FoundationModels SDK and macOS 26+ at runtime (`@available(macOS 26.0)`
  guards; weak-linked `FoundationModels`). The stub path
  (`apple_intelligence_stub.swift`) reports unavailable (`return 0` /
  error string) and matches the existing Rust fallbacks (`return None` /
  `false` in the non-ARM64 gates). Selection is automatic per toolchain;
  either selection resolves all three link symbols. The CI log's
  `cargo:warning` line records which path was taken.

Architecture / SDK gating and deployment-target constraints:

- Bridge compilation and linkage are gated to macOS + aarch64 only (same
  `cfg(all(target_os = "macos", target_arch = "aarch64"))` shape as the
  Rust call sites in `actions.rs`/`commands/mod.rs`). Non-ARM64 builds see
  only the existing `tauri_build::build()` behavior.
- The Swift object target `arm64-apple-macosx11.0` is restored verbatim as
  a Handy-internal compile flag; runtime availability is handled by
  `@available(macOS 26.0)` guards plus weak linking. The Tauri bundle floor
  `minimumSystemVersion 10.15` (ADR-022) is UNCHANGED — this ADR resolves
  no deployment-floor question and modifies no floor.
- No new `unsafe` tokens, no new dependencies, no new env-var contract
  beyond Handy's documented names.

Alternatives:

1. Reimplement the bridge in Rust or a new Swift design. REJECTED: invents
   an FFI contract against a byte-identical caller; discards Handy's
   CI-proven real/stub auto-detection; violates RESTORE-NOT-REFORK.
2. Whole-file `build.rs` copy from Handy. REJECTED: imports the tray
   generator over Soravo's owned tray path plus transcribe/ORT/VC staging
   Soravo never adopted — maximal blast radius for zero link benefit.
3. `#[link]`-attribute or `cc`-crate staticlib in `apple_intelligence.rs`.
   REJECTED: edits the byte-identical Handy-derived caller to work around
   a build-integration omission; adds a `cc` dependency Handy proves
   unnecessary (`swiftc` direct).
4. Do nothing / defer. REJECTED: the aarch64 leg is red on exactly these
   three symbols; deferral normalizes a broken primary-platform leg.

Why Rust-only restoration was insufficient (recorded for audit):

- T33-P-FOLLOWUP-3A→3D repaired compilation (the lib target). The failure
  moved to the bin target's link step, which no Rust edit can satisfy
  because the symbol definitions live in Swift object code. This ADR
  supplies the missing link input; it changes zero Rust lines.

Preservation of existing Soravo-owned functionality:

- `apple_intelligence.rs`, `transcription.rs`, session state machine, IPC
  contracts, Supabase/auth, payment code, model catalog, Windows and Linux
  implementations, x86_64 ORT handling: all untouched.
- ADR-020, ADR-021, ADR-022, ADR-023, ADR-024: unamended, in force.

CI verification requirements (acceptance):

1. `diff` of each swift file against Handy bytes at `ba10ce19` AND
   `5ec58f69` is empty (SHA-256 record above).
2. `git diff` of `build.rs` shows only the Apple hunk as pure addition
   outside the original 3-line skeleton; `grep` proves no tray/staging
   helper was imported.
3. Linux no-regression: `cargo fmt --check`, `cargo clippy -D warnings`,
   `cargo test -p soravo-desktop` green (bridge is `cfg`-gated out).
4. Authoritative GitHub CI: `desktop build (macOS, aarch64-apple-darwin)`
   GREEN with the Apple-Intelligence `cargo:warning` line in the log
   (real or stub both accept) and zero `Undefined symbols … arm64`;
   `web`/`e2e`/Linux/Windows unchanged-or-better; x86_64 macOS still red
   ONLY on the independent `ort-sys` prebuilt-binary absence (FOLLOWUP-4,
   untouched); audit lane only on pre-existing `yoke-derive` (untouched).
5. If x86_64 remains the only macOS failure after ARM64 passes, it is
   recorded as the next independent task — NOT repaired inline.

Security impact:

- No new attack surface: the linked calls existed in the Rust source all
  along (compile-blocked at link, not absent); the Swift code is upstream
  Handy bytes, not new Soravo code. No secret, capability, CSP, IPC, or
  entitlement surface is touched.

Performance impact: none claimed; the change affects link inputs, not
runtime behavior (real path executes only where the OS provides
FoundationModels; elsewhere the stub's unavailable-report matches the
pre-existing fallback).

Rollback (two-layer):

1. Code: delete `apps/desktop/src-tauri/swift/` and revert the `build.rs`
   Apple hunk (returns to stub `build.rs`; aarch64 leg goes red on the
   three undefined symbols again — the defined safe state, not a
   regression).
2. ADR: flip this entry to `Superseded` with reason + date. Verify no other
   code landed under the exception window (`git log` audit).

Files/modules covered: the three `swift/` files + the `build.rs` Apple
hunk + this ADR + the ADR index entry.

Files/modules explicitly NOT covered: every Rust source file (in
particular `apple_intelligence.rs`); `Cargo.toml`/`Cargo.lock`;
`tauri.conf.json` and the 10.15 floor; CI workflows (no runner-image
change rides along — the `macos-26` alignment stays a separable,
undecided option); release/signing; tests; catalog/model assets;
Supabase/Razorpay/payment code; x86_64 ORT strategy (FOLLOWUP-4);
`yoke-derive`; Handy upstream itself.
