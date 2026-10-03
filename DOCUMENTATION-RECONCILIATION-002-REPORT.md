# DOCUMENTATION-RECONCILIATION-002 — Final Report

Status: complete. Deterministic reconciliation of `Soravo_Engineering_Docs_v4/` as the final engineering source of truth, performed 2026-09-27.

Repository: `eySRbS4zgHuW3gMFZB2/soravo`
Branch: `main`
HEAD: `2f96f3d21213bce24f049996d5ab897f16acd31b`
Prior reconciliation: `DOCUMENTATION-HYGIENE-001-REPORT.md`

---

## 1. Scope of change and non-change

Exactly three files were modified by this task:

1. `Soravo_Engineering_Docs_v4/SPEC_MANIFEST.json`
2. `Soravo_Engineering_Docs_v4/00_README.md`
3. `DOCUMENTATION-RECONCILIATION-002-REPORT.md` (new)

No substantive engineering requirement, acceptance criterion, target, threshold, gate, or process rule was created, removed, or reworded in any v4 file. The two v4 edits are metadata and read-order corrections only.

This task performed **no cleanup**. No document was deleted, archived, moved, or renamed. No source code, historical document, CI workflow, package configuration, lockfile, or operational file was modified. No commit was created. No push was performed.

---

## 2. `Soravo_Engineering_Docs_v4` manifest correction

### 2.1 Defect found

`SPEC_MANIFEST.json` declared `"file_count": 22` and enumerated 22 files. The pack contained 23 files. `DESIGN-wise.md` was present on disk and absent from the manifest. The manifest therefore under-declared the pack by one file and did not assign `DESIGN-wise.md` any role, authority level, or read-order position.

### 2.2 Correction applied

| Property | Before | After |
|---|---|---|
| `file_count` | 22 | 23 |
| `files` entries | 22 | 23 |
| `DESIGN-wise.md` represented | no | yes |
| `role` on every entry | no | yes (23/23) |
| `authority_level` on every entry | no | yes (23/23) |
| `read_order` on every entry | no | yes (23/23, unique, complete 1..23) |
| `authority_hierarchy` block | absent | present (Level 1-4 plus conflict rule) |
| `design_requirements_determination` block | absent | present |

Every one of the 22 previously listed files was verified to exist on disk. No nonexistent file was listed, so no entry required removal. 22 of 23 files are unchanged in identity; the 23rd (`DESIGN-wise.md`) is newly represented.

### 2.3 Verification result

Machine-checked after the edit:

```
JSON VALID
file_count field: 23
entries: 23
read_order 1..N unique: true
entries missing role/authority/read_order: 0
listed but not present: []
present but not listed: []
actual file count: 23
file_count matches actual: true
DESIGN-wise.md: present=true authority_level=R-REFERENCE read_order=23 is_soravo_design_system=false
non-authoritative: DESIGN-wise.md [R-REFERENCE]
```

Requirement coverage: every actual file is represented; `file_count` equals the actual count; no nonexistent file is listed; every file has an explicit role; every file has an explicit authority level; every file has an explicit read-order position; the authority status of `DESIGN-wise.md` is unambiguous.

### 2.4 Final pack composition — 23 files

