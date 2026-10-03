# DOCUMENTATION-HYGIENE-002-REPORT

**Generated:** 2026-09-27
**Repository:** eySRbS4zgHuW3gMFZB2/soravo

---

## 1. Git State

| Field | Value |
|-------|-------|
| repository SHA | `ede495b55efd95cedd882d90a19d12b4777da852` |
| origin/main SHA | `ede495b55efd95cedd882d90a19d12b4777da852` |
| branch | `main` |
| worktree state | dirty (untracked files present) |
| untracked files | 14 items (see below) |

---

## 2. v6 Pack Information

| Field | Value |
|-------|-------|
| location | `Soravo_Engineering_Docs_v6/` |
| status | **untracked** (not in git) |
| files | 24 documents (22 numbered docs + DESIGN.md + SPEC_MANIFEST.json) |
| commit that introduced | `ede495b5` |
| message | "docs: persist Soravo engineering control pack v6" |

v6 Document SHA256 (first 12 chars):
- `00_README.md` → `3ac63b4c986d`
- `DESIGN.md` → `96439028415e`
- `SPEC_MANIFEST.json` → `71c27b3e990d`

---

## 3. Complete Document Inventory

### A. v6 Authoritative Documentation (Soravo_Engineering_Docs_v6/)

| Path | Tracked | Status | Purpose | Superseded By | References | Disposition |
|------|---------|--------|---------|---------------|------------|-------------|
| 00_README.md | No | CURRENT | Pack introduction, read order | — | — | KEEP |
| 01_AUTHORITY_AND_SOURCE_OF_TRUTH.md | No | CURRENT | Authority rules, conflict protocol | — | — | KEEP |
| 02_PRODUCT_REQUIREMENTS.md | No | CURRENT | Product scope | — | — | KEEP |
| 03_TECHNICAL_DESIGN.md | No | CURRENT | Technical design | — | — | KEEP |
| 04_HANDY_FORK_AND_REUSE_POLICY.md | No | CURRENT | Handy reuse policy | — | — | KEEP |
| 05_DESKTOP_CONTRACTS.md | No | CURRENT | Desktop contracts | — | — | KEEP |
| 06_WEB_CLOUD_PAYMENT.md | No | CURRENT | Web/cloud/payment | — | — | KEEP |
| 07_IMPLEMENTATION_PLAN.md | No | CURRENT | Implementation plan | — | — | KEEP |
| 08_TASK_BREAKDOWN.md | No | CURRENT | Task breakdown | — | — | KEEP |
| 09_AI_AGENT_INSTRUCTIONS.md | No | CURRENT | AI agent rules | — | — | KEEP |
| 10_AI_SKILLS.md | No | CURRENT | AI skills | — | — | KEEP |
| 11_MCP_AND_AGENT_TOOLING.md | No | CURRENT | MCP/tooling | — | — | KEEP |
| 12_SECURITY_BASELINE.md | No | CURRENT | Security baseline | — | — | KEEP |
| 13_DEFINITION_OF_DONE_AND_QA.md | No | CURRENT | DOD/QA | — | — | KEEP |
| 14_CI_CD_AND_BRANCHING.md | No | CURRENT | CI/CD | — | — | KEEP |
| 15_ENVIRONMENT_AND_SECRETS.md | No | CURRENT | Environment/secrets | — | — | KEEP |
| 16_TEST_AND_BENCHMARK_PROTOCOL.md | No | CURRENT | Test/benchmark | — | — | KEEP |
| 17_RELEASE_RUNBOOK.md | No | CURRENT | Release runbook | — | — | KEEP |
| 18_INTERRUPTION_AND_HANDOFF.md | No | CURRENT | Interruption protocol | — | — | KEEP |
| 19_STATE_AUDIT_PROTOCOL.md | No | CURRENT | State audit protocol | — | — | KEEP |
| 20_ADR_INDEX.md | No | CURRENT | ADR index | — | — | KEEP |
| 21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md | No | CURRENT | Handy provenance | — | — | KEEP |
| DESIGN.md | No | CURRENT | **Sole authoritative design spec** | — | — | KEEP |
| SPEC_MANIFEST.json | No | CURRENT | Manifest | — | — | KEEP |

