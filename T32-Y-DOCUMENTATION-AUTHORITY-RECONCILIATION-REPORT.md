# T32-Y — AUTHORITATIVE DOCUMENTATION, V1 PRESERVATION, AND POST-T32-W AUTHORITY RECONCILIATION

**Task:** T32-Y — documentation/control-plane reconciliation
**Mode:** Documentation / control plane only. No production source, no tests, no `catalog.json`, no UI, no Handy behaviour, no payment/provider work.
**Date:** 2026-09-30
**Report state:** COMPLETE — `STOP` after T32-Y. The next task is **not** started.

---

## 1. MANDATORY READING GATE — COMPLETED

Performed at the beginning of this task, in full, before any other action.

| # | Item | Result |
|---|---|---|
| 1 | `SPEC_MANIFEST.json` read | ✅ (root v2 manifest, and the v6 `SPEC_MANIFEST.json`) |
| 2 | All 24 v6 documents read completely, in `SPEC_MANIFEST.json` read order | ✅ `00_README` → `21_HANDY_SOURCE_CHAIN_OF_CUSTODY` → `DESIGN.md` (544 lines) → `SPEC_MANIFEST.json` |
| 3 | `PROGRESS.md` read in full | ✅ 3,320 lines |
| 4 | Fresh Git/VM/PR/CI state audit | ✅ §2 |
| 5 | Task-specific reports (T32-W spec + ADR draft, T32-X audit) read only after the gate | ✅ |

**Order of operations actually observed:** `SPEC_MANIFEST.json` → 24-document pack → `PROGRESS.md` → fresh git/PR/CI audit → **then** `T32-X-POST-RUNTIME-RESTORATION-AUDIT.md` and the T32-W ADR draft. The most recent report was **not** used as a substitute for the pack.

**Two authority conflicts were discovered *during* the reading gate and both are resolved in this task**, per v6 §01's conflict protocol:

- **R-1 — a duplicate, byte-divergent copy of the v6 pack exists** (§4).
- **R-2 — `docs/spec-v3/` exists on `origin/main` but not on this branch** (§5).

The reading gate was also recorded as **permanent policy** inside the authoritative pack (§6.2), so that the next session is bound by it without being told.

---

## 2. FRESH STATE AUDIT

| Field | Value | Evidence |
|---|---|---|
| **Date** | 2026-09-30 | session date |
| **Branch** | `t31/soravo-wrapper-completion` | `git rev-parse --abbrev-ref HEAD` |
| **Local HEAD (start)** | `27200173950a1ad5a69840c3e170297d2b7c2ef9` | `git rev-parse HEAD` |
| **`origin/main`** | `ede495b55efd95cedd882d90a19d12b4777da852` | `git rev-parse origin/main` after `git fetch origin --prune` |
| **Ahead / behind** | branch is **0 behind / 12 ahead** of `origin/main` | `git rev-list --left-right --count origin/main...HEAD` |
| **Upstream tracking** | `origin/t31/soravo-wrapper-completion`, **0/0** | `git status --short --branch` |
| **Worktree** | primary clean except `PROGRESS.md`; 3 additional worktrees present and untouched | `git worktree list` |
| **Untracked** | 28 pre-existing untracked paths (T22–T32 report corpus, `reports/`, `docs/archive/spec-v3/spec-v3/`, `apps/desktop/.env.example`, `apps/desktop/src-tauri/tauri.toml`, `deno.lock`). **All classified pre-existing and preserved. None touched, staged, or deleted by this task.** | `git status --porcelain` |
| **PR #63** | **OPEN**, base `main`, head `27200173` (**identical to local HEAD**), `mergeable: MERGEABLE`, `mergeStateStatus: **BLOCKED**`, `reviewDecision: **REVIEW_REQUIRED**`, 0 of 1 approving reviews, **NOT MERGED** | `gh pr view 63` |
| **CI at `27200173`** | `CI` run `36638028609` **FAILURE** · `Security Audit` run `36638028456` **SUCCESS** | `gh run list` |
| **PR checks** | `rust` **fail** (8 m 8 s) · `desktop` **pass** (9 m 18 s) · `web` pass · `e2e` pass · `cargo-audit` pass · `cargo-deny` pass · `npm-audit` pass | `gh pr checks 63` |
| **Release** | `gh run list --workflow release.yml` → **no runs, ever**. `gh release list` → **empty**. macOS/Windows signing secrets are **commented out**. | live query |
| **Branch protection on `main`** | **PRESENT**: required checks `web`, `e2e`, `rust`, `desktop`; `strict: true`; 1 approving review; `dismiss_stale_reviews: true`; force-push/deletions disallowed. *(Was 404/absent at T32-C; established by T23.)* | `gh api …/branches/main/protection` |
| **Desktop toolchain** | `rustup target list --installed` → **only** `x86_64-unknown-linux-gnu` | live query |
| **Test baseline** | `cargo test -p soravo-desktop --lib --no-fail-fast` → **`203 passed; 7 failed; 0 ignored`** | re-run in this task |
| **Deployment** | not changed, not inspected further; no release exists | — |
| **Provider state** | **not queried.** No Razorpay / Supabase / Cloudflare / GitHub write API was called. **Provider mutations: ZERO.** | — |

---

## 3. T32-W / T32-X IMPLEMENTATION TRUTH — ALL 20 ITEMS AUDITED AGAINST THE REPOSITORY

Every item was re-verified first-hand in this task. **Nothing is taken on report.**