| Read order | File | Authority level |
|---|---|---|
| 1 | `00_README.md` | A-AUTHORITATIVE |
| 2 | `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md` | A-AUTHORITATIVE |
| 3 | `02_PRODUCT_REQUIREMENTS.md` | A-AUTHORITATIVE |
| 4 | `03_TECHNICAL_DESIGN.md` | A-AUTHORITATIVE |
| 5 | `04_HANDY_FORK_AND_REUSE_POLICY.md` | A-AUTHORITATIVE |
| 6 | `05_DESKTOP_CONTRACTS.md` | A-AUTHORITATIVE |
| 7 | `06_WEB_CLOUD_PAYMENT.md` | A-AUTHORITATIVE |
| 8 | `07_IMPLEMENTATION_PLAN.md` | A-AUTHORITATIVE |
| 9 | `08_TASK_BREAKDOWN.md` | A-AUTHORITATIVE |
| 10 | `09_AI_AGENT_INSTRUCTIONS.md` | A-AUTHORITATIVE |
| 11 | `10_AI_SKILLS.md` | A-AUTHORITATIVE |
| 12 | `11_MCP_AND_AGENT_TOOLING.md` | A-AUTHORITATIVE |
| 13 | `12_SECURITY_BASELINE.md` | A-AUTHORITATIVE |
| 14 | `13_DEFINITION_OF_DONE_AND_QA.md` | A-AUTHORITATIVE |
| 15 | `14_CI_CD_AND_BRANCHING.md` | A-AUTHORITATIVE |
| 16 | `15_ENVIRONMENT_AND_SECRETS.md` | A-AUTHORITATIVE |
| 17 | `16_TEST_AND_BENCHMARK_PROTOCOL.md` | A-AUTHORITATIVE |
| 18 | `17_RELEASE_RUNBOOK.md` | A-AUTHORITATIVE |
| 19 | `18_INTERRUPTION_AND_HANDOFF.md` | A-AUTHORITATIVE |
| 20 | `19_STATE_AUDIT_PROTOCOL.md` | A-AUTHORITATIVE |
| 21 | `20_ADR_INDEX.md` | A-AUTHORITATIVE |
| 22 | `SPEC_MANIFEST.json` | A-AUTHORITATIVE |
| 23 | `DESIGN-wise.md` | R-REFERENCE |

`A-AUTHORITATIVE` is Level 1 of the ladder in §11. `R-REFERENCE` is Level 4. `DESIGN-wise.md` is the only non-authoritative file in the pack.

---

## 3. `00_README.md` read-order correction

### 3.1 Defect found

The read-order line enumerated 22 documents and terminated at `manifest`. `DESIGN-wise.md` was omitted, so a reader following the entry point would never encounter the file, and its status was unstated.

### 3.2 Correction applied

The read-order line now enumerates all 23 documents and terminates at `DESIGN-wise.md`, explicitly labelled as a non-authoritative third-party reference and directed to be read last. Three further lines were added:

1. The four-level authority ladder and the conflict rule, including the explicit statement that operational repository configuration is Level 2 and that current project state must never be inferred from the pack.
2. A concern-to-file index naming, for every concern in the pack, the single file that defines it.
3. The UI/design-requirements determination, stating that `DESIGN-wise.md` is not a source of Soravo requirements and that no v4 file currently defines a Soravo visual design system.

The existing `Purpose`, `Research HEAD`, `Repository`, `Status`, and "never infer current state" statements were preserved. The prior sentence "GitHub is implementation truth; this pack is intent, constraints, workflow and acceptance truth" was replaced by the authority ladder, which is strictly more precise: it names GitHub-tracked operational configuration as Level 2 and resolves the previous ambiguity between "this pack" and "GitHub" by rank rather than by domain.

### 3.3 Verification result

```
README read-order line present: true
files missing from README read order: []
README read order strictly ascending: true
DESIGN-wise.md is last: true
```

All 23 files appear exactly once, in manifest read-order sequence, with `DESIGN-wise.md` last.

---

## 4. v3 core documents — eight files

All eight files exist in the working tree and are git-tracked. Each has a direct v4 counterpart of equal or greater scope, so each is classified `SUPERSEDED`. None requires migration, none was deleted, and all remain in place as Level 4 historical material.

| v3 file | v4 replacement | Classification | Retain | Migration required |
|---|---|---|---|---|
| `docs/spec-v3/00_README.md` | `00_README.md` | SUPERSEDED | yes | no |
| `docs/spec-v3/01_PRD.md` | `02_PRODUCT_REQUIREMENTS.md` | SUPERSEDED | yes | no |
| `docs/spec-v3/02_ARCHITECTURE.md` | `03_TECHNICAL_DESIGN.md` | SUPERSEDED | yes | no |
| `docs/spec-v3/03_AI_INSTRUCTIONS.md` | `09_AI_AGENT_INSTRUCTIONS.md` | SUPERSEDED | yes | no |
| `docs/spec-v3/04_IMPLEMENTATION_PLAN.md` | `07_IMPLEMENTATION_PLAN.md` + `08_TASK_BREAKDOWN.md` | SUPERSEDED | yes | no |
| `docs/spec-v3/10_ADR_INDEX.md` | `20_ADR_INDEX.md` | SUPERSEDED | yes | no |
| `docs/spec-v3/19_DOCUMENT_GOVERNANCE.md` | `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md` + `19_STATE_AUDIT_PROTOCOL.md` | SUPERSEDED | yes | no |
| `docs/spec-v3/SPEC_MANIFEST.json` | `SPEC_MANIFEST.json` | SUPERSEDED | yes | no |

