# DOCUMENTATION-HYGIENE-001 — Legacy Documentation Audit and Source-of-Truth Cleanup

**Task:** DOCUMENTATION-HYGIENE-001
**Date of audit:** 2026-09-27
**Auditor:** opencode agent session
**Audit repository HEAD:** `2f96f3d21213bce24f049996d5ab897f16acd31b` (branch `main`, `origin/main` identical)
**Research HEAD declared by the new pack:** `2f96f3d21213bce24f049996d5ab897f16acd31b` — **MATCH**

**No commit, push, branch, reset, stash or amend was performed. No application or source code was modified. The new engineering pack was not altered.**

---

## 1. Current authoritative specification

**Directory:** `Soravo_Engineering_Docs_v4/`

Per `Soravo_Engineering_Docs_v4/00_README.md` and `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md`, this directory is the sole authoritative engineering-control pack. The authority ladder established by the new pack is:

1. Safety/security/legal constraints
2. Explicit non-negotiable rules in the pack
3. Accepted ADRs
4. Current GitHub implementation
5. PRD/TDD
6. Implementation plan/tasks
7. Tests/CI
8. Historical progress/audits
9. Agent preference

Every document in the repository outside `Soravo_Engineering_Docs_v4/` is NON-AUTHORITATIVE unless it is (a) an accepted ADR body, (b) a required operational/configuration file, or (c) explicitly named by the new pack (`PROGRESS.md` is named at tier 8 as an evidence log, and `decisions/` is required by `20_ADR_INDEX.md`).

**Binding rule applied throughout this report:** where a legacy document conflicts with `Soravo_Engineering_Docs_v4/`, the new pack wins. No compromise text was invented. Unique legacy information absent from the new pack is flagged for human review and was **not** merged into the pack.

---

## 2. Complete documentation inventory

Scanned: `*.md`, `*.mdx`, `*.txt`, `*.json` (specification/manifest), `docs/`, `progress/`, `tasks/`, `decisions/`, root reports, `.opencode/`, `.github/`, `Soravo_Engineering_Docs_v4/`.
Excluded from inspection as non-documentation: `node_modules/`, `target/`, `apps/desktop/src-tauri/target/`, `.pnpm-store/`, `apps/website/dist/`, `supabase/.temp/`, `test-results/`, `.swarm/`, `.swarm-worktrees/`, `apps/desktop/src-tauri/gen/schemas/*.json` (generated Tauri schemas).

Counts:

| Group | Files |
|---|---|
| New authoritative pack (`Soravo_Engineering_Docs_v4/`) | 23 |
| Root-level documentation / reports | 26 (15 already deleted in the working tree before this task; 1 is this report) |
| `docs/` (incl. spec-v2-archive, spec-v3, spec-v3.zip) | 79 (78 documents + 1 archive container) |
| `progress/` | 16 |
| `decisions/` | 14 |
| `supabase/README.md`, `services/license-api/README.md` | 2 |
| `.opencode/` config (non-`node_modules`) | 4 |
| `.github/` (workflows + dependabot) | 5 |
| **Total documentation candidates inspected** | **168 legacy + this report** |

Counted by `find -type f` over each root, excluding only the paths listed in the scan exclusions above. The five READMEs in the repository are accounted for as: `decisions/README.md` (inside the `decisions` group), `docs/spec-v2-archive/README.md` and `docs/spec-v2-archive/decisions/README.md` (inside the archive group), and the 2 service READMEs above. There is no root `README.md` — it is deleted in the working tree (§4.1).

### 2.1 Root level

| Path | Git | Bytes | Modified |
|---|---|---|---|
| `Soravo_Engineering_Docs_v4/` | untracked | 23 files | 2026-09-27 04:55–05:18 |
| `DOCUMENTATION-HYGIENE-001-REPORT.md` | untracked | this report | created by this task |
| `PROGRESS.md` | tracked (M) | 110328 | 2026-09-27 07:19 |
| `SORAVO_PLAN.md` | tracked | 9432 | 2026-09-27 06:48 |
| `SORAVO_HANDY_CODE_REUSE_REPORT.md` | tracked | 51150 | 2026-09-27 02:09 |
| `SPEC_MANIFEST.json` | tracked | 1380 | 2026-09-27 02:09 |
| `FUNCTIONAL-INTEGRATION-REPORT.md` | untracked | 17753 | 2026-09-27 02:09 |
| `INTEGRATION-BASELINE-009.md` | untracked | 10469 | 2026-09-27 02:09 |
| `INTEGRATION_AUDIT_008.md` | untracked | 858 | 2026-09-27 02:09 |
| `FRONTEND-DEPLOYMENT-DRIFT-AUDIT.md` | untracked | 3895 | 2026-09-27 06:47 |
| `RAZORPAY-REGIONAL-PRICING-028-VERIFICATION.md` | untracked | 2732 | 2026-09-27 04:24 |
| `01_PRD.md` … `14_ENVIRONMENT_AND_SECRETS.md` | tracked, **already deleted in worktree** | — | — |
| `README.md` | tracked, **already deleted in worktree** | — | — |
| `LICENSE` | tracked | 1192 | 2026-09-27 02:09 |

### 2.2 `docs/`

| Path | Git | Bytes |
|---|---|---|
| `docs/ARCHITECTURE.md` | tracked | 1100 |
| `docs/SECURITY_POLICY.md` | tracked | 2503 |
| `docs/HANDY_V1_PLAN.md` | tracked | 5291 |
| `docs/COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md` | tracked | 6954 |
| `docs/compliance/TASK_1_2_DEPENDENCY_AUDIT.md` | tracked | 5741 |
| `docs/spec-v2-archive/**` (32 files) | tracked | — |
| `docs/spec-v3/**` (41 files) | 34 tracked + 7 untracked | — |
| `docs/spec-v3.zip` | tracked | 152968 |

Note: `docs/COMPLIANCE/` and `docs/compliance/` are **two distinct real directories** (distinct inodes 2509111 / 655989) differing only by case, on a case-sensitive filesystem. `docs/COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md` and `docs/compliance/TASK_1_2_DEPENDENCY_AUDIT.md` are **different documents**. Verified: `docs/COMPLIANCE/` contains only the single duplicate file, so removing that directory removes nothing else.

### 2.3 `progress/` (16 files, all tracked)

`BENCHMARKS.md`, `ENVIRONMENT.md`, `FOUNDATION_AUDIT.md`, `GIT-BRANCH-CLEANUP-AUDIT.md`, `MCP.md`, `NEXT.md`, `OPENCODE_TAKEOVER.md`, `SKILLS.md`, `SKILLS_MCP_AUDIT.md`, `STATUS.md`, `STT-002-BENCHMARK-REPORT.md`, `STT-003-HANDY-REUSE-AUDIT.md`, `STT-003-IMPLEMENTATION-SUMMARY.md`, `TRANS_002_006.md`, `TYPE-002-003-HANDY-REUSE-AUDIT.md`, `TYPE-002-003-IMPLEMENTATION.md`. Dated 2026-09-14 → 2026-09-20.

### 2.4 Operational / configuration (not specification)

`LICENSE`; `package.json`; `Cargo.toml`; `Cargo.lock`; `deno.lock`; `pnpm-lock.yaml`; `pnpm-workspace.yaml`; `tsconfig.base.json`; `deny.toml`; `playwright.config.ts`; `apps/*/package.json`, `apps/*/tsconfig.json`, `apps/*/components.json`; `apps/desktop/src-tauri/tauri.conf.json`, `capabilities/default.json`, `src/catalog/catalog.json`; `packages/payment-domain/{package.json,tsconfig.json}`; `services/license-api/{package.json,tsconfig.json}`; `apps/desktop/.env.example` (untracked env template); `apps/website/public/robots.txt`; `.github/dependabot.yml`; `.github/workflows/{ci.yml,pages-deployment.yaml,release.yml,security-audit.yml}`; `.opencode/{opencode-swarm.json,.gitignore,package.json,package-lock.json}`; `supabase/README.md`; `services/license-api/README.md`; `decisions/README.md`; `docs/SECURITY_POLICY.md`.

### 2.5 Local agent state — NOT repository documentation

| Path | Status | Disposition |
|---|---|---|
| `.swarm/` | untracked, excluded via `.git/info/exclude` | Agent runtime state. Not part of the engineering specification. **Not touched.** |
| `.swarm-worktrees/` | untracked, excluded via `.git/info/exclude` | Contains 3 live git worktrees. **Not touched — HUMAN REVIEW REQUIRED before any prune.** |
| `test-results/` | untracked, empty, gitignored | **Not touched.** |
| `testsprite_tests/tmp/mcp.log` | untracked, gitignored (`*.log`) | **Not touched.** |
| `apps/website/dist/` | untracked build artifact, gitignored | **Not touched.** |
| `supabase/.temp/` | untracked, gitignored | **Not touched.** |

---

## 3. New-pack manifest — `Soravo_Engineering_Docs_v4/`

Authority level for all 23 files: **A — AUTHORITATIVE** (intent, constraints, workflow and acceptance truth). GitHub remains implementation truth per `00_README.md`.

