# ADR-024 — Narrowly scoped `unsafe` exception for Handy-derived macOS FFI (macOS only)

Status: Accepted (owner-authorized 2026-10-02 as T33-P-FOLLOWUP-3D Decision 1)
Date: 2026-10-02 (UTC)
Sequence: v6 pack sequence. The index of record is
`docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`, which governs. Root
`10_ADR_INDEX.md` and `decisions/` files belong to a different, older sequence
and are unaffected by this entry.

Context:

- T33-P-FOLLOWUP-3A Family U: 22 × `error: usage of an unsafe block is
  forbidden` on the macOS aarch64 leg, rendered by CI as `requested on the
  command line with -F unsafe-code` from `[workspace.lints.rust]
  unsafe_code = "forbid"` (root `Cargo.toml:25-27`, in force since
  foundation `739ea664`, inherited by `soravo-desktop` until ADR-021 moved
  this crate to crate-level `deny`). `forbid`, unlike `deny`, cannot be
  suppressed by any `#[allow]` at any level (proven in T04-B §1).
- Every one of the 22 sites is Handy-derived macOS platform FFI that is
  `unsafe` by language definition (Carbon TIS/UCKeyTranslate/CoreFoundation
  foreign-function blocks and `unsafe extern` link blocks in `input.rs`;
  Swift/FFI pointer blocks in `apple_intelligence.rs`; `SMAppService`
  Objective-C blocks in `autostart.rs`; Carbon `IsSecureEventInputEnabled`
  call in `secure_input.rs`; CGEvent/pasteboard `msg_send!` blocks in
  `paste_tx/macos.rs`). Upstream Handy at the pin of record
  `https://github.com/cjpais/Handy` @
  `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` carries the identical `unsafe`
  tokens and compiles green on macOS aarch64 CI — it has no `[lints]` table
  at all (verified first-hand at the pin; same structural fact as ADR-021).
  Family U is therefore a Soravo-policy-vs-Handy-code collision, not a
  defect in the code, and it persists after the 3B import restoration (28 →
  27) and the 3C enigo realignment (27 → 22, Family S gone, Family M gone).