### B. Root-Level Old Engineering Documents

| Path | Tracked | Status | Purpose | Superseded By | References | Unique Info | Disposition |
|------|---------|--------|---------|---------------|------------|-------------|-------------|
| 01_PRD.md | Yes | HISTORICAL | Product requirements (old format) | v6/02_PRODUCT_REQUIREMENTS.md, v3/01_PRD.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Some content merged to v6 | ARCHIVE |
| 02_TDD.md | Yes | HISTORICAL | Technical design (old format) | v6/03_TECHNICAL_DESIGN.md, v3/02_ARCHITECTURE.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Some content merged to v6 | ARCHIVE |
| 03_AI_INSTRUCTIONS.md | Yes | HISTORICAL | AI agent rules (v2 format) | v6/09_AI_AGENT_INSTRUCTIONS.md, v3/03_AI_INSTRUCTIONS.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json, 06_DOD_QA.md | Near-duplicate with v3; v3 has more detail | ARCHIVE |
| 04_IMPLEMENTATION_PLAN.md | Yes | HISTORICAL | Implementation plan (v2 format) | v6/07_IMPLEMENTATION_PLAN.md, v3/04_IMPLEMENTATION_PLAN.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Near-duplicate with v3 | ARCHIVE |
| 05_TASK_BREAKDOWN.md | Yes | HISTORICAL | Task breakdown (v2 format) | v6/08_TASK_BREAKDOWN.md, v3/05_TASK_BREAKDOWN.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Near-duplicate with v3 | ARCHIVE |
| 06_DOD_QA.md | Yes | HISTORICAL | DOD/QA (v2 format) | v6/13_DEFINITION_OF_DONE_AND_QA.md, v3/06_DOD_QA.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Near-duplicate with v3 | ARCHIVE |
| 07_AI_SKILLS.md | Yes | HISTORICAL | AI skills (v2 format) | v6/10_AI_SKILLS.md, v3/07_AI_SKILLS.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Near-duplicate with v3 | ARCHIVE |
| 08_MCP_AND_AGENT_TOOLING.md | Yes | HISTORICAL | MCP/tooling (v2 format) | v6/11_MCP_AND_AGENT_TOOLING.md, v3/08_MCP_AND_AGENT_TOOLING.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Near-duplicate with v3 | ARCHIVE |
| 09_SECURITY_BASELINE.md | Yes | HISTORICAL | Security baseline (v2 format) | v6/12_SECURITY_BASELINE.md, v3/09_SECURITY_BASELINE.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Near-duplicate with v3 | ARCHIVE |
| 10_ADR_INDEX.md | Yes | HISTORICAL | ADR index (v2) | v6/20_ADR_INDEX.md, v3/10_ADR_INDEX.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Near-duplicate with v3 | ARCHIVE |
| 11_INTERRUPTION_HANDOFF.md | Yes | HISTORICAL | Interruption (v2 format) | v6/18_INTERRUPTION_AND_HANDOFF.md, v3/11_INTERRUPTION_HANDOFF.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Near-duplicate with v3 | ARCHIVE |
| 12_BENCHMARK_PROTOCOL.md | Yes | HISTORICAL | Benchmark (v2 format) | v6/16_TEST_AND_BENCHMARK_PROTOCOL.md, v3/12_BENCHMARK_PROTOCOL.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Near-duplicate with v3 | ARCHIVE |
| 13_RELEASE_RUNBOOK.md | Yes | HISTORICAL | Release (v2 format) | v6/17_RELEASE_RUNBOOK.md, v3/13_RELEASE_RUNBOOK.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Near-duplicate with v3 | ARCHIVE |
| 14_ENVIRONMENT_AND_SECRETS.md | Yes | HISTORICAL | Environment (v2 format) | v6/15_ENVIRONMENT_AND_SECRETS.md, v3/14_ENVIRONMENT_AND_SECRETS.md | SORAVO_HANDY_CODE_REUSE_REPORT.md, SPEC_MANIFEST.json | Near-duplicate with v3 | ARCHIVE |

