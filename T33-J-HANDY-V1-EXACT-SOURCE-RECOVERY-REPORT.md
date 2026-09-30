# T33-J — HANDY V1 EXACT-SOURCE RECOVERY — REPORT

**Task:** T33-J — HANDY V1 EXACT-SOURCE RECOVERY
**Type:** STOP-gated implementation. Restored accidentally omitted Handy
transcription-support source from the verified upstream pin. No fresh fork.
No broad upstream merge. No `main`/`latest`.
**Date:** 2026-09-30
**Branch:** `t31/soravo-wrapper-completion` @ `d7a34203` (start; 0/0 vs origin
at session start for the tracked tree)
**Upstream:** `https://github.com/cjpais/Handy` @
`ba10ce1943ef34e93c09494027fc0b9ced2e8a44` (short `ba10ce19`,
2026-09-15T05:29:06Z). No other ref consulted. No `main`/`29bd2c0d` code taken.
**Verdict:** RECOVERY COMPLETE — transcription source restored byte-identical;
catalog deliberately NOT restored (ADR-019 `D-CATALOG = B` in force).

---

## 0. Reading gate — completed in the mandated order

1. Canonical v6 pack (`docs/Soravo_Engineering_Docs_v6/`, manifest order 00–21 +
   `DESIGN.md` + `SPEC_MANIFEST.json`, as reconciled by T33-I) — read in full.
2. `PROGRESS.md` in full (4,718 lines through the T33-I follow-up entry).
3. Fresh Git/PR/CI audit this session (HEAD `d7a34203`, PR #63 OPEN/BLOCKED,
   CI `36657041713` rust FAIL `203/7`, Security Audit SUCCESS).
4. T33-I (`PROGRESS.md` §T33-I, the authority for the pin of record
   `ba10ce19` and the RESTORE-NOT-REFORK rule) and all three T33 Handy recovery
   reports (`T33-HANDY-DIVERGENCE-FORENSIC-001`,
   `T33-HANDY-INTEGRATION-ORIGIN-002`, `T33-HANDY-RECOVERY-PLAN-003`).
5. T32-I (failure/catalog decision), T32-Y ADR-019 ACCEPTED
   (`D-CATALOG = B`: schema tolerance only; `catalog.json` stays authoritative
   and unpopulated).

No prior report's conclusion was accepted on report; every provenance fact
below was re-derived first-hand from the local `cjpais/Handy` clone and Git
object inspection.

---

## 1. Source-recovery manifest (produced BEFORE any edit)

