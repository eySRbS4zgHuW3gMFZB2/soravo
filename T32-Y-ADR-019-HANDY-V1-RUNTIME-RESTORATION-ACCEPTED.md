# T32-Y — ADR-019: HANDY V1 RUNTIME RESTORATION (MINIMUM INTEGRATION BOOT)

> **STATUS: ACCEPTED — WITH RECORDED AMENDMENTS.**
> Accepted 2026-09-30 by owner direction under task **T32-Y** (documentation/control-plane
> reconciliation). Indexed in `docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`, which is
> the single index of record.
>
> **This ADR supersedes `T32-W-ADR-019-HANDY-RUNTIME-RESTORATION-DRAFT.md`**, which was
> `DRAFT — NOT RATIFIED, NOT INDEXED`, carried five unchecked ratification rows, stated
> *"No implementation is authorized"*, and contained four factually wrong claims and two
> unfulfilled obligations. **The draft is retained unmodified as history; nothing in it is
> silently rewritten.** Its wrong claims are corrected here, one by one, in *Amendments*.

**Number:** ADR-019 (this pack's sequence; `20_ADR_INDEX.md` runs ADR-001…ADR-016, ADR-018;
**ADR-017 is absent**). This is **not** the v2 sequence's ADR-019 (*update/release mechanism*,
`10_ADR_INDEX.md` at the repository root) nor `docs/archive/spec-v3/decisions/ADR-027`
(*handy-derived-desktop-foundation*). Those are different sequences; see the numbering note
in the index of record.

**Task of record:** T32-W (spec + draft) → T32-X phase 1 (`5649411d`) → T32-X phase 2
(`27200173`) → T32-Y (this acceptance, indexing, and correction).

