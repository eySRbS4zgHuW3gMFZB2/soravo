# ADR-020 — Windows `windows`-crate dependency alignment (0.54 bare → 0.61.3 + Handy-proven features)

Status: Accepted (owner-authorized 2026-10-01 as T33-P-FOLLOWUP-2B Decisions 1, 2, 4, 5)
Date: 2026-10-01 (UTC)
Sequence: v6 pack sequence. The index of record is
`docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`, which governs. Root
`10_ADR_INDEX.md` (`ADR-020 — performance benchmark results`) and
`decisions/` files belong to a different, older sequence and are unaffected
by this entry.

Context:

- T33-P-FOLLOWUP-2A (forensics only, no repair) re-derived all 35 Windows
  `soravo-desktop` (lib) errors on authoritative CI run `36798675037`, job
  `desktop build (Windows, x86_64-pc-windows-msvc)` (`110167865409`), and
  sorted them into three independent families: A — 10 × E0432 feature-gated
  `windows::*` imports; B — 1 × E0432 + 3 × E0308 (+ 1 latent) windows-crate
  version-API mismatches; C — 21 × `unsafe_code = "forbid"` denials on Win32
  FFI. Family C is decided separately in ADR-021 and is NOT decided here.
- Soravo declared `windows = "0.54"` with zero features
  (`apps/desktop/src-tauri/Cargo.toml:76-78`, unchanged since `fc56c31b`;
  locked `0.54.0`), while every line of the Windows implementation it
  compiles against was restored/imported byte-identical from Handy at the
  pin of record `https://github.com/cjpais/Handy` @
  `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` (blame: `paste_tx/windows.rs`
  → `27200173`; `overlay.rs` / `utils.rs` / `managers/audio.rs` Windows
  blocks → `a156c8c9`).
- Handy at the pin declares
  `windows = { version = "0.61.3", features = [Win32_Media_Audio_Endpoints,
  Win32_System_Com_StructuredStorage, Win32_System_DataExchange,
  Win32_System_LibraryLoader, Win32_System_Ole, Win32_System_Memory,
  Win32_System_Threading, Win32_System_Variant, Win32_Foundation,
  Win32_Graphics_Gdi, Win32_UI_WindowsAndMessaging] }`
  (re-verified first-hand 2026-10-01 via pinned upstream bytes; 11/11
  feature names additionally verified present in the vendored
  `windows-0.61.3` registry source), and Handy's own CI at the pin is green
  on `windows-latest x86_64-pc-windows-msvc` and `windows-11-arm` with
  exactly this source. That CI is the existence proof that this declaration
  compiles this source.

Decision:

- Align Soravo's `windows` declaration with the Handy-compatible
  declaration/version and required features (T33-P-FOLLOWUP-2B Decision 1):
  `version = "0.61.3"` + exactly the 11 features above, in
  `[target.'cfg(windows)'.dependencies]` of `apps/desktop/src-tauri`
  (`Cargo.lock` regenerated via normal resolution; the direct edge moves
  `windows 0.54.0` → `windows 0.61.3`).
- Preserve Handy V1 Windows behavior and source logic byte-for-byte
  (Decision 2): zero source edits to the implementation accompany this
  decision. Families A+B are repaired by configuration only.
- `winreg` stays at `0.10` (Decision 4): T33-P-FOLLOWUP-2A found zero errors
  attributable to it; all Soravo-used APIs verified present in vendored
  `winreg-0.10.1`.
- `webview2-com 0.38` (present upstream) is deliberately NOT adopted: no
  reported error references it, and adding a dependency without an error
  demanding it violates the no-new-dependency discipline.
- This remediation stays separate from macOS (FOLLOWUP-3/-4) and
  `yoke-derive` remediation (Decision 5).

Alternatives:

1. Rewrite the Handy-derived Windows sources to fit 0.54 (casts for
   `HANDLE(hg.0)`, rerouted `BOOL` import, invented feature-less
   workarounds). REJECTED: edits restored V1 bytes to fit a Soravo-chosen
   older dependency — exactly what the V1 preservation rule forbids — and
   is technically impossible in full (0.54 has no `windows::core::BOOL`
   under any feature).
2. Keep 0.54 and add features only. REJECTED: fixes Family A at most;
   Family B (`core::BOOL`, `HANDLE`/`HGLOBAL` representation) is
   version-fixed and unfixable by features.
3. Invent a third configuration (e.g. newest 0.62.x, or a feature subset).
   REJECTED: unproven against this source; only 0.61.3 + the 11 features
   carries a green-CI proof on the exact bytes.
4. Do nothing / defer. REJECTED: the Windows leg is red on 14 reported +
   1 latent errors; deferral normalizes a broken primary-platform leg.

Why windows 0.54 is incompatible with the current imported Windows code:

- Family A mechanism: the `windows` modules exist in 0.54 but are
  compile-time cfg'd out because Soravo declares zero features; every one
  of the 10 imports carries the compiler note naming its gating
  `Win32_*` feature. Declaration defect, present since `fc56c31b`.
- Family B mechanism: the code targets the 0.61 type layout —
  `windows::core::BOOL` (`utils.rs:56`; absent from vendored
  `windows-core-0.54.0`, lives in `Win32::Foundation` there) and
  `HANDLE(hg.0)` / `HANDLE(raw as *mut _)` construction
  (`paste_tx/windows.rs:135,284,291` + latent `:388`; vendored 0.54.0
  defines `HANDLE(pub isize)` vs `HGLOBAL(pub *mut c_void)`).
  Version-API migration, stillborn at import/restore, invisible to Linux CI
  by cfg-gating.

