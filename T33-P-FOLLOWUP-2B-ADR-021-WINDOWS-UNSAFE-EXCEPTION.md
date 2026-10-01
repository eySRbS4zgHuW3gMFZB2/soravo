# ADR-021 — Narrowly scoped `unsafe` exception for Handy-derived Win32 FFI (Windows only)

Status: Accepted (owner-authorized 2026-10-01 as T33-P-FOLLOWUP-2B Decision 3)
Date: 2026-10-01 (UTC)
Sequence: v6 pack sequence. The index of record is
`docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`, which governs. Root
`10_ADR_INDEX.md` (`ADR-021 — Linux support decision if revisited`) and
`decisions/ADR-021-linux-support.md` belong to a different, older sequence
and are unaffected by this entry.

Context:

- T33-P-FOLLOWUP-2A Family C: 21 × `error: usage of unsafe block is
  forbidden` on the Windows leg, rendered by CI as `requested on the
  command line with -F unsafe-code` from `[workspace.lints.rust]
  unsafe_code = "forbid"` (root `Cargo.toml:25-27`, in force since
  foundation `739ea664`, inherited by `soravo-desktop` via `[lints]
  workspace = true`). `forbid`, unlike `deny`, cannot be suppressed by any
  `#[allow]` at any level (proven in T04-B §1).
- Every one of the 21 sites is Handy-derived Win32 FFI that is `unsafe` by
  language definition (foreign-function calls, `unsafe fn` Win32 callbacks,
  `unsafe {}` blocks around Win32/COM calls, one `transmute` of a
  dynamically resolved `IsWow64Process2` pointer with an inline `SAFETY`
  comment). Upstream Handy carries the identical `unsafe` tokens and
  compiles — it has no `[lints]` table at all (verified first-hand at pin
  `ba10ce19`: no `[lints]` section in upstream `src-tauri/Cargo.toml`).
  Family C is therefore a Soravo-policy-vs-Handy-code collision, not a
  defect in the code, and it persists after ADR-020's declaration fix (the
  `unsafe` tokens remain).
- T05-B §3 explicitly deferred these exact files to "their own ADR
  coverage". The `memory.rs` precedent does not apply (that tuning was
  deleted; deletion is unavailable here — this code IS V1 Windows
  behavior: delayed-render clipboard, overlay topmost, ARM64 machine
  detection, COM mute backends).
- v6 `12`:14 governs: "local unsafe Rust forbidden unless an explicit ADR
  changes policy." This ADR is that explicit change, scoped below.

Decision:

- Permit a narrowly scoped unsafe exception for the Handy-derived Win32
  FFI code where required for compilation (Decision 3), implemented as:
  1. Root `Cargo.toml` `[workspace.lints.rust]` is UNCHANGED
     (`unsafe_code = "forbid"`). Workspace-global policy is not weakened.
  2. `apps/desktop/src-tauri/Cargo.toml` stops inheriting the workspace
     lint table (`[lints] workspace = true` → explicit `[lints.rust]`
     table preserving `unused_must_use = "deny"`) with `unsafe_code =
     "deny"` for this crate only. `deny` (unlike `forbid`) is overridable
     by a narrower `allow`.
  3. `apps/desktop/src-tauri/src/lib.rs` (Soravo-owned adaptation surface —
     one of the 7 files that legitimately differ from upstream, NOT a
     Handy-identical file) carries exactly four
     `#[cfg_attr(target_os = "windows", allow(unsafe_code))]` attributes,
     one on each of the `pub mod managers;`, `pub mod overlay;`, `pub mod
     paste_tx;`, `pub mod utils;` declarations. On non-Windows targets the
     attributes vanish and `deny` applies unchanged.
- The four Handy-derived implementation files themselves
  (`paste_tx/windows.rs`, `utils.rs`, `overlay.rs`, `managers/audio.rs`)
  are byte-untouched: zero source edits, zero logic change, zero
  behavior change.

Alternatives:

1. Separate tiny crate with its own `allow` (T05-B §8 mechanic (i)).
   REJECTED for this repair: it requires moving the 21 Win32 blocks out of
   the four Handy files into a new crate — a larger structural edit to
   restored V1 bytes than the adopted attribute scoping, in direct tension
   with owner Decision 2 (preserve source logic; do not redesign the
   Windows implementation). Recorded as the fallback if the adopted
   mechanism ever proves insufficient.