### 4.1 Code and configuration references to v3 documents

A repository-wide search across `*.ts`, `*.tsx`, `*.rs`, `*.mjs`, `*.js`, `*.json`, `*.toml`, `*.yml`, `*.yaml` returned exactly one source reference, and it does not target any of the eight core files:

- `supabase/tests/webhook-hardening.test.mjs:5` — a comment citing `docs/spec-v3/RAZORPAY-PAYMENT-ARCHITECTURE-021.md` (F1-F12).

No build script, CI workflow, `package.json`, `Cargo.toml`, or `pnpm-workspace.yaml` entry references any v3 document. The eight core v3 documents have zero code or configuration dependencies and are therefore safe to supersede without operational consequence.

### 4.2 Dangling v3 internal reference

`docs/spec-v3/04_IMPLEMENTATION_PLAN.md` references `05_TASK_BREAKDOWN.md`. `docs/spec-v3/05_TASK_BREAKDOWN.md` does not exist in the working tree and is not git-tracked. Its content exists only inside `docs/spec-v3.zip`. The dangling reference is a Level 4 historical defect, recorded here for traceability; no v3 file was edited to repair it.

---

## 5. `SORAVO_PLAN.md` analysis

### 5.1 Classification

`SORAVO_PLAN.md` is git-tracked, exists in the working tree, and is the document that `DOCUMENTATION-HYGIENE-001-REPORT.md` identified as the pre-v4 root authority.

**Classification: `SUPERSEDED` — retain, do not delete, do not migrate.**

Its requirements and constraints are re-derived, not copied, into the 23-file v4 pack. Because the v4 pack is a re-derivation rather than a transcription, no content migration is required and none was performed. Any requirement present only in `SORAVO_PLAN.md` would be a v4 gap and is recorded as `HUMAN REVIEW REQUIRED` in §12 rather than silently resolved.

### 5.2 References from the four retained documents

| Referencing file | Lines | Reference form | Classification of the reference |
|---|---|---|---|
| `PROGRESS.md` | 6, 14, 1370 | Names `SORAVO_PLAN.md` as governing authority | SUPERSEDED — `PROGRESS.md` is an evidence log (Level 3), not an authority source |
| `docs/spec-v3/MODEL_AND_BENCHMARK_REUSE_AUDIT.md` | 5 | Cites `SORAVO_PLAN.md` under `**Authority:**` | SUPERSEDED — v4 `04` and `16` govern |
| `docs/spec-v3/SORAVO_UI_INTEGRATION_PLAN.md` | 12 | Cites `SORAVO_PLAN.md` as the authority for the UI plan | SUPERSEDED — v4 `02`, `04` and `07` Phase 8 govern |
| `docs/spec-v3/SPEC_MANIFEST.json` | 5, 124 | Declares `SORAVO_PLAN.md` the root authority | SUPERSEDED — v4 `SPEC_MANIFEST.json` is the index |

All four referencing documents are retained unmodified. Each authority claim is `SUPERSEDED` by v4 under the Level 1 rule in §11. No referencing file was edited, because editing them is outside the three permitted paths and is unnecessary: the v4 authority ladder resolves the conflict deterministically for any reader who follows it.

---

## 6. Model provenance and STT benchmark

### 6.1 The conflict

`docs/spec-v3/MODEL_PROVENANCE_MATRIX.md` records 16 models and asserts 8 as `ready` (Whisper `small`/`base`/`medium`/`large-v3`/`turbo` variants and Moonshine variants, licensed MIT and Apache-2.0, verified 2026-01-15 against upstream repository licence files) and 8 as `under review` (NVIDIA Parakeet and SenseVoice families).

Three other retained documents assert the opposite for the same models:

- `docs/spec-v3/MODEL_AND_BENCHMARK_REUSE_AUDIT.md:13,177-189,271,287` — "ALL model licenses are BLOCKED/unknown"; every catalogue row, including Whisper and Moonshine, is `BLOCKED`.
- `docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md` and `docs/spec-v3/16_HANDY_MIGRATION_STATUS.md` — the latter states "Model catalog is empty. Upstream licenses unverified."
- `docs/spec-v3/STT-BENCHMARK-RESULTS-016.md` — records host, hardware, and candidate selection, and reports no completed performance measurement; measured values are unavailable.

`apps/desktop/src-tauri/src/catalog/catalog.json` contains `{}`, corroborating the "catalog is empty" statement.

### 6.2 Independent verification of the matrix's runtime claims

The matrix contains a "Runtime Model Manager Verification" section reporting five checks as `PASS`, with specific line citations into `crates/models/src/lib.rs` and `apps/desktop/src-tauri/src/managers/model.rs`. Direct inspection of the current tree contradicts this section:

- `ReleaseReadiness`, `release_readiness`, `license_verified`, `verify_license`, and `check_release_readiness` do not occur in any `.rs` file in the repository.
- `crates/models/src/lib.rs` declares `ModelError`, `ModelManifest`, `ModelFile`, `ModelBackend`, `HardwareRequirements`, `ModelState`, `Model`, `ModelDownloader`, `ModelManager`, `compute_sha256`, and `verify`. It contains no readiness enum and no licence-verification function.
- The matrix cites `model.rs` lines 708, 777, 845 and 913 as SHA-256 checksum evidence. Line 708 of the 3133-line `model.rs` is inside the Whisper `large` catalogue entry and contains a filename and a `blob.handy.computer` URL, not a checksum.
- The model identifiers the matrix names do exist in `model.rs` (`small`, `medium`, `turbo`, `large`, `canary_flash`).

The model-identity portion of the matrix is consistent with the tree. Its readiness and licence-verification verdicts are not reproducible from the tree.

### 6.3 Determinate classification

| Subject | Classification | Basis |
|---|---|---|
| 16-model identity, origin repository, and hosting location | `HISTORICAL` (Level 4 evidence) | Recorded fact; identity corroborated by `model.rs`; not superseded by any v4 row-level table |
| The 8 `ready` readiness and licence verdicts | `HUMAN REVIEW REQUIRED` | Unverifiable against the tree (§6.2) and directly contradicted by three sibling v3 documents (§6.1) |
| The 8 `under review` verdicts | `HUMAN REVIEW REQUIRED` | Same contradiction; no independent licence text is present in the repository |
| STT benchmark measurements | `HUMAN REVIEW REQUIRED` | No measurement exists in any retained document |
| v4's requirements for this area | `REQUIRED` and in force | v4 `04` requires independent verification of every model licence and separation of software licence from model-weight redistribution rights; v4 `16` defines the record/measure/target benchmark schema |

No licence conclusion, readiness value, or benchmark number was invented, and no `MIGRATION REQUIRED` action was taken. v4 does not contain a 16-row model table, so the v4 requirement is a rule to be satisfied, not a contradicted value; the per-model evidence remains in `docs/spec-v3/MODEL_PROVENANCE_MATRIX.md` as Level 4 material. Resolving the readiness conflict requires a human licensing determination against upstream terms, which this task is not authorised to make and which no document in the repository can settle.

---

## 7. `DESIGN-wise.md` authority status

### 7.1 Determination

**`DESIGN-wise.md` is NOT authoritative for any Soravo requirement and is NOT a Soravo design system. Classification: `R-REFERENCE` (Level 4, non-authoritative). No ambiguity remains.**

This determination is based on the document's own content, verified directly:

- YAML frontmatter declares `name: Wise-design-analysis`, `version: alpha`, and a description reading "An inspired interpretation of Wise's design language — a global money-transfer brand…"
- The string `Soravo` occurs **0** times. The string `Wise` occurs **26** times.
- The document contains no occurrence of "authoritative", "authority", "source of truth", or "specification".
- It mandates a proprietary third-party display typeface: "The proprietary `Wise Sans` family", "Don't replace Wise Sans with a generic geometric sans for hero typography — the proprietary face IS the brand's voice", and it names open-source substitutes at line 372.
- It states third-party brand rules: "Wise green is the sole identity colour" and "Don't introduce a second brand accent".