| # | File | Purpose | Defines | Depends on |
|---|---|---|---|---|
| 1 | `00_README.md` | Pack entry point, read order, evidence-vocabulary warning | source of truth, current-project-state rule | all |
| 2 | `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md` | 9-level authority ladder, evidence vocabulary | source of truth, state-audit reporting, ADR discipline | 00 |
| 3 | `02_PRODUCT_REQUIREMENTS.md` | V1 product scope and success definition | product requirements, UI-deferral rule | 01 |
| 4 | `03_TECHNICAL_DESIGN.md` | Architecture, session machine, audio chain, model lifecycle, price catalog | architecture, implementation rules, payment catalog | 01,02 |
| 5 | `04_HANDY_FORK_AND_REUSE_POLICY.md` | Handy derive/fork/rebrand policy, ADOPT/ADAPT/SORAVO-OWNED/REPLACE matrix | **Handy fork/reuse policy**, licensing, no-auto-upstream-sync | 01,03 |
| 6 | `05_DESKTOP_CONTRACTS.md` | Session/transcript/IPC/typing/audio/model/entitlement/Tauri invariants | architecture, security, implementation rules | 03 |
| 7 | `06_WEB_CLOUD_PAYMENT.md` | Website/auth/checkout/webhook/entitlement contract | payment requirements, security, environment | 03 |
| 8 | `07_IMPLEMENTATION_PLAN.md` | Phases 0–8, desktop recovery focus, dependency rule | implementation plan | 04,05,06 |
| 9 | `08_TASK_BREAKDOWN.md` | T01–T11 atomic tasks | task breakdown | 07 |
| 10 | `09_AI_AGENT_INSTRUCTIONS.md` | Mission loop, first actions, prohibitions, reporting | **AI coding-agent behavior** | 01,12 |
| 11 | `10_AI_SKILLS.md` | Skill families, selection discipline, re-audit rule | AI skills policy | 09 |
| 12 | `11_MCP_AND_AGENT_TOOLING.md` | MCP preference, verification rule, no-token rule | **MCP/tooling** | 09 |
| 13 | `12_SECURITY_BASELINE.md` | Non-negotiable security controls, untrusted-data rule | **security** | 09 |
| 14 | `13_DEFINITION_OF_DONE_AND_QA.md` | Universal DoD, L0–L4, payment + desktop acceptance | **testing requirements** | 12 |
| 15 | `14_CI_CD_AND_BRANCHING.md` | Branch format, CI families, failure classification, CI≠deploy | **CI/CD** | 13 |
| 16 | `15_ENVIRONMENT_AND_SECRETS.md` | Public/server-only/platform variables, escalation | **environment/secrets** | 12 |
| 17 | `16_TEST_AND_BENCHMARK_PROTOCOL.md` | STT benchmark record/measure/targets, payment evidence, webhook cases | **testing/benchmarking** | 13 |
| 18 | `17_RELEASE_RUNBOOK.md` | Preconditions, artifacts, post-publication, TEST→LIVE gate, rollback | **release** | 13,16 |
| 19 | `18_INTERRUPTION_AND_HANDOFF.md` | Handoff schema, DO_NOT_REPEAT, reproduce-first-failure | **interruption/handoff** | 09 |
| 20 | `19_STATE_AUDIT_PROTOCOL.md` | Git/env/CI/external audit commands and report keys | **state audit** | 01,11 |
| 21 | `20_ADR_INDEX.md` | ADR-001…ADR-016 and ADR creation triggers | architecture, ADR authority | 01 |
| 22 | `SPEC_MANIFEST.json` | Machine-readable pack manifest | source of truth (machine) | all |
| 23 | `DESIGN-wise.md` | UI design system: colors, typography, spacing, radius, components, do/don't | **UI/design** | 02,08 (Phase 8) |

**Not defined anywhere in the new pack (see §11 HUMAN REVIEW):** no current project-state ledger, no model-license verification field list, no per-model provenance data, no STT benchmark measurements, no Handy integration module checklist, no payment verification evidence log, no environment/MCP behaviour notes, no supply-chain policy document reference.

---

## 4. Legacy classification table

Legend: **A** authoritative · **B** required operational · **C** current state/progress · **D** historical reference · **E** duplicate/superseded · **F** obsolete temporary report · **G** unrelated

### 4.1 Root level

| File | Classification | Reason | Superseded By | Referenced? | Safe to Remove? | Action |
|---|---|---|---|---|---|---|
| `Soravo_Engineering_Docs_v4/**` (23) | A | Sole authoritative pack | — | No inbound refs | **NO — never** | Retained, unmodified |
| `PROGRESS.md` | C | Named by new pack `01_AUTHORITY` at tier 8 as evidence log | — | Self + v3 docs | **NO** | Retained; content is v3-era — HUMAN REVIEW |
| `SORAVO_PLAN.md` | E | Self-declares "Repository root authority document"; names V3 authoritative. Directly conflicts with new pack authority model | `Soravo_Engineering_Docs_v4/01` | **Yes** — `PROGRESS.md:6,14,1370`, `docs/spec-v3/SPEC_MANIFEST.json:5,124`, `docs/spec-v3/SORAVO_UI_INTEGRATION_PLAN.md:12`, `docs/spec-v3/MODEL_AND_BENCHMARK_REUSE_AUDIT.md:5,308` | **NO — referenced by retained docs** | Retained; **HUMAN REVIEW REQUIRED** (highest-priority conflict) |
| `SORAVO_HANDY_CODE_REUSE_REPORT.md` | E | **Byte-identical** to `docs/spec-v2-archive/SORAVO_HANDY_CODE_REUSE_REPORT.md`; v2 Handy strategy superseded by `04_HANDY_FORK_AND_REUSE_POLICY.md` | `Soravo_Engineering_Docs_v4/04` | By name only from `docs/HANDY_V1_PLAN.md`, `docs/spec-v2-archive/README.md` — both resolve to the retained archive copy | **YES** | **REMOVED** |
| `SPEC_MANIFEST.json` | E | **Byte-identical** to `docs/spec-v2-archive/SPEC_MANIFEST.json`; declares `spec_version 2.0` and lists 14 root documents that no longer exist at root | `Soravo_Engineering_Docs_v4/SPEC_MANIFEST.json` | No code/CI/config ref | **YES** | **REMOVED** |
| `FUNCTIONAL-INTEGRATION-REPORT.md` | F | One-off static-analysis audit; SHA-pinned to `a156c8c9`; 28-capability checklist. `PROGRESS.md:1372` already classifies it as an "unrelated untracked report"; `PROGRESS.md:1744` already lists it as "intentionally excluded" | `Soravo_Engineering_Docs_v4/19` (fresh state audit required) | Only self-references | **YES** | **REMOVED** |
| `INTEGRATION-BASELINE-009.md` | F | Git-state baseline (SHA `a156c8c9`, 47-branch listing). Wholly re-derivable by the `git` block in `19_STATE_AUDIT_PROTOCOL.md` | `Soravo_Engineering_Docs_v4/19` | Only self-references | **YES** | **REMOVED** |
| `INTEGRATION_AUDIT_008.md` | F | Forensic audit with coverage/readiness percentages; no engineering content beyond the above | `Soravo_Engineering_Docs_v4/19` | Only self-references | **YES** | **REMOVED** |
| `FRONTEND-DEPLOYMENT-DRIFT-AUDIT.md` | F | Transient drift snapshot at branch `feature/razorpay-payments-021-026` / `091f9e92`. `PROGRESS.md:1744` already lists it as "intentionally excluded" | `Soravo_Engineering_Docs_v4/19` | `PROGRESS.md:1744` (prose mention) | **YES** | **REMOVED** |
| `RAZORPAY-REGIONAL-PRICING-028-VERIFICATION.md` | E | Duplicate of the retained, richer tracked `docs/spec-v3/RAZORPAY-REGIONAL-PRICING-028.md`; same 5-currency result, same 61/61 + 178/178 counts. `PROGRESS.md:1744` lists it as "intentionally excluded" | `docs/spec-v3/RAZORPAY-REGIONAL-PRICING-028.md` | `PROGRESS.md:1744` (prose mention) | **YES** | **REMOVED** |
| `01_PRD.md` … `14_ENVIRONMENT_AND_SECRETS.md`, `README.md` | E | v2 root pack; identical copies preserved in `docs/spec-v2-archive/` | `Soravo_Engineering_Docs_v4/` | `SPEC_MANIFEST.json` (removed), `progress/BENCHMARKS.md` | n/a | **Already deleted in the worktree before this task.** No action. Removing `README.md` leaves the repository with **no root README** — HUMAN REVIEW REQUIRED |
| `LICENSE` | B | Legal record | — | — | **NO — never** | Retained |

### 4.2 `docs/`