### C. docs/spec-v2-archive/

| Path | Tracked | Status | Purpose | Superseded By | References | Unique Info | Disposition |
|------|---------|--------|---------|---------------|------------|-------------|-------------|
| 01_PRD.md | Yes | HISTORICAL | Historical v2 PRD | v6/02_PRODUCT_REQUIREMENTS.md, v3/01_PRD.md | — | Duplicate of root 01_PRD.md | DELETE-CANDIDATE |
| 02_TDD.md | Yes | HISTORICAL | Historical v2 TDD | v6/03_TECHNICAL_DESIGN.md, v3/02_ARCHITECTURE.md | — | Duplicate of root 02_TDD.md | DELETE-CANDIDATE |
| 03_AI_INSTRUCTIONS.md | Yes | HISTORICAL | Historical v2 AI | v6/09_AI_AGENT_INSTRUCTIONS.md, v3/03_AI_INSTRUCTIONS.md | — | Duplicate of root 03_AI_INSTRUCTIONS.md | DELETE-CANDIDATE |
| 04_IMPLEMENTATION_PLAN.md | Yes | HISTORICAL | Historical v2 plan | v6/07_IMPLEMENTATION_PLAN.md, v3/04_IMPLEMENTATION_PLAN.md | — | Duplicate of root 04_IMPLEMENTATION_PLAN.md | DELETE-CANDIDATE |
| 05_TASK_BREAKDOWN.md | Yes | HISTORICAL | Historical v2 tasks | v6/08_TASK_BREAKDOWN.md, v3/05_TASK_BREAKDOWN.md | — | Duplicate of root 05_TASK_BREAKDOWN.md | DELETE-CANDIDATE |
| 06_DOD_QA.md | Yes | HISTORICAL | Historical v2 DOD | v6/13_DEFINITION_OF_DONE_AND_QA.md, v3/06_DOD_QA.md | — | Duplicate of root 06_DOD_QA.md | DELETE-CANDIDATE |
| 07_AI_SKILLS.md | Yes | HISTORICAL | Historical v2 skills | v6/10_AI_SKILLS.md, v3/07_AI_SKILLS.md | — | Duplicate of root 07_AI_SKILLS.md | DELETE-CANDIDATE |
| 08_MCP_AND_AGENT_TOOLING.md | Yes | HISTORICAL | Historical v2 MCP | v6/11_MCP_AND_AGENT_TOOLING.md, v3/08_MCP_AND_AGENT_TOOLING.md | — | Duplicate of root 08_MCP_AND_AGENT_TOOLING.md | DELETE-CANDIDATE |
| 09_SECURITY_BASELINE.md | Yes | HISTORICAL | Historical v2 security | v6/12_SECURITY_BASELINE.md, v3/09_SECURITY_BASELINE.md | — | Duplicate of root 09_SECURITY_BASELINE.md | DELETE-CANDIDATE |
| 10_ADR_INDEX.md | Yes | HISTORICAL | Historical v2 ADR | v6/20_ADR_INDEX.md, v3/10_ADR_INDEX.md | — | Duplicate of root 10_ADR_INDEX.md | DELETE-CANDIDATE |
| 11_INTERRUPTION_HANDOFF.md | Yes | HISTORICAL | Historical v2 interrupt | v6/18_INTERRUPTION_AND_HANDOFF.md, v3/11_INTERRUPTION_HANDOFF.md | — | Duplicate of root 11_INTERRUPTION_HANDOFF.md | DELETE-CANDIDATE |
| 12_BENCHMARK_PROTOCOL.md | Yes | HISTORICAL | Historical v2 benchmark | v6/16_TEST_AND_BENCHMARK_PROTOCOL.md, v3/12_BENCHMARK_PROTOCOL.md | — | Duplicate of root 12_BENCHMARK_PROTOCOL.md | DELETE-CANDIDATE |
| 13_RELEASE_RUNBOOK.md | Yes | HISTORICAL | Historical v2 release | v6/17_RELEASE_RUNBOOK.md, v3/13_RELEASE_RUNBOOK.md | — | Duplicate of root 13_RELEASE_RUNBOOK.md | DELETE-CANDIDATE |
| 14_ENVIRONMENT_AND_SECRETS.md | Yes | HISTORICAL | Historical v2 env | v6/15_ENVIRONMENT_AND_SECRETS.md, v3/14_ENVIRONMENT_AND_SECRETS.md | — | Duplicate of root 14_ENVIRONMENT_AND_SECRETS.md | DELETE-CANDIDATE |
| SORAVO_HANDY_CODE_REUSE_REPORT.md | Yes | HISTORICAL | Historical Handy reuse | v6/21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md | root/SORAVO_HANDY_CODE_REUSE_REPORT.md | Duplicate | DELETE-CANDIDATE |
| 10_ADR_INDEX.md | Yes | HISTORICAL | v2 ADR index | v6/20_ADR_INDEX.md, v3/10_ADR_INDEX.md | — | Duplicate | DELETE-CANDIDATE |
| README.md | Yes | HISTORICAL | v2 archive readme | v3/00_README.md | — | Historical | ARCHIVE |
| decisions/ | Yes | HISTORICAL | v2 ADRs | decisions/ | — | Duplicate ADRs | DELETE-CANDIDATE |
| COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md | Yes | HISTORICAL | Compliance audit | — | — | Historical | HUMAN-REVIEW |