| # | Claim | Verdict | Evidence gathered in this task |
|---|---|---|---|
| **1** | T32-W runtime restoration shipped | ✅ **VERIFIED** | `27200173` present, pushed, on PR #63 whose head is identical |
| **2** | P0 updater registration removal shipped | ✅ **VERIFIED** | `git diff 433976d3..HEAD -- main.rs` — `.plugin(tauri_plugin_updater::Builder::new().build())` removed. *(The `tauri-plugin-updater = "2"` **crate dependency remains in `Cargo.toml`** — deferred as F8, not removed.)* |
| **3** | P3 `cli` module declaration shipped | ✅ **VERIFIED** | `lib.rs` diff: `+pub mod cli;` |
| **4** | D-CATALOG-B shipped as the one-line `#[serde(default)]` tolerance change | ✅ **VERIFIED** | `git diff 433976d3..HEAD -- catalog/mod.rs` = `+#[serde(default)]` above `models: Vec<CatalogModel>,` plus 4 comment lines. Nothing else. |
| **5** | Runtime boot setup shipped | ✅ **VERIFIED** | `.setup(move \|app\| { … })` present in `main.rs`; constructs `ModelManager` (S3) → `TranscriptionManager` (S4) → `AudioRecordingManager` (S5) → `HistoryManager` (S6) → `TranscriptionCoordinator` (S7) → `manage(cli_args)` (S8) → `secure_input::init` (S9) → `initialize_shortcuts` (S10) |
| **6** | `initialize_shortcuts` registration shipped | ✅ **VERIFIED** | `generate_handler!` gains `initialize_shortcuts`; the `__cmd__initialize_shortcuts` / `__tauri_command_name_initialize_shortcuts` re-exports are imported |
| **7** | `paste_tx` restoration shipped, and is **restoration of existing source, not a new Soravo insertion architecture** | ✅ **VERIFIED** | SHA-256 recomputed this task: `mod.rs` `2d70bc1ff915c899`, `macos.rs` `a4f9ebd9011f271b`, `windows.rs` `11d975d768b06070` — **byte-identical to `5f56260c`** on all three. `git status` on the directory: **0 changes.** `lib.rs` gained exactly one line, `pub mod paste_tx;` — a module declaration. **No Soravo-authored insertion path exists.** |
| **8** | The catalog data itself remains unpopulated; `catalog.json` must NOT be fabricated | ✅ **VERIFIED** | `apps/desktop/src-tauri/src/catalog/catalog.json` = **3 bytes** (`{}`). No model id, publisher, URL, licence, revision, size, hash, architecture, mirror, score, or provenance was invented. |
| **9** | The baseline changed 188/15 → 203/7 because the catalogue `Lazy`-poison collateral disappeared after D-CATALOG-B — **not** a test rewrite | ✅ **VERIFIED** | Re-ran the suite: `203 passed; 7 failed; 0 ignored`. `git diff 433976d3..HEAD --stat` lists **zero test files**. Recovery arithmetic: **+7** (`paste_tx::tests` returned with the module) **+8** (D-CATALOG-B removed the `Lazy` poison so 8 catalogue tests now execute) **−8 failed**. |
| **10** | Remaining failures = 2 catalog-content/data-authority + 5 frozen-V1 transcription | ✅ **VERIFIED** | Exact list re-confirmed: `catalog::tests::catalog_parses_and_is_nonempty`; `managers::model::tests::test_discover_catalog_alternate_quant_in_models_dir`; and the five `managers::transcription::tests::` (`auto_language_without_detection_skips_gated_filler_removal`, `ignored_user_language_is_not_output_evidence`, `portuguese_transcription_does_not_use_english_ui_filler_words`, `unknown_evidence_with_confident_text_detection_removes_gated_fillers`, `unknown_evidence_with_portuguese_text_preserves_um`). |
| **11** | No Soravo post-processing was added | ✅ **VERIFIED** | `post_process.rs` is **not** in the 9-path change set (`Cargo.lock`, `apps/desktop/src-tauri/Cargo.toml`, `lib.rs`, `catalog/mod.rs`, `main.rs`, `paste_tx/{mod,macos,windows}.rs`, plus `PROGRESS.md`) |
| **12** | No second STT path was added | ✅ **VERIFIED** | no transcription/session crate wired; `hotkey.rs` still undeclared; `retry_history_entry_transcription` still unregistered |
| **13** | No second insertion path was added | ✅ **VERIFIED** | the only insertion chain remains `actions.rs` → `utils.rs` → `clipboard.rs` → `paste_tx` |
| **14** | `injectText()` remains unused infrastructure | ✅ **VERIFIED** | defined `apps/desktop/src/ipc.ts:139`; **0 `.tsx` callers**; the only references are the definition and the unit test `app.test.ts` |
| **15** | `typing://result` remains unsubscribed | ✅ **VERIFIED** | emitted at `soravo_ipc.rs:202`; wrapper at `ipc.ts:107/162`; **0 production subscribers**; the only subscriber is the unit test |
| **16** | macOS/Windows compilation remains **UNVERIFIED** | ✅ **VERIFIED UNVERIFIED** | `rustup target list --installed` → only `x86_64-unknown-linux-gnu`; `ci.yml` has 4 jobs, **all `runs-on: ubuntu-latest`**; `release.yml` carries the macOS/Windows matrix but is `workflow_dispatch`-only and **has never run** |
| **17** | Linux launch/runtime evidence must not be represented as macOS/Windows verification | ✅ **ENFORCED** | stated explicitly in ADR-019 §10 and in §9 of this report; the phrase "no cross-platform support is claimed" is retained |
| **18** | T1/T2 platform build gates remain unresolved | ✅ **VERIFIED UNRESOLVED** | no workflow was changed by T32-W; **T1 (boot gate)** and **T2 (macOS/Windows jobs)** are absent from CI. The manual Linux boot is evidence, **not a gate.** |
| **19** | `app.tsx` stale wording recorded as a UI documentation/state issue, **not** silently changed | ✅ **RECORDED, NOT CHANGED** | `app.tsx:190-200` still reads *"Speech recognition, microphone access, global shortcuts, and text insertion are deliberately unavailable until their dedicated, testable phases."* `git diff HEAD -- apps/desktop/src/app.tsx` → **empty.** Recorded as an outstanding ADR-019 obligation in §13 of the ADR. |
| **20** | `Cargo.lock` changed by the runtime restoration, and must be documented accurately | ✅ **VERIFIED** | `git diff 433976d3..HEAD -- Cargo.lock` = **+2 lines**: `objc2-app-kit`, `objc2-foundation` added to the `soravo-desktop` dependency list. Both declared macOS-scoped in `Cargo.toml`. **The T32-W draft's claim "Cargo.lock unchanged" was factually wrong and is corrected in the ADR (§6, Amendment 6).** |