| File | Classification | Reason | Superseded By | Referenced? | Safe to Remove? | Action |
|---|---|---|---|---|---|---|
| `docs/ARCHITECTURE.md` | E | v2-era module map. **Conflicts** with new pack: states `services/license-api` owns the product catalog and that "Real Razorpay integration is reserved for CLOUD-010/CLOUD-011" and "`supabase`: reserved for committed migrations" | `Soravo_Engineering_Docs_v4/03` + `/06` | `progress/OPENCODE_TAKEOVER.md:34` | **NO — tracked, distinct content, historical value uncertain** | Retained; **HUMAN REVIEW REQUIRED** |
| `docs/SECURITY_POLICY.md` | B | Executed supply-chain policy: matches `.github/workflows/security-audit.yml` exactly (`cargo audit --ignore GHSA-q83h-524g-xf6h` = documented h2 exception; `cargo deny check`; `pnpm audit --prod --audit-level=high`) and carries the allowed-licence list and the `vad-rs` SHA pin required by new pack `04` | — | CI-equivalent, `deny.toml` | **NO — security record, never** | Retained |
| `docs/HANDY_V1_PLAN.md` | E | v2/v3-era Handy plan. Self-declares "Old generic plan superseded (ADR-026)". References a non-existent `.swarm/spec.md` and a non-existent `SORAVO_HANDY_FLUIDVOICE_FLUIDAUDIO_COMBINED_AUDIT.md` | `Soravo_Engineering_Docs_v4/04` + `/08` | No code/CI ref | **NO — tracked, distinct content** | Retained; **HUMAN REVIEW REQUIRED** (broken references) |
| `docs/COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md` | E | **Byte-identical** to `docs/spec-v2-archive/COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md`. Removing it also eliminates the `docs/COMPLIANCE` vs `docs/compliance` case-collision while preserving the distinct `docs/compliance/TASK_1_2_DEPENDENCY_AUDIT.md` | `docs/spec-v2-archive/COMPLIANCE/` copy | Self only | **YES** | **REMOVED** |
| `docs/compliance/TASK_1_2_DEPENDENCY_AUDIT.md` | D | Distinct document (dependency/licence/network audit, task 1.2). No v4 equivalent | — | No | **NO — unique content** | Retained |
| `docs/spec-v3.zip` | D | **Tracked** 152,968-byte container holding a 2026-09-21 snapshot of `docs/spec-v3/` (41 files) plus 13 files from `docs/spec-v2-archive/` — 56 entries total. It is a *third* copy of both trees, but its snapshot predates the 2026-09-26/27 edits to the tracked v3 payment reports, so it may hold the only surviving earlier state of those files. Also a partial snapshot: it holds 13 archive files where the live archive holds 32 | `Soravo_Engineering_Docs_v4/` | No code/CI ref | **NO — tracked, may be the only copy of a superseded state** | Retained; **HUMAN REVIEW REQUIRED** |
| `docs/spec-v2-archive/**` (32) | D | Repository's own designated archive convention, referenced by `docs/spec-v2-archive/19`-era governance and by new pack tier 8 ("historical progress/audits"). Preserved byte-for-byte | — | `SORAVO_PLAN.md`, `docs/spec-v2-archive/README.md` | **NO — do not modify, do not relocate** | Retained unchanged |

#### `docs/spec-v3/` — core specification documents