### D. docs/spec-v3/ (v3 - Implementation Authority)

| Path | Tracked | Status | Purpose | Superseded By | References | Unique Info | Disposition |
|------|---------|--------|---------|---------------|------------|-------------|-------------|
| 00_README.md | Yes | CURRENT | v3 readme | — | — | KEEP |
| 01_PRD.md | Yes | CURRENT | v3 PRD | v6/02_PRODUCT_REQUIREMENTS.md | — | KEEP |
| 02_ARCHITECTURE.md | Yes | CURRENT | v3 architecture | v6/03_TECHNICAL_DESIGN.md | — | KEEP |
| 03_AI_INSTRUCTIONS.md | Yes | CURRENT | v3 AI rules | v6/09_AI_AGENT_INSTRUCTIONS.md | — | KEEP |
| 04_IMPLEMENTATION_PLAN.md | Yes | CURRENT | v3 plan | v6/07_IMPLEMENTATION_PLAN.md | — | KEEP |
| 05_TASK_BREAKDOWN.md | Yes | CURRENT | v3 tasks | v6/08_TASK_BREAKDOWN.md | — | KEEP |
| 06_DOD_QA.md | Yes | CURRENT | v3 DOD | v6/13_DEFINITION_OF_DONE_AND_QA.md | — | KEEP |
| 07_AI_SKILLS.md | Yes | CURRENT | v3 skills | v6/10_AI_SKILLS.md | — | KEEP |
| 08_MCP_AND_AGENT_TOOLING.md | Yes | CURRENT | v3 MCP | v6/11_MCP_AND_AGENT_TOOLING.md | — | KEEP |
| 09_SECURITY_BASELINE.md | Yes | CURRENT | v3 security | v6/12_SECURITY_BASELINE.md | — | KEEP |
| 10_ADR_INDEX.md | Yes | CURRENT | v3 ADR index | v6/20_ADR_INDEX.md | — | KEEP |
| 11_INTERRUPTION_HANDOFF.md | Yes | CURRENT | v3 interrupt | v6/18_INTERRUPTION_AND_HANDOFF.md | — | KEEP |
| 12_BENCHMARK_PROTOCOL.md | Yes | CURRENT | v3 benchmark | v6/16_TEST_AND_BENCHMARK_PROTOCOL.md | — | KEEP |
| 13_RELEASE_RUNBOOK.md | Yes | CURRENT | v3 release | v6/17_RELEASE_RUNBOOK.md | — | KEEP |
| 14_ENVIRONMENT_AND_SECRETS.md | Yes | CURRENT | v3 env | v6/15_ENVIRONMENT_AND_SECRETS.md | — | KEEP |
| 15_HANDY_REUSE_POLICY.md | Yes | CURRENT | Handy policy | v6/04_HANDY_FORK_AND_REUSE_POLICY.md | — | KEEP |
| 16_HANDY_MIGRATION_STATUS.md | Yes | CURRENT | Migration status | v6/21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md | — | KEEP |
| 17_MODEL_LICENSE_AND_PROVENANCE.md | Yes | CURRENT | Model license | v6/DESIGN.md | — | KEEP |
| 18_DESKTOP_ARCHITECTURE.md | Yes | CURRENT | Desktop architecture | v6/05_DESKTOP_CONTRACTS.md | — | KEEP |
| 19_DOCUMENT_GOVERNANCE.md | Yes | CURRENT | Document governance | v6/00_README.md | — | KEEP |
| decisions/ADR-027-handy-derived-desktop-foundation.md | Yes | CURRENT | v3 ADR | decisions/ADR-026-handy-foundation.md | — | KEEP |
| MODEL_AND_BENCHMARK_REUSE_AUDIT.md | Yes | CURRENT | Benchmark audit | — | — | KEEP |
| MODEL_PROVENANCE_MATRIX.md | Yes | CURRENT | Provenance | — | — | KEEP |
| SORAVO_UI_INTEGRATION_PLAN.md | Yes | CURRENT | UI plan | — | — | KEEP |
| STT-BENCHMARK-RESULTS-016.md | Yes | CURRENT | Benchmark results | — | — | KEEP |
| RAZORPAY-*.md (6 files) | Yes | CURRENT | Razorpay docs | — | — | KEEP |

