# T34 — HANDY CURRENT-MAIN DELTA AUDIT (FORENSIC, NO IMPLEMENTATION)

**Task:** T34 — HANDY CURRENT-MAIN DELTA AUDIT (HANDY-REUSE-FIRST / NO-REINVENTION FORENSICS)
**Type:** Forensic/decision preparation. NO source, test, config, workflow, manifest,
lockfile, catalog, ADR, or UI file was modified by this task (report + PROGRESS only).
**Date:** 2026-10-03 (UTC)
**Branch:** `t31/soravo-wrapper-completion`
**HEAD (audit ref):** `3c7dcfcfb41b70a090b96b9df3c43bedfa9d91c7`
**`origin/main`:** `ede495b55efd95cedd882d90a19d12b4777da852` (branch 54 ahead / 0 behind — PR #63 branch)
**PR #63:** OPEN, head `3c7dcfcf` == local HEAD, mergeable `MERGEABLE`.
Required checks (branch protection): `web`, `e2e`, `rust`, `desktop`.
Latest CI (2026-10-02T21:47:26Z): `cargo-audit` FAIL, `rust` FAIL, `cargo-deny`/`desktop`/all-3-desktop-builds/`e2e`/`npm-audit`/`web` PASS.
**Status:** AUDIT COMPLETE — STOP. No implementation. PR #63 not merged. No force-push.

**Source changes made by this task: NONE (implementation).**
**Files created:** `T34-HANDY-CURRENT-MAIN-DELTA-AUDIT-REPORT.md` (this document).
**Files updated:** `PROGRESS.md` (T34 entry appended only; no historical entry rewritten).

---

## 0. Skill Selection Gate (executed BEFORE planning)

Installed skills inventoried via `~/.agents/skills/` (33 entries). Relevance scan for
Rust / Handy-source forensics / Git-GitHub / desktop-Tauri / transcription-STT /
model management / security / supply-chain-dependency:

| Skill | Why selected | Loaded |
|---|---|---|
| `rust-engineer` | Rust ownership/trait/error/clippy discipline for reading `actions.rs`, `transcription.rs`, `text.rs`, `shortcut/*`, `lib.rs` diffs | ✅ full body |
| `rust-review` | `unsafe`/FFI/memory-safety lens on shortcut/validator + transcribe-cpp dep delta | ✅ summary S338 |
| `github` | `gh pr checks / gh run list / gh api` workflows for PR #63 + CI forensics | ✅ full body |
| `gh-cli` | Authenticated-`gh`-over-curl rule for all GitHub reads | ✅ full body |
| `tauri` | Tauri v2 global-shortcut registration/parse semantics (`#2158`), startup path (`#2160`) | ✅ full body |
| `security-guidance` | OWASP ASVS lens on shortcut-parse hardening + clipboard/history trust boundary | ✅ summary S339 |
| `supply-chain-risk-auditor` | `transcribe-cpp 0.2.3 → 0.2.4` dependency-bump judgment (collector not run — registry fetch out of scope for a forensic read; version/checksum evidence taken from the Handy diff itself) | ✅ full body |
| `semgrep` | SAST-scan workflow knowledge (no scan run — this task is read-only forensics; reported as not executed) | ✅ full body |

Considered but declined: `tauri-development`, `tauri-setup` (scaffolding/setup, not
forensics); `codeql`, `agent-security-audit`, `mcp-server-review` (no agent/MCP surface
in the delta); `playwright`, `frontend-*`, `react`, `shadcn`, `vitest` (frontend deltas
are classified IRRELEVANT/DEFERRED per §15 without needing deep UI skill work);
`supabase*`, `cloudflare*`, `wrangler`, `workers-best-practices` (platform layer
untouched by the Handy delta); `securability-engineering`, `secure-workflow-guide`
(smart-contract oriented); `find-skills` (no skill gap requiring install).
Missing specialist skills: none — no STT/transcription-model-management skill exists
in the installed set; transcription forensics was done by direct source inspection
(recorded as a gap, not a substitution).

Every claim below was derived first-hand from `git` object inspection of a local
Handy clone (`/tmp/handy-delta`, remote `https://github.com/cjpais/Handy.git`)
and from the Soravo working tree. No prior report's conclusion was accepted on report.

---

## 1. Both Handy references (re-verified, not assumed)

| Reference | SHA | Verified how |
|---|---|---|
| Soravo frozen Handy pin | `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` (2026-09-15T05:29:06Z) | v6 `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` pin of record; fetched from upstream and used as diff base |
| Current Handy main | `5ec58f696354fcf64ae831102e673779e0249717` (2026-10-02) | `git ls-remote https://github.com/cjpais/Handy.git HEAD` at task start |

Exact delta: **19 commits** (`git log --oneline pin..main | wc -l` = 19 — the
"approximately 19" from the previous audit is confirmed exact).

```
5ec58f69 Update PULL_REQUEST_TEMPLATE.md                                    2026-10-02
340defbc Update PULL_REQUEST_TEMPLATE.md                                    2026-10-02
29bd2c0d fix: list compute devices off the startup path (#2160)              2026-09-28
f5c27e69 fix: reject shortcuts the Tauri backend cannot parse (#2158)       2026-09-27
eea1f5f4 fix: don't start recording when no model can transcribe it (#2161) 2026-09-27
eb49dc02 fix: keep the sentence capital after removing a leading filler (#2157) 2026-09-27
2d526b15 bump to transcribe-cpp-0.2.4 (#2147)                               2026-09-28
8ef8dd43 fix: stop removing "Ha" as an English filler word (#2156)           2026-09-27
8f9cf53c docs: restore the recording indicator on Omarchy with native Wayland (#2040) 2026-09-19
141f981d fix: emit parseable names for compound shortcut keys (#1862)       2026-09-19
496a80cc fix(history): show copy success only after clipboard write (#2011) 2026-09-19
a6eed754 fix(shortcut): reject unknown reset binding IDs (#2033)            2026-09-19
7c31572d fix: reset settings scroll position when switching sections (#2082) 2026-09-19
dc5bdc9d fix: unload model after recordings with no audio (#2106)           2026-09-19
05e0aedd release 0.9.7                                                      2026-09-18
69175114 add canty sponsor                                                   2026-09-18
055c7a5e Update README.md                                                   2026-09-18
53766a27 Update README.md                                                   2026-09-18
53c55d70 slim readme                                                        2026-09-18
```

Full file delta (47 paths): 8× `src-tauri` Rust + `Cargo.toml`/`Cargo.lock` +
`tauri.conf.json`, `src/App.tsx`, `HistorySettings.tsx`, new `clipboard.ts` +
`clipboard.test.ts`, `keyboard.ts` rework + `keyboard.test.ts`, 29× i18n
`translation.json` (one `copyError` key each), `package.json` (`test:keyboard`
script + 0.9.7), `code-quality.yml` (keyboard test step), README/sponsor/PR-template.

---

## 2. Functional-change forensics (source-level evidence)

### 2.1 Model-availability guard — `eea1f5f4` (#2161) ⚠️ FOCUS ITEM

Handy `src-tauri/src/actions.rs` (`TranscribeAction::start`): after the model-load
kickoff, before tray/overlay/microphone —
```rust
// Don't open the mic if nothing can transcribe the recording; the load
// kicked off above fails and reports why.
if !tm.is_model_loaded() {
    let selected_model = get_settings(app).selected_model;
    if let Err(e) = app.state::<Arc<ModelManager>>().get_model_path(&selected_model) {
        warn!("Not starting recording: no model can transcribe it ({})", e);
        return;
    }
}
```
Condition checked: no model loaded AND selected-model files not on disk
(`none selected | not downloaded | files deleted`). Interaction: early return
before `set_tray_state(Recording)`, overlay, and capture; coordinator stays idle;
the already-kicked-off load fails and reports via the existing "Failed to load
model" toast. A loaded model keeps working even if its files moved (commit body).

Soravo state: **ABSENT**. `grep` for `Don't open the mic|no model can transcribe`
in `apps/desktop/src-tauri/src/actions.rs` returns nothing; the Soravo
pre-recording path (`actions.rs:470-531`) is Soravo-adapted — `initiate_model_load`
kickoff, then `model_supports_streaming` capability gate → `VadPolicy` select →
`start_stream` → overlay sizing. Soravo has `is_model_loaded()` and
`get_model_path()` (used in `commands/transcription.rs`, `tray.rs`,
`managers/transcription.rs:462`) but no pre-mic availability gate.
Integration point differs (Soravo `SessionMachine` Idle→Starting + streaming/VAD
planning sit between kickoff and capture), so the exact Handy hunk cannot land
unchanged — the check must be placed relative to Soravo's session transition.
**Classification: MINIMAL ADAPTATION CANDIDATE** (agent-executable; queue T34-C).
Relevance to the incomplete selected-model/runtime-asset gate: direct — this is
the upstream fix for the same class of defect.

### 2.2 Transcription/text-processing — `eb49dc02` (#2157) + `8ef8dd43` (#2156) ⚠️ FOCUS ITEMS

`8ef8dd43`: `gated_filler_words_for_language` en-list `&["um","ah","eh","ha"]` →
`&["um","ah","eh"]` (Spanish "ha" = "has" was being eaten as an English filler).
`eb49dc02`: new `opens_sentence` / `push_restoring_capital` /
`remove_filler_matches` — a capitalized sentence-opening filler hands its capital
to the replacement word ("Um, so I think" → "So I think", not "so I think");
`remove_filler_words` loop now calls `remove_filler_matches` instead of
`pattern.replace_all`; two existing test expectations updated
(`"this is a test"` → `"This is a test"`, `"so I was,"` → `"So I was,"`) + one new
test `test_filter_leading_filler_keeps_sentence_capital`.

Soravo state: **OLD BEHAVIOR PRESENT, byte-identical to the pin.**
`sha256sum` of `apps/desktop/src-tauri/src/audio_toolkit/text.rs` =
`7d341440…410941` = identical to `git show ba10ce19:...text.rs`. Soravo still has
`"ha"` in the en-list (line 316) and no `remove_filler_matches`/`opens_sentence`;
Soravo test at line 509 still asserts the OLD `"this is a test"`, line 537 the OLD
`"so I was, thinking about this"`. (T33-J restored the pin-exact file; these two
Handy commits landed after the pin.)
Both change user-visible transcription semantics → per task §8 and v6 §04 V1
preservation rule (filler-word/normalization/STT-output behavior frozen),
**Classification: OWNER/ADR REQUIRED** (queue T34-D). Exact bytes available;
no silent adoption. Test expectations would also change, which needs the same
authorization (Handy tests are integrity witnesses, not to be rewritten casually).

### 2.3 Shortcuts — `f5c27e69` (#2158) + `141f981d` (#1862) ⚠️ FOCUS ITEM

`f5c27e69` (`shortcut/tauri_impl.rs::validate_shortcut`): after the modifier/name
checks, `raw.parse::<Shortcut>()` so side-specific chords the handy-keys recorder
saves (`option_left+space`, `ctrl_right+space`) are REJECTED at validation (a
carried-over binding resets to default instead of failing to register); +2 tests.
Soravo state: **ABSENT** — `apps/desktop/src-tauri/src/shortcut/tauri_impl.rs:55-70`
is the OLD two-branch form with no `parse::<Shortcut>()` check.
**Classification: EXACT REUSE CANDIDATE** (queue T34-A; the hunk is backend-only,
no Soravo contract touches it).
`141f981d` (compound key names `scrolllock/capslock/numlock/pageup/pagedown/
printscreen` parseable on both backends): backend test
`compound_shortcut_keys_parse_on_both_backends` is **ALREADY PRESENT** in Soravo
`shortcut/mod.rs:1413`; the frontend half (`keyboard.ts` token rework +
`keyboard.test.ts`) has **no Soravo counterpart** (no `keyboard.ts` exists under
`apps/desktop/src/`; `shortcut-settings.tsx` contains no capslock/pageup refs;
frontend restructured to lowercase `app.tsx`). Frontend half: **IRRELEVANT**
(no-counterpart; revisit only if/when a key-name tokenizer is built).

### 2.4 Startup/performance — `29bd2c0d` (#2160) ⚠️ FOCUS ITEM

Before: `init_transcribe_backend()` listed `transcribe_compute_devices()` inline to
log them — the first listing opens the GPU (macOS: loads ggml's Metal library,
compiled from source when the shader cache misses = first launch after
install/update). After: new `report_compute_devices()` holds the logging; both
call sites (`run()` startup path, background pre-warm thread for
`get_available_accelerators`) call it off the startup path; a model load that
comes first waits on the same one-time compile.
Soravo state: **ABSENT** — `apps/desktop/src-tauri/src/managers/transcription.rs:
1880-1905` still logs devices inline inside `init_transcribe_backend`; no
`report_compute_devices` symbol anywhere; Soravo `lib.rs` is an 81-line module
shim (Soravo-owned entry, no background pre-warm thread — startup orchestration
lives elsewhere). Safe to inherit (logging-only move, no behavior contract);
integration point needs locating Soravo's actual startup caller.
**Classification: MINIMAL ADAPTATION CANDIDATE** (queue T34-B). No Soravo-owned
startup contract conflict found (Apple Intelligence bridge ADR-025 and ORT
provisioning ADR-026 touch build/link, not this logging path).

### 2.5 Dependency delta — `2d526b15` (#2147) + version bumps

`transcribe-cpp` / `transcribe-cpp-sys` `0.2.3 → 0.2.4` in all four
`Cargo.toml` target tables + `Cargo.lock` checksums
(`b405c121…` → `8afa3f82…`, `00e81030…` → `1c6946c7…`). Commit body is a bare
bump (no rationale text beyond the version). Soravo state: **OLD** —
`apps/desktop/src-tauri/Cargo.toml:68` declares `version = "0.2"` resolving to
locked `0.2.3` (`Cargo.lock: transcribe-cpp 0.2.3`). Impact surface: all four
platforms (Windows x86_64/aarch64 dynamic/vulkan, macOS metal, Linux
dynamic/vulkan), ORT-adjacent native backend, security audit (`cargo-audit`
currently FAIL on PR #63 — must be re-checked post-bump), licensing (same crate,
patch bump — low risk but unreviewed). Per v6 §04 dependency rule + task §11,
a transcribe dependency change is a supply-chain decision, never silent.
**Classification: OWNER/ADR REQUIRED** (queue T34-E; precedent: ADR-020/023 for
`windows`-crate alignment). `handy 0.9.6 → 0.9.7` + `tauri.conf.json` version:
**IRRELEVANT** (Soravo release identity is Soravo-owned; Soravo versions `0.1.0`).

### 2.6 Already-present in Soravo (no action)

| Handy commit | Soravo evidence |
|---|---|
| `dc5bdc9d` (#2106) unload-after-no-audio (`FinishGuard(AppHandle, Arc<TM>)` + `maybe_unload_immediately`) | PRESENT — `actions.rs:37-44,672`, `managers/transcription.rs:459` |
| `a6eed754` (#2033) `get_stored_binding → Result` + 2 tests | PRESENT — `settings.rs:1223`, `shortcut/mod.rs:227`, tests `:1249,:1258` |
| `141f981d` backend test | PRESENT — `shortcut/mod.rs:1413` |

### 2.7 Irrelevant / no-counterpart (no action)

README/sponsor/README-slim (4 commits), PR-template ×2, release 0.9.7 marker,
Omarchy Wayland doc (`8f9cf53c`), `App.tsx` settings-scroll reset (`7c31572d` —
Soravo frontend restructured; UI overhaul deferred per §15),
`HistorySettings.tsx` clipboard refactor + `clipboard.ts`/`clipboard.test.ts` +
`copyError` i18n ×29 (Soravo has NO history UI: `components/settings/` holds only
general/microphone/model/settings-layout/shortcut — no history component),
`keyboard.ts` rework + `keyboard.test.ts`, `code-quality.yml` `test:keyboard` step
(no `keyboard.ts` to test), `package.json` version/script.

---

## 3. Soravo duplication / boundary check (§13–14)

No duplicate STT stack found: `post_process.rs` (the Soravo-authored substitute)
was deleted in T33-J (`12b569fa`); `audio_toolkit/` now holds pin-exact
`text.rs` + `lang_id.rs`. No second desktop implementation would be created by
any queued item. Soravo-owned boundaries preserved and untouched by every
candidate: `session.rs` state machine (Idle→Starting→…), transcript/session
semantics, typed IPC (`ipc.ts`, `commands/`, `events.rs`), account/auth/Supabase/
entitlement/payment/Razorpay, `catalog.json` policy (ADR-019 `D-CATALOG = B` —
catalog stays `{}`; no catalog change is queued), branding, release policy.
`transcription.rs` differs from the pin by Soravo adaptation (session integration)
— expected per the 7-file adaptation surface, not a defect signal.

---

## 4. Classification table (§16)

| Handy commit | File | Change | Soravo state | Classification |
|---|---|---|---|---|
| `f5c27e69` (#2158) | `shortcut/tauri_impl.rs` | reject Tauri-unparseable chords (`option_left+space`) | OLD validator, no parse check | EXACT REUSE CANDIDATE |
| `eea1f5f4` (#2161) | `actions.rs` | no-mic-when-no-model guard | absent; Soravo pre-record path adapted | MINIMAL ADAPTATION CANDIDATE |
| `29bd2c0d` (#2160) | `managers/transcription.rs`, `lib.rs` | compute-device listing off startup path | absent; old inline logging | MINIMAL ADAPTATION CANDIDATE |
| `eb49dc02` (#2157) | `audio_toolkit/text.rs` | capital-preserving filler removal + test updates | pin-identical OLD file+tests | OWNER/ADR REQUIRED |
| `8ef8dd43` (#2156) | `audio_toolkit/text.rs` | drop "Ha" from en fillers | pin-identical OLD (`"ha"` present) | OWNER/ADR REQUIRED |
| `2d526b15` (#2147) | `Cargo.toml`, `Cargo.lock` | transcribe-cpp(-sys) 0.2.3→0.2.4 | locked at 0.2.3 | OWNER/ADR REQUIRED |
| `dc5bdc9d` (#2106) | `actions.rs`, `managers/transcription.rs` | unload model after no-audio | present | ALREADY PRESENT |
| `a6eed754` (#2033) | `settings.rs`, `shortcut/mod.rs` | `get_stored_binding → Result` | present incl. tests | ALREADY PRESENT |
| `141f981d` (#1862) | `shortcut/mod.rs` test | compound-key parse test | present | ALREADY PRESENT |
| `141f981d` (#1862) | `lib/utils/keyboard.ts` | compact parseable key tokens | no counterpart file | IRRELEVANT |
| `496a80cc` (#2011) | history clipboard UI | copy-success only after write | no history UI | IRRELEVANT |
| `7c31572d` (#2082) | `App.tsx` | settings scroll reset | restructured UI, absent | IRRELEVANT |
| `8f9cf53c` (#2040) | docs | Omarchy Wayland indicator note | docs only | IRRELEVANT |
| `05e0aedd` + 4 preceding | version/README/sponsor/PR-template | 0.9.7, readme, sponsor, templates | Soravo-owned identity | IRRELEVANT |
| `code-quality.yml` + `package.json` script | CI | `test:keyboard` step | no `keyboard.ts` to test | IRRELEVANT |
| `HistorySettings` `copyError` ×29 | i18n | new copy-error string | no history UI | IRRELEVANT |
| `settings.rs` scroll/unload hunks | — | (covered above) | present | ALREADY PRESENT |
| Soravo `lib.rs` startup shape | `lib.rs` | Handy added background pre-warm call | Soravo-owned 81-line shim | UNVERIFIED (locate Soravo startup caller in T34-B) |

---

## 5. Implementation queue (§17) — NOT EXECUTED

AGENT-EXECUTABLE (each needs its own task + tests + CI; no owner gate):
- **T34-A** — exact Handy shortcut-parse fix (`f5c27e69` → `tauri_impl.rs`
  `validate_shortcut` + 2 tests, byte-identical port).
- **T34-B** — startup compute-devices off path (`29bd2c0d`: extract
  `report_compute_devices`, move logging off Soravo's actual startup caller;
  first locate Soravo's `init_transcribe_backend` caller since `lib.rs` is a shim).
- **T34-C** — model-availability guard (`eea1f5f4` adapted: place the
  `is_model_loaded`/`get_model_path` check relative to Soravo's
  `SessionMachine` Idle→Starting transition and streaming/VAD planning).

OWNER/ADR REQUIRED (do not execute without the owner/ADR path):
- **T34-D** — transcription fixes (`8ef8dd43` + `eb49dc02`): change frozen V1
  user-visible transcription semantics + Handy test expectations.
- **T34-E** — transcribe-cpp(-sys) 0.2.3→0.2.4: supply-chain decision
  (all-platform native backend; re-run `cargo-audit`, Windows/macOS builds,
  license re-check).

DEFERRED (UI overhaul deferred; no counterpart files):
- **T34-F** — `keyboard.ts` tokens, history clipboard refactor, settings-scroll
  reset, `copyError` strings. Revisit when Soravo history/shortcut UI exists.

---

## 6. Licensing / provenance (§18)

All examined Handy source is MIT (`LICENSE` present at the pin per v6 §21).
Provenance for any future copy: `https://github.com/cjpais/Handy` @ the exact
commit in the table above, per file. No source copied in this task. Model/weight
licensing is a separate gate (ADR-011; ADR-019 `D-CATALOG = B` in force) and is
NOT discharged by Handy source MIT status — no model named, acquired, or licensed
here.

---

## 7. Governance

- Tests/CI inspected (not run): PR #63 checks (`rust` FAIL 7m4s, `cargo-audit`
  FAIL 10s, all else PASS), runs `37068904531`/`37068904536` (both `failure`,
  2026-10-02T21:47:26Z), branch protection (`web,e2e,rust,desktop` required).
- Implemented: nothing (forensic only). Verified: SHA truth above
  (`5ec58f69` HEAD, 19-commit count, `text.rs` sha256 `7d341440…410941` both
  sides, `transcription.rs` differing by adaptation, `transcribe-cpp` 0.2.3
  locked). Blocked: nothing. Not executed: implementation queue T34-A…F,
  test runs, Semgrep scan, supply-chain collector run, Handy source sync
  (explicitly forbidden). Deferred: T34-F UI items.
- Stop conditions: none triggered (Handy main fetched reliably; provenance
  established per item; no Soravo-owned contract silently altered — nothing
  altered at all).
- Next task: **T34-A — exact Handy shortcut-parse fix** (smallest
  agent-executable reuse; backend-only, byte-identical port + Handy tests),
  unless the owner prioritizes T34-C (model-availability guard) or opens the
  ADR path for T34-D/T34-E first.