**V1 preservation verified from the change set, not asserted:** the 9-path union contains **zero**
files from `audio_toolkit/`, `managers/`, `shortcut/`, `actions.rs`, `post_process.rs`,
`clipboard.rs`, `input.rs`, `settings.rs`, or `crates/**`. `catalog/mod.rs` is the only
Handy-derived file touched, it is `SORAVO-OWNED` per v6 §04/§21, and it asserts no model fact.

---

## 4. AUTHORITY / V6 PACK RECONCILIATION

### 4.1 The finding

**There are two copies of the v6 pack, and they held *complementary* content.**

| | `docs/Soravo_Engineering_Docs_v6/` | `./Soravo_Engineering_Docs_v6/` (root) |
|---|---|---|
| On `origin/main`? | ✅ **yes** (all 24 entries) | ❌ **no** |
| Files | 26 (24 manifest + 2 milestone artifacts) | 24 |
| Created | `ede495b5` | `fc56c31b` (T22) |
| Last control edit | `fc56c31b` | `6aa322c0` (T32-A) |
| Had **V1 Handy-core preservation** (02/04/09/20/21) | ❌ **NO** | ✅ yes |
| Had **product-direction / fork-reuse / provider-boundary** (02/03/04/06) | ✅ yes | ❌ no |
| Had the 2 `22_IMPLEMENTATION_COMPLETION_MATRIX*` artifacts | ✅ yes | ❌ no |

**Neither copy was a superset.** T32-A updated the root copy; `fc56c31b` updated the `docs/`
copy. The V1 preservation policy that v6 §00/§04 make non-negotiable existed **only** in a
copy that is **not on GitHub**. This is exactly the condition the task describes as *"the local
authoritative docs contain the intended corrections but GitHub does not."*

### 4.2 Which copy is authoritative — determined, not assumed

`docs/Soravo_Engineering_Docs_v6/` is the **canonical copy and the index of record**, on three
independent bases:

1. it is the **only** copy present on `origin/main` (verified by `git ls-tree -r origin/main`);
2. it is the path the task control plane records as the pack location;
3. per v6 §01, **implementation truth is GitHub repository state** — and the GitHub-verified
   location wins.

**ADR numbering also disambiguates this.** The root copy's `20_ADR_INDEX.md` was used by
T32-X as *the* index when it recorded the missing ADR-019 entry; that is the ambiguity T32-X
flagged as H-13/N-3. Resolving the directory question resolves the index question.

### 4.3 What was done

- **Union merge.** For the five divergent files, a three-way `--union` merge with the
  `ede495b5` common base produced **0 conflict markers**, and the result was verified to be a
  **strict superset of both parents** (line-level `comm` check: zero parent-only lines
  remaining). The union went into the canonical copy.
- **Mirror sync.** The root copy's `02`, `03`, `04`, `06`, `09`, `21` were then set to the
  canonical content, so **no control text exists in only one place.** The two trees now differ
  **only** in `00_README.md` and `20_ADR_INDEX.md` — the two files that carry the authority
  banners — plus the 2 extra milestone artifacts in the canonical directory.
- **No file was deleted.** The root copy is retained as history, explicitly marked.

### 4.4 Version / consistency corrections (in the canonical copy)

| Inconsistency | Correction |
|---|---|
| `00_README.md` title said **"Pack v5"** while the directory, `SPEC_MANIFEST.json` (`"name": "…Pack v6"`, `"version": "6.0.0"`) and every other signal said v6 | Title → **v6**; an explicit `Pack version: 6.0.0` / `Canonical path:` header added; the historical "v5" is **recorded as having been wrong** rather than erased |
| README read order jumped **23 → 25**, skipping 24 | Corrected to a 24-entry table; `SPEC_MANIFEST.json` read_order 1–24 and the README table now match exactly |
| README said nothing about the 2 unmanifested files in the directory | **Directory contents versus the manifest** section added, listing both `22_*` artifacts as retained milestone artifacts that are **not** part of the control plane and **not** read by the gate. **The manifest is not amended to absorb them** — the manifest defines what the gate reads, and the gate is unchanged by their presence. `file_count: 24`, `files[]` = 24, `read_order` = 24 all remain internally consistent |
| Historical research-head claim (`2f96f3d2…`) | **UNCHANGED.** No evidence required altering it. |
| Duplicate ADR index undeclared | **Duplicate pack copies** section added to `00_README.md` |

### 4.5 All 24 manifest entries verified present

`00_README.md` · `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md` · `02_PRODUCT_REQUIREMENTS.md` ·
`03_TECHNICAL_DESIGN.md` · `04_HANDY_FORK_AND_REUSE_POLICY.md` · `05_DESKTOP_CONTRACTS.md` ·
`06_WEB_CLOUD_PAYMENT.md` · `07_IMPLEMENTATION_PLAN.md` · `08_TASK_BREAKDOWN.md` ·
`09_AI_AGENT_INSTRUCTIONS.md` · `10_AI_SKILLS.md` · `11_MCP_AND_AGENT_TOOLING.md` ·
`12_SECURITY_BASELINE.md` · `13_DEFINITION_OF_DONE_AND_QA.md` · `14_CI_CD_AND_BRANCHING.md` ·
`15_ENVIRONMENT_AND_SECRETS.md` · `16_TEST_AND_BENCHMARK_PROTOCOL.md` · `17_RELEASE_RUNBOOK.md` ·
`18_INTERRUPTION_AND_HANDOFF.md` · `19_STATE_AUDIT_PROTOCOL.md` · `20_ADR_INDEX.md` ·
`21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` · `DESIGN.md` · `SPEC_MANIFEST.json`
— **all 24 present. 0 missing.**

---

## 5. SPEC-V3 — BRANCH DISTINCTION (T32-X's FINDING N-4 CORRECTED)

**T32-X reported that `docs/spec-v3/` did not exist. That was true of the working branch and
was checked on no other ref. Both refs were therefore verified fresh in this task, and the
result contradicts the single-ref claim.**