### E. progress/ (Historical Progress/Audit)

| Path | Tracked | Status | Purpose | Superseded By | References | Unique Info | Disposition |
|------|---------|--------|---------|---------------|------------|-------------|-------------|
| BENCHMARKS.md | Yes | HISTORICAL | Benchmark notes | v6/16_TEST_AND_BENCHMARK_PROTOCOL.md | — | Historical | ARCHIVE |
| ENVIRONMENT.md | Yes | HISTORICAL | Environment notes | v6/15_ENVIRONMENT_AND_SECRETS.md | — | Historical | ARCHIVE |
| FOUNDATION_AUDIT.md | Yes | HISTORICAL | Foundation audit | v6/DESIGN.md | — | Historical | ARCHIVE |
| GIT-BRANCH-CLEANUP-AUDIT.md | Yes | HISTORICAL | Branch audit | — | — | Historical | ARCHIVE |
| MCP.md | Yes | HISTORICAL | MCP notes | v6/11_MCP_AND_AGENT_TOOLING.md | — | Historical | ARCHIVE |
| NEXT.md | Yes | HISTORICAL | Next tasks | v6/08_TASK_BREAKDOWN.md | — | Historical | ARCHIVE |
| OPENCODE_TAKEOVER.md | Yes | HISTORICAL | Takeover notes | — | — | Historical | ARCHIVE |
| SKILLS_MCP_AUDIT.md | Yes | HISTORICAL | Skills audit | v6/11_MCP_AND_AGENT_TOOLING.md | — | Historical | ARCHIVE |
| SKILLS.md | Yes | HISTORICAL | Skills notes | v6/10_AI_SKILLS.md | — | Historical | ARCHIVE |
| STATUS.md | Yes | HISTORICAL | Status | v6/00_README.md | — | Historical | ARCHIVE |
| STT-002-BENCHMARK-REPORT.md | Yes | HISTORICAL | STT benchmark | v6/16_TEST_AND_BENCHMARK_PROTOCOL.md | — | Historical | ARCHIVE |
| STT-003-HANDY-REUSE-AUDIT.md | Yes | HISTORICAL | Handy audit | v6/21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md | — | Historical | ARCHIVE |
| STT-003-IMPLEMENTATION-SUMMARY.md | Yes | HISTORICAL | Implementation summary | v6/07_IMPLEMENTATION_PLAN.md | — | Historical | ARCHIVE |
| TRANS_002_006.md | Yes | HISTORICAL | Transition notes | v6/00_README.md | — | Historical | ARCHIVE |
| TYPE-002-003-HANDY-REUSE-AUDIT.md | Yes | HISTORICAL | Type audit | v6/21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md | — | Historical | ARCHIVE |
| TYPE-002-003-IMPLEMENTATION.md | Yes | HISTORICAL | Type implementation | v6/07_IMPLEMENTATION_PLAN.md | — | Historical | ARCHIVE |