**Implementation commits (shipped, pushed, on PR #63 — not merged):**
`5649411d` *fix(desktop): remove launch-aborting updater plugin + declare cli module*
· `27200173` *feat(desktop): restore the Handy V1 runtime boot (T32-X corrections 3-5)*

**Branch / HEAD (audit reference):** `t31/soravo-wrapper-completion` @
`27200173950a1ad5a69840c3e170297d2b7c2ef9`, 0 ahead / 0 behind `origin/t31/soravo-wrapper-completion`.
**`origin/main`:** `ede495b55efd95cedd882d90a19d12b4777da852`.

---

## 1. The decision

**Soravo V1 is a wrapper/platform around the existing Handy-derived desktop foundation.**
This ADR authorizes and records the restoration of the **minimum integration boot** required to
make the *already-existing, already-complete* Handy STT runtime launch and become the live V1
runtime, and it fixes the exact boundaries of that restoration.

The V1 rule forbids **adding** STT capability. It does not forbid **instantiating**
capability that already exists in full and was never constructed. Before this decision
Handy's STT architecture was compiled-but-dead code: every constructor had zero call sites,
`main.rs` had no `.setup()` hook in any commit in this repository's history, and the
application panicked on every launch. That is the same defect class (unreachable / dead
architecture) whose root cause is the fork/integration artifact of the `a156c8c9` import,
which was **file-level** — it replaced `lib.rs` and wrote a new `main.rs` builder while the
imported modules still referenced the boot function that was dropped. This is a
**re-integration**, not a design change.

## 2. Accepted decisions

### 2.1 Authorized — restoration of missing integration/startup glue

Restricted to `apps/desktop/src-tauri/src/main.rs`, `src/lib.rs`, and (for the
catalog tolerance below) `src/catalog/mod.rs`:

| # | Decision | Shipped |
|---|---|---|
| **A1** | Drop the `.plugin(tauri_plugin_updater::Builder::new().build())` registration that aborted every launch. | ✅ `5649411d` |
| **A2** | Declare the ported `pub mod cli;` in `lib.rs` (a module declaration changes no behaviour). | ✅ `5649411d` |
| **A3** | Add a `.setup(\|app\| { … })` hook whose entire content calls **already-existing, unmodified** `pub` Handy APIs, in this order: `portable::init()` → `CliArgs::parse()` → `init_transcribe_backend()` → `ModelManager::new` → `TranscriptionManager::new` → `AudioRecordingManager::new` (via `tm.stream_router()`) → `HistoryManager::new` → `TranscriptionCoordinator::new` → `.manage(cli_args)` → `secure_input::init` → `initialize_shortcuts`. | ✅ `27200173` |
| **A4** | Register **exactly one** additional existing command — `initialize_shortcuts` — so the global shortcut can be re-installed after the OS accessibility grant. 15 → 16. The function is reused verbatim. | ✅ `27200173` |
| **A5** | **D-CATALOG = B** — add `#[serde(default)]` to `CatalogRoot::models` (`catalog/mod.rs:32`). **One line of behaviour-relevant code plus four comment lines.** | ✅ `27200173` |
| **A6** | Restore the `paste_tx/` module (`mod.rs`, `macos.rs`, `windows.rs`) from `5f56260c`. See §4. | ✅ `27200173` |
| **A7** | Add the two **macOS-scoped** direct dependencies `objc2-app-kit = "0.3.2"` and `objc2-foundation = "0.3.2"` required by the restored `paste_tx/macos.rs`. See §6. | ✅ `27200173` |

**`D-CATALOG` resolution, recorded verbatim as taken:** option **B**. Options A, C, D are
rejected. A fabricates model metadata. C is impossible (`TranscriptionManager::new` requires
`Arc<ModelManager>`). D produces a running app that silently has no STT capability, which is
the dishonest state this ADR exists to end.

**Zero Handy behaviour files were edited.** Proven from the 9-path change set, not asserted.

### 2.2 Prohibited — and held

- **No** `hotkey.rs` declaration, and **no** registration of its 7 `hotkey_*` commands. They
  are a Phase-1 stub that returns success without performing any OS registration; registering
  them would present a false "Listening…" state beside Handy's real `shortcut/` backends —
  a third hotkey path. **Held.**
- **No** `pub mod signal_handle;`. **Held.**
- **No** wiring of `crates/transcript` / `soravo-stt` / `soravo-licensing`.
  Entitlement does not participate in transcription in V1. **Held.**
- **No** second `TranscriptionManager::transcribe` call site.
  `retry_history_entry_transcription` stays unregistered. **Held.**
- **No** second text-insertion path. **Held.**
- **No** newly-authored tray or recording-overlay implementation. **Held.**
- **No** changes to Handy behaviour: audio capture · VAD (including **VAD backend
  selection** — `Silero` stays) · transcription engine · language detection · transcription
  pipeline · filler-word behaviour · normalisation · punctuation · transcript
  post-processing · STT output semantics · hotkey · typing/injection · clipboard fallback ·
  model execution. **Held — `vad_backend: Silero` confirmed live in the runtime log.**
- **No** fabricated data or assets: no model id, architecture, quantisation, SHA-256, size,
  mirror URL, licence, provenance, score, or rank; no updater endpoint, minisign key, or
  credential; no fabricated benchmark. **Held.**
- **No test edited, added, removed, relocated, ignored, or annotated** to obtain green CI.
  **Held — zero test-file modifications in either commit.**

### 2.3 Deferred — explicitly not authorized by this ADR

| # | Item | Prerequisite |
|---|---|---|
| F1 | Tray construction + `TrayIconEvent` handlers | Exact upstream Handy repo + commit per the v6 ten-field source manifest (**currently `UNKNOWN`**); 11 tray PNG assets with licence/provenance. A from-scratch tray is **prohibited** (a hand-written tray has no menu action handlers, so the `check_updates` item would be inert). |
| F2 | Recording overlay | `src/overlay/index.html` must exist, Vite must become multi-page, `capabilities/default.json` must cover the `recording_overlay` window (currently `windows: ["main"]` only). |
| F3 | `pub mod signal_handle;` + `setup_signal_handler` | separate decision; remote trigger only, never the dictation path |
| F4 | The 119 remaining command registrations | per-command justification against a real consumer, state, and capability |
| F5 | Settings-store unification (`soravo_config` ↔ Handy `AppSettings`) | **product decision** on which surface is authoritative. Only the Soravo-owned direction (an adapter) is ever permissible; the Handy direction is a Handy change and is prohibited. |
| F6 | macOS `NSMicrophoneUsageDescription` and packaging | release workstream; no `Info.plist` exists today |
| F7 | Model-catalogue population, model acquisition, VAD asset sourcing | the ten-item catalog checklist; v6 §07/§12/§15 |
| F8 | Updater restoration (real endpoints + real minisign key) | v6 §03/§04 release workstream. The `tauri-plugin-updater = "2"` **crate dependency remains in `Cargo.toml`** — deferred, not removed. |

## 3. V1 preservation — what this decision explicitly does NOT do

**Soravo V1 is a wrapper/platform around Handy, and this ADR keeps it that way.**

The intended V1 architecture, unchanged by this decision:

```
Soravo account / auth / payment / entitlement / product wrapper
                            ↓
                   Soravo contracts
                            ↓
                 Handy-derived core
                            ↓
              existing STT / insertion
```

Explicitly, and verified against the shipped change set:

1. **Handy's existing STT behaviour and pipeline are preserved.** No Handy behaviour file
   was edited. The 9-path change set contains no file from `audio_toolkit/`, `managers/`,
   `shortcut/`, `actions.rs`, `post_process.rs`, `clipboard.rs`, `input.rs`, `settings.rs`,
   or `crates/**`.
2. **No Soravo post-processing layer was added.** `post_process.rs` was not touched. There
   is no Soravo filler-word removal, no Soravo normalisation, no Soravo
   punctuation/capitalisation transformation, and no language-specific transcription
   transformation.
3. **No second STT stack, no second transcript producer, no second insertion path.** The
   same dictated text is never routed through both native Handy insertion and Soravo
   injection.
4. **No change was made to Handy behaviour to satisfy a test.** The five failing
   transcription tests were left red. That is the explicit intent, not an oversight.
5. **Any change that can alter Handy transcription behaviour requires an explicit
   owner-approved decision or ADR before implementation** — v6 §04 *V1 HANDY-CORE PRESERVATION
   POLICY* and v6 §09 *V1 HANDY-CORE PRESERVATION VIOLATIONS* are STOP conditions.

### 3.1 Why the restoration does not create a competing STT architecture

This is the question a reviewer must be able to answer without reading the source.

- **The STT stack was already there.** The restoration adds no STT code. It adds calls to
  constructors that already existed with zero call sites. The set of STT types,
  functions, models, and pipelines in the crate is unchanged.
- **It removes dead code; it does not add a rival.** ADR-018's preservation rule exists to
  keep Handy's working STT behaviour. Before this decision that behaviour was unreachable.
  Instantiation is the only way to make a preserved capability the *live* one instead of
  compiled-but-dead code.
- **The wrapper/product layer is untouched and remains the owner of identity, money, and
  release.** The restoration constructs `AccountMachine` and `SessionMachine` — which were
  already managed — and adds no account, entitlement, payment, or licensing code. Entitlement
  still does not participate in transcription in V1.
- **The one-line catalog change is in a Soravo-owned file, not a Handy behaviour file.**
  `catalog/mod.rs` is classified `SORAVO-OWNED` per v6 §04/§21. It changes a *failure mode*
  (process abort → empty registry), asserts **no** model fact, and is the only line in the
  change set that touches a Handy-derived file at all.
- **The single-path invariants are asserted, not hoped for** (§7).

**Counterfactual, stated because the V1 rule can be read against this decision:** leaving the
desktop unbooted keeps 40+ files of working Handy code dead, keeps the application from
starting at all, and contradicts the v6 §02 V1 success sentence *"install → configure →
dictate → correct injection → …"*. That is the status quo this ADR exists to change.

## 4. `paste_tx` restoration — restoration of existing source, not new Soravo architecture

**This is a restoration, and it must be described as one.** A reviewer encountering "Soravo
added a text-insertion path" would be reading the change backwards.

- `apps/desktop/src-tauri/src/paste_tx/{mod,macos,windows}.rs` are **byte-identical to their
  state at `5f56260c`** (the first Handy migration commit). Verified by SHA-256, three files:

  | File | SHA-256 (first 16) | vs `5f56260c` |
  |---|---|---|
  | `paste_tx/mod.rs` | `2d70bc1ff915c899` | **IDENTICAL** |
  | `paste_tx/macos.rs` | `a4f9ebd9011f271b` | **IDENTICAL** |
  | `paste_tx/windows.rs` | `11d975d768b06070` | **IDENTICAL** |

- `git status` on the directory is empty at `27200173`; `git diff HEAD` on it is empty.
- `lib.rs` gained exactly one line, `pub mod paste_tx;` — a module declaration.
- **There is no Soravo-authored insertion path here.** No function in `paste_tx` was
  written, adapted, or renamed by T32-W. The same file served the existing
  `clipboard::paste` chain before, serves it now, and is reachable from the same single call
  site.
- The restoration is required, not optional: `paste_tx` is referenced by the existing
  `clipboard` module, so its absence was a **macOS *and* Windows** compile break — not a
  macOS-only break. See Amendment 5.

## 5. D-CATALOG-B — a schema-tolerance change only

`#[serde(default)]` on `CatalogRoot::models` is a **schema-tolerance** change. That is the
complete characterisation.

- **What it does:** if the bundled `catalog.json` has no `models` key, parsing yields an
  empty vector instead of aborting the process.
- **What it does not do:** it does not create, imply, approximate, or default any model. It
  asserts **no** model fact. It is not a catalogue entry.
- **Its only effect on behaviour is to move a failure mode:** a hard process abort at boot
  becomes an empty registry. With an empty catalogue the registry is still populated by the
  legacy hard-coded model table and on-disk discovery.
- **`catalog.json` remains authoritative and unpopulated.** It is **3 bytes**: `{}`. Nothing
  was fabricated: no model id, publisher, source URL, licence verdict or text, revision pin,
  byte-exact `size_bytes`, SHA-256, architecture reconciliation, mirror base URL, generator
  procedure, or provenance entry. The ten-item catalog checklist stands at **0 of 9 data
  items closed**.
- **Hashes are never hand-written.** Any future `size_bytes`/SHA-256 must be *computed from
  pinned artifacts*, never authored.
- **No test-only production catalog fixture was created.** It would ship via `include_str!`
  and would attest to untrusted mirrors.
- **ADR-011 (model licensing gate) is untouched and still blocks** release of any model.

## 6. Dependency delta

| Item | State |
|---|---|
| Crates added | `objc2-app-kit 0.3.2`, `objc2-foundation 0.3.2` — **macOS-scoped** (`[target.'cfg(target_os = "macos")'.dependencies]`) |
| `Cargo.lock` | **+2 lines** (both crates added to the `soravo-desktop` dependency list) |
| New packages in the lock graph | **0** — both crates were already locked at `0.3.2` as transitive dependencies; `+name =` count in the lock diff is **0** |
| Versions changed / removed | none |
| Provider secrets, endpoints, keys | **none** |

**Corrected claim (the draft said "Dependencies — none added, removed, or version-changed.
`Cargo.lock` unchanged." That was factually wrong.)** The accurate statement is above.

## 7. Invariants asserted and protected

**I1 — exactly one reachable STT path.** Global shortcut → `handle_shortcut_event` →
`TranscriptionCoordinator` → `actions.rs` → `TranscriptionManager::transcribe` /
`finalize_stream` → the existing transcribe-cpp models. One engine-load function
(`load_model_with_device`); one engine-invocation function (`transcribe`, `:1176`); two
`transcribe` call sites, of which `commands/history.rs:87` is **unreachable** because its
command stays unregistered. Adding a third call site, or registering
`retry_history_entry_transcription`, breaks I1 and requires a new ADR.

**I2 — exactly one text-insertion path carrying dictated text.**
`actions.rs:822` → `utils::paste` → `clipboard::paste` → `paste_via_clipboard` /
`paste_direct` / `paste_tx::try_reliable_paste`, with the v6 §05 snapshot → write → paste →
restore sequence and a `paste-error` event on failure. `injectText()` has **0** `.tsx`
callers. `typing://result` has **0** production subscribers. Any addition of an
`injectText()` caller or a Soravo-side committed/final-text producer is a STOP condition.

**I3 — the two live session state machines remain uncoupled.** After this boot
`TranscriptionCoordinator`'s `CoordinatorState` is live *alongside* the Soravo
`SessionMachine`. Nothing is wired between them. **Disclosed, not a defect fixed here.**
v6 §04 *"No duplicate stacks … Keeping both requires an ADR"* — **this ADR is that record.**
No coupling is authorized.

**I4 — the four model/VAD/microphone asset gates remain external.** The boot makes the app
start and the pipeline live. It does **not** make dictation produce text. A model on disk, a
`selected_model` pointing at it, the Silero VAD asset, and a working microphone are still
required. Live settings confirm all four: `selected_model: ""`, no `resources/` directory,
`"resources"` count **0** in `tauri.conf.json`, no bundled Silero asset. **Dictation does not
work in V1 today, and this ADR does not claim otherwise.**

**I5 — the VAD backend is unchanged.** `vad_backend: Silero` is confirmed live. Switching
the default to Earshot is prohibited.

## 8. Security impact

**Net: no weakening.**

- **CSP** — unchanged. `tauri.conf.json` retains the explicit restrictive policy.
- **Tauri capabilities** — `capabilities/default.json` **unchanged** (11 permissions,
  `windows: ["main"]`). Registering one application-defined command adds **no** new Tauri API
  surface, because `#[tauri::command]` handlers are not gated by capability permissions. This
  is a material benefit of the `+1` minimum: the 120-command option is avoided **by
  construction**.
- **Updater** — removing a plugin registration **removes** an attack-relevant surface (an
  unauthenticated update-fetch path that cannot currently be configured). No endpoint, key,
  or signature material is introduced.
- **Newly active surfaces, disclosed for review** (none is a weakening; each already existed
  in compiled form): a global OS shortcut is installed and becomes user-reachable; four
  long-lived threads become live; microphone access becomes available on demand; six managed
  Tauri states replace two; `HistoryManager::new` runs SQLite migrations synchronously at
  boot against `<app_data>/history.db`; `ModelManager` becomes live and reaches `hf-hub`.
- **Secrets** — none read, printed, written, or required. **Provider mutations: zero.**
- **`unsafe`** — none introduced. Workspace lint posture untouched.
- **Data integrity** — the only filesystem writes are the app-data models/recordings
  directories and the history database, all under the path `portable::app_data_dir` selects.
  `portable::init()` runs first, so a portable install is detected before any of them.
- **Residual risk accepted:** the boot makes a previously-inert runtime live. Its behaviour is
  Handy's, which is the V1-preserved baseline. The security review of that behaviour is the
  pre-existing open item (v6 §21 provenance `UNKNOWN`), not a new one.

## 9. Performance impact

**Targets, not claims.** The benchmark has never been executed. Every startup and memory
figure for the booted state is **`UNKNOWN`** and must be measured.

| Item | Expectation | Basis | Status |
|---|---|---|---|
| Additional time to window | `portable::init` (one `current_exe()` + marker stat) + `CliArgs::parse` + `init_transcribe_backend` + `ModelManager::new` (directory create, catalogue parse, custom-model scan, HF-cache scan, two migrations, download-status pass, auto-select pass) + `HistoryManager::new` (directory create, SQLite open, migrations) + coordinator thread spawn + `initialize_shortcuts` (2 OS registrations) | source-read | **UNMEASURED.** The v6 §16 target *"warm application startup < 2 s"* may need re-baselining now that the boot exists. |
| Memory | `TranscriptionManager` (engine mutex unloaded at boot, `StreamRouter`, four `Arc<AtomicU64>`, idle-watcher handle); `AudioRecordingManager` (recorder slot empty by default, cached-device slot) | source-read | **UNMEASURED** |
| Steady state | idle-watcher ticks every 10 s; Secure Input monitor every 1 s (macOS only) | source-read | **UNMEASURED** |
| No inference in any audio callback | inference happens in the stream worker, not the cpal callback | v6 §05 | **Preserved — unchanged by this ADR** |

**No performance regression is claimed and none can be.** This ADR moves the application from
*not starting* to *starting*.

## 10. Platform verification limitations — stated without hedging

| Target | State | Evidence |
|---|---|---|
| `x86_64-unknown-linux-gnu` | **COMPILED AND LAUNCHED** | local build PASS; CI `desktop` job PASS (9 m 18 s, run `36638028609`); binary launched and survived 15 s with **exit 124**, **0 panics**, **0 `PluginInitialization` errors**; runtime log shows the S3–S10 sequence and *"Shortcuts initialized successfully"*; **0 ERROR / 0 WARN** from Soravo code |
| `aarch64-apple-darwin` / macOS | **`UNKNOWN`** | `rustup target list --installed` → **only** `x86_64-unknown-linux-gnu`. **No CI job compiles macOS.** `release.yml` carries a `macos-latest` matrix but is `workflow_dispatch`-only and **has never been executed**; `gh release list` is empty |
| `x86_64-pc-windows-msvc` / Windows | **`UNKNOWN`** | same. `release.yml` carries a `windows-latest` matrix, `workflow_dispatch`-only, never executed |

**No cross-platform support is claimed.** Both structural breaks (`crate::cli`,
`crate::paste_tx`) are *removed* — but **"removed" is not "verified"**. The honest states are:
`UNKNOWN` by toolchain, `VERIFIED` by source analysis. **Linux launch/runtime evidence is not
macOS or Windows verification and must never be presented as such.**

**Named, bounded, pre-existing uncertainty (not introduced by this ADR):**
`paste_tx/windows.rs` needs `windows::Win32` features that `Cargo.toml`'s `windows = "0.54"`
does not declare. The same undeclared-feature pattern already existed before this ADR in
`managers/audio.rs`, `overlay.rs`, and `utils.rs`. **Unresolvable without a Windows toolchain.**

## 11. Test baseline

**`cargo test -p soravo-desktop --lib --no-fail-fast` → `203 passed; 7 failed; 0 ignored`.**
Confirmed twice: locally and in CI run `36638028609` (job `rust`), with a byte-identical
failure list.

**Why the baseline moved from 188/15 to 203/7 — and why that is not a test rewrite:**

| Change | Tests | Cause |
|---|---|---|
| `paste_tx/` restoration | **+7 passed** | `paste_tx::tests` returned to the suite with the module |
| D-CATALOG-B | **+8 passed, −8 failed** | the catalogue `Lazy` poison disappeared, so 8 previously-poisoned tests now *execute*. T30 §2.3 had already classified them as poison-cascade collateral, not independent defects. |
| **Net** | **+15 passed, −8 failed** | 188/15 → **203/7** |

**No test was added, edited, removed, relocated, ignored, or annotated.** Zero test-file
modifications exist in either commit. The count moved because two of this ADR's *own*
mechanisms changed the suite.

**The invariant that actually protects the suite is not a number — it is the absence of test
edits.** A fixed expected count is a weaker guard than the reason it was proposed.

**`rust` is red by design.** Clearing it by editing a test is wrong.

### 11.1 The exact 7 remaining failures

| Class | Count | Tests |
|---|---|---|
| **1 — missing authoritative model/catalog data** | 2 | `catalog::tests::catalog_parses_and_is_nonempty` (*"bundled catalog should contain models"*); `managers::model::tests::test_discover_catalog_alternate_quant_in_models_dir` (*"catalog has multi-quant models"*) |
| **2 — frozen-V1 transcription expectation disagreement** | 5 | `managers::transcription::tests::` — `auto_language_without_detection_skips_gated_filler_removal`, `ignored_user_language_is_not_output_evidence`, `portuguese_transcription_does_not_use_english_ui_filler_words`, `unknown_evidence_with_confident_text_detection_removes_gated_fillers`, `unknown_evidence_with_portuguese_text_preserves_um` |
| **3 — genuine Soravo defect** | **0** | |
| **4 — build/environment issue** | **0** | |
| **5 — unknown** | **0** | |

The 5 transcription failures are **5 failing output-string assertions and 0 failing
evidence/provenance assertions.** The `resolve_output_language_evidence` ledger is 9 assertions,
9 passing, 0 failing. They are characterisation tests of **live, shipped** behaviour — the
function is on both reachable production paths and is not gated by `post_process_enabled`.

**Their treatment is an open owner decision and this ADR takes no position on it.** It must
not be resolved by editing a test to match current behaviour, because that would convert *"the
product question is open, therefore we stopped"* into *"the current behaviour is the
specification"* and would pin live user-facing data loss as intended behaviour.

**Escalations the owner must see before choosing:**
1. The frozen filler list is **English-only and unconditional**, so the Portuguese article
   **`"um"` is silently deleted** — observed live: `"eu vi um carro"` → `"Eu vi carro."`
2. Normalisation is script-agnostic.
3. One inline comment in the test file is factually false: it claims `'uhm'` is removed
   "regardless", and `"uhm"` is **not** in the set.
4. `OutputLanguageEvidence::TextDetected` is a live branch with zero coverage.
5. These are tests of **live shipped** behaviour, so changing them changes the specification
   of user-visible output.

## 12. Testing obligations — accepted, with two still outstanding

| # | Obligation | State |
|---|---|---|
| T1 | **Boot gate in CI** — launch the built binary and assert it reaches the Tauri runtime without panic (headless-safe via `xvfb-run`). Neither `build` nor `cargo test` nor `pnpm tauri build` ever calls `run()`. | ❌ **OUTSTANDING.** The boot was proved **manually, once, on Linux**. That is real evidence, **not a gate**. |
| T2 | **macOS and Windows build jobs in CI** | ❌ **OUTSTANDING.** `ci.yml` = 4 jobs, **all `ubuntu-latest`**. |
| T3 | Existing batteries not edited to obtain green CI; expected baseline **203 passed / 7 failed** | ✅ held |
| T4 | Static assertions for I1, I2, and the absence of `hotkey.rs` / orphan-crate wiring | ✅ held by inspection; not yet encoded as a CI assertion |
| T5 | First record attempt, model selection, model load, transcription, insertion | ❌ **expected to fail until F7 clears** |
| T6 | Privacy gate: no raw-audio network request, no transcript analytics, no keystroke logging, no clipboard telemetry | ❌ outstanding; the runtime gains an HTTP-capable model path for the first time |
| T7 | No new test written to make the 2 catalogue or 5 transcription tests pass | ✅ held |

**T1 and T2 are the evidence class whose absence let the original defect class survive
T08 → T32-U.** Their absence is why this decision must be treated as a *recorded restoration*,
not as a *verified platform state*.

## 13. Operational obligations — one outstanding

- **`app.tsx:190-200` states** *"Speech recognition, microphone access, global shortcuts, and
  text insertion are deliberately unavailable until their dedicated, testable phases."*
  **That statement became false and has not been corrected.** Clause-by-clause:
  *global shortcuts* — **false**, installed and live; *microphone access* — **partially false /
  misattributed**, the capture manager is constructed and the first attempt stops at the
  VAD/model asset gates; *text insertion* — **partially false / misattributed**, the
  `clipboard::paste` chain is reachable and live; *speech recognition* — **true in effect**,
  but the blocker is **missing authoritative model data**, not phase deferral.
- **This ADR obliges the correction. It is unfulfilled and recorded as such.** It is a
  **UI documentation/state issue, not a UI redesign**, and it was deliberately **not** changed
  under T32-Y, which is documentation/control-plane only.
- **Runbook** — v6 §17 gains one entry: the app is now expected to launch, so a launch failure
  is a regression signal rather than the standing condition.
- **Known V1 gaps to record so they are not later mistaken for regressions:** no tray (F1),
  no overlay (F2), a fixed-default global shortcut the Settings UI cannot change (F5), an
  inert `Pill` "hold to talk" button, first-run failure at VAD/model asset resolution, and a
  deferred (not removed) updater.
- **Release** — unchanged. No packaging, signing, or distribution change.
- **Provider impact: ZERO.**

## 14. Rollback

The change is additive and reversible. Ordered by independence:

| Step | Rollback | Residual |
|---|---|---|
| A1 (updater line) | restore the one line | app panics on launch again |
| A2 (`pub mod cli;`) | remove the one line | `tray.rs:614`'s `crate::cli::CliArgs` no longer resolves |
| A3 (`.setup()`) + A4 (`+1` command) | remove the hook and the registration | the app returns to the pre-ADR state: starts, no Handy runtime, `Pill` inert |
| A5 (D-CATALOG-B) | remove the attribute | the boot aborts again |
| **A6 (`paste_tx/` restore, 3 files)** | **delete the 3 restored files and the `pub mod paste_tx;` line** | **`clipboard`'s existing reference to `paste_tx` no longer resolves — macOS *and* Windows stop compiling.** This row was **absent** from the draft and is added here because A6 was outside the draft's scope. |
| **A7 (2 macOS dependencies)** | **remove the 2 `Cargo.toml` lines and the corresponding 2 `Cargo.lock` lines** | **the restored `paste_tx/macos.rs` no longer compiles.** Also absent from the draft. |

**Rollback preserves payment, entitlement, auth, and schema integrity** — no migration, data,
or provider state is touched. Runtime artifacts created by a booted app (app-data models
directory, `history.db` and its migration chain, settings store file) are **not** removed by
rollback; the history database in particular should be preserved, not deleted. A rollback
re-launch may observe changed settings values, because a booted Handy runtime may rewrite the
versioned settings store. Recorded as an operational note, not a blocker.

## 15. Consequences

**Positive**
1. The application **starts**. This is the precondition for every v6 §02 V1 acceptance
   statement about dictation being true rather than aspirational.
2. Handy's existing, complete, already-reviewed STT architecture becomes the **live** one
   instead of compiled-but-dead code — precisely what ADR-018's preservation rule protects.
3. Exactly one STT path and one text-insertion path, both Handy-derived, both provably
   unchanged (I1, I2).
4. The `+1` command keeps the Tauri trust boundary **unchanged** — strictly better than the
   120-command option.
5. Two previously-silent defects become visible and nameable: the inert `Pill` control, and
   the two-settings-stores divergence (F5).
6. Zero new dependencies in the lock graph, zero data invention, zero Handy behaviour change,
   zero new STT capability, zero capability widening.

**Negative / accepted**
1. **Two live but uncoupled session state machines** (I3) — disclosed, ADR-recorded, not wired.
2. A **fixed-default global shortcut** the Settings UI cannot change (F5).
3. **First-run failure at VAD-asset and model resolution** until F7 clears — honest and
   legible, but user-visible.
4. **No tray, no overlay** (F1, F2) — a visible product gap, correctly deferred rather than
   faked.
5. The **updater capability is deferred, not removed** — recorded so it is not later mistaken
   for "updates were implemented".
6. Four threads and a SQLite migration are part of first launch.
7. Every startup and memory figure for the booted state is `UNKNOWN` and must be measured.
8. **macOS and Windows are unverified.** Two of the three named `primary_platforms` have
   zero PR-time coverage.

**Follow-on obligations created by accepting this ADR**
- ✅ Update `20_ADR_INDEX.md` — **done** (this ADR, single entry, in the index of record).
- ✅ Record the decision as **accepted** rather than as authorizing nothing — **done** (this
  document).
- ❌ Update `app.tsx:190-200` — the in-product "deliberately unavailable" notice is false.
- ❌ Add the T1 boot gate and T2 per-target builds.
- ❌ Record F1–F8 as known gaps in the release runbook.
- ADR-018 remains formally unapproved (pending since T29). This ADR **implements and does not
  weaken** it; both should be ratified together.

## 16. Amendments — corrections to the T32-W draft

The draft is retained unmodified. Each claim it made that is now known to be wrong is
recorded here as wrong. **History is not rewritten.**

| # | Draft location | Draft claim | Corrected | Basis |
|---|---|---|---|---|
| **1** | header `:3`, `:5`; `Status:` `:33`; ratification table `:343-351`; `:353` | `DRAFT — NOT RATIFIED`; *"a proposal for the owner to accept, amend, or reject"*; *"**No implementation is authorized by it**"*; *"**No implementation is authorized until this table is completed**"*; 5 unchecked rows | **ACCEPTED (with recorded amendments).** The implementation it disclaimed is committed and pushed on PR #63. An ADR may not stand as a record that nothing is authorized while what it describes is already merged. | Owner direction, T32-Y; commits `5649411d`, `27200173`; PR #63 head identical to local HEAD |
| **2** | **T3** `:281` | *"`cargo test -p soravo-desktop --lib` must remain **188 passed / 15 failed** with the byte-identical failure set. **Any other number is a regression against this ADR**, because it would mean a test was edited, relocated, ignored, or newly poisoned."* | **203 passed / 7 failed**, caused by the `paste_tx` restore returning 7 of its own tests and by D-CATALOG-B un-poisoning 8 catalogue `Lazy`s — **not** by any test edit. The invariant is **the absence of test edits**, not a fixed count. **As written, T3 would have classified a correct, V1-compliant implementation as a regression.** | §11 |
| **3** | **D7 / D-CATALOG-B** `:184` | *"Turns the 10 catalogue tests green? NO … **the other 9 continue to fail**"* | **2 of 10 remain red** (content-dependent). **8 turned green** because they were `Lazy`-poison collateral, per T30 §2.3. The draft's prediction was wrong. | §11, §5 |
| **4** | **D5.6** `:162` | *"The 10 catalogue tests and 5 transcription tests remain red by design … `D-CATALOG` does **not** turn them green."* | **2 catalogue-content + 5 transcription** remain red. D-CATALOG-B turned **8** green. | §11.1 |
| **5** | **C3** `:69-71` + **Consequences #4** `:320` | C3 names only `crate::cli` as the macOS break; Consequences: *"macOS — a named primary platform — **becomes buildable** (D1.2)."* | C3 was **under-inclusive**: `crate::paste_tx` was a **second** unresolvable path, breaking **macOS *and* Windows**. Both are now structurally removed — but **neither has been compiled**. Buildability is **`UNKNOWN`**, not achieved. | §4, §10 |
| **6** | **Security impact → Dependencies** `:237` | *"**Dependencies** — none added, removed, or version-changed. `Cargo.lock` unchanged."* | **Two macOS-scoped direct deps added** (`objc2-app-kit 0.3.2`, `objc2-foundation 0.3.2`); `Cargo.lock` **+2 lines**. Mitigating verified fact: both were already locked at `0.3.2` as transitive deps; new-package count **0**. | §6 |
| **7** | **Rollback** `:303-308` | 4 rows; *"remove the one line \| **macOS stops compiling again**"* | The row is correct but **incomplete** — the table has **no row** for the `paste_tx` restore or the two dependencies, because neither was in the draft's scope. Two rows added, with their true residuals. | §14 |
| **8** | **Operational impact** `:261` | *"`app.tsx:190-200` … **must be updated as part of the implementation task**"* | **Unfulfilled.** The text is still present and is still false. Recorded as an outstanding obligation and as a **UI documentation/state issue**; deliberately not changed under T32-Y. | §13 |
| **9** | **Testing → T1 / T2** `:273-281` | T1 boot gate; T2 macOS + Windows builds | **Unfulfilled.** No workflow was changed. These are the evidence class whose absence let the defect class survive T08 → T32-U. | §12 |
| **10** | **scope** | — | The draft is **narrower than what shipped**: `paste_tx/` and the two dependencies are **not in its scope at all**. Both are now inside this ADR's scope as A6 and A7. | §2.1 |
| **11** | `PROGRESS.md:2813`, `:3081` described ADR-019 as *"the ratified ADR"* | — | That description was **unfounded at the time** (the ADR was a draft, the index had no entry). It is now **true**, but only because of this acceptance. | §16 amendment 1 |

## 17. Ratification record

| Item | Decision taken | Recorded in |
|---|---|---|
| Accept ADR-019 (as amended here)? | **ACCEPTED** | this document; `20_ADR_INDEX.md` (index of record) |
| `D-CATALOG` | **B** — 1-line schema tolerance; fabricates nothing; `catalog.json` stays authoritative and unpopulated | §2.1 A5, §5 |
| `paste_tx` restoration | **Ratified** as restoration of existing source (byte-identical to `5f56260c`) | §4 |
| The 2 macOS-scoped dependencies | **Ratified** as a mechanical prerequisite of the above | §6 |
| Numbering | **ADR-019**, this pack's sequence. Not the v2 sequence's ADR-019, not spec-v3's ADR-028. | index of record |
| F1–F8 deferrals | **Accepted as deferred** | §2.3 |
| T1 / T2 / `app.tsx` obligations | **Accepted, still outstanding** | §12, §13 |
| macOS / Windows platform verification | **NOT claimed — `UNKNOWN`** | §10 |

---

*Task: T32-Y — documentation/control-plane reconciliation. Authority:
`docs/Soravo_Engineering_Docs_v6/` §00–§21 + `SPEC_MANIFEST.json` + `PROGRESS.md`
(evidence only) + T29/T30/T32-A/T32-I/T32-T/T32-V/T32-W/T32-X + live repository, CI, and
process-launch evidence gathered 2026-09-30 on `t31/soravo-wrapper-completion` @ `27200173`.
Supersedes: `T32-W-ADR-019-HANDY-RUNTIME-RESTORATION-DRAFT.md` (retained unmodified as
history).*