Why alignment is the preservation strategy:

- The divergence is the dependency declaration, not the source: the four
  files' Windows code is byte-identical in logic to Handy at the pin, and
  Handy's green Windows CI at the pin proves the declaration compiles the
  bytes. Aligning the declaration repairs A+B with zero source edits, keeps
  `HANDY-REUSE` classification intact, and introduces no Soravo-authored
  Windows behavior.

Exact required feature set: the 11 features named in Decision above,
copied verbatim from the pinned upstream declaration (order preserved).

Exact version selected: `windows 0.61.3` (declaration `version = "0.61.3"`;
locked `0.61.3`, checksum `9babd3a7…` — already present in the pre-change
closure via `tauri-plugin-opener 2.6.0`, so no new crate version enters the
graph).

Compatibility / supply-chain implications:

- `windows` is a `[target.'cfg(windows)'.dependencies]` entry: it does not
  enter Linux/macOS closures. Linux/macOS binaries provably unaffected
  (dependency cfg isolation); lockfile churn (one direct edge) is the only
  cross-platform artifact.
- `windows 0.54.0` remains in the lockfile via the `cpal → rodio` audio
  path — untouched and correct; only the `soravo-desktop` direct edge
  moves. `0.56.0` / `0.58.0` / `0.62.2` transitive entries unchanged.
- `cargo deny check` + `cargo audit` must be clean for the bumped edge
  before merge (acceptance criterion below); `deny.toml` carries no
  windows-specific entries, so the edge is judged by the default
  advisories/license policy.

Security impact:

- No new trust boundary, secret, endpoint, or IPC surface. No `unsafe`
  introduced or removed by this decision (Family C is ADR-021). Clipboard
  handling stays snapshot/write/restore with no logging — the
  no-clipboard-telemetry invariant (root `09` §18 / v6 `12`) is preserved.
- Dependency-strategy change only. Supply-chain delta is bounded to
  enabling already-vendored features of an already-locked crate version.

Performance impact: none claimed. Windows runtime intent is restored, not
altered; the pre-fix code never compiled, so no shipping behavior exists
to regress. No benchmark is invalidated or required by this decision.

Operational impact:

- Windows CI leg (`desktop-windows`) is expected to progress past all
  E0432/E0308 in `soravo-desktop`; Family C errors remain until ADR-021
  lands (separate commit, same task). CI's lockfile-unchanged assertion
  requires the regenerated `Cargo.lock` to be committed with the change.

Testing impact:

- No test created, modified, or masked (owner constraint). Linux
  `cargo clippy -p soravo-desktop --all-targets -- -D warnings` and
  `cargo test -p soravo-desktop` must stay green (shared `paste_tx/mod.rs`
  and callers unaffected; Windows-only modules excluded by cfg — stated
  explicitly in validation).

Rollback:

- Revert the `apps/desktop/src-tauri/Cargo.toml` hunk + the one-line
  `Cargo.lock` edge (normal resolution restores `windows 0.54.0`), and flip
  this ADR to `Superseded` with reason + date. No source, test, catalog,
  workflow, or release change rides along in either direction.

CI acceptance criteria (all observed, none assumed):

1. `git diff --check` clean; `cargo fmt --check -p soravo-desktop` exit 0.
2. Linux no-regression: `cargo clippy -p soravo-desktop --all-targets --
   -D warnings` exit 0 + `cargo test -p soravo-desktop` green on
   `x86_64-unknown-linux-gnu`.
3. Windows proof (authoritative GitHub CI only — no MSVC on this host):
   `desktop-windows` leg log shows ZERO `E0432`/`E0308` in `soravo-desktop`
   attributable to Families A/B, PLUS explicit confirmation that
   `paste_tx/windows.rs:388` (latent B5) emits nothing. Family C errors
   may remain at this commit — they are ADR-021's proof, not this ADR's
   failure.
4. Regression guard: `web` / `e2e` / `desktop`(Linux) / `rust` /
   `cargo-audit` / `cargo-deny` unchanged-or-better vs run `36798675037`;
   lockfile diff reviewed (only the `windows` direct edge; `winreg`
   untouched; no new crate versions).
5. Supply-chain: `cargo deny check` + `cargo audit` clean for the bumped
   edge.
6. Diff hygiene: the commit contains ONLY the Cargo.toml hunk, the
   Cargo.lock edge, this ADR, and its index entry. The four implementation
   files, macOS code, `yoke-derive`, catalog/model assets, UI,
   release/signing, and tests are byte-unchanged (verified by diff).

Files/modules covered: `apps/desktop/src-tauri/Cargo.toml`
(`[target.'cfg(windows)'.dependencies]` `windows` entry only) +
`Cargo.lock` (the `soravo-desktop` → `windows` edge only) + this ADR +
the ADR index entry.

Files/modules explicitly NOT covered: `paste_tx/windows.rs`,
`utils.rs`, `overlay.rs`, `managers/audio.rs` (zero source edits);
`winreg 0.10` declaration; `webview2-com` (not adopted); macOS sources
and legs (FOLLOWUP-3/-4); `yoke-derive`; catalog/model assets; UI;
release/signing; all tests; `release.yml`; all other workspace crates'
manifests (`soravo-typing`'s `clipboard-win`, `soravo-hotkeys`' `winapi`
unchanged).

Consequences:

- The Windows leg becomes compilable through Families A+B with Handy V1
  behavior preserved; Family C remains red until ADR-021 lands.
- First dependency-strategy change to the Handy-derived Windows surface:
  future `windows`-version moves require the same evidence (pinned
  upstream declaration + green upstream CI on the exact bytes + ADR).