2. Workspace-wide `forbid` → `deny` downgrade with crate-level allows.
   REJECTED in advance (T33-P-FOLLOWUP-2A §10): broader than necessary —
   it would relax the guarantee for every workspace crate. Even with an
   ADR it is not the minimal change.
3. Silent weakening (`forbid` → `deny`/`allow` without an ADR, deleting the
   lint, or `cfg`-stubbing the Windows blocks). REJECTED: T05-B R4 policy
   violation; stubbing masks a real V1 behavior (forbidden).
4. Deleting the Windows unsafe code. REJECTED: the code IS V1 Windows
   behavior (clipboard delayed rendering, overlay placement, machine
   detection, mute backends); deletion is not a repair.

Why the exception is narrowly scoped:

- Platform-narrow: the `allow`s exist only under `target_os =
  "windows"` (cfg_attr). Linux, macOS, and musl builds see `deny`
  exactly as before — their posture is byte-identical in effect to
  `forbid` because they contain no allowlisted sites.
- Crate-narrow: every other workspace crate keeps inheriting workspace
  `forbid`. Only `soravo-desktop` moves to `deny`.
- Module-narrow: on Windows builds, the `allow` covers exactly four
  module subtrees (`managers`, `overlay`, `paste_tx`, `utils`). All 21
  allowlisted sites were verified (first-hand grep + cfg inspection) to
  sit inside `#[cfg(target_os = "windows")]` functions/blocks or the
  Windows-only `paste_tx::windows` module — so on a Windows build the
  exception covers exactly the allowlist below and nothing else that
  exists today.
- Token-narrow: pre/post `grep -rn unsafe` census must show exactly the
  21 allowlisted sites compiling and ZERO new `unsafe` tokens introduced
  anywhere (diff-based; acceptance criterion below).

Exact allowlist — files/modules covered (21 sites):

- `paste_tx/windows.rs` (16): `:89` (`unsafe fn shared_ptr`), `:119`
  (`render_text`), `:140` (`paste_wnd_proc`), `:206` (block),
  `:236`/`:238`/`:246` (`settle_clipboard` path), `:262`
  (`restore_snapshot`), `:298` (`snapshot_clipboard`), `:357`
  (`publish`), `:370` (`publish_formats`), `:464`/`:466`
  (ownership-settle path), `:481` (block), `:486`
  (`destroy_window_and_shared`), `:495` (block).
- `overlay.rs` (2): `:162` (`force_overlay_topmost`), `:363`
  (`place_windows_overlay`).
- `managers/audio.rs` (2): `:33` (`set_mute`), `:120` (`get_mute`).
- `utils.rs` (1): `:66` (`native_windows_machine`; the `:61` `unsafe
  extern "system" fn` pointer *type* fires no lint and is not an
  allowlisted site — recorded so a future census is not confused by it).

Files/modules explicitly NOT covered:

- Every macOS-gated `unsafe` surface (`apple_intelligence.rs` Swift FFI,
  `input.rs` Carbon block, `autostart.rs` `SMAppService` block,
  `secure_input.rs`, `paste_tx/macos.rs`): on macOS builds the cfg_attr
  allows are absent, so `deny` still rejects them exactly as `forbid`
  does today. They need their own ADR coverage under FOLLOWUP-3/-4
  (T05-B §3 pattern); this ADR grants them nothing and sets no precedent
  beyond its allowlist.
- Linux/musl builds: unchanged (`deny`, no allows present). `memory.rs`
  no longer exists; no Linux `unsafe` remains in this crate.
- Any future `unsafe` outside the four module subtrees, or any new
  `unsafe` token inside them: NOT covered — the census gate fails the
  build's review until this ADR is amended.
- `soravo-typing` (`#![forbid(unsafe_code)]` intact), `soravo-hotkeys`,
  and all other workspace crates: untouched, still `forbid`.