### F. decisions/ (Current ADRs)

| Path | Tracked | Status | Purpose | Superseded By | References | Unique Info | Disposition |
|------|---------|--------|---------|---------------|------------|-------------|-------------|
| README.md | Yes | CURRENT | ADR readme | v6/20_ADR_INDEX.md | — | KEEP |
| ADR-001-tauri-v2-architecture.md | Yes | CURRENT | Tauri v2 | v6/00_README.md | — | KEEP |
| ADR-010-supabase-schema-and-rls.md | Yes | CURRENT | Schema/RLS | v6/03_TECHNICAL_DESIGN.md | — | KEEP |
| ADR-011-authentication-and-session-model.md | Yes | CURRENT | Auth/session | v6/06_WEB_CLOUD_PAYMENT.md | — | KEEP |
| ADR-012-supabase-entitlements-authorization.md | Yes | CURRENT | Entitlements | v6/06_WEB_CLOUD_PAYMENT.md | — | KEEP |
| ADR-013-supabase-devices-and-sessions.md | Yes | CURRENT | Devices/sessions | v6/06_WEB_CLOUD_PAYMENT.md | — | KEEP |
| ADR-014-cloudflare-hosting-and-deployment.md | Yes | CURRENT | Cloudflare hosting | v6/06_WEB_CLOUD_PAYMENT.md | — | KEEP |
| ADR-016-admin-dashboard-metrics.md | Yes | CURRENT | Admin metrics | v6/03_TECHNICAL_DESIGN.md | — | KEEP |
| ADR-021-linux-support.md | Yes | CURRENT | Linux support | v6/02_PRODUCT_REQUIREMENTS.md | — | KEEP |
| ADR-022-supabase-admin-role-and-authorization.md | Yes | CURRENT | Admin role | v6/06_WEB_CLOUD_PAYMENT.md | — | KEEP |
| ADR-023-scoped-signout-and-password-reauthentication.md | Yes | CURRENT | Signout/password | v6/06_WEB_CLOUD_PAYMENT.md | — | KEEP |
| ADR-024-payment-service-skeleton.md | Yes | CURRENT | Payment skeleton | v6/06_WEB_CLOUD_PAYMENT.md | — | KEEP |
| ADR-025-admin-user-directory.md | Yes | CURRENT | Admin directory | v6/06_WEB_CLOUD_PAYMENT.md | — | KEEP |
| ADR-026-handy-foundation.md | Yes | CURRENT | Handy foundation | v6/04_HANDY_FORK_AND_REUSE_POLICY.md | — | KEEP |

### G. Other Documentation

| Path | Tracked | Status | Purpose | Superseded By | References | Unique Info | Disposition |
|------|---------|--------|---------|---------------|------------|-------------|-------------|
| README.md | Yes | HISTORICAL | Root readme | v6/00_README.md | — | References v3 | ARCHIVE |
| PROGRESS.md | Yes | HISTORICAL | Progress log | v6/00_README.md | — | Historical evidence | ARCHIVE |
| SORAVO_PLAN.md | Yes | HISTORICAL | Old plan | v6/00_README.md | — | References v3 | ARCHIVE |
| SORAVO_HANDY_CODE_REUSE_REPORT.md | Yes | HISTORICAL | Handy reuse report | v6/21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md | — | Historical | ARCHIVE |
| SPEC_MANIFEST.json | Yes | HISTORICAL | Manifest | v6/SPEC_MANIFEST.json | — | References root v2 docs | ARCHIVE |
| docs/README.md | Yes | HISTORICAL | Docs readme | v6/00_README.md | — | References v2/v3 | ARCHIVE |
| docs/ARCHITECTURE.md | Yes | HISTORICAL | Legacy arch | v6/03_TECHNICAL_DESIGN.md | — | Duplicate | ARCHIVE |
| docs/HANDY_V1_PLAN.md | Yes | HISTORICAL | Handy v1 plan | v6/04_HANDY_FORK_AND_REUSE_POLICY.md | — | Historical | ARCHIVE |
| docs/SECURITY_POLICY.md | Yes | HISTORICAL | Legacy security | v6/12_SECURITY_BASELINE.md | — | Duplicate | ARCHIVE |

