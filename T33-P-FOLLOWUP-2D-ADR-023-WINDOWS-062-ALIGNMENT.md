# ADR-023 — Windows `windows`-crate realignment 0.61.3 → 0.62.2 (Family D HWND type-split repair, Path A)

Status: Accepted (owner-authorized 2026-10-01 as T33-P-FOLLOWUP-2D-DECISION Path A)
Date: 2026-10-01 (UTC)
Sequence: v6 pack sequence. The index of record is
`docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`, which governs. Root
`10_ADR_INDEX.md` and `decisions/` files belong to a different, older sequence
and are unaffected by this entry.

Context:

- T33-P-FOLLOWUP-2D (forensics only, no repair) re-derived the two remaining
  Windows Family D errors on authoritative CI (2 × E0308,
  `apps/desktop/src-tauri/src/overlay.rs:165,365`): Soravo's direct
  `windows 0.61.3` (ADR-020 pin) vs `windows 0.62.2` via
  `soravo-desktop → tauri 2.12.0 → tauri-runtime-wry 2.12.0 → tao 0.37.1`
  (plus `tauri 2.12.0 → windows 0.62` directly). `overlay.rs` passes tao/tauri's
  0.62 `HWND` (from `WebviewWindow::hwnd()`) into `SetWindowPos` resolving
  against direct 0.61.3. Same struct layout
  (`pub struct HWND(pub *mut core::ffi::c_void)`, `#[repr(transparent)]`,
  identical derives, both at `Foundation/mod.rs:5670`), distinct types under
  Rust's crate-version identity rule — compiler-attested dual-version note.
- The T33-P-FOLLOWUP-2D-DECISION owner package evaluated four repair paths
  (A: align direct to 0.62.x; B: boundary conversion; C: Handy tao-fork line;
  D: defer) against fifteen criteria plus four forensic checks, without ranking.
  The owner selected **Path A**.
- `overlay.rs` is byte-identical to Handy at the pin of record
  `https://github.com/cjpais/Handy` @
  `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` (892 lines, empty diff,
  re-verified first-hand). It is Handy-preserved and is NOT touched by this
  decision.

Decision:

- Move Soravo's direct `windows` declaration from `version = "0.61.3"` to
  `version = "0.62.2"` (exact pin), keeping exactly the same 11 features, in
  `[target.'cfg(windows)'.dependencies]` of `apps/desktop/src-tauri`
  (`Cargo.lock` regenerated via normal resolution; the direct edge moves
  `windows 0.61.3` → `windows 0.62.2`, one line). `0.62.2` is the version
  already locked via the tao/tauri closure — no new crate version enters the
  graph.
- Preserve Handy V1 Windows behavior and source logic byte-for-byte: zero Rust
  source edits accompany this decision. Both fault sites type-check because
  `SetWindowPos` and `hwnd()` now resolve against the same `windows` version.
- `winreg` stays at `0.10` (zero errors attributable to it; owner Decision 4
  holds). `webview2-com` is deliberately NOT adopted (no error demands it).
- This decision **supersedes ADR-020 Decision 1** (the 0.61.3 pin) and reverses
  ADR-020 Alternative 3 (rejection of 0.62.x) for the direct edge. All other
  ADR-020 decisions (zero source edits; `winreg` hold; no `webview2-com`;
  separation from macOS/`yoke-derive`) remain in force.
- **ADR-021 re-review (trigger fired by C3):** the `windows` minor bump
  (0.61 → 0.62) fires ADR-021's explicit re-review trigger. This ADR records
  the re-review: the 21-site allowlist is unchanged (zero `unsafe` tokens
  added, removed, or moved — census-verified by diff); the `windows-version`
  pin referenced by ADR-021 is updated 0.61.3 → 0.62.2; the crate-level
  `deny` + four Windows-gated `allow`s mechanism is unchanged. Full census
  re-proof under 0.62.2 is an acceptance criterion below, not an assumption.

Alternatives (as evaluated in the decision package; owner selected Path A):

1. Path B (boundary `HWND(hwnd.0)` conversion at the two call sites).
   NOT SELECTED: breaks `overlay.rs` byte-identity and leaves the graph
   duplicated. Its §6 ABI-legitimacy finding is retained as evidence only.
2. Path C (tauri 2.11.5 + `[patch.crates-io]` tao fork `@c3bee28`).
   NOT SELECTED: disproportionate cross-platform blast radius (macOS + Linux
   closures, runtime version, git-source supply chain, unknown plugin
   cascade) for a two-error defect.
3. Path D (defer). NOT SELECTED: normalizes a red primary-platform leg;
   ADR-020 Alternative 4 rejection stands for the general case and is
   overridden here only by executing Path A instead.
4. Keep 0.61.3 and downgrade tao/tauri's `windows` edge. NOT PURSUED:
   dependency surgery across subsystem boundaries with unproven blast radius
   (all Tauri plugins share the closure).

Why alignment to 0.62.2 (not 0.61.3, not a third configuration):

- The duplication is directional: tao 0.37.1 / tauri 2.12.0 declare
  `windows 0.62` (vendored manifests read first-hand); the direct edge is the
  Soravo-owned side and the only side this decision may move without touching
  the Tauri runtime architecture.
- All 11 declared `Win32_*` features verified present in vendored
  `windows-0.62.2`; `HANDLE`/`HGLOBAL` shapes identical to 0.61
  (`pub *mut c_void` both); both `SetWindowPos` signatures textually
  identical. Residual unknowns carried as CI-to-disprove: `windows::core::BOOL`
  import resolution under 0.62 (`utils.rs:56`) and any interaction with
  `tauri-plugin-opener`'s remaining 0.61.3 edge (three-version graph becomes
  two-version, not one — recorded, not hidden).