SAFETY rationale (adopted from the code's own comments + review):

- All 21 sites are Win32/COM foreign-function calls or `unsafe fn`
  callbacks required by the Win32 API shape (`WNDPROC`, COM vtables);
  there is no safe-Rust equivalent (same finding class as T04-B §5).
- `rust-review` relevance: no raw-pointer arithmetic beyond documented
  Win32 handle conversions, no `transmute` except the `IsWow64Process2`
  resolution (inline `SAFETY` comment retained, dynamically resolved so
  merely starting the app never raises the minimum Windows version), no
  manual allocation, no `unsafe` trait/impl. Clipboard/audio/transcript
  content is never logged (no-clipboard-telemetry invariant holds).
- Precedent containment: this ADR allowlists exact call sites, pins the
  `windows` version (ADR-020: `0.61.3`), and mandates the census gate —
  it is not a blanket permission and must not be cited for any other
  file.

Security impact:

- Creates the first accepted `unsafe` exception to the workspace baseline
  for this crate on Windows builds only. Blast radius is bounded to Win32
  FFI that upstream Handy ships identically; no new attack surface is
  introduced (the calls existed in the source all along — they were
  compile-blocked, not absent).
- Ignored-return-code posture (`SetWindowPos` `let _ =`, COM `let _ =`)
  matches upstream Handy bytes and is preserved, not expanded.

Performance impact: none claimed; the exception changes compilability,
not runtime behavior. `malloc_trim`-style latency analysis from T05-B
does not apply (no allocator tuning here).

Operational impact:

- Windows CI leg is expected to go green with ADR-020 + this ADR combined
  (separate commits, same task). Linux/macOS legs are unaffected by
  construction (allows are Windows-cfg-only); their current failures
  (macOS `ort-sys`/ggml floor, `yoke-derive` yanked) are owned elsewhere
  and must read unchanged-or-better.

Testing impact:

- No test created, modified, or masked. The census gate is review-time,
  not a test edit: `grep -rn unsafe apps/desktop/src-tauri/src` diff vs
  the 21-site allowlist must be empty apart from the pre-existing
  non-Windows cfg-gated sites (which remain deny-blocked on their own
  targets).
- Linux `clippy -p soravo-desktop --all-targets -- -D warnings` must stay
  green (the exception must not leak into the common closure);
  `cargo test -p soravo-desktop` green.

Re-review triggers (any one reopens this ADR):

- `windows` major/minor bump (e.g. 0.61 → 0.62+), or any change to the
  ADR-020 feature set;
- any new `unsafe` token in `apps/desktop/src-tauri/src` (census gate);
- any change to the four modules' Windows FFI surface beyond the
  allowlist;
- post-V1 Linux-support milestone (re-examine crate-level `deny` vs
  restored `forbid` inheritance).

Rollback (two-layer, T05-B §8 pattern):

1. Code: revert the `lib.rs` four attributes + restore `[lints]
   workspace = true` in the crate manifest (returns to `forbid`-clean
   stubs state; Windows leg goes red on Family C again — that is the
   defined safe state, not a regression).
2. ADR: flip this entry to `Superseded` with reason + date. Verify no
   other code landed under the exception window (`git log` audit for
   `unsafe` additions between accept and revert).

CI acceptance criteria:

1. All of ADR-020's gates (this lands on top of a Family-A/B-fixed
   declaration; order per T33-P-FOLLOWUP-2A §14).
2. Census proof: pre/post `grep -rn unsafe` of
   `apps/desktop/src-tauri/src` shows exactly the 21 allowlisted sites
   and ZERO new `unsafe` tokens (diff-based).
3. Windows proof (authoritative GitHub CI only): `desktop-windows` leg
   GREEN with zero `E0432`/`E0308`/`unsafe-forbid` in `soravo-desktop`,
   including explicit silence at `paste_tx/windows.rs:388` (latent B5).
4. Linux `clippy -- -D warnings` green; `cargo test -p soravo-desktop`
   green; no-clipboard-telemetry invariant holds (`grep` proves no new
   logging of clipboard/audio/transcript content in touched scope).
5. Diff hygiene: the commit contains ONLY the crate `[lints]` table
   change, the four `lib.rs` attributes, this ADR, and its index entry.
   The four implementation files are byte-unchanged.

Consequences:

- The existing Windows implementation compiles as Handy wrote it, under
  an explicit, audited, revocable exception — instead of a silent global
  weakening or a rewrite of V1 behavior.
- `soravo-desktop` is now the single crate on crate-level `deny`; it must
  mirror future workspace lint additions explicitly (recorded here so a
  future `[workspace.lints]` addition does not silently skip this crate).