The content is an analysis of a third party's visual identity: 21 colour tokens (`#9fe870` primary, sage canvas `#e8ebe6`, near-black ink `#0e0f0c`), a 24 px canonical card and button radius, and a two-face display-typography ladder.

### 7.2 Correction to the prior reconciliation record

`DOCUMENTATION-HYGIENE-001-REPORT.md` §7 characterised `DESIGN-wise.md` as the current UI/design source of truth and as the design target for Phase 8. That characterisation is not supported by the document's own content and is corrected here. The file was retained unchanged; only its recorded status is corrected.

### 7.3 Conflict with the v4 pack

Adopting `DESIGN-wise.md` as a Soravo design specification would conflict with two A-AUTHORITATIVE files:

- `04_HANDY_FORK_AND_REUSE_POLICY.md` — requires branding replacement and reserves product and branding decisions to Soravo, not to a third party's identity.
- `20_ADR_INDEX.md` ADR-010 — defers the UI overhaul until functional and release gates pass.

It would additionally import a proprietary typeface, creating a licensing and attribution obligation that no v4 file authorises.

### 7.4 UI and design requirements — determinate answer

| Question | Answer |
|---|---|
| Which file defines UI/design requirements? | `02_PRODUCT_REQUIREMENTS.md` for scope and the binding redesign-deferral rule; `07_IMPLEMENTATION_PLAN.md` Phase 8 for the implementation gate |
| Is a Soravo visual design system defined anywhere in the pack? | No |
| Status of that gap | `HUMAN REVIEW REQUIRED` |
| May `DESIGN-wise.md` be used? | As an optional Phase 8 visual reference input only, subject to a Soravo-owned design decision |
| May it be used as a Soravo design specification, brand identity, or source of a second brand accent? | No |
| Disposition | Retained in place. Not deleted, not archived, not moved. Read order 23, read last. |

This determination is recorded in three places so it cannot be lost: `SPEC_MANIFEST.json` (`files[22]`, `design_authority_status`), `SPEC_MANIFEST.json` (`design_requirements_determination`), and `00_README.md`.

---

## 8. Handy integration details — six items

`DOCUMENTATION-HYGIENE-001-REPORT.md` §5.4 identified six pieces of Handy information present in v3 material and absent from the v4 pack. All six were re-verified against their sources in this task.

| # | Source | Unique content | Classification | Action |
|---|---|---|---|---|
| 1 | `docs/spec-v3/15_HANDY_REUSE_POLICY.md` §1–§3 | "Delete redundant Soravo implementation after consumers are migrated and tests pass" directive plus four named reuse categories; v4 `04` states the rule in one sentence without the categories or the deletion protocol | `HUMAN REVIEW REQUIRED` | Retained in place; not migrated |
| 2 | `docs/spec-v3/decisions/ADR-027-handy-derived-desktop-foundation.md` | 15 domains over which Soravo retains authority, plus the explicit "do not automatically pull upstream Handy changes" decision | `HUMAN REVIEW REQUIRED` | Retained in place; not migrated |
| 3 | `docs/spec-v3/18_DESKTOP_ARCHITECTURE.md` | Per-module Soravo-owned vs Handy-derived matrix at finer granularity than v4 `03`/`04` | `HUMAN REVIEW REQUIRED` | Retained in place; not migrated |
| 4 | `docs/spec-v3/16_HANDY_MIGRATION_STATUS.md` | 12-module Handy integration checklist (audio_toolkit+VAD, clipboard, input/typing, settings, tray, HandyKeys, overlay, catalogue/model-manager, transcription/manager, history, actions, secure_input) | `HUMAN REVIEW REQUIRED` | Retained in place; not migrated |
| 5 | `docs/compliance/TASK_1_2_DEPENDENCY_AUDIT.md` | Executed Handy-foundation dependency, licence and network audit, with telemetry-stripping evidence | `HUMAN REVIEW REQUIRED` | Retained in place; not migrated |
| 6 | `progress/STT-003-HANDY-REUSE-AUDIT.md` | Exact Handy upstream revision used for the STT subsystem | `HUMAN REVIEW REQUIRED` | Retained in place; not migrated |

Item 6 was independently confirmed at `progress/STT-003-HANDY-REUSE-AUDIT.md:5`, which records `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` as the Handy revision. v4 `04` requires a pinned source for any upstream sync but records no pin, so this is a concrete, closable v4 gap. Migrating it would be a substantive addition to `04_HANDY_FORK_AND_REUSE_POLICY.md`, which is outside the three permitted paths, so it was not migrated.