| # | Soravo current path | Upstream path @ `ba10ce19` | Upstream blob SHA | Soravo blob SHA (pre-change) | Byte equality | Exact import/adaptation commit if known | Classification | Required dependency changes | Restoration changes Handy behavior or merely restores missing source? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `apps/desktop/src-tauri/src/audio_toolkit/text.rs` | `src-tauri/src/audio_toolkit/text.rs` | `82d45b5aced133ae5424365a707017cbf69cff98` | — (absent; `ls` fails; 0 of 84 refs ever held it per T33-002) | N/A — file absent | Never imported. Omitted in `5f56260c` (2026-09-21); compilability papered over in `fc56c31b` (2026-09-28) by a substitute | B HANDY-DIVERGENCE (omission) | `regex = "1"`, `strsim = "0.11.0"`, `natural = "0.5.0"` (pin-exact, upstream `Cargo.toml:66-68`) | **Merely restores missing source.** The mechanism (two-tier fillers, `OutputLanguageEvidence`, stutter/whitespace normalization, n-gram+Soundex custom words) is upstream's own. Live output changes only because the Soravo substitute it displaces was divergent. |
| 2 | `apps/desktop/src-tauri/src/audio_toolkit/lang_id.rs` | `src-tauri/src/audio_toolkit/lang_id.rs` | `82834bdb7eb2196664fa999774c4678cb2c8534b` | — (absent; 0 refs) | N/A — file absent | Same omission as #1 | B HANDY-DIVERGENCE (omission) | `whatlang = "0.16"`, `isolang = "2"` (pin-exact, upstream `Cargo.toml:71-72` + comment) | **Merely restores missing source.** Sole definition site of `detect_output_language`; confidence-gated (`is_reliable && >= 0.9`), fail-closed. REQUIRED, not optional: `text.rs` does not define the symbol and tests #4/#6 cannot pass without it (verified: 0 occurrences of `detect_output_language` in pin `text.rs`). |
| 3 | `apps/desktop/src-tauri/src/audio_toolkit/mod.rs` | `src-tauri/src/audio_toolkit/mod.rs` | `60e0c9edb4d60db9371fa45523de4e446936c2bc` | `bf30f481fdc5c81a4f66a0e6cf7169901d8258b9` | DIFFERING (expected — Soravo glue) | Soravo shim; `pub mod post_process` + 4-line re-export added in `6324dc59` (2026-09-29) | D SORAVO-INTEGRATION-GLUE | None (wiring only) | **Neither.** Surgical re-point only: `pub mod post_process` → `pub mod lang_id; pub mod text;`, one `pub use post_process::{…}` block → upstream's two `pub use` lines. All Soravo re-exports (`soravo_audio::vad`, `wav`, `audio`, `get_cpal_host`) preserved verbatim. Upstream `mod.rs` NOT copied wholesale (its `audio::{read_wav_samples…}` and `vad::{…}` re-exports would collide with Soravo's `wav`/`soravo_audio` modules — per T33-003 §R-7 warning, heeded). |
| 4 | `apps/desktop/src-tauri/src/catalog/catalog.json` | `src-tauri/src/catalog/catalog.json` | `64fc3482a8c7ff8b0a053a043e789b22113045ec` | `0967ef424bce6791893e9a57bb952f80fd536e93` (`{}` + newline, 3 bytes, sha256 `ca3d163b…`) | DIFFERING — **deliberately left differing** | Created `{}` in `a156c8c9` (2026-09-22); 3 bytes in every commit since | B HANDY-DIVERGENCE (data omission) | None | **NOT RESTORED in this task.** Pinned blob PROVEN byte-exact (127,334 bytes, §2) but restoration is NOT authorized: ADR-019 `D-CATALOG = B` (accepted, in force) holds `catalog.json` authoritative and unpopulated, and T28 §7 is 0/9 with ADR-011 still blocking (1× `cc-by-nc-4.0`, 7× `other`). Source restoration and model licensing are separate gates; this task restores source only. The 2 catalog test failures therefore REMAIN and are pre-declared (§6). |
| 5 | `apps/desktop/src-tauri/Cargo.toml` (+ `Cargo.lock`) | `src-tauri/Cargo.toml:66-72` | N/A (manifest, not blob-compared) | Pre-change: only `once_cell = "1"` of the six present; `regex`/`strsim` in lock (transitive) but undeclared; `natural`/`whatlang`/`isolang` absent from lock | N/A | N/A | D (dependency-port adaptation) | Exactly 5 added lines, pin-exact strings: `isolang = "2"`, `natural = "0.5.0"`, `regex = "1"`, `strsim = "0.11.0"`, `whatlang = "0.16"` | **Neither.** Dependencies, not behavior. Smallest delta: no versions invented, no bumps, `once_cell` untouched (already present). |

Deleted as the inseparable removal half of #1/#2: `audio_toolkit/post_process.rs`
(280 L, blob `c98a5b4e…`, 100% `fc56c31b`, no upstream counterpart at any ref —
upstream path returns 404). Its 5 Soravo-authored tests die with it (2 of them
assert the divergent behavior the preserved upstream tests contradict). No
Soravo product contract lived in the file. Deletion before #1/#2 would not
compile; deletion after is dead-code removal required by the no-duplicate-stacks
rule. The unrelated Handy LLM `post_process_*` settings/actions feature
(`settings.rs`, `actions.rs`, `shortcut/*`) is untouched — only the
`audio_toolkit` module of that name is removed.

NOT restored (parity-only, deferred per T33-003): `utils.rs` (10 L),
`constants.rs` (1 L), `scripts/gen_catalog.py` (301 L), `memory.rs`,
`macos_permissions` plugin, tray i18n. None affects the 7 failures.

---

## 2. Catalog proof (bytes verified, file NOT restored)

```
$ git -C handy-upstream cat-file -s ba10ce19:src-tauri/src/catalog/catalog.json
127334
$ git -C handy-upstream rev-parse ba10ce19:src-tauri/src/catalog/catalog.json
64fc3482a8c7ff8b0a053a043e789b22113045ec   (identical at main 29bd2c0d)
$ cat apps/desktop/src-tauri/src/catalog/catalog.json   →   {}   (3 bytes, unchanged)
```

The pinned Handy catalog blob IS exactly the expected 127,334-byte upstream
file. Restoration is NOT authorized by any existing owner decision (ADR-019
`D-CATALOG = B` expressly holds it unpopulated), so the exact upstream bytes
were NOT written. No model id, hash, URL, licence, quant, mirror, or
provenance was generated, synthesized, modified, or claimed releasable. No
model-license claim is made from anything in this task.

---