| File | Classification | Reason | Superseded By | Referenced? | Safe to Remove? | Action |
|---|---|---|---|---|---|---|
| `00_README.md` | E | Self-declares "Status: Authoritative" and a 10-level authority ladder whose #1 is `03_AI_INSTRUCTIONS.md`. Conflicts with new pack `01` | `Soravo_Engineering_Docs_v4/01` | `docs/spec-v3/SPEC_MANIFEST.json` | **NO — tracked, distinct, historical value uncertain** | Retained; **HUMAN REVIEW REQUIRED** |
| `01_PRD.md` | E | v3 PRD, differs from v2 and v4 | `Soravo_Engineering_Docs_v4/02` | v3 manifest | **NO** | Retained; **HUMAN REVIEW REQUIRED** |
| `02_ARCHITECTURE.md` | E | v3 architecture, "Handy-derived", differs from v2/v4 | `Soravo_Engineering_Docs_v4/03` | v3 manifest | **NO** | Retained; **HUMAN REVIEW REQUIRED** |
| `03_AI_INSTRUCTIONS.md` | E | v3 agent rules, ranked above ADRs/PRD — conflicts with new pack `01` ladder where ADRs outrank PRD/TDD | `Soravo_Engineering_Docs_v4/01` + `/09` | v3 manifest, `SORAVO_PLAN.md` | **NO** | Retained; **HUMAN REVIEW REQUIRED** |
| `04_IMPLEMENTATION_PLAN.md` | E | v3 phase plan (phases 0–14). Conflicts with new pack `07` (phases 0–8, UI overhaul = Phase 8) | `Soravo_Engineering_Docs_v4/07` | `SORAVO_UI_INTEGRATION_PLAN.md:12` | **NO** | Retained; **HUMAN REVIEW REQUIRED** |
| `05_TASK_BREAKDOWN.md` | — | **FILE DOES NOT EXIST** | — | Listed in `docs/spec-v3/00_README.md` §Document Order and in `docs/spec-v3/SPEC_MANIFEST.json` | n/a | **HUMAN REVIEW REQUIRED** (pre-existing broken reference, not caused by this task) |
| `06_DOD_QA.md` | E | **Byte-identical** to `docs/spec-v2-archive/06_DOD_QA.md` | `Soravo_Engineering_Docs_v4/13` | v3 README/manifest (superseded) | **YES** | **REMOVED** |
| `07_AI_SKILLS.md` | E | **Byte-identical** to `docs/spec-v2-archive/07_AI_SKILLS.md` | `Soravo_Engineering_Docs_v4/10` | v3 README/manifest | **YES** | **REMOVED** |
| `08_MCP_AND_AGENT_TOOLING.md` | E | **Byte-identical** to `docs/spec-v2-archive/08_MCP_AND_AGENT_TOOLING.md` | `Soravo_Engineering_Docs_v4/11` | v3 README/manifest | **YES** | **REMOVED** |
| `09_SECURITY_BASELINE.md` | E | **Byte-identical** to `docs/spec-v2-archive/09_SECURITY_BASELINE.md` | `Soravo_Engineering_Docs_v4/12` | v3 README/manifest | **YES** | **REMOVED** |
| `10_ADR_INDEX.md` | E | v3 ADR index (differs from v2; ADR-027 absent from the new pack's index) | `Soravo_Engineering_Docs_v4/20` | v3 manifest | **NO — tracked, distinct** | Retained; **HUMAN REVIEW REQUIRED** |
| `11_INTERRUPTION_HANDOFF.md` | E | **Byte-identical** to `docs/spec-v2-archive/11_INTERRUPTION_HANDOFF.md` | `Soravo_Engineering_Docs_v4/18` | v3 README/manifest | **YES** | **REMOVED** |
| `12_BENCHMARK_PROTOCOL.md` | E | **Byte-identical** to `docs/spec-v2-archive/12_BENCHMARK_PROTOCOL.md` | `Soravo_Engineering_Docs_v4/16` | v3 README/manifest, `progress/BENCHMARKS.md` | **YES** | **REMOVED** |
| `13_RELEASE_RUNBOOK.md` | E | **Byte-identical** to `docs/spec-v2-archive/13_RELEASE_RUNBOOK.md` | `Soravo_Engineering_Docs_v4/17` | v3 README/manifest | **YES** | **REMOVED** |
| `14_ENVIRONMENT_AND_SECRETS.md` | E | **Byte-identical** to `docs/spec-v2-archive/14_ENVIRONMENT_AND_SECRETS.md` | `Soravo_Engineering_Docs_v4/15` | v3 README/manifest | **YES** | **REMOVED** |
| `15_HANDY_REUSE_POLICY.md` | D | v3 Handy reuse policy — substantially more detailed than new pack `04` (reuse categories, "do not preserve code merely because Soravo already implemented it", deletion-after-migration rule) | `Soravo_Engineering_Docs_v4/04` (condensed) | v3 README/manifest | **NO — unique detail** | Retained; **unique info flagged** |
| `16_HANDY_MIGRATION_STATUS.md` | F | Stale state snapshot (`origin/main 216cf23`, branch `feature/HANDY-MIGRATION-001`, "NOT YET MERGED") — now false. The new pack contains no state ledger by design | `Soravo_Engineering_Docs_v4/19` | v3 README/manifest | **NO — tracked; integrated-module checklist is unique** | Retained; **HUMAN REVIEW REQUIRED** |
| `17_MODEL_LICENSE_AND_PROVENANCE.md` | D | Required per-model verification field list and the software-licence ≠ model-weight ≠ hosting-rights distinction. New pack `04`/`08` T07 state the gate but not the fields | — | v3 README, `MODEL_AND_BENCHMARK_REUSE_AUDIT.md:5` | **NO — unique content** | Retained; **unique info flagged** |
| `18_DESKTOP_ARCHITECTURE.md` | D | Desktop component matrix (Soravo-owned vs Handy-derived per module) at finer granularity than new pack `03`/`04` | `Soravo_Engineering_Docs_v4/03` | v3 README | **NO — unique content** | Retained; **unique info flagged** |
| `19_DOCUMENT_GOVERNANCE.md` | E | Declares "V3 is authoritative going forward" and sets a V3/V2 archive policy — superseded governance that now contradicts new pack `01` | `Soravo_Engineering_Docs_v4/01` | v3 README | **NO — tracked, distinct** | Retained; **HUMAN REVIEW REQUIRED** |
| `SPEC_MANIFEST.json` | E | Declares `"root_authority_document": "SORAVO_PLAN.md"` and lists the non-existent `05_TASK_BREAKDOWN.md` | `Soravo_Engineering_Docs_v4/SPEC_MANIFEST.json` | `SORAVO_PLAN.md` | **NO — tracked, distinct** | Retained; **HUMAN REVIEW REQUIRED** |
| `decisions/ADR-027-handy-derived-desktop-foundation.md` | A | Accepted ADR body corresponding to new pack ADR-006/ADR-009. Content **agrees** with `04_HANDY_FORK_AND_REUSE_POLICY.md` (derive/fork/rebrand, no automatic upstream sync). New pack `01` ranks accepted ADRs at tier 3 | — | v3 README/manifest | **NO** | Retained; numbering reconciliation flagged |

#### `docs/spec-v3/` — audit / verification / payment reports

| File | Classification | Reason | Referenced? | Safe to Remove? | Action |
|---|---|---|---|---|---|
| `FUNCTIONAL-VERIFICATION-012.md` (untracked) | F | State snapshot at `a156c8c9`; "soravo-desktop: 53 compilation errors" — re-derivable via `19_STATE_AUDIT_PROTOCOL.md`; `PROGRESS.md:1374` already lists it as an "unrelated untracked report" | Only self | **YES** | **REMOVED** |
| `RAZORPAY-PAYMENT-API-032.md` (untracked) | E | Payment API boundary. Decision, endpoint, JWT flow, request/response shape are all now specified in `06_WEB_CLOUD_PAYMENT.md`; the rejected alternatives are unnecessary historical information. `PROGRESS.md:1744` already lists `032*` as "intentionally excluded" | `supabase/config.toml:29` (comment only, milestone ID) | **YES** | **REMOVED** |
| `RAZORPAY-PAYMENT-API-032A.md` (untracked) | E | Payment-domain extraction. New pack `03` names `packages/payment-domain` as catalog source of truth and new pack ADR-005 records the decision. `PROGRESS.md:1744` already excludes `032*` | `supabase/config.toml:29` (comment only) | **YES** | **REMOVED** |
| `STT-BENCHMARK-RESULTS-016.md` (untracked) | D | **Actual measured** STT benchmark (hardware, CPU-only, latency). New pack `16` defines the protocol but contains no measurements | v3 README | **NO — unique data required by T08** | Retained; **unique info flagged** |
| `MODEL_PROVENANCE_MATRIX.md` (untracked) | D | Per-model licence readiness (16 models: Whisper/Moonshine ready, NVIDIA + unknown-licence under review). Required by T07; absent from new pack | v3 README | **NO — unique data required by T07** | Retained; **unique info flagged** |
| `MODEL_AND_BENCHMARK_REUSE_AUDIT.md` (untracked) | D | Handy model-manager reuse audit + the finding that **all model licences are BLOCKED/unknown** and no benchmark measurements exist | v3 README | **NO — unique data** | Retained; **unique info flagged** |
| `SORAVO_UI_INTEGRATION_PLAN.md` (untracked) | E | Declares itself "Authoritative — DEFERRED TO PHASE 14", conflicting with new pack `07` (UI overhaul = Phase 8) and `02` (redesign deferred). Contains 24 KB of UI integration design with no v4 equivalent | `SORAVO_PLAN.md` | **NO — 24 KB of unique design content not represented in the new pack** | Retained; **HUMAN REVIEW REQUIRED — candidate for migration into v4 Phase 8** |
| `RAZORPAY-PAYMENT-ARCHITECTURE-021.md` | D | Foundational audit with `file:line` anchors and 12 findings F1–F12. **Referenced by source code**: `supabase/tests/webhook-hardening.test.mjs:5` | **Yes — source code** | **NO** | Retained |
| `RAZORPAY-WEBHOOK-HARDENING-022.md` | D | The repair report for F1–F12; defines the webhook test matrix reused by `supabase/tests/webhook-hardening.test.mjs` | Test suite semantics | **NO** | Retained |
| `RAZORPAY-TEST-PAYMENT-SMOKE-027.md` | D | **Historical evidence**: first real TEST-mode lifetime payment, webhook HMAC, ledger, exactly-one-entitlement | v3 README | **NO** | Retained |
| `RAZORPAY-LIVE-CONFIG-VERIFICATION-024.md` | D | Historical evidence: deployed-state verification of webhook reachability and applied migrations | v3 README | **NO** | Retained |
| `RAZORPAY-LIVE-CONFIG-RECONCILIATION-025.md` | D | Historical evidence: root-caused the blocker (server-side TEST-key revocation + 2 payload-fidelity defects) | v3 README | **NO** | Retained |
| `RAZORPAY-GRANT-PAYLOAD-FIDELITY-026.md` | D | Historical evidence: F25-5/F25-6 webhook payload defects and their fixes | v3 README | **NO** | Retained |
| `RAZORPAY-REGIONAL-PRICING-028.md` | D | Canonical 5-currency order-creation verification. Retained after its untracked duplicate was removed | v3 README | **NO** | Retained |
| `RAZORPAY-SUBSCRIPTIONS-029.md` | D | Monthly subscription flow verification; records created TEST Item IDs | v3 README | **NO** | Retained |
| `RAZORPAY-MCP-AUDIT-018.md` | D | Razorpay MCP capability audit. Directly supports new pack `11` ("Razorpay MCP/API/CLI capabilities must be re-verified before subscription automation") | v3 README | **NO** | Retained; supports v4 §11 |
| `RAZORPAY-TEST-TOOLING-019.md` | D | TEST credential/tooling architecture. Directly supports new pack `15` TEST-only rule | v3 README | **NO** | Retained; supports v4 §15 |
| `RAZORPAY-SECRET-BOUNDARY-019B.md` | D | **Security record** — local secret file boundary, `.env.local` ignore confirmation | v3 README | **NO — security record, never** | Retained |
| `RAZORPAY-SECRET-VALUE-019C.md` | D | **Security record** — credential existence verification without disclosure. Reports state only as EXISTS/format, matching new pack `15` | v3 README | **NO — security record, never** | Retained |
| `RAZORPAY-AUTHENTICATION-CHECK-020.md` | D | TEST credential validity check | v3 README | **NO** | Retained |

### 4.3 `progress/` (all tracked, all D unless noted)

| File | Classification | Reason | Safe to Remove? | Action |
|---|---|---|---|---|
| `PROGRESS.md` → `progress/` cohort | D | v3-era progress ledger fragments dated 2026-09-14 → 2026-09-20. Superseded by root `PROGRESS.md` and new pack `08` | **NO — tracked** | Retained; **HUMAN REVIEW REQUIRED** (consolidation decision) |
| `progress/MCP.md`, `progress/SKILLS.md`, `progress/SKILLS_MCP_AUDIT.md` | D | **Operationally valuable** — record verified Supabase MCP/Postgres behaviours (`set role postgres` requirement, `information_schema.role_routine_privileges` absent, `aclexplode` alternative, transaction-abort semantics), skill-selection gates, credential architecture. New pack `10` states "The exact installed list must be re-audited locally" and `11` requires MCP verification | **NO — unique operational knowledge** | Retained; **merge candidates for v4 §10/§11** |
| `progress/ENVIRONMENT.md` | D | Environment audit 2026-09-14. Partially stale ("repository unavailable", `.git` read-only) | **NO** | Retained |
| `progress/FOUNDATION_AUDIT.md`, `progress/OPENCODE_TAKEOVER.md`, `progress/GIT-BRANCH-CLEANUP-AUDIT.md` | D | One-off environment/takeover/branch audits, superseded by new pack `19` | **NO — tracked** | Retained; **HUMAN REVIEW REQUIRED** |
| `progress/STATUS.md`, `progress/NEXT.md`, `progress/TRANS_002_006.md`, `progress/TYPE-002-003-*.md`, `progress/STT-002/003-*.md` | D | Per-task completion records superseded by root `PROGRESS.md` and new pack `08` | **NO — tracked** | Retained; **HUMAN REVIEW REQUIRED** |
| `progress/BENCHMARKS.md` | D | States "No STT engine benchmark has been run" — **directly contradicted** by `docs/spec-v3/STT-BENCHMARK-RESULTS-016.md` (2026-09-26) | **NO** | Retained; **contradiction flagged** |

### 4.4 Operational — classification B, never removed

`LICENSE` · `package.json` · `Cargo.toml` · `Cargo.lock` · `deno.lock` · `pnpm-lock.yaml` · `pnpm-workspace.yaml` · `tsconfig.base.json` · `deny.toml` · `playwright.config.ts` · `apps/*/package.json` · `apps/*/tsconfig.json` · `apps/*/components.json` · `apps/desktop/src-tauri/tauri.conf.json` · `apps/desktop/src-tauri/capabilities/default.json` · `apps/desktop/src-tauri/src/catalog/catalog.json` · `packages/payment-domain/{package.json,tsconfig.json}` · `services/license-api/{package.json,tsconfig.json}` · `apps/desktop/.env.example` · `apps/website/public/robots.txt` · `.github/dependabot.yml` · `.github/workflows/{ci.yml,pages-deployment.yaml,release.yml,security-audit.yml}` · `.opencode/opencode-swarm.json` · `.opencode/.gitignore` · `.opencode/package.json` · `.opencode/package-lock.json` · `supabase/README.md` · `services/license-api/README.md` · `decisions/README.md` · `docs/SECURITY_POLICY.md` · `decisions/ADR-001,010,011,012,013,014,016,021,022,023,024,025,026` (13 accepted ADR bodies, tier-3 authority per new pack `01`).

### 4.5 Classification G — unrelated to the engineering specification

`.swarm/`, `.swarm-worktrees/`, `test-results/`, `testsprite_tests/tmp/mcp.log`, `apps/website/dist/`, `supabase/.temp/`, `apps/desktop/src-tauri/gen/schemas/*.json`, `tasks/.gitkeep`, `scripts/.gitkeep`. All local, ignored or generated. **None inspected as documentation. None touched.**

---

## 5. Handy-specific audit

### 5.1 Old Handy documents identified

| Old document | Git | What it says |
|---|---|---|
| `SORAVO_HANDY_CODE_REUSE_REPORT.md` (root) | tracked | v2 Handy V1 reuse strategy, 51 KB, the "HOW" companion to PRD/TDD |
| `docs/spec-v2-archive/SORAVO_HANDY_CODE_REUSE_REPORT.md` | tracked | byte-identical preserved copy |
| `docs/HANDY_V1_PLAN.md` | tracked | 6-phase Handy-based desktop foundation plan; declares itself superseded by ADR-026; FluidVoice/Core ML deferred |
| `decisions/ADR-026-handy-foundation.md` | tracked | **Accepted**: Handy is the "primary technical foundation"; strategy "fork/rebase Handy, then progressively replace, harden, and extend" |
| `docs/spec-v3/15_HANDY_REUSE_POLICY.md` | tracked | **Status: Authoritative**; "DO NOT PRESERVE CODE MERELY BECAUSE SORAVO ALREADY IMPLEMENTED IT"; 4 direct-reuse / adaptation categories; delete redundant Soravo code after consumer migration |
| `docs/spec-v3/16_HANDY_MIGRATION_STATUS.md` | tracked | Integration status of 12 Handy modules; stale SHA/branch state |
| `docs/spec-v3/decisions/ADR-027-handy-derived-desktop-foundation.md` | tracked | **Accepted**: strategy clarified from "port components" to "fork/derive/rebrand"; Soravo retains authority over 15 named domains; "not automatically pull upstream Handy changes" |
| `docs/compliance/TASK_1_2_DEPENDENCY_AUDIT.md` | tracked | Handy-foundation dependency/licence/network audit; telemetry stripping; version pinning |
| `docs/COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md` | tracked | Handy migration verification (22,580 lines added) |
| `progress/STT-003-HANDY-REUSE-AUDIT.md` | tracked | Handy revision `ba10ce1943ef34e93c09494027fc0b9ced2e8a44`, streaming STT reuse |
| `progress/TYPE-002-003-HANDY-REUSE-AUDIT.md` | tracked | Handy reuse for typing/clipboard injection |

### 5.2 What the new pack says — `04_HANDY_FORK_AND_REUSE_POLICY.md`

Handy is **an implementation asset, not a requirements authority**. Soravo controls product contracts, security, privacy, licensing, account, entitlement, payment, branding and release policy. Mandatory 8-step pre-work sequence (locate Soravo impl → locate Handy equivalent → inspect actual source → classify ownership → reuse/adapt → implement only the Soravo delta → test → document reuse). Matrix: **ADOPT/ADAPT** = Tauri shell, React foundation, audio, VAD, hotkeys, typing, clipboard, settings, tray, overlay, model manager, transcription, history. **SORAVO-OWNED** = session, transcript, IPC, auth, Supabase, entitlements, Razorpay, model licensing, product decisions. **REPLACE** = user-facing Handy branding. No parallel implementations without ADR. **No automatic upstream sync** — any sync requires pinned source, diff, licence/dependency review, contract regression tests and an explicit merge decision. Every derived-subsystem completion report must list exact Handy files inspected / reused / adapted / new / non-reuse reasons. Handy code licensing does not license model weights; unknown model licensing blocks release.

### 5.3 Conflict and supersession analysis

| Item | Conflicts with new pack? | Superseded? | Disposition |
|---|---|---|---|
| Root `SORAVO_HANDY_CODE_REUSE_REPORT.md` | No direct contradiction; lower authority than the new pack | **Yes** — entirely replaced by `04_HANDY_FORK_AND_REUSE_POLICY.md` | **REMOVED** (byte-identical copy retained in the v2 archive) |
| `docs/HANDY_V1_PLAN.md` | **Yes** — phase structure and "superseeded by ADR-026" framing are a prior generation; references two non-existent files | **Yes** | Retained; **HUMAN REVIEW REQUIRED** |
| `decisions/ADR-026-handy-foundation.md` | **No** — "fork/rebase Handy … keep Soravo specification authoritative" is consistent with new pack `04` and ADR-006 | Not superseded in substance; superseded in numbering by new pack ADR-006 | Retained (A) |
| `docs/spec-v3/15_HANDY_REUSE_POLICY.md` | **No contradiction** — it is the detailed expansion of new pack `04` | Condensed into new pack `04`; detail not carried over | Retained (D); **unique detail flagged** |
| `docs/spec-v3/16_HANDY_MIGRATION_STATUS.md` | **Yes (state only)** — asserts "NOT YET MERGED" at SHA `216cf23`, which is false now | State superseded by definition | Retained; **HUMAN REVIEW REQUIRED** |
| `docs/spec-v3/decisions/ADR-027-…md` | **No** — agrees with new pack `04`, including "not automatically pull upstream Handy changes" | Numbering only | Retained (A); numbering reconciliation flagged |
| `progress/*HANDY*REUSE-AUDIT.md` | No | No | Retained (D) — per-task evidence required by new pack `04` reporting rule |

**Old Handy plans do not override the new plan.** No old Handy requirement was merged into the new pack.

### 5.4 Unique Handy information absent from the new pack — FLAGGED, NOT MIGRATED

1. `docs/spec-v3/15_HANDY_REUSE_POLICY.md` §1–§3 — the explicit "delete redundant Soravo implementation after consumers are migrated and tests pass" directive and the four named reuse categories. New pack `04` states the rule in one sentence; the categories and the deletion protocol are not reproduced.
2. `docs/spec-v3/decisions/ADR-027-…md` — the enumerated list of 15 domains Soravo retains authority over, and the explicit "not automatically pull upstream Handy changes" decision record.
3. `docs/spec-v3/18_DESKTOP_ARCHITECTURE.md` — the per-module Soravo-owned vs Handy-derived matrix at finer granularity than new pack `03`/`04`.
4. `docs/spec-v3/16_HANDY_MIGRATION_STATUS.md` — the 12-module Handy integration checklist (audio_toolkit+VAD, clipboard, input/typing, settings, tray, HandyKeys, overlay, catalog/model-manager, transcription/manager, history, actions, secure_input). New pack has no equivalent checklist.
5. `docs/compliance/TASK_1_2_DEPENDENCY_AUDIT.md` — the executed Handy-foundation dependency/licence/network audit and telemetry-stripping evidence.
6. `progress/STT-003-HANDY-REUSE-AUDIT.md` — the exact Handy upstream revision `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` used for the STT subsystem. New pack `04` requires a "pinned source" for any upstream sync but no pin is recorded in the pack.

**HUMAN REVIEW REQUIRED** for all six. No modification to the new pack was made.

---

## 6. Payment-specific audit (Razorpay, milestones 018–038)

The milestone reports were audited individually. **No historical milestone report is treated as engineering specification.** Root `PROGRESS.md` is a tier-8 evidence log per new pack `01`, not specification.

| Milestone document | Git | Determination | Disposition |
|---|---|---|---|
| `RAZORPAY-MCP-AUDIT-018.md` | tracked | **Historical evidence** + capability input to new pack `11` | Retained (D) |
| `RAZORPAY-TEST-TOOLING-019.md` | tracked | **Historical evidence** + input to new pack `15` TEST-only rule | Retained (D) |
| `RAZORPAY-SECRET-BOUNDARY-019B.md` | tracked | **Security record** | Retained (D), never delete |
| `RAZORPAY-SECRET-VALUE-019C.md` | tracked | **Security record** | Retained (D), never delete |
| `RAZORPAY-AUTHENTICATION-CHECK-020.md` | tracked | Historical evidence | Retained (D) |
| `RAZORPAY-PAYMENT-ARCHITECTURE-021.md` | tracked | **Superseded specification** (audit + 12 findings) but **referenced by source code** (`supabase/tests/webhook-hardening.test.mjs:5`) — the F1–F12 finding set is the test suite's specification | Retained (D) |
| `RAZORPAY-WEBHOOK-HARDENING-022.md` | tracked | **Superseded specification** (repair report); defines the enforced webhook test matrix | Retained (D) |
| `RAZORPAY-LIVE-CONFIG-VERIFICATION-024.md` | tracked | **Historical evidence** | Retained (D) |
| `RAZORPAY-LIVE-CONFIG-RECONCILIATION-025.md` | tracked | **Historical evidence** — root-caused the blocker | Retained (D) |
| `RAZORPAY-GRANT-PAYLOAD-FIDELITY-026.md` | tracked | **Historical evidence** — F25-5/F25-6 fixes | Retained (D) |
| `RAZORPAY-TEST-PAYMENT-SMOKE-027.md` | tracked | **Historical evidence** — real TEST payment, webhook, ledger, exactly-one entitlement | Retained (D) |
| `RAZORPAY-REGIONAL-PRICING-028.md` | tracked | **Historical evidence** — canonical 5-currency verification | Retained (D) |
| `RAZORPAY-SUBSCRIPTIONS-029.md` | tracked | **Historical evidence** — monthly flow, TEST Item IDs | Retained (D) |
| `RAZORPAY-PAYMENT-API-032.md` | untracked | **Obsolete temporary report** — the decision is now fully specified in new pack `06` + ADR-005 | **REMOVED** |
| `RAZORPAY-PAYMENT-API-032A.md` | untracked | **Obsolete temporary report** — `packages/payment-domain` is named as catalog source of truth in new pack `03` | **REMOVED** |
| `RAZORPAY-REGIONAL-PRICING-028-VERIFICATION.md` (root) | untracked | **Duplicate** of the retained tracked `RAZORPAY-REGIONAL-PRICING-028.md` | **REMOVED** |
| `FRONTEND-DEPLOYMENT-DRIFT-AUDIT.md` (root) | untracked | **Obsolete temporary report** (milestone 033) — transient drift snapshot at `091f9e92` | **REMOVED** |
| Milestones 034–038 (webhook ledger idempotency, Cloudflare Pages, CI audit, TEST-mode deployment) | — | **No dedicated documents exist.** 034–038 are recorded only inside root `PROGRESS.md` | Nothing to classify; `PROGRESS.md` retained (C) |

**Payment architecture authority:** new pack `06_WEB_CLOUD_PAYMENT.md` and new pack ADR-005/ADR-012/ADR-013/ADR-014. Implementation in the repository confirms it — `packages/payment-domain/src/catalog.ts` carries exactly the amounts the pack declares (monthly INR 9900 / USD 1200 / CAD 1600 / EUR 1100 / AUD 1800; lifetime INR 41500 / USD 5000 / CAD 6700 / EUR 4600 / AUD 7500 minor units). **No third price catalog exists.**

**Payment evidence retained but absent from the new pack — FLAGGED:**
- The 61/61 license-api and 178/178 Supabase test counts and the 130→178 test-growth history.
- Recorded Razorpay TEST Item IDs created in milestone 029.
- The `h2 0.3.27` / `GHSA-q83h-524g-xf6h` exception and the `vad-rs` SHA pin from `docs/SECURITY_POLICY.md` — these are enforced in `.github/workflows/security-audit.yml` but are **not** referenced by new pack `12_SECURITY_BASELINE.md`. **HUMAN REVIEW REQUIRED.**

---

## 7. Design-document audit — `DESIGN-wise.md`

**Location:** `Soravo_Engineering_Docs_v4/DESIGN-wise.md` (untracked, 24577 bytes, mtime 2026-09-27 04:55 — 23 minutes before the 21 numbered pack files at 05:18).

**Determination:**

1. **Is it part of the new authoritative pack?** It is physically inside the authoritative directory and is not a v2/v3 leftover. **YES — it is part of the new authoritative pack directory.**
2. **Is it the current UI/design source of truth?** **YES.** It is the only design specification supplied with the new documentation work. It defines: 21 colour tokens (Wise green `#9fe870` primary on sage canvas `#e8ebe6`, ink `#0e0f0c`), a 14-step type scale (Wise Sans 900 for hero 64–126 px + Inter 600 sub-display), a 7-step radius scale with 24 px as the canonical card/button radius, a 4 px base spacing scale, 3 elevation levels (surface contrast as the primary cue), 18 named components, 10 auto-derived `ex-*` example surfaces, 3 breakpoints (768/1024), ~48 px touch targets, and explicit Do/Don't rules including "do not introduce a second brand accent".
3. **Is it historical design documentation?** **NO.**
4. **Governance status:** new pack `02_PRODUCT_REQUIREMENTS.md` defers the Soravo visual redesign until functionality, security, QA and release foundations are complete, and `07_IMPLEMENTATION_PLAN.md` schedules the UI overhaul as **Phase 8**. This document is therefore the design target for Phase 8, not a Phase 0–7 constraint. This is consistent, not contradictory.
5. **Not replaced by assumptions based on the current website.** The current `apps/website/` implementation was not used to infer, replace or amend any design value. No design file was altered.

**HUMAN REVIEW REQUIRED — defect inside the new pack (not modified by this task):**
`Soravo_Engineering_Docs_v4/SPEC_MANIFEST.json` declares `"file_count": 22` and lists 22 files. `DESIGN-wise.md` is **absent from the `files` array**, and the directory contains **23** files. `00_README.md`'s read-order sentence also omits `DESIGN-wise.md`. The authoritative manifest therefore under-declares its own pack. This is a specification defect for the pack owner to correct. **The new pack was not modified by this task.**

---

## 8. Files safe to remove — removed by this task

Removal criteria applied to every file below: (1) demonstrably superseded; (2) not referenced by code, configuration, CI or the new pack; (3) unique information either byte-identically preserved elsewhere or explicitly classified as unnecessary historical information; (4) not operational; (5) not a legal/licence/security record; (6) listed in this report as safe.

### 8.1 Tracked files — byte-identical duplicate, historical value provably zero

| File | Preserved identical copy at | Byte-identical? |
|---|---|---|
| `SPEC_MANIFEST.json` | `docs/spec-v2-archive/SPEC_MANIFEST.json` | Yes |
| `SORAVO_HANDY_CODE_REUSE_REPORT.md` | `docs/spec-v2-archive/SORAVO_HANDY_CODE_REUSE_REPORT.md` | Yes |
| `docs/COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md` | `docs/spec-v2-archive/COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md` | Yes |
| `docs/spec-v3/06_DOD_QA.md` | `docs/spec-v2-archive/06_DOD_QA.md` | Yes |
| `docs/spec-v3/07_AI_SKILLS.md` | `docs/spec-v2-archive/07_AI_SKILLS.md` | Yes |
| `docs/spec-v3/08_MCP_AND_AGENT_TOOLING.md` | `docs/spec-v2-archive/08_MCP_AND_AGENT_TOOLING.md` | Yes |
| `docs/spec-v3/09_SECURITY_BASELINE.md` | `docs/spec-v2-archive/09_SECURITY_BASELINE.md` | Yes |
| `docs/spec-v3/11_INTERRUPTION_HANDOFF.md` | `docs/spec-v2-archive/11_INTERRUPTION_HANDOFF.md` | Yes |
| `docs/spec-v3/12_BENCHMARK_PROTOCOL.md` | `docs/spec-v2-archive/12_BENCHMARK_PROTOCOL.md` | Yes |
| `docs/spec-v3/13_RELEASE_RUNBOOK.md` | `docs/spec-v2-archive/13_RELEASE_RUNBOOK.md` | Yes |
| `docs/spec-v3/14_ENVIRONMENT_AND_SECRETS.md` | `docs/spec-v2-archive/14_ENVIRONMENT_AND_SECRETS.md` | Yes |

### 8.2 Untracked files — one-off temporary reports, removal preferred over archiving

| File | Justification |
|---|---|
| `FUNCTIONAL-INTEGRATION-REPORT.md` | SHA-pinned static audit; `PROGRESS.md:1372` already classifies it as an unrelated untracked report |
| `INTEGRATION-BASELINE-009.md` | Pure git-state snapshot, fully re-derivable from `19_STATE_AUDIT_PROTOCOL.md`; `PROGRESS.md:1373` |
| `INTEGRATION_AUDIT_008.md` | Pure forensic audit snapshot; `PROGRESS.md:1373` |
| `FRONTEND-DEPLOYMENT-DRIFT-AUDIT.md` | Transient drift snapshot at `091f9e92`; `PROGRESS.md:1744` already marks it "intentionally excluded" |
| `RAZORPAY-REGIONAL-PRICING-028-VERIFICATION.md` | Duplicate of the retained, richer `docs/spec-v3/RAZORPAY-REGIONAL-PRICING-028.md`; `PROGRESS.md:1744` |
| `docs/spec-v3/RAZORPAY-PAYMENT-API-032.md` | Decision fully specified in new pack `06` + ADR-005; `PROGRESS.md:1744` already excludes `032*` |
| `docs/spec-v3/RAZORPAY-PAYMENT-API-032A.md` | `packages/payment-domain` named as catalog source of truth in new pack `03`; `PROGRESS.md:1744` |
| `docs/spec-v3/FUNCTIONAL-VERIFICATION-012.md` | State snapshot at `a156c8c9`, re-derivable via `19_STATE_AUDIT_PROTOCOL.md`; `PROGRESS.md:1374` |

**Total removed: 19 files** (11 tracked byte-identical duplicates + 8 untracked one-off reports). **Total bytes removed from the working tree: 156,701** (measured with `du -bc` over exactly these 19 paths immediately before deletion).

The 11 byte-identity claims in §8.1 were re-verified immediately before this cleanup with `diff -q` against the named archive copies: all 11 reported no differences.

## 9. Files that should be archived

**No file was moved.** Reason: every file classified D has uncertain historical value, and the instruction for tracked D-files is HUMAN REVIEW REQUIRED, not relocation. `docs/spec-v2-archive/` is the repository's existing archive convention and was left byte-for-byte unmodified per its own governance rule ("Preserve them as-is").

Recommended archive targets, pending human decision — **HUMAN REVIEW REQUIRED**:

| Candidate set | Proposed destination | Note |
|---|---|---|
| `docs/spec-v3/{00,01,02,03,04,10,19,SPEC_MANIFEST.json}` | `docs/archive/legacy/spec-v3/` with a superseded notice | Removes 6 self-declared "Authoritative" v3 documents from the active doc surface. Introduces a new archive convention — human decision. |
| `progress/*` (16 files) | consolidate under `docs/archive/legacy/progress-v3/` | `MCP.md` / `SKILLS.md` / `SKILLS_MCP_AUDIT.md` should first be reviewed as merge candidates for v4 §10/§11. |
| `docs/HANDY_V1_PLAN.md`, `docs/ARCHITECTURE.md` | `docs/archive/legacy/` | `docs/ARCHITECTURE.md` actively contradicts new pack §03/§06 and is the second-most misleading document in the repository. |

## 10. Files that MUST remain

**Authoritative:** `Soravo_Engineering_Docs_v4/**` (23 files, unmodified).
**Accepted ADR bodies (new pack tier 3):** `decisions/ADR-{001,010,011,012,013,014,016,021,022,023,024,025,026}` and `docs/spec-v3/decisions/ADR-027-handy-derived-desktop-foundation.md`.
**Required operational:** `LICENSE` · all `package.json` / `Cargo.toml` / lockfiles / `tsconfig*.json` / `components.json` / `deny.toml` / `playwright.config.ts` / `pnpm-workspace.yaml` · `apps/desktop/src-tauri/{tauri.conf.json,capabilities/default.json,src/catalog/catalog.json}` · `apps/desktop/.env.example` · `apps/website/public/robots.txt` · `.github/workflows/*.yml` · `.github/dependabot.yml` · `.opencode/opencode-swarm.json` (+ `.opencode/.gitignore`, `package.json`, `package-lock.json`) · `supabase/README.md` · `services/license-api/README.md` · `decisions/README.md`.
**Security records (never remove):** `docs/SECURITY_POLICY.md` · `docs/spec-v3/RAZORPAY-SECRET-BOUNDARY-019B.md` · `docs/spec-v3/RAZORPAY-SECRET-VALUE-019C.md`.
**Named by the new pack:** `PROGRESS.md` (tier-8 evidence log).
**Referenced by source code:** `docs/spec-v3/RAZORPAY-PAYMENT-ARCHITECTURE-021.md` (from `supabase/tests/webhook-hardening.test.mjs:5`).
**Unique engineering data required by new-pack tasks:** `docs/spec-v3/15_HANDY_REUSE_POLICY.md` · `17_MODEL_LICENSE_AND_PROVENANCE.md` · `18_DESKTOP_ARCHITECTURE.md` · `MODEL_PROVENANCE_MATRIX.md` · `MODEL_AND_BENCHMARK_REUSE_AUDIT.md` · `STT-BENCHMARK-RESULTS-016.md`.
**Payment historical evidence:** all retained `docs/spec-v3/RAZORPAY-*.md` reports listed in §6.
**Repository archive of record:** `docs/spec-v2-archive/**` (32 files, unmodified).
**Historical snapshot container:** `docs/spec-v3.zip` (tracked, 56 entries, 2026-09-21 snapshot — not modified by this task).
**Handy evidence:** `docs/compliance/TASK_1_2_DEPENDENCY_AUDIT.md`, `progress/*HANDY*`.
**Not touched, agent state:** `.swarm/`, `.swarm-worktrees/`, `test-results/`, `testsprite_tests/`, `apps/website/dist/`, `supabase/.temp/`, `tasks/`, `scripts/`.

## 11. Files requiring human review

| # | Item | Why |
|---|---|---|
| 1 | `SORAVO_PLAN.md` | Declares itself root authority; names V3 authoritative. **Referenced by 4 retained documents** so it cannot be deleted without breaking them. Highest-priority conflict with the new pack. |
| 2 | `docs/ARCHITECTURE.md` | Contradicts new pack §03/§06 (payment catalog owner, Supabase status). Small, actively misleading, tracked. |
| 3 | `docs/spec-v3/{00,01,02,03,04,10,19,SPEC_MANIFEST.json}` | Superseded v3 specification core, 6 files self-declared "Authoritative". Archival destination is a human decision. |
| 4 | `docs/HANDY_V1_PLAN.md` | Superseded Handy plan with two broken references (`.swarm/spec.md`, `SORAVO_HANDY_FLUIDVOICE_FLUIDAUDIO_COMBINED_AUDIT.md` — both absent). |
| 5 | `docs/spec-v3/16_HANDY_MIGRATION_STATUS.md` | Stale state snapshot ("NOT YET MERGED" at `216cf23`) that is now false. |
| 6 | `docs/spec-v3/SORAVO_UI_INTEGRATION_PLAN.md` | 24 KB of unique UI design bound to "Phase 14", which conflicts with new pack Phase 8. Candidate for migration into v4 Phase 8. |
| 7 | `docs/spec-v3/05_TASK_BREAKDOWN.md` | **Missing file** listed in `docs/spec-v3/00_README.md` and `docs/spec-v3/SPEC_MANIFEST.json`. Pre-existing broken reference. |
| 8 | `Soravo_Engineering_Docs_v4/SPEC_MANIFEST.json` | **Defect in the new pack:** declares `file_count: 22` and omits `DESIGN-wise.md`; directory contains 23 files. `00_README.md` read order also omits it. **Not modified by this task.** |
| 9 | Root `README.md` | Already deleted in the worktree before this task. The repository will have **no root README** on GitHub. A minimal pointer to `Soravo_Engineering_Docs_v4/00_README.md` is needed. Not authored by this task. |
| 10 | `progress/` (16 files) | v3-era ledger fragments. Consolidation/archive decision required. |
| 11 | Unique Handy information (6 items, §5.4) | Must be migrated into the new pack or explicitly discarded by the pack owner. **Not migrated by this task.** |
| 12 | Unique model/benchmark/payment data (§6, §5) | 16-model provenance matrix, STT measurements, TEST Item IDs, test-count history — absent from the new pack. |
| 13 | `docs/SECURITY_POLICY.md` ↔ new pack §12 | The enforced `GHSA-q83h-524g-xf6h` exception and `vad-rs` SHA pin are executed by CI but not referenced by the new pack's security baseline. |
| 14 | `.swarm-worktrees/` | 3 live worktrees on unmerged branches: `phase1/task1.1-port-handy` @ `83a506e8`, `phase1/task1.3-hotkeys` @ `7eaea96f`, `feature/type-001-native-insertion` @ `d5a1f846`. Pruning is irreversible and is a human decision. |
| 15 | Dangling references inside retained documents | After removal, `PROGRESS.md:1372-1374,1744`, `docs/spec-v3/00_README.md` §Document Order and `docs/spec-v3/SPEC_MANIFEST.json` `documents[]` name files that no longer exist. All three retained documents are themselves superseded. New pack `18` requires a fresh handoff; these references are not corrected by this task. |
| 16 | `supabase/config.toml:29` | Comment `# RAZORPAY-PAYMENT-API-032A` names a removed milestone ID. Comment only — no build impact. |
| 17 | `docs/spec-v3.zip` | Tracked 152,968-byte zip holding a 2026-09-21 snapshot of `docs/spec-v3/` plus 13 `spec-v2-archive` files. It is a duplicate *container* of two trees that both still exist, but it predates the 2026-09-26/27 edits to the tracked v3 payment reports, so it may be the only surviving copy of that earlier state. Deletion is a human decision; it was NOT deleted by this task. |

## 12. Exact cleanup commands / actions performed

No `git add`, `git commit`, `git push`, branch creation, amend, reset or stash was performed. No source file was modified.

```
# 11 tracked byte-identical duplicates (identical copy preserved in docs/spec-v2-archive/)
rm SPEC_MANIFEST.json
rm SORAVO_HANDY_CODE_REUSE_REPORT.md
rm -r docs/COMPLIANCE
rm docs/spec-v3/06_DOD_QA.md
rm docs/spec-v3/07_AI_SKILLS.md
rm docs/spec-v3/08_MCP_AND_AGENT_TOOLING.md
rm docs/spec-v3/09_SECURITY_BASELINE.md
rm docs/spec-v3/11_INTERRUPTION_HANDOFF.md
rm docs/spec-v3/12_BENCHMARK_PROTOCOL.md
rm docs/spec-v3/13_RELEASE_RUNBOOK.md
rm docs/spec-v3/14_ENVIRONMENT_AND_SECRETS.md

# 8 untracked one-off temporary reports
rm FUNCTIONAL-INTEGRATION-REPORT.md
rm INTEGRATION-BASELINE-009.md
rm INTEGRATION_AUDIT_008.md
rm FRONTEND-DEPLOYMENT-DRIFT-AUDIT.md
rm RAZORPAY-REGIONAL-PRICING-028-VERIFICATION.md
rm docs/spec-v3/RAZORPAY-PAYMENT-API-032.md
rm docs/spec-v3/RAZORPAY-PAYMENT-API-032A.md
rm docs/spec-v3/FUNCTIONAL-VERIFICATION-012.md
```

Reversal (if the human reviewer rejects any removal), without committing:

```
git checkout -- SPEC_MANIFEST.json SORAVO_HANDY_CODE_REUSE_REPORT.md docs/COMPLIANCE docs/spec-v3
```

Files deliberately **not** removed, for the reasons in §9–§11: `SORAVO_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/HANDY_V1_PLAN.md`, `docs/spec-v2-archive/**`, `docs/spec-v3/**` (remainder), `progress/**`, `PROGRESS.md`, `decisions/**`, `docs/SECURITY_POLICY.md`, `docs/compliance/TASK_1_2_DEPENDENCY_AUDIT.md`, `Soravo_Engineering_Docs_v4/**`.

## 13. Final documentation topology

```
/  (repository root)
├── LICENSE                                     B  legal
├── Soravo_Engineering_Docs_v4/                 A  *** SOLE AUTHORITATIVE SPECIFICATION ***
│   ├── 00_README.md .. 20_ADR_INDEX.md         A  21 numbered control documents
│   ├── SPEC_MANIFEST.json                      A  machine manifest (see HUMAN REVIEW #8)
│   └── DESIGN-wise.md                          A  UI design system (Phase 8 target)
├── decisions/                                  A  13 accepted ADR bodies + README.md convention
│   └── ADR-026-handy-foundation.md             A  new pack ADR-006 body
├── docs/
│   ├── SECURITY_POLICY.md                      B  executed supply-chain policy (CI-bound)
│   ├── ARCHITECTURE.md                         E  conflicts with new pack  -> HUMAN REVIEW
│   ├── HANDY_V1_PLAN.md                        E  superseded Handy plan    -> HUMAN REVIEW
│   ├── compliance/TASK_1_2_DEPENDENCY_AUDIT.md D  unique Handy dependency audit
│   ├── spec-v3.zip                            D  2026-09-21 snapshot container -> HUMAN REVIEW
│   ├── spec-v2-archive/                        D  repository archive of record (32, unmodified)
│   └── spec-v3/
│       ├── 00,01,02,03,04,10,19,MANIFEST       E  superseded v3 core       -> HUMAN REVIEW
│       ├── decisions/ADR-027-…md               A  new pack ADR-006/009 body
│       ├── 15_HANDY_REUSE_POLICY.md            D  unique Handy detail      -> unique-info flag
│       ├── 16_HANDY_MIGRATION_STATUS.md        F  stale state              -> HUMAN REVIEW
│       ├── 17_MODEL_LICENSE_AND_PROVENANCE.md  D  unique policy fields     -> unique-info flag
│       ├── 18_DESKTOP_ARCHITECTURE.md          D  unique component matrix  -> unique-info flag
│       ├── SORAVO_UI_INTEGRATION_PLAN.md       E  unique UI design         -> HUMAN REVIEW
│       ├── MODEL_PROVENANCE_MATRIX.md          D  16-model licence data    -> unique-info flag
│       ├── MODEL_AND_BENCHMARK_REUSE_AUDIT.md  D  licence-blocked finding  -> unique-info flag
│       ├── STT-BENCHMARK-RESULTS-016.md        D  real measurements        -> unique-info flag
│       └── RAZORPAY-*.md (16 files)            D  payment historical evidence + 2 security records
├── progress/                                   D  16 v3-era ledger fragments -> HUMAN REVIEW
├── PROGRESS.md                                 C  named by new pack 01 (tier-8 evidence log)
├── SORAVO_PLAN.md                              E  conflicts with new pack   -> HUMAN REVIEW
├── supabase/README.md                          B  operational
├── services/license-api/README.md              B  operational
├── .opencode/opencode-swarm.json               B  OpenCode configuration
├── .github/workflows/                          B  CI/CD
├── package.json Cargo.toml lockfiles tsconfig  B  manifests
├── apps/ crates/ packages/ services/ tests/    —  source (untouched)
├── tasks/ scripts/                             —  empty placeholders
└── .swarm/ .swarm-worktrees/ test-results/     G  local agent state (untouched)
```

**Determinism statement:** one authoritative specification directory (`Soravo_Engineering_Docs_v4/`, 23 files), one accepted-ADR tree (`decisions/`, tier 3 per new pack `01`), one repository archive of record (`docs/spec-v2-archive/`), one operational/configuration class, one local agent-state class. No duplicate specification content remains, and no byte-identical duplicate of any retained file remains. The residual non-determinism is enumerated in §11 as 17 items requiring human review; it consists of superseded v3/v2 authority declarations and unique engineering data, none of which was deleted without proof and none of which was merged into the new pack.

---

## 14. Post-cleanup verification

Reconciliation of counts across the cleanup (`find -type f`):

| Path | Before | After | Delta | Expected |
|---|---|---|---|---|
| `Soravo_Engineering_Docs_v4/` | 23 | 23 | 0 | untouched ✓ |
| `docs/` | 79 | 67 | −12 | −11 v3 files −1 `docs/COMPLIANCE` ✓ |
| `docs/spec-v3/` | 41 | 30 | −11 | −8 tracked −3 untracked ✓ |
| `progress/` | 16 | 16 | 0 | untouched ✓ |
| `decisions/` | 14 | 14 | 0 | untouched ✓ |
| `docs/COMPLIANCE/` | 1 | 0 | −1 | directory fully removed ✓ |
| root legacy reports | 9 | 1 | −8 | 11 removals included 3 root files ✓ |

`git status --short` after the cleanup — **task-caused** entries (19):

```
 D SPEC_MANIFEST.json
 D SORAVO_HANDY_CODE_REUSE_REPORT.md
 D docs/COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md
 D docs/spec-v3/06_DOD_QA.md
 D docs/spec-v3/07_AI_SKILLS.md
 D docs/spec-v3/08_MCP_AND_AGENT_TOOLING.md
 D docs/spec-v3/09_SECURITY_BASELINE.md
 D docs/spec-v3/11_INTERRUPTION_HANDOFF.md
 D docs/spec-v3/12_BENCHMARK_PROTOCOL.md
 D docs/spec-v3/13_RELEASE_RUNBOOK.md
 D docs/spec-v3/14_ENVIRONMENT_AND_SECRETS.md
```
plus 8 untracked one-off reports that no longer appear in `git status` at all:
`FUNCTIONAL-INTEGRATION-REPORT.md`, `INTEGRATION-BASELINE-009.md`, `INTEGRATION_AUDIT_008.md`, `FRONTEND-DEPLOYMENT-DRIFT-AUDIT.md`, `RAZORPAY-REGIONAL-PRICING-028-VERIFICATION.md`, `docs/spec-v3/RAZORPAY-PAYMENT-API-032.md`, `docs/spec-v3/RAZORPAY-PAYMENT-API-032A.md`, `docs/spec-v3/FUNCTIONAL-VERIFICATION-012.md`.

**Pre-existing entries NOT caused by this task** (present before it began, left exactly as found):

- 15 unstaged deletions of the v2 root pack: `01_PRD.md` … `14_ENVIRONMENT_AND_SECRETS.md` and `README.md`. These are *not* part of this task's 19 removals; they are recorded in §4.1 and §11 #9.
- 22 modified application source files: `Cargo.lock`, `PROGRESS.md`, 18 files under `apps/desktop/src-tauri/`, `crates/audio/src/audio/mod.rs`, and 4 files under `apps/website/src/`.
- 8 untracked paths: `DOCUMENTATION-HYGIENE-001-REPORT.md` (this report), `Soravo_Engineering_Docs_v4/`, `apps/desktop/.env.example`, `apps/desktop/src-tauri/src/audio_toolkit/post_process.rs`, `apps/desktop/src-tauri/src/commands/account.rs`, `apps/desktop/src-tauri/src/helpers/`, `apps/website/src/lib/payment-service.test.ts`, `deno.lock`, and the 4 retained v3 data files.

**Verification result:** 19/19 intended removals performed, 0 unintended removals, 0 source-code modifications, 0 files added to the index, 0 commits. The new authoritative pack is byte-for-byte untouched.