- T05-B §3 explicitly deferred macOS `unsafe` surfaces to "their own ADR
  coverage". ADR-021 covers 4 Windows files only (21 sites) and explicitly
  excludes these macOS surfaces ("macOS `unsafe` surfaces explicitly NOT
  covered (FOLLOWUP-3/-4 own them)"). No accepted ADR covers these 22 sites
  today.
- v6 `12`:14 governs: "local unsafe Rust forbidden unless an explicit ADR
  changes policy." This ADR is that explicit change, scoped below.

Decision:

- Permit a narrowly scoped unsafe exception for the Handy-derived macOS
  FFI code where required for compilation, implemented as:
  1. Root `Cargo.toml` `[workspace.lints.rust]` is UNCHANGED
     (`unsafe_code = "forbid"`). Workspace-global policy is not weakened.
  2. `apps/desktop/src-tauri/Cargo.toml` `[lints.rust]` table is UNCHANGED
     (`unsafe_code = "deny"`, `unused_must_use = "deny"` from ADR-021).
     `deny` (unlike `forbid`) is overridable by a narrower `allow`.
  3. `apps/desktop/src-tauri/src/lib.rs` (Soravo-owned adaptation surface)
     carries exactly five additional
     `#[cfg_attr(target_os = "macos", allow(unsafe_code))]` attributes,
     one on each of the `pub mod apple_intelligence;`,
     `pub mod autostart;`, `pub mod input;`, `pub mod paste_tx;`
     (alongside its existing Windows allow), and `pub mod secure_input;`
     declarations. On non-macOS targets the attributes vanish and `deny`
     applies unchanged.
- The five Handy-derived implementation files themselves
  (`apple_intelligence.rs`, `autostart.rs`, `input.rs`,
  `paste_tx/macos.rs`, `secure_input.rs`) are byte-untouched: zero source
  edits, zero logic change, zero behavior change.

Alternatives:

1. Separate tiny crate with its own `allow`. REJECTED for this repair: it
   requires moving the 22 macOS blocks out of the five Handy files into a
   new crate — a larger structural edit to Handy bytes than the adopted
   attribute scoping, in direct tension with the preservation rule (preserve
   Handy source logic; do not redesign the macOS implementation).
   Recorded as the fallback if the adopted mechanism ever proves
   insufficient.
2. Workspace-wide `forbid` → `deny`/`allow` downgrade. REJECTED: broader
   than necessary — it would relax the guarantee for every workspace crate.
   Even with an ADR it is not the minimal change.
3. Crate-wide `allow(unsafe_code)` or removing the `unsafe_code` lint.
   REJECTED: grants blanket permission to the whole crate including future
   Soravo-owned code; fails the smallest-correct-scope requirement.
4. Rewriting Handy-derived macOS code to avoid `unsafe` (wrappers, alternate
   implementations, FFI-call replacement). REJECTED: edits Handy-derived
   behavior merely to silence the lint; violates the preservation rule; no
   safe-Rust equivalent exists for Carbon/CoreFoundation/SMAppService/CGEvent
   foreign-function calls. The default is to preserve Handy source and
   adjust Soravo's lint-policy boundary.
5. Silent weakening (`deny` without an ADR, deleting the lint, or
   `cfg`-stubbing the macOS blocks). REJECTED: policy violation; stubbing
   masks real V1 behavior (transcription, login-item, secure-input,
   paste-receipt paths).
6. Deleting the macOS unsafe code. REJECTED: the code IS V1 macOS behavior
   (keyboard-layout-aware paste, Apple Intelligence, login items, secure
   input fallback, pasteboard receipts); deletion is not a repair.

Why the exception is narrowly scoped:

- Platform-narrow: the new `allow`s exist only under `target_os =
  "macos"` (cfg_attr). Windows, Linux, and musl builds see `deny`
  exactly as before.
- Crate-narrow: every other workspace crate keeps workspace `forbid`.
  Only `soravo-desktop` uses crate-level `deny`.
- Module-narrow: on macOS builds, the `allow` covers exactly five module
  subtrees (`apple_intelligence`, `autostart`, `input`, `paste_tx`,
  `secure_input`). All 22 allowlisted sites were verified (first-hand grep
  + cfg inspection) to sit inside macOS-gated functions/blocks or the
  macOS-only `paste_tx::macos` module — so on a macOS build the exception
  covers exactly the allowlist below and nothing else that exists today.
- Token-narrow: pre/post `grep -rn unsafe` census must show exactly the 22
  allowlisted sites compiling and ZERO new `unsafe` tokens introduced
  anywhere (diff-based; acceptance criterion below).

Exact allowlist — files/modules covered (22 sites):

- `apple_intelligence.rs` (6): `:20` (`check_apple_intelligence_availability`),
  `:41` (`process_text_with_system_prompt` FFI call), `:49` (response deref),
  `:55` (`CStr::from_ptr` response), `:61` (`CStr::from_ptr` error), `:70`
  (`free_apple_llm_response`).
- `autostart.rs` (4): `:64` (`SMAppService::mainAppService`), `:65`
  (`status`), `:71` (`registerAndReturnError`), `:83`
  (`unregisterAndReturnError`) — all inside `#[cfg(target_os = "macos")] mod
  macos`.
- `input.rs` (8): `:27` + `:50` (`unsafe extern "C"` Carbon/CoreFoundation
  link blocks); `:62` (`CFRelease` in `Drop`), `:80`
  (`TISCopyCurrentKeyboardLayoutInputSource`), `:88`
  (`TISGetInputSourceProperty`), `:95` (`CFDataGetBytePtr`), `:102`
  (`LMGetKbdType`), `:111` (`UCKeyTranslate`) — all inside
  `#[cfg(target_os = "macos")] mod macos`.
- `paste_tx/macos.rs` (3): `:62` (`isEqualToString`), `:92` (`msg_send!
  init`), `:293` (`msg_send! declareTypes:owner:`). The `#[unsafe(...)]`
  attribute lines (`:50`, `:58`, `:80`) are safe-attribute syntax and are
  not allowlisted sites.
- `secure_input.rs` (1): `:146` (`IsSecureEventInputEnabled`) — inside
  `#[cfg(target_os = "macos")] mod imp` (line shifted +2 by the 3B gated
  `Emitter` import; content untouched).

Files/modules explicitly NOT covered:

- Every Windows-gated `unsafe` surface remains under ADR-021's four
  Windows-gated allows only; this ADR grants Windows nothing and amends
  ADR-021 in no way (the `paste_tx` declaration now carries two
  independent per-target allows, one per ADR).
- Linux/musl builds: unchanged (`deny`, no new allows present).
- Any future `unsafe` outside the five module subtrees, or any new
  `unsafe` token inside them: NOT covered — the census gate fails the
  build's review until this ADR is amended.
- `soravo-typing` (`#![forbid(unsafe_code)]` intact), `soravo-hotkeys`,
  and all other workspace crates: untouched, still `forbid`.
- x86_64 `ort-sys` prebuilt-binary absence (FOLLOWUP-4) and `yoke-derive`
  yanked advisory: untouched, owned elsewhere.

SAFETY rationale (adopted from the code's own comments + review):

- All 22 sites are macOS foreign-function calls or `unsafe extern` link
  blocks required by the platform API shape (Carbon TIS/UCKeyTranslate,
  CoreFoundation CFData, ServiceManagement SMAppService Objective-C,
  Carbon IsSecureEventInputEnabled, AppKit pasteboard `msg_send!`, Swift
  Apple-Intelligence FFI); there is no safe-Rust equivalent.
- `rust-review` relevance: no raw-pointer arithmetic beyond documented
  FFI handle conversions, no `transmute`, no manual allocation, no `unsafe`
  trait/impl. Each `unsafe` block balances ownership per its inline
  `SAFETY` comment (Create-Rule release in `InputSource::drop`,
  retained-source lifetime for layout data, main-thread TIS requirement,
  null-checked Swift response pointers). Clipboard/audio/transcript content
  is never logged (no-clipboard-telemetry invariant holds).
- Precedent containment: this ADR allowlists exact call sites and mandates
  the census gate — it is not a blanket permission and must not be cited
  for any other file.

Security impact:

- Creates the second accepted `unsafe` exception to the workspace baseline
  for this crate, on macOS builds only. Blast radius is bounded to macOS
  FFI that upstream Handy ships identically; no new attack surface is
  introduced (the calls existed in the source all along — they were
  compile-blocked, not absent).
- Ignored-return-code posture matches upstream Handy bytes and is
  preserved, not expanded.

Performance impact: none claimed; the exception changes compilability,
not runtime behavior.

Operational impact:

- macOS aarch64 CI leg is expected to go green with 3B + 3C + this ADR
  combined (sequenced commits). Linux/Windows legs are unaffected by
  construction (allows are macOS-cfg-only); their current states
  (Windows GREEN per ADR-023, Linux green) must read unchanged-or-better.
  x86_64 macOS remains red on the independent `ort-sys` error (FOLLOWUP-4).

Testing impact:

- No test created, modified, or masked. The census gate is review-time,
  not a test edit: `grep -rn unsafe apps/desktop/src-tauri/src` diff vs
  the 22-site allowlist must be empty apart from the pre-existing
  Windows-gated sites (which remain deny-blocked on macOS targets and
  vice versa).
- Linux `clippy -p soravo-desktop --all-targets -- -D warnings` must stay
  green (the exception must not leak into the common closure);
  `cargo test -p soravo-desktop` green.

Re-review triggers (any one reopens this ADR):

- Any new `unsafe` token in `apps/desktop/src-tauri/src` (census gate);
- Any change to the five modules' macOS FFI surface beyond the allowlist;
- Any change to the crate-level `[lints.rust]` table;
- Post-V1 Linux-support milestone (re-examine crate-level `deny` vs
  restored `forbid` inheritance).

Rollback (two-layer, T05-B §8 pattern):

1. Code: revert the `lib.rs` five attributes (returns to `deny`-blocked
   macOS state; aarch64 leg goes red on Family U again — that is the
   defined safe state, not a regression).
2. ADR: flip this entry to `Superseded` with reason + date. Verify no
   other code landed under the exception window (`git log` audit for
   `unsafe` additions between accept and revert).

CI acceptance criteria:

1. `git diff --check` clean; `cargo fmt --check -p soravo-desktop` exit 0.
2. Linux no-regression: `cargo clippy -p soravo-desktop --all-targets --
   -D warnings` exit 0 + `cargo test -p soravo-desktop` green on
   `x86_64-unknown-linux-gnu`.
3. macOS proof (authoritative GitHub CI only — no macOS SDK on this host):
   `desktop build (macOS, aarch64-apple-darwin)` leg GREEN with zero
   `unsafe-forbid`, zero E0277, zero E0599 in `soravo-desktop`.
4. Regression guard: `web` / `e2e` / `desktop`(Linux) /
   `desktop-windows` / `rust` / `cargo-audit` / `cargo-deny`
   unchanged-or-better vs run `36956251559` (modulo the pre-existing
   `yoke-derive` yanked denial owned elsewhere); x86_64 macOS unchanged
   (`ort-sys`, FOLLOWUP-4).
5. Census proof: pre/post `grep -rn unsafe` of
   `apps/desktop/src-tauri/src` shows exactly the 22 allowlisted sites
   plus the 21 ADR-021 Windows sites and ZERO new `unsafe` tokens
   (diff-based).
6. Diff hygiene: the commit contains ONLY the five `lib.rs` attributes,
   this ADR, and its index entry. The five implementation files are
   byte-unchanged.

Consequences:

- The existing macOS implementation compiles as Handy wrote it, under an
  explicit, audited, revocable exception — instead of a silent global
  weakening or a rewrite of V1 behavior.
- `soravo-desktop` remains the single crate on crate-level `deny`; it must
  mirror future workspace lint additions explicitly (recorded in ADR-021
  and here so a future `[workspace.lints]` addition does not silently skip
  this crate).