| Ref | SHA | `docs/spec-v3/` | `docs/archive/spec-v3/` |
|---|---|---|---|
| **Local working branch** `t31/soravo-wrapper-completion` | `27200173` | ❌ **does not exist** | ✅ exists |
| **`origin/main`** | `ede495b5` | ✅ **EXISTS** — 20 documents + a `decisions/` subtree, plus `docs/spec-v3.zip` | ❌ does not exist |

**Both statements are recorded; neither is the whole truth.**

**Mechanism, established from history:** the move happened in **`fc56c31b`** *"T22: First
coherent milestone checkpoint"* — which is on the **feature branch, not on `main`**. The
archive move has therefore **never reached `origin/main`**.

**The contradiction, stated exactly.** Three documents still name `docs/spec-v3/` as
authoritative:

- `PROGRESS.md:6` — `**Authority:** SORAVO_PLAN.md, docs/spec-v3/`
- `README.md:13` — `**docs/spec-v3/**` as the documentation set; `:28-32` links five V3 files
  as "Authoritative entry point"; `:69-72` makes reading them steps 2–5 of the on-ramp
- `SORAVO_PLAN.md:11` — *"This document (`SORAVO_PLAN.md`) and `docs/spec-v3/` are the current
  authoritative Soravo plan"*; `:15` marks V3 as **"Implementation authority"**

…while v6 `00_README.md` §*Authority ladder* states: *"The repository may contain older
`SORAVO_PLAN.md` and `docs/spec-v3/` material. Those are historical implementation-planning
sources **unless explicitly reconciled with this pack**."*