Two retention facts were established and are material:

- `ADR-027` is not present in `docs/spec-v3.zip` and not present in the root `decisions/` directory. `docs/spec-v3/decisions/ADR-027-handy-derived-desktop-foundation.md` is its sole carrier in this repository.
- Items 1–5 all reside in files that remain on disk. No cleanup was performed, so all six remain retrievable.

---

## 9. `docs/spec-v3.zip` decision

**Classification: `HISTORICAL` — non-authoritative snapshot. Retain. Not deleted, not archived, not moved.**

| Property | Value |
|---|---|
| Path | `docs/spec-v3.zip` |
| Entries | 56 |
| Archive entry timestamps | 2026-09-21 02:09 / 02:10 |
| Creating commit | `93c6c2a6` — "docs: Create V3 specification pack with Handy-derived architecture" |
| Commit timestamp | 2026-09-21 02:11:09 +0530 |
| Authority level | Level 4 |
| In v4 read order | No |

The archive is the only complete in-repository carrier of eight v3 files that are deleted in the current working tree: `06_DOD_QA.md`, `07_AI_SKILLS.md`, `08_MCP_AND_AGENT_TOOLING.md`, `09_SECURITY_BASELINE.md`, `11_INTERRUPTION_HANDOFF.md`, `12_BENCHMARK_PROTOCOL.md`, `13_RELEASE_RUNBOOK.md`, `14_ENVIRONMENT_AND_SECRETS.md`. Each of these eight is present in the archive and absent from disk. Deleting or archiving the zip would permanently remove their content from the repository. It is therefore classified `HISTORICAL` and explicitly **not** `SAFE TO DELETE`.

The archive additionally carries `05_TASK_BREAKDOWN.md`, which exists nowhere else (§4.2).

---

## 10. Root `README.md` status

| Property | Value |
|---|---|
| Path | `README.md` (repository root) |
| Git state | Tracked in HEAD; deleted in the working tree (` D README.md`) |
| Deletion origin | Pre-existing working-tree change; not caused by this task |
| Referenced by any CI workflow | No |
| Referenced by `package.json`, `Cargo.toml`, `pnpm-workspace.yaml` | No |
| Referenced by `playwright.config.ts`, `deny.toml` | No |
| CI workflows present | `ci.yml`, `pages-deployment.yaml`, `release.yml`, `security-audit.yml` — none reference a root README |
| Referenced by the v4 pack | No |
| Component READMEs present | `supabase/README.md`, `services/license-api/README.md`, `decisions/README.md` |

**Classification: not required by the project; `HUMAN REVIEW REQUIRED` as an optional repository-experience artifact. No action taken.**

No operational dependency on a root `README.md` exists anywhere in the repository. Nothing in CI, package configuration, or the v4 pack requires it, and no build, test, publish, or release step reads it. For engineering intent it is superseded by `Soravo_Engineering_Docs_v4/00_README.md`, which is the pack entry point and states the authority ladder.

Whether a human-facing repository README should exist is a repository-experience decision for the owner, not an engineering-correctness requirement. This task neither restored nor created it, because doing so would add a file outside the three permitted paths.

---

## 11. Final authority hierarchy

| Level | Scope | Content |
|---|---|---|
| **1** | Authoritative | `Soravo_Engineering_Docs_v4/` — binding engineering intent, constraints, workflow and acceptance truth |
| **2** | Operational | Operational repository configuration required to execute the project: manifests, lockfiles, CI, capability and Tauri config, `.env.example`, `deny.toml` |
| **3** | Current state / progress | Current state and progress records explicitly designated by v4. `PROGRESS.md` is an evidence log only; state itself requires a fresh audit per `19_STATE_AUDIT_PROTOCOL.md` |
| **4** | Historical | Historical archives and non-authoritative references: `docs/spec-v2-archive/`, `docs/spec-v3/`, `docs/spec-v3.zip`, `progress/`, and `DESIGN-wise.md` within the v4 pack |