### H. .swarm/ Documentation (OpenCode System)

| Path | Tracked | Status | Purpose | References | Unique Info | Disposition |
|------|---------|--------|---------|------------|-------------|-------------|
| .swarm/*.md | Yes | CURRENT | OpenCode workflow | — | System docs | KEEP |
| .swarm/bundled-skills/**/*.md | Yes | CURRENT | OpenCode skills | — | System docs | KEEP |

### I. docs/compliance/ docs/docs/COMPLIANCE/

| Path | Tracked | Status | Purpose | References | Unique Info | Disposition |
|------|---------|--------|---------|------------|-------------|-------------|
| docs/compliance/* | Yes | HISTORICAL | Compliance | v6/12_SECURITY_BASELINE.md | Historical | ARCHIVE |
| docs/COMPLIANCE/* | Yes | HISTORICAL | Compliance | v6/12_SECURITY_BASELINE.md | Historical | ARCHIVE |

---

## 4. Authority Conflicts

| Old Document | Authority Claim | v6 Authority | Conflict Status |
|--------------|-----------------|--------------|-----------------|
| README.md | "SORAVO_PLAN.md" is authoritative | v6/00_README.md | CONFLICT - v6 is authoritative |
| README.md | "docs/spec-v3/" is authoritative | v6/00_README.md | Partial CONFLICT - v3 is implementation truth, v6 is engineering-control truth |
| SORAVO_PLAN.md | Root-level authority | v6/00_README.md | CONFLICT - v6 supersedes |
| 03_AI_INSTRUCTIONS.md (root) | "V3 AI Instructions" authority | v6/09_AI_AGENT_INSTRUCTIONS.md | CONFLICT - v6 is current |
| PROGRESS.md | "progressive record" | v6/00_README.md | CONFLICT - PROGRESS.md is not authoritative |

---

## 5. Duplicates

### Byte-Identical Duplicates
- docs/spec-v2-archive/ files match root-level files (01_PRD.md through 14_ENVIRONMENT_AND_SECRETS.md)

### Near-Duplicates
| Old | New | Content Overlap |
|-----|-----|-----------------|
| root/01_PRD.md | docs/spec-v3/01_PRD.md | ~90% |
| root/02_TDD.md | docs/spec-v3/02_ARCHITECTURE.md | ~80% |
| root/03_AI_INSTRUCTIONS.md | docs/spec-v3/03_AI_INSTRUCTIONS.md | ~95% |
| root/04_IMPLEMENTATION_PLAN.md | docs/spec-v3/04_IMPLEMENTATION_PLAN.md | ~90% |

---

## 6. Unique Historical Information

| File | Unique Content | Recommendation |
|------|---------------|----------------|
| SORAVO_HANDY_CODE_REUSE_REPORT.md | Full Handy reuse audit trail | ARCHIVE (historical reference) |
| progress/FOUNDATION_AUDIT.md | Foundation audit details | ARCHIVE |
| progress/STT-003-HANDY-REUSE-AUDIT.md | Detailed STT/Handy audit | ARCHIVE |
| docs/spec-v3/RAZORPAY-*.md | Razorpay implementation details | KEEP (current implementation) |
| decisions/ADR-*.md | Current ADRs | KEEP |

---

## 7. Current References

| Referenced Document | Reference Type | Handler |
|---------------------|----------------|---------|
| root/01_PRD.md | SPEC_MANIFEST.json | Update manifest to reference v3 or v6 |
| root/02_TDD.md | SPEC_MANIFEST.json | Update manifest |
| root/03_AI_INSTRUCTIONS.md | SPEC_MANIFEST.json | Update manifest |
| root/04_IMPLEMENTATION_PLAN.md | SPEC_MANIFEST.json | Update manifest |
| root/05_TASK_BREAKDOWN.md | SPEC_MANIFEST.json | Update manifest |
| root/06_DOD_QA.md | SPEC_MANIFEST.json | Update manifest |
| root/07_AI_SKILLS.md | SPEC_MANIFEST.json | Update manifest |
| root/08_MCP_AND_AGENT_TOOLING.md | SPEC_MANIFEST.json | Update manifest |
| root/09_SECURITY_BASELINE.md | SPEC_MANIFEST.json | Update manifest |
| root/10_ADR_INDEX.md | SPEC_MANIFEST.json | Update manifest |
| root/11_INTERRUPTION_HANDOFF.md | SPEC_MANIFEST.json | Update manifest |
| root/12_BENCHMARK_PROTOCOL.md | SPEC_MANIFEST.json | Update manifest |
| root/13_RELEASE_RUNBOOK.md | SPEC_MANIFEST.json | Update manifest |
| root/14_ENVIRONMENT_AND_SECRETS.md | SPEC_MANIFEST.json | Update manifest |
| PROGRESS.md | PROGRESS.md itself | Historical |
| docs/spec-v3/04_IMPLEMENTATION_PLAN.md | PROGRESS.md | Current v3 ref |

---

## 8. Proposed KEEP List

- **v6 pack:** All 24 files (Soravo_Engineering_Docs_v6/)
- **v3 pack:** All files in docs/spec-v3/
- **Current ADRs:** All in decisions/
- **docs/README.md:** Updated v3 link
- **docs/compliance/* and docs/COMPLIANCE/:** Historical compliance

---

## 9. Proposed ARCHIVE List

- **Root v2 docs:** 01_PRD.md through 14_ENVIRONMENT_AND_SECRETS.md (14 files)
- **SORAVO_PLAN.md**
- **SORAVO_HANDY_CODE_REUSE_REPORT.md**
- **PROGRESS.md**
- **SPEC_MANIFEST.json**
- **docs/*:** ARCHITECTURE.md, HANDY_V1_PLAN.md, SECURITY_POLICY.md
- **progress/:** All files (16 files)
- **README.md** (root)

---

## 10. Proposed DELETE-CANDIDATE List

- **docs/spec-v2-archive/*:** All files (31 files)
  - 01_PRD.md through 14_ENVIRONMENT_AND_SECRETS.md
  - SORAVO_HANDY_CODE_REUSE_REPORT.md
  - decisions/ (full duplicate)
  - README.md, COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md

---

## 11. HUMAN-REVIEW List

- **docs/spec-v2-archive/COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md** - Contains audit details that may have historical value

---

## 12. Exact Recommended Cleanup Sequence

1. **Update SPEC_MANIFEST.json** to reference v6 or v3 documents (not root v2 docs)
2. **Move root v2 docs to archive:**
   ```bash
   mkdir -p docs/superseded-v2
   mv 01_PRD.md 02_TDD.md 03_AI_INSTRUCTIONS.md 04_IMPLEMENTATION_PLAN.md 05_TASK_BREAKDOWN.md 06_DOD_QA.md 07_AI_SKILLS.md 08_MCP_AND_AGENT_TOOLING.md 09_SECURITY_BASELINE.md 10_ADR_INDEX.md 11_INTERRUPTION_HANDOFF.md 12_BENCHMARK_PROTOCOL.md 13_RELEASE_RUNBOOK.md 14_ENVIRONMENT_AND_SECRETS.md SORAVO_PLAN.md SORAVO_HANDY_CODE_REUSE_REPORT.md PROGRESS.md SPEC_MANIFEST.json README.md docs/ docs/superseded-v2/
   ```
3. **Delete docs/spec-v2-archive/** (confirmed duplicate)
4. **Move progress/** to docs/archive/
5. **Update root README.md** to reference v6 pack as authoritative

---

## Summary Statistics

| Category | Count |
|----------|-------|
| v6 documents | 24 |
| v3 documents | 32 |
| Root v2 documents (tracked) | 14 |
| docs/spec-v2-archive/ files | 31 |
| progress/ files | 16 |
| decisions/ ADRs | 14 |
| Total historical to archive | ~60 files |
| Total duplicates to delete | ~31 files |

---

**END OF REPORT**