## 3. Tests — pre-change baseline (recorded before modification)

```
cargo test -p soravo-desktop --lib --no-fail-fast
→ test result: FAILED. 203 passed; 7 failed; 0 ignored
```

Exact seven failures with exact failure output:

| # | Test | Output |
|---|---|---|
| 1 | `catalog::tests::catalog_parses_and_is_nonempty` (`catalog/mod.rs:227`) | `bundled catalog should contain models` |
| 2 | `managers::model::tests::test_discover_catalog_alternate_quant_in_models_dir` (`managers/model.rs:2986`) | `catalog has multi-quant models` |
| 3 | `managers::transcription::tests::portuguese_transcription_does_not_use_english_ui_filler_words` (`:2281`) | left `"Eu vi carro."` / right `"eu vi um carro"` |
| 4 | `managers::transcription::tests::auto_language_without_detection_skips_gated_filler_removal` (`:2320`) | left `"Uhm ok."` / right `"um ok"` |
| 5 | `managers::transcription::tests::unknown_evidence_with_confident_text_detection_removes_gated_fillers` (`:2339`) | left `"The weather forecast said … weekend."` / right `"so the weather forecast said … weekend."` |
| 6 | `managers::transcription::tests::unknown_evidence_with_portuguese_text_preserves_um` (`:2360`) | left `"Eu vi carro na rua ontem … mercado."` / right `"eu vi um carro na rua ontem … mercado."` |
| 7 | `managers::transcription::tests::ignored_user_language_is_not_output_evidence` (`:2445`) | left `"Eu vi carro."` / right `"eu vi um carro"` |

Byte-identical to CI run `36657041713` and to the T33-001/002/003 inventories.

---

## 4. Change set (authorized recovery only)

| File | Action | Provenance proof (post-change) |
|---|---|---|
| `apps/desktop/src-tauri/src/audio_toolkit/text.rs` (ADD) | Byte-copy from pin | `git hash-object` = `82d45b5aced133ae5424365a707017cbf69cff98` = pin blob; 29,496 B / 828 L |
| `apps/desktop/src-tauri/src/audio_toolkit/lang_id.rs` (ADD) | Byte-copy from pin | `git hash-object` = `82834bdb7eb2196664fa999774c4678cb2c8534b` = pin blob; 6,685 B / 170 L |
| `apps/desktop/src-tauri/src/audio_toolkit/mod.rs` (EDIT) | Surgical re-point + `cargo fmt` ordering | Diff: `post_process` mod + 1 re-export block → `lang_id`/`text` mods + 2 upstream re-export lines; all Soravo re-exports preserved |
| `apps/desktop/src-tauri/src/audio_toolkit/post_process.rs` (DELETE) | `git rm` (no upstream counterpart) | Gone; zero `audio_toolkit.*post_process` references remain (`grep` CLEAN) |
| `apps/desktop/src-tauri/Cargo.toml` (EDIT) | +5 dependency lines, pin-exact | Diff shows only the 5 lines; nothing else touched |
| `Cargo.lock` (UPDATE) | `cargo` lockfile resolution | +9 entries: 3 direct (`isolang`, `natural`, `whatlang`) + 6 transitive (`ahash`, `allocator-api2`, `hashbrown`, `phf`, `phf_shared`, `rust-stemmers`); zero removals/bumps |
| `apps/desktop/src-tauri/src/managers/transcription.rs` | **UNTOUCHED** (`git diff` empty) | Caller was already correct; any edit would introduce divergence |
| `apps/desktop/src-tauri/src/catalog/catalog.json` | **UNTOUCHED** (still `{}`) | Per §2 |
| Every test file | **UNTOUCHED** (`git diff --name-only | grep -i test` empty) | No test added/edited/removed/relocated/ignored/annotated |

---

## 5. Tests — post-restoration results

| Scope | Result |
|---|---|
| Affected transcription tests (`cargo test -p soravo-desktop --lib managers::transcription`) | **18 passed; 0 failed** — all 5 previously failing now pass, unedited |
| Affected catalog tests (`… --lib catalog`) | 6 passed; **2 failed** — the 2 pre-declared catalog-content failures (file still `{}` per ADR-019); every name matches the baseline |
| Complete desktop Rust library suite (`… --lib --no-fail-fast`) | **254 passed; 2 failed; 0 ignored** — failures are exactly baseline #1–#2; **0 new failures, 0 regressions, every failure name accounted for** |
| Count reconciliation | 203→254 passed (+51 = −5 removed Soravo tests +43 upstream `text.rs` +8 upstream `lang_id` +5 fixed); 210→256 total (+46 = −5 +51); matches the T33-003 prediction exactly |
| `git diff --check` | exit 0 |
| `cargo fmt --all -- --check` | pass |
| `cargo clippy -p soravo-desktop --all-targets -- -D warnings` | pass, exit 0 |
| `cargo audit` | 7 warnings, ALL pre-existing (`gtk-layer-shell`, `number_prefix`, `paste`, `proc-macro-error`, `glib`, `memmap2`) — **zero from `natural`/`whatlang`/`isolang`/`strsim`/`regex`** |
| `cargo deny check` | **advisories ok, bans ok, licenses ok, sources ok** |