Conflict rule: if documents conflict, v4 wins. A historical document must not override v4. Where v4 lacks required information, the result is `HUMAN REVIEW REQUIRED`; no inferred compromise is created. Operational configuration is subordinate to v4 intent but is the record of what is actually configured, so a divergence between a Level 1 requirement and a Level 2 configuration is reported as a finding, not silently reconciled.

---

## 12. Classification register

| Subject | Classification | Action taken |
|---|---|---|
| `Soravo_Engineering_Docs_v4/` (23 files) | `REQUIRED` | Manifest and read order corrected; all 23 represented |
| `DESIGN-wise.md` authority | `HUMAN REVIEW REQUIRED` (no Soravo design system exists) | Recorded as `R-REFERENCE`; status stated in three places |
| 8 v3 core files | `SUPERSEDED` | Retained; no code dependency found |
| `SORAVO_PLAN.md` | `SUPERSEDED` | Retained; deleted from active authority |
| 4 retained documents citing `SORAVO_PLAN.md` | Retained; their authority claims `SUPERSEDED` | Unmodified |
| 16-model identity/provenance data | `HISTORICAL` | Retained |
| Model readiness and licence verdicts | `HUMAN REVIEW REQUIRED` | Unresolved; no value invented |
| STT benchmark measurements | `HUMAN REVIEW REQUIRED` | Unresolved; no value invented |
| 6 Handy integration details | `HUMAN REVIEW REQUIRED` | Retained; not migrated |
| `docs/spec-v3.zip` | `HISTORICAL` | Retained; sole carrier of 8 deleted v3 files |
| Root `README.md` | `HUMAN REVIEW REQUIRED` (optional) | No action |
| v3 `05_TASK_BREAKDOWN.md` dangling reference | `HISTORICAL` defect | Recorded only |

No document was classified `SAFE TO ARCHIVE` or `SAFE TO DELETE`. No `MIGRATION REQUIRED` action was executed, because every candidate migration is a substantive requirement change and only three metadata-level files were in scope.

---

## 13. Current repository state snapshot

Per v4 `19_STATE_AUDIT_PROTOCOL.md`, current state is reported, not asserted, and transient counts are not frozen into the pack.

| Property | Value |
|---|---|
| Branch | `main` |
| HEAD | `2f96f3d21213bce24f049996d5ab897f16acd31b` |
| v4 pack `research_head` | `2f96f3d21213bce24f049996d5ab897f16acd31b` — identical to HEAD |
| v4 pack tracked by git | 0 files; the entire pack is untracked |
| Working-tree status entries | 58 (57 pre-existing + 1 created by this task) |
| v4 pack file count | 23, all present, manifest consistent |

The working tree was already heavily modified before this task: 22 source files across `apps/desktop`, `crates/audio`, `Cargo.lock` and `PROGRESS.md`; 13 root-level document deletions; 8 v3 document deletions; 4 untracked v3 documents. All of these pre-date this task and were left untouched.

No test count, deployment count, coverage figure, or CI result is asserted in this report. Per v4, obtaining them requires a fresh audit.

---

## 14. Exact files modified by this task

1. `Soravo_Engineering_Docs_v4/SPEC_MANIFEST.json` — `file_count` 22 → 23; `DESIGN-wise.md` entry added; `role`, `authority_level` and `read_order` added to all 23 entries; `authority_hierarchy` and `design_requirements_determination` blocks added. No engineering requirement changed.
2. `Soravo_Engineering_Docs_v4/00_README.md` — read order 22 → 23 items with `DESIGN-wise.md` last and labelled non-authoritative; authority ladder added; concern-to-file index added; UI/design-requirements determination added. No engineering requirement changed.
3. `DOCUMENTATION-RECONCILIATION-002-REPORT.md` — this file, created.

A temporary verification script `reconcile-verify.tmp.js` was created at the repository root to machine-check the manifest and README, executed, and deleted. It is not part of the final state and does not appear in `git status`.

---

## 15. Final `git status --short`