**Authority level applied:** the v6 pack is engineering-control truth (ladder #2–3) and
`docs/spec-v3/` predates it and is not reconciled with it. **`docs/spec-v3/` is therefore
HISTORICAL/STALE**, on the v6 pack's own wording — *not* on the basis that it is absent.

**Resolution — the important consequence:** the authority model does **not** depend on the
directory's existence, and this task therefore does **not** declare `docs/spec-v3/` nonexistent
and does **not** delete it (either location). Declaring it "nonexistent" — as T32-X's N-4/H-4
did — would be a **false statement about `origin/main`**, and is corrected here. The correct
statement is: *historical per v6 §00, present on `origin/main`, archived on this branch, and
still mis-cited by three documents as authoritative.*

**Recorded as an open owner item (§10, N-4′).** Correcting the three citations is an
**authority-level** change to an authority declaration and is deliberately **not** performed
here as a silent edit; the finding is escalated with the exact lines.

---

## 6. GITHUB DOCUMENTATION VERIFICATION

### 6.1 What GitHub holds, and what it did not

| Item | Before this task | After |
|---|---|---|
| 24 v6 files at `docs/Soravo_Engineering_Docs_v6/` | ✅ present on `origin/main` | ✅ still present; **content corrected on this branch, pending merge** |
| Paths match `SPEC_MANIFEST.json` | ✅ | ✅ |
| README version matches v6 | ❌ **"v5"** on both `origin/main` and the branch | ✅ **v6**, with the mismatch recorded |
| `SPEC_MANIFEST.json` internally consistent | ✅ (24/24/24) | ✅ unchanged and verified |
| **V1 Handy-core preservation policy in the authoritative pack** | ❌ **ABSENT from `docs/`** — present only in the non-GitHub root copy | ✅ **present in `docs/`** (02, 04, 09, 21) |
| **Permanent reading-gate policy in the authoritative AI-agent documentation** | ⚠️ only a generic *"read the entire engineering pack"* step | ✅ explicit **Permanent reading gate** + **Permanent PROGRESS governance** sections in `09_AI_AGENT_INSTRUCTIONS.md`, mirrored in `00_README.md` |
| ADR-019 entry | ❌ **absent from both indexes** | ✅ **exactly one**, in the index of record |

**Per the task's instruction, the repository documentation is updated in this task** because the
local authoritative docs did contain the intended corrections and GitHub did not.

### 6.2 The reading gate, now permanent

Two new sections, in the **canonical** pack:

- `docs/Soravo_Engineering_Docs_v6/00_README.md` — **Mandatory read order** is now explicitly
  *"a **PERMANENT READING GATE** … performed at the beginning of **every** task and **every**
  new agent session, without exception and without being asked"*, with the 24-entry table, the
  `PROGRESS.md`-in-full + state-audit + *then* task-reports ordering, the explicit rule that
  **"the latest task report is never a substitute for this pack"**, and the conflict-handling
  rule (record both · identify authority · verify against GitHub/VM · reconcile · never guess).
- `docs/Soravo_Engineering_Docs_v6/09_AI_AGENT_INSTRUCTIONS.md` — **Permanent reading gate
  (non-negotiable)** and **Permanent PROGRESS governance**, each as a STOP-grade rule at the
  top of the agent instructions.

**PROGRESS.md governance** is now stated in three places (v6 `00_README.md`, v6
`09_AI_AGENT_INSTRUCTIONS.md`, and the `PROGRESS.md` entry appended by this task), with the
full required field list.

### 6.3 Handy source boundary — preserved

Every changed desktop-related document continues to carry the five-way distinction from v6 §21
(`HANDY-REUSE` · `HANDY-ADAPT` · `SORAVO-NEW` · `HANDY-REPLACE` · `SORAVO-OWNED`).
**No source classification was changed.** The union merge carried both sides' text forward
verbatim; the only content authored in this task is the reading-gate policy, the version
consistency corrections, the index/authority banners, and the ADR-019 acceptance.

---

## 7. ADR STATE

**Before:** `T32-W-ADR-019-HANDY-RUNTIME-RESTORATION-DRAFT.md` — `STATUS: DRAFT — NOT
RATIFIED, NOT INDEXED`; `Status: PROPOSED`; five ratification rows with **every box unchecked**;
**"No implementation is authorized by it"**; **"No implementation is authorized until this
table is completed and `20_ADR_INDEX.md` is updated"**; and **no ADR-019 entry in either
index** — while the implementation it disclaimed was **committed and pushed**. `PROGRESS.md`
was the only artifact calling it "the ratified ADR".

**After:** `T32-Y-ADR-019-HANDY-V1-RUNTIME-RESTORATION-ACCEPTED.md` — **`ACCEPTED (with
recorded amendments)`**, with exactly **one** current index entry.

### 7.1 The audit items requested

| Audit item | Finding | Resolution in the corrected ADR |
|---|---|---|
| **Ratification state** | `DRAFT — NOT RATIFIED` / `PROPOSED`; 5 unchecked rows; "No implementation is authorized" — contradicted by shipped, pushed code | Header + `Status:` + §17 ratification record. **An ADR may not stand as a record that nothing is authorized while what it describes is already merged.** The draft is retained unmodified as history |
| **T3 test-baseline claim** | *"must remain **188 passed / 15 failed** … **Any other number is a regression against this ADR**"* — **factually wrong and dangerous**: as written it would classify a correct, V1-compliant implementation as a regression | **Amendment 2** + §11. Baseline is **203/7**; the invariant is **the absence of test edits**, not a fixed count. Full recovery arithmetic given |
| **Scope** | **Narrower than what shipped.** `paste_tx/` and the 2 macOS dependencies are **not in its scope at all** | **A6** and **A7** added; §4 and §6 added; **Amendment 10** |
| **`paste_tx` restoration** | Absent from the ADR entirely, so it was "ratified separately" with no ADR record | **§4** — described strictly as **restoration of existing source**: byte-identical to `5f56260c` on all three files (SHA-256 recomputed), one-line module declaration, no Soravo-authored insertion path |
| **Catalog tolerance change** | The D7-B row predicted *"the other 9 continue to fail"* and D5.6 said *"does **not** turn them green"* — **both wrong**; 8 turned green | **§5** (schema tolerance only) + **Amendments 3 and 4** |
| **Runtime boot restoration** | Correct as drafted | §2.1 A1–A4 with per-item shipped evidence |
| **Actual files touched** | The ADR's own rollback table had no row for `paste_tx` or the deps | §14 rollback table **extended with two rows and their true residuals**; **Amendment 7** |

### 7.2 The ten statements the corrected ADR is required to make — all present

| # | Required statement | Where |
|---|---|---|
| 1 | V1 preservation of Handy STT behaviour | **§3** (five numbered clauses, all verified from the change set) |
| 2 | No Soravo post-processing | **§3.2** — `post_process.rs` not touched; no filler removal, normalisation, punctuation/capitalisation, or language-specific transformation |
| 3 | No second STT / transcript / insertion path | **§3.3**, and invariants **I1**/**I2** |
| 4 | **Why** the restoration does not create a competing STT architecture | **§3.1** — five arguments, each answerable without reading source, plus the stated counterfactual |
| 5 | D-CATALOG-B as a **schema-tolerance change only** | **§5** — what it does, what it does not do, its only effect being a failure-mode change |
| 6 | `catalog.json` remains authoritative and unpopulated | **§5** — 3 bytes, 0 of 9 checklist items closed, hashes never hand-written, no test-only fixture |
| 7 | `paste_tx` restoration as restoration of existing source | **§4** |
| 8 | Platform verification limitations | **§10** — per-target table, `UNKNOWN` for macOS/Windows, "removed is not verified", the Linux-evidence caveat, and the named `windows::Win32` uncertainty |
| 9 | Remaining blockers | **§2.3** (F1–F8), **§11.1**, **§12** (T1/T2/T5/T6 outstanding), **§13** (`app.tsx`), **§15** |
| 10 | No false platform claim | **§10**; the words *"no cross-platform support is claimed"* are explicit |

### 7.3 One unambiguous current entry

- **Index of record:** `docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md` — one
  `ADR-019 **ACCEPTED (with recorded amendments)**` line, naming the accepted text, the two
  shipped commits, `D-CATALOG = B`, the `paste_tx` ratification, the outstanding obligations,
  the `UNKNOWN` platform state, and the sentence **"ADR-019 is the only current entry for this
  decision."**
- **The duplicate** `Soravo_Engineering_Docs_v6/20_ADR_INDEX.md` was **not** given a second
  ADR-019 entry. It carries a **"NOT THE INDEX OF RECORD — NON-AUTHORITATIVE MIRROR"** banner
  and a pointer, so the ambiguity is resolved rather than duplicated.
- **Both index files were edited, and this is declared rather than silent** — one
  substantively (index of record) and one with an explicit supersession banner. The index
  question was settled **before** the entry was written (T32-X's R-11 blocking order).
- A **Numbering note** was added to the index of record: `ADR-017` is absent; the v2 sequence's
  ADR-019 (*update/release mechanism*) and spec-v3's ADR-027 (*handy-derived-desktop-foundation*)
  are **different sequences**. This removes the 019-vs-028 ambiguity recorded in the draft §0.

---

## 8. T32-S — DISPOSITION

**T32-S was skipped. It is NOT superseded. It remains a required owner task with one half
already complete.**

**Provenance.** `T32-D-SORAVO-BLOCKER-EXECUTION-MATRIX.md:237` proposed it as item 15 of an
ordered plan: **`[Owner] T32-S — Branch protection + release exercise. D12 remainder.`** It was
never executed: there is **no `T32-S` report and no `## T32-S` PROGRESS entry** (T32-X H-14
correctly recorded this as *not a finding* — the ID was proposed, never run). **No T32-S report
is fabricated here.**

**Was it superseded by T32-T…T32-X? No — disjoint scope, proven.** T32-T was the transcription
test contract; T32-U the boot-proof test baseline; T32-V the runtime boot proof; T32-W the
runtime-restoration spec; T32-X the implementation + audit. **None of these touches D12**
(branch protection / release engineering). T32-T…X are desktop-runtime tasks; T32-S is a
CI/release-governance task.

**Smallest deterministic recovery task — two rows, only one still needed:**

| D12 half | State | Evidence |
|---|---|---|
| **Branch protection** | ✅ **COMPLETE** | `gh api …/branches/main/protection` returns a full ruleset. It was **404/absent** when T32-C recorded the gap, and was established by `T23-GITHUB-BRANCH-PROTECTION-REPORT.md`. **This sub-item is closed** |
| **Release exercise** | ❌ **OUTSTANDING** | `gh run list --workflow release.yml` → **no runs, ever** (not merely failing — never dispatched). `gh release list` → **empty**. macOS and Windows signing secrets are **commented out** in `release.yml:88-97`. The `x86_64-pc-windows-msvc` target has never been compiled |

**⇒ T32-S is recorded as `SKIPPED — PARTIALLY SUPERSEDED`, remaining requirement: the release-exercise half only.**

**Smallest deterministic recovery task (T32-S-1, owner, external input required):** dispatch
`release.yml` once via `workflow_dispatch` and record the run ID and outcome, with signing
either wired to real external certificates or the unsigned scope **documented as the accepted
V1 limitation**. That is a single dispatch plus a record. It cannot be completed by an agent
without external certificate/credential material, which must never be invented.

**T32-S remains in the blocker set and is not marked complete anywhere.**

---

## 9. HANDY SOURCE BOUNDARY

Every changed desktop-related document preserves the five-way classification from v6 §21:
`HANDY-REUSE` · `HANDY-ADAPT` · `SORAVO-NEW` · `HANDY-REPLACE` · `SORAVO-OWNED`.

**No source classification was changed in this task.** Specifically:

- The union merge carried both parents' text **verbatim**; no classification line was rewritten.
- The only Handy-derived file in the T32-W change set — `catalog/mod.rs` — is recorded as
  **`SORAVO-OWNED`** in ADR-019 §3.1, and ADR-019 §4 records `paste_tx` as **`HANDY-REUSE`**
  (byte-identical restoration), not `SORAVO-NEW`.
- `PROGRESS.md` historical entries were **not** rewritten, so no historical classification was
  altered.

---

## 10. BLOCKERS (unchanged by this task)

**PR #63 — two independent gates.** Required check `rust` is **red (203/7 by design)**, and
**0 of 1** required approving reviews. `mergeStateStatus: BLOCKED`. **Not merged. Not to be
merged by this task.**

**Open owner decisions:**

| # | Decision | Status |
|---|---|---|
| **O-1** | Transcription-test treatment for the 5 frozen-V1 failures (per-test, per the T32-T matrix). **Must not** be resolved by editing a test to match current behaviour — that pins live user-visible data loss as the specification. | OPEN |
| **O-2** | The 9 remaining catalog data items. **0 of 9 closed.** | OPEN |
| ~~O-3~~ | ~~ADR-019 accept/amend/reject~~ | ✅ **CLOSED by this task** — accepted with recorded amendments, indexed |
| **O-4** | **`app.tsx:190-200`** truthfulness correction. Recorded as a UI documentation/state issue; **deliberately not changed here**. | OPEN |
| **O-5** | **The `docs/spec-v3/` authority declaration** (three documents mis-cite it; branch/ref distinction in §5). | OPEN |

**F1–F8 all still deferred** (tray · overlay · `signal_handle` · 119 registrations ·
settings-store unification, user-visible today · macOS `NSMicrophoneUsageDescription` ·
model + Silero VAD assets · updater restoration). Payment / Cloudflare / signing /
branch-protection items carried unchanged.

**New findings raised by this task:**

| # | Finding | Severity |
|---|---|---|
| **P-1** | **The V1 Handy-core preservation policy existed only in a pack copy that is not on GitHub.** Anyone reading the authoritative pack on `origin/main` would not have found the non-negotiable V1 preservation rule. | **HIGH** — corrected in this task |
| **P-2** | **Two byte-divergent copies of the control pack**, each holding content the other lacked. This is the direct cause of P-1. | **HIGH** — reconciled in this task; the root copy is now an explicitly marked mirror |
| **P-3** | **`docs/spec-v3/` exists on `origin/main`** — T32-X's N-4/H-4 "`docs/spec-v3/` absent" is a single-ref statement that is false for `origin/main`. | MEDIUM — corrected in this task; the archive move has never reached `main` |
| **P-4** | **T32-X already reserved the ID `T32-Y`** for *"Soravo UI truthfulness, `app.tsx:190-200` only"*. **This task is also `T32-Y`** and is a different body of work. **Second collision of this kind** (T32-X had three). | MEDIUM — recorded, **not** renumbered; renumbering is an owner act |
| **P-5** | The T32 report corpus (20+ `T*.md` reports incl. `T32-U`) is **still untracked**, so the evidence base for ADR-019 is not on GitHub. | **HIGH** — carried from T32-X H-1, **not** fixed here (staging is a separate, explicitly-scoped act) |
| **P-6** | `T32-U` still has **no `## T32-U` PROGRESS entry** (report exists, 481 lines). | MEDIUM — carried from T32-X H-2, **not** fixed here (historical-entry authoring) |

---

## 11. FILES CHANGED

### 11.1 Changed (documentation only)

| File | Change |
|---|---|
| `docs/Soravo_Engineering_Docs_v6/00_README.md` | v5→**v6**; canonical-path + pack-version header; read order fixed to 24 entries and made the **PERMANENT READING GATE**; `PROGRESS.md`-in-full → state audit → task-reports ordering; "latest report is never a substitute"; conflict-handling rule; *Directory contents versus the manifest*; *Duplicate pack copies* |
| `docs/Soravo_Engineering_Docs_v6/02_PRODUCT_REQUIREMENTS.md` | **V1 HANDY-CORE PRESERVATION** block restored (union) |
| `docs/Soravo_Engineering_Docs_v6/04_HANDY_FORK_AND_REUSE_POLICY.md` | **V1 HANDY-CORE PRESERVATION POLICY** restored + product-direction + fork/reuse boundary (union) |
| `docs/Soravo_Engineering_Docs_v6/09_AI_AGENT_INSTRUCTIONS.md` | **Permanent reading gate** + **Permanent PROGRESS governance** + **V1 HANDY-CORE PRESERVATION VIOLATIONS** stop conditions (union) |
| `docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md` | **Index of record** declaration; single **ADR-019 ACCEPTED** entry; ADR-text location convention; numbering note (ADR-017 absent; 019 ≠ v2's 019 ≠ spec-v3's 027/028) |
| `docs/Soravo_Engineering_Docs_v6/21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` | **V1 behavior preservation requirements** restored + added to the chain-of-custody acceptance list (union) |
| `Soravo_Engineering_Docs_v6/00_README.md` | **NOT THE AUTHORITATIVE PACK** banner; v6; pointer to the canonical pack |
| `Soravo_Engineering_Docs_v6/20_ADR_INDEX.md` | **NOT THE INDEX OF RECORD** banner; **no second ADR-019 entry**; pointer to the index of record |
| `Soravo_Engineering_Docs_v6/{02,03,04,06,09,21}*.md` | mirrored to canonical content so no control text exists in only one place |
| `T32-Y-ADR-019-HANDY-V1-RUNTIME-RESTORATION-ACCEPTED.md` | **created** — the corrected, accepted ADR-019 |
| `T32-Y-DOCUMENTATION-AUTHORITY-RECONCILIATION-REPORT.md` | **created** — this report |
| `PROGRESS.md` | T32-Y entry appended (governance) |

### 11.2 Deliberately unchanged — and verified unchanged

| File / state | Why unchanged |
|---|---|
| **All production source** (`apps/desktop/src-tauri/**`, `crates/**`, `apps/desktop/src/**`) | Task is documentation/control-plane only |
| **All tests** | Prohibited. Verified: `git diff HEAD -- '*test*'` **empty** |
| **`apps/desktop/src-tauri/src/catalog/catalog.json`** | Must not be fabricated. Still 3 bytes `{}` |
| **`apps/desktop/src/app.tsx`** | O-4 open; recorded as a UI documentation/state issue, **not** silently changed |
| **`Cargo.toml` / `Cargo.lock`** | No dependency change in a documentation task |
| **`.github/workflows/**`** | No CI added; T1/T2 remain outstanding |
| **`docs/archive/spec-v3/**`** | Not deleted. `docs/spec-v3` is historical, not removed |
| **`T32-W-ADR-019-…-DRAFT.md`** | **Retained unmodified as history.** Wrong claims corrected *in the new ADR*, not erased |
| **`T32-X-POST-RUNTIME-RESTORATION-AUDIT.md`** | Retained; its N-4 finding is corrected in this report, not in the file |
| **`PROGRESS.md` historical entries** | Not rewritten; only a new entry appended |
| **`SPEC_MANIFEST.json` (v6)** | `file_count: 24` is correct; the 2 extra files are disclosed in `00_README.md` rather than absorbed |
| **Root `SPEC_MANIFEST.json` (v2)** | Historical pack; out of scope |
| **`SORAVO_PLAN.md`, root `README.md`, `10_ADR_INDEX.md`** | Authority declarations → O-5 owner item, escalated with exact lines, not silently edited |
| **Provider state** | **Provider mutations: ZERO.** No Razorpay / Supabase / Cloudflare / GitHub write API called |
| **28 untracked paths** | Pre-existing. None staged, deleted, or modified |

---

## 12. TESTS / CHECKS / SECURITY

**Documentation consistency checks run in this task:**

| Check | Result |
|---|---|
| All 24 v6 manifest entries present in `docs/Soravo_Engineering_Docs_v6/` | ✅ **24/24, 0 missing** |
| `file_count: 24` == `files[]` == `read_order` == README read-order table | ✅ consistent, 24/24/24/24 |
| No `v5` residue in the authoritative pack | ✅ only the historical note recording that it *was* v5 |
| Directory name == README == `SPEC_MANIFEST.json` version | ✅ `Soravo_Engineering_Docs_v6` / `v6` / `6.0.0` |
| V1 preservation policy present in the authoritative pack | ✅ `02`, `04`, `09`, `21` |
| Permanent reading-gate + PROGRESS-governance policy present | ✅ `00_README`, `09_AI_AGENT_INSTRUCTIONS` |
| ADR-019 has exactly **one** current entry | ✅ in the index of record; the duplicate carries a pointer, not an entry |
| Three-way union merge produced **0** conflict markers and is a **strict superset** of both parents | ✅ verified line-level |
| Two pack trees differ only in the two banner files + the 2 disclosed artifacts | ✅ verified |
| `git diff HEAD -- apps/desktop/src-tauri/src/paste_tx/` | ✅ **empty** |
| `git diff HEAD -- '*/catalog.json'` | ✅ **empty** |

**Test / CI state (unchanged by this task, re-measured for the record):**

- `cargo test -p soravo-desktop --lib --no-fail-fast` → **`203 passed; 7 failed; 0 ignored`**
  (2 catalog-content + 5 frozen-V1 transcription; **0** Soravo defects, **0** build/env, **0** unknown)
- CI at `27200173`: `rust` **fail** (by design) · `desktop`/`web`/`e2e`/`cargo-audit`/`cargo-deny`/`npm-audit` **pass**
- **No test was added, edited, removed, relocated, ignored, or annotated by this task.**

**Security state — unchanged, no weakening, nothing new introduced:**

- **Zero provider mutations.** No Razorpay / Supabase / Cloudflare / GitHub write API.
- **No secret read, printed, or committed.** No `.env` value inspected; `apps/desktop/.env.example`
  left untouched.
- **No `unsafe` introduced.** No source change at all.
- CSP, `capabilities/default.json`, RLS, webhook HMAC posture: **untouched**.
- Branch protection on `main`: **verified present and unchanged** (read-only `gh api` GET).
- The only writes were to tracked Markdown files plus the two new task documents, all reviewed
  in `git diff` before commit.

---

## 13. COMMIT / PUSH / PR

| Item | Value |
|---|---|
| **Commit** | `b3bf5d1b` — `docs(control-plane): accept ADR-019, reconcile the v6 pack authority, record the permanent reading gate (T32-Y)` |
| **Files in the commit** | **16 documentation files, 0 non-markdown.** 2 new task documents, 6 canonical-pack files, 8 mirror-pack files, `PROGRESS.md`. Diffstat: `16 files changed, +608 −50` (plus the appended report) |
| **Pre-commit diff inspection** | ✅ performed. `git status --porcelain \| grep -v '\.md$'` → **EMPTY**. No path under `crates/`, `src-tauri/`, `apps/`, `.github/`, and no `Cargo.*`, `catalog.json`, `*.test.*`, `*.ts*` was staged |
| **Push** | ✅ `27200173..b3bf5d1b → origin/t31/soravo-wrapper-completion`. Local/upstream **0/0** after push |
| **PR #63** | **OPEN · NOT MERGED · NOT MODIFIED BY MERGE.** Head now `b3bf5d1b`; `mergeStateStatus: BLOCKED`; `reviewDecision: REVIEW_REQUIRED`; **0 of 1** approving reviews |

### 13.1 CI after push — inspected, result as expected

| Check | Result | Run |
|---|---|---|
| `rust` | **fail — 8 m 11 s, BY DESIGN** | `36644914376` |
| `desktop` | **pass** — 10 m 37 s | `36644914376` |
| `web` | pass — 45 s | `36644914376` |
| `e2e` | pass — 51 s | `36644914376` |
| `cargo-audit` | pass — 10 s | `36644914411` |
| `cargo-deny` | pass — 43 s | `36644914411` |
| `npm-audit` | pass — 15 s | `36644914411` |

**The `rust` failure is the documented, intended state, and it was verified to be the *same* 7 failures — not a regression introduced by this documentation change.** The CI log's failure list and `test result:` line are byte-identical to the local run and to the pre-existing `27200173` baseline:

> `test result: FAILED. 203 passed; 7 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.59s`

failing: `catalog::tests::catalog_parses_and_is_nonempty` ·
`managers::model::tests::test_discover_catalog_alternate_quant_in_models_dir` ·
`managers::transcription::tests::auto_language_without_detection_skips_gated_filler_removal` ·
`…::ignored_user_language_is_not_output_evidence` ·
`…::portuguese_transcription_does_not_use_english_ui_filler_words` ·
`…::unknown_evidence_with_confident_text_detection_removes_gated_fillers` ·
`…::unknown_evidence_with_portuguese_text_preserves_um`

**203/7, three times confirmed: locally, in CI at `27200173` (run `36638028609`), and in CI
at `b3bf5d1b` (run `36644914376`).** The `desktop` job passing at 10 m 37 s is additional
confirmation that a documentation-only commit cannot have altered the build.

**A documentation commit that does not turn `rust` green is the correct outcome.** Turning it
green by editing a test is explicitly prohibited.

---

## 14. EXACT NEXT TASK

**STOP. The next task is NOT started. T32-Y is complete.**

**This task did not begin, and must not begin automatically:**

1. **`T32-Y-UI` (or a renumbered ID — P-4)** — the `app.tsx:190-200` truthfulness correction.
   `app.tsx` only. No behaviour change, no `injectText()` caller, no `onTypingResult()`
   subscription, no UI redesign. This is the ID T32-X already reserved for this work; the
   collision with this task's ID is recorded and **renumbering is an owner act**.
2. **T1 boot gate + T2 macOS/Windows build jobs** — the evidence class whose absence let the
   original defect class survive T08 → T32-U. Agent-executable, no external input.
3. **O-5 authority declaration** — reconcile `README.md`, `SORAVO_PLAN.md`, `PROGRESS.md:6` and
   the `docs/spec-v3/` situation against the v6 pack, now that the branch/ref distinction is
   established (§5).
4. **P-5 / P-6** — commit the untracked T32 report corpus; add the missing `## T32-U` entry.
5. **T32-S-1** — the release-exercise half (§8). **Owner + external certificates required.**
6. **O-1, O-2** — transcription-test treatment; the 9 catalog data items. **Owner decisions.**

**Explicitly NOT next tasks:** no `docs/spec-v3` deletion · no Handy behaviour change · no
transcript/session integration layer (T32-R §15.1 stands, un-overturned) · no `injectText()`
caller · no `onTypingResult()` subscription · no `crates/transcript` / `soravo-stt` /
`soravo-licensing` wiring · no `hotkey.rs` · no second STT or insertion path · no from-scratch
tray · no VAD backend switch · no `catalog.json` population · no change to Handy behaviour to
make CI green · **no merge of PR #63**.

---

## 15. SCOPE-CONSTRAINT ATTESTATION

- ✅ **No production source modified.** No test modified/added/removed/relocated/ignored/annotated.
  `catalog.json` not populated; **no** model id / hash / URL / licence / architecture /
  quantisation / mirror / score / provenance invented; no weight licence inferred from a software licence.
- ✅ **Zero Handy STT / audio / VAD / engine / language / filler / normalisation / punctuation /
  typing / clipboard / hotkey / post-processing files modified** — proven from the 9-path
  change set.
- ✅ **No transcription manager added; no STT producer created; no second transcription path;
  no second insertion path.**
- ✅ **`app.tsx` NOT modified.** **`ui/` NOT modified.** **No Handy behaviour changed.**
- ✅ **No ADR claim of platform verification.** macOS/Windows stated as `UNKNOWN`.
- ✅ **No `docs/spec-v3` deleted; no directory declared nonexistent.** The branch/ref
  distinction is recorded exactly.
- ✅ **The T32-W ADR draft retained unmodified.** Wrong claims corrected in the new ADR, with
  an 11-row amendment table; history is not rewritten.
- ✅ **No `PROGRESS.md` historical entry rewritten.** One entry appended.
- ✅ **No CI added, no workflow touched, no updater endpoint/key/credential invented.**
- ✅ **PR #63 NOT merged.**
- ✅ **Provider mutations: ZERO.** No secret read, printed, or committed. No `unsafe` introduced.
- ✅ **No untracked pre-existing work staged, deleted, or modified.**

---

*Task: T32-Y — Authority: `docs/Soravo_Engineering_Docs_v6/` §00–§21 + `SPEC_MANIFEST.json` +
`PROGRESS.md` (evidence only) + T29/T30/T32-A/T32-D/T32-I/T32-T/T32-V/T32-W/T32-X + live
repository, GitHub API, CI, and dependency-source evidence gathered 2026-09-30 on
`t31/soravo-wrapper-completion` @ `27200173`. Supersedes no historical report; corrects the
T32-X audit's finding N-4 in §5 above.*