---

## 6. Transcription-rule compliance (single STT path)

- Handy transcription implementation in use (`managers/transcription.rs` +
  restored `text.rs`/`lang_id.rs`) remains the **single STT path**. `crates/stt`
  untouched and still inert (desktop `Cargo.toml` depends only on
  `soravo-audio/config/hotkeys/typing`).
- No second STT stack created (the substitute was deleted, not duplicated).
- No Soravo `post_process.rs` replacement behavior remains in the restored
  responsibility (file deleted; LLM `post_process_*` feature elsewhere is
  Handy's own and untouched).
- No language-specific Portuguese workaround — the upstream gating mechanism
  was restored; `pt` preservation falls out of `_ => &[]`.
- No filler-word list change, no normalization change, no punctuation/
  capitalization added (all are upstream's own, restored verbatim).
- No Handy test rewritten; committed/final transcript path untouched;
  `injectText()` has no new caller (definition in `ipc.ts` + pre-existing test
  caller only; no frontend transcript consumer added); no second insertion path.

---

## 7. Success criteria (all 12)

1. ✅ `text.rs`/`lang_id.rs` byte-identical to pin (§4 proofs).
2. ✅ `transcription.rs` unchanged (`git diff` empty).
3. ✅ No Soravo post-processing in the restored responsibility (§4, §6).
4. ✅ No second STT path (§6).
5. ✅ No second insertion path (§6).
6. ✅ V1 IPC infrastructure untouched (no IPC file in the change set).
7. ✅ Catalog NOT restored — criterion holds vacuously as the authorized
   subset: no catalog bytes were to be restored under ADR-019, and none were.
8. ✅ No model-license claim made (§2).
9. ✅ No test file changed (§4).
10. ✅ No unrelated dependency churn (5 lines + lockfile minimum, §4).
11. ✅ CI failure delta fully explained: 7→2; the 5 fixed are the RC-1
    transcription set; the 2 remaining are the RC-2 catalog set, gated by
    ADR-019 `D-CATALOG = B` (owner decision O-2 still open).
12. ✅ `git diff --check` passes.

---

## 8. STOP conditions (none triggered)

| Condition | Assessment |
|---|---|
| Upstream blob cannot be reproduced | NOT TRIGGERED — all four blobs reproduced (§1, §4) |
| Dependency provenance uncertain | NOT TRIGGERED — pin-exact versions; `deny` green; zero new advisories |
| Model licensing entangled with source restoration | NOT TRIGGERED — catalog untouched; gates kept separate (§2) |
| Restoration would require modifying Handy behavior | NOT TRIGGERED — pure byte-restoration; `transcription.rs` untouched |
| Restoration would require a second STT path | NOT TRIGGERED — single path preserved (§6) |
| Tests need rewriting | NOT TRIGGERED — zero test files touched; preserved tests pass as written |
| Architecture decision discovered | NOT TRIGGERED — no new ADR trigger; ADR-019 left in force |

---

## 9. Explicit non-goals (not done in this task)

Catalog licensing, model selection, macOS/Windows builds, UI truthfulness,
release work, `utils.rs`/`constants.rs`/`gen_catalog.py` parity, `#[serde(default)]`
revert (ratified ADR-019 line — left alone), `macos_permissions` restoration,
tray i18n, `memory.rs`, merge of PR #63.

---

## 10. Commit / push / CI

*Recorded after the fact per implementation discipline.*

- **Commit:** `TBD` (this report + `PROGRESS.md` entry + the 6-path recovery
  change set; no untracked `T*.md`/misc paths staged).
- **Push:** `TBD`.
- **CI:** `TBD` — expected: `rust` FAIL with exactly the 2 pre-declared
  catalog failures (ADR-019-gated), all other jobs green; `203/7 → 254/2`
  is the correct, fully explained delta.

**STOP. T33-J implementation is complete. Catalog licensing (GATE-3b/O-2),
the 2 remaining catalog failures, and everything in §9 are NOT this task.**