```
 D 01_PRD.md
 D 02_TDD.md
 D 03_AI_INSTRUCTIONS.md
 D 04_IMPLEMENTATION_PLAN.md
 D 05_TASK_BREAKDOWN.md
 D 06_DOD_QA.md
 D 07_AI_SKILLS.md
 D 08_MCP_AND_AGENT_TOOLING.md
 D 09_SECURITY_BASELINE.md
 D 10_ADR_INDEX.md
 D 11_INTERRUPTION_HANDOFF.md
 D 12_BENCHMARK_PROTOCOL.md
 D 13_RELEASE_RUNBOOK.md
 D 14_ENVIRONMENT_AND_SECRETS.md
 M Cargo.lock
 M PROGRESS.md
 D README.md
 D SORAVO_HANDY_CODE_REUSE_REPORT.md
 D SPEC_MANIFEST.json
 M apps/desktop/src-tauri/Cargo.toml
 M apps/desktop/src-tauri/build.rs
 M apps/desktop/src-tauri/src/actions.rs
 M apps/desktop/src-tauri/src/audio_feedback.rs
 M apps/desktop/src-tauri/src/audio_toolkit/mod.rs
 M apps/desktop/src-tauri/src/audio_toolkit/vad/mod.rs
 M apps/desktop/src-tauri/src/commands/audio.rs
 M apps/desktop/src-tauri/src/lib.rs
 M apps/desktop/src-tauri/src/managers/model.rs
 M apps/desktop/src-tauri/src/managers/model/download.rs
 M apps/desktop/src-tauri/src/memory.rs
 M apps/desktop/src-tauri/src/tray_i18n.rs
 M apps/website/src/lib/payment-service.ts
 M apps/website/src/pages/account.tsx
 M apps/website/src/pages/pricing.test.tsx
 M apps/website/src/pages/pricing.tsx
 M crates/audio/src/audio/mod.rs
 D docs/COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md
 D docs/spec-v3/06_DOD_QA.md
 D docs/spec-v3/07_AI_SKILLS.md
 D docs/spec-v3/08_MCP_AND_AGENT_TOOLING.md
 D docs/spec-v3/09_SECURITY_BASELINE.md
 D docs/spec-v3/11_INTERRUPTION_HANDOFF.md
 D docs/spec-v3/12_BENCHMARK_PROTOCOL.md
 D docs/spec-v3/13_RELEASE_RUNBOOK.md
 D docs/spec-v3/14_ENVIRONMENT_AND_SECRETS.md
?? DOCUMENTATION-HYGIENE-001-REPORT.md
?? DOCUMENTATION-RECONCILIATION-002-REPORT.md
?? Soravo_Engineering_Docs_v4/
?? apps/desktop/.env.example
?? apps/desktop/src-tauri/src/audio_toolkit/post_process.rs
?? apps/desktop/src-tauri/src/commands/account.rs
?? apps/desktop/src-tauri/src/helpers/
?? apps/website/src/lib/payment-service.test.ts
?? deno.lock
?? docs/spec-v3/MODEL_AND_BENCHMARK_REUSE_AUDIT.md
?? docs/spec-v3/MODEL_PROVENANCE_MATRIX.md
?? docs/spec-v3/SORAVO_UI_INTEGRATION_PLAN.md
?? docs/spec-v3/STT-BENCHMARK-RESULTS-016.md
```

58 entries. Exactly two are attributable to this task:

- `?? DOCUMENTATION-RECONCILIATION-002-REPORT.md` — this report.
- `?? Soravo_Engineering_Docs_v4/` — the whole pack appears as one line because all 23 of its files are untracked. Exactly two files inside it were written: `SPEC_MANIFEST.json` and `00_README.md`. No write, edit, move, or delete was issued against the other 21.

The remaining 56 entries pre-date this task and were left untouched. No entry was added, removed, or altered by this task other than the two listed above.

---

## 16. Explicit statements

- No source code was modified by this task.
- No historical document was modified by this task.
- No CI workflow was modified by this task.
- No package configuration or lockfile was modified by this task.
- No operational file was modified by this task.
- No document was deleted, archived, moved, or renamed by this task.
- No substantive engineering requirement, acceptance criterion, target, threshold, gate, or process rule was created, removed, or reworded.
- No licence conclusion, benchmark measurement, or readiness value was invented.
- No inferred compromise was created to resolve a v4 information gap; every such gap is recorded as `HUMAN REVIEW REQUIRED`.
- No commit was created. No push was performed. No branch was created, switched, or deleted.
- `Soravo_Engineering_Docs_v4/` is the final engineering source of truth per the Level 1 rule in §11.