- No third configuration (newer 0.62.x than locked, feature subset) —
  unproven and unnecessary; the locked 0.62.2 is the tao/tauri version.

Compatibility / supply-chain implications:

- `windows` is a `[target.'cfg(windows)'.dependencies]` entry: Linux/macOS
  binaries provably unaffected (dependency cfg isolation); lockfile churn
  (one direct edge) is the only cross-platform artifact.
- `windows 0.61.3` remains in the lockfile via `tauri-plugin-opener 2.6.0`
  (transitive, untouched); `0.54.0` (via `cpal → rodio`), `0.56.0`, `0.58.0`
  unchanged. Only the `soravo-desktop` direct edge moves.
- `cargo deny check` + `cargo audit` must be clean for the moved edge before
  merge (acceptance criterion below); `deny.toml` carries no
  windows-specific entries.

Security impact:

- No new trust boundary, secret, endpoint, or IPC surface. No `unsafe`
  introduced, removed, or moved by this decision (ADR-021 re-review above).
  Clipboard handling stays snapshot/write/restore with no logging — the
  no-clipboard-telemetry invariant (root `09` §18 / v6 `12`) is preserved.

Performance impact: none claimed. Windows runtime intent is restored, not
altered; the pre-fix code never compiled, so no shipping behavior exists
to regress. No benchmark is invalidated or required by this decision.

Operational impact:

- Windows CI leg (`desktop-windows`) is expected to go fully green (Family D
  was the last remaining error class). If CI surfaces ANY new Windows
  incompatibility (e.g. a 0.62 import-resolution or opener-interaction error),
  the implementation STOPS: no Handy-derived source may be edited to satisfy
  it without a new forensic/owner gate (owner instruction).

Testing impact:

- No test created, modified, or masked (owner constraint). Linux
  `cargo clippy -p soravo-desktop --all-targets -- -D warnings` and
  `cargo test -p soravo-desktop` must stay green (shared `paste_tx/mod.rs`
  and callers unaffected; Windows-only modules excluded by cfg — stated
  explicitly in validation).

Rollback:

- Revert the `apps/desktop/src-tauri/Cargo.toml` hunk + the one-line
  `Cargo.lock` edge (normal resolution restores `windows 0.61.3`), and flip
  this ADR to `Superseded` with reason + date (ADR-020 D1 pin is then
  restored, but Family D returns — recorded here so a rollback is never
  mistaken for a fix). No source, test, catalog, workflow, or release change
  rides along in either direction.

CI acceptance criteria (all observed, none assumed):

1. `git diff --check` clean; `cargo fmt --check -p soravo-desktop` exit 0.
2. Linux no-regression: `cargo clippy -p soravo-desktop --all-targets --
   -D warnings` exit 0 + `cargo test -p soravo-desktop` green on
   `x86_64-unknown-linux-gnu`.
3. Windows proof (authoritative GitHub CI only — no MSVC on this host):
   `desktop-windows` leg GREEN with zero `E0432`/`E0308`/`unsafe-forbid` in
   `soravo-desktop`, explicit silence at both `overlay.rs` sites AND at
   `paste_tx/windows.rs:388` (latent B5), PLUS `cargo-tree` evidence on the
   new graph (direct edge at 0.62.2; opener 0.61.3 residual disposition).
   ANY new Windows error class fails this criterion and triggers the STOP
   above — it is not repaired inline.
4. Regression guard: `web` / `e2e` / `desktop`(Linux) / `rust` /
   `cargo-audit` / `cargo-deny` unchanged-or-better vs run `36811309685`;
   macOS legs unchanged in cause (independent ort-sys/ggml failures owned
   elsewhere); lockfile diff reviewed (only the `windows` direct edge;
   `winreg` untouched; no new crate versions).
5. Supply-chain: `cargo deny check` + `cargo audit` clean for the moved
   edge (modulo the pre-existing `yoke-derive` yanked denial owned
   elsewhere).
6. ADR-021 census re-proof: pre/post `grep -rn unsafe` of
   `apps/desktop/src-tauri/src` shows exactly the 21 allowlisted sites and
   ZERO new `unsafe` tokens (diff-based) under the 0.62.2 build.
7. Diff hygiene: the commits contain ONLY the Cargo.toml hunk, the
   Cargo.lock edge, this ADR, and its index entry. All Rust sources
   (including `overlay.rs`), macOS code, `yoke-derive`, catalog/model
   assets, UI, release/signing, and tests are byte-unchanged.

Files/modules covered: `apps/desktop/src-tauri/Cargo.toml`
(`[target.'cfg(windows)'.dependencies]` `windows` entry only) +
`Cargo.lock` (the `soravo-desktop` → `windows` edge only) + this ADR +
the ADR index entry. ADR-021's `windows-version` pin reference updated
0.61.3 → 0.62.2 by this ADR's re-review record.

Files/modules explicitly NOT covered: `overlay.rs` (zero edits — owner
instruction) and every other Rust source; `tauri`/`tao`/plugin versions and
sources; `winreg`; `webview2-com` (not adopted); macOS sources and legs;
`yoke-derive`; catalog/model assets; UI; release/signing; all tests;
`release.yml`; all other workspace manifests.

Consequences:

- The Windows leg is expected to compile fully with Handy V1 behavior
  preserved byte-for-byte; the `windows` version now shadows the Tauri/tao
  line, so future tauri/tao bumps must re-evaluate this edge under the same
  evidence rule (pinned declaration + CI proof on the exact bytes + ADR).
- First accepted departure from the Handy-proven dependency declaration:
  future `windows`-version moves require the same evidence, and may never
  ride along as silent bumps.
