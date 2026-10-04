# T17 — Git/CI Milestone Control and Current-State Reconciliation

## Skill Selection Gate

Loaded Skills:
- `github` — CLI workflow for PRs, CI runs, and repository queries

---

## PHASE 1 — Full Git State Audit

| Item | Value |
|------|-------|
| 1. Current HEAD SHA | `ede495b55efd95cedd882d90a19d12b4777da852` |
| 2. Current Branch | `main` |
| 3. Origin URL | `https://github.com/eySRbS4zgHuW3gMFZB2/soravo.git` |
| 4. Origin/main SHA | `ede495b55efd95cedd882d90a19d12b4777da852` |
| 5. Ahead/Behind | HEAD == origin/main (0 ahead, 0 behind) |
| 6. Working-tree Status | **DIRTY** — 80 files modified/added/deleted |
| 7. Staged Files | None |
| 8. Modified Tracked Files | 59 files |
| 9. Deleted Tracked Files | 21 files (docs/spec-v3/*) |
| 10. Untracked Files | 40+ files (T02-T16 reports, audit artifacts) |
| 11. Existing Branches | 45+ local + remote branches |
| 12. Recent Commits | See `git log --oneline -10` |
| 13. Recent GitHub PRs | 9 open PRs (all dependabot) |
| 14. Recent GitHub Actions Runs | See table below |
| 15. Branch Protection/Rulesets on Main | **NONE** |
| 16. Required CI Checks Before Merge | **NONE** |
| 17. Direct Pushes to Main Possible | **YES** |

### GitHub Actions Runs (Most Recent)

| Run ID | Status | Timestamp |
|--------|--------|-----------|
| 36357597823 (PR #61) | FAILURE | 2026-09-27T23:07:00Z |
| 36357583831 (PR #60) | FAILURE | 2026-09-27T23:06:45Z |
| 36339104443 (main push) | FAILURE (CI) | 2026-09-27T18:01:39Z |
| 36339104444 (main push) | SUCCESS (Deploy) | 2026-09-27T18:01:39Z |

---

## PHASE 2 — Reconcile Milestone History

### Why T08–T16 Reported "No commit. No push."

**Root Cause:** Repository has never enforced proper feature-branch → PR → CI → merge workflow.

1. No branch protection rules
2. No required status checks
3. Multiple stashes (10) contain WIP from previous tasks
4. docs/spec-v3/* deleted and replaced with v6 docs
5. Pending work exists in modified files, not committed

### Work vs GitHub Status

| Task/Milestone | In VM/worktree | On GitHub | Status |
|----------------|----------------|-----------|--------|
| T08-PAYMENT-ENTITLEMENT | Partial | Partial (bfbffc8d) | Changes in tree |
| T10-B-DESKTOP-COMMAND-RECOVERY | Partial | Partial (ede495b5) | Changes in tree |
| T13-HANDY-CORE-BOUNDARY | Partial | Partial | Changes in tree |
| T14 (CI/CD) | Partial | Partial | Changes in tree |
| T15-WINDOWS-MACOS-RELEASE | Partial | Partial | Changes in tree |
| T16-FINAL-COMPLETION-MATRIX | Partial (untracked) | No | Artifact only |

---

## PHASE 3 — Worktree Classification

### Modified Tracked Files (59 files)

| Category | Files |
|----------|-------|
| Desktop Core Changes (T10-B, T13) | 30 files |
| Payment/Website (T08) | 8 files |
| Rust Crates | 5 files |
| Engineering Docs (v6) | 5 files |
| Dependency Updates | 2 files (Cargo.lock, pnpm-lock.yaml) |
| Security Config | 1 file (deny.toml) |

### Deleted Tracked Files (21 files)

| Category | Files |
|----------|-------|
| Historical Archive | 21 files (docs/spec-v3/* — T08-T16 spec artifacts) |

### Untracked Files (40+ files)

| Category | Files |
|----------|-------|
| T02-T16 Reports | 40+ report files |
| Audit Artifacts | CI-BASELINE-AUDIT-002.md, STATE-AUDIT-V6-002.md, etc. |
| Generated | apps/desktop/.env.example, deno.lock, etc. |
| Unknown/Temporary | Soravo_Engineering_Docs_v6/ (duplicate) |

---

## PHASE 4 — Commit Structure Analysis

**CRITICAL:** Current worktree state is NOT safely checkpointable.

### Conflicts/Dependencies

1. Cargo.lock changes depend on Cargo.toml modifications
2. Desktop core changes (30 files) form a coherent unit
3. Payment/website changes (8 files) are coherent
4. Documentation changes (5 files) are coherent
5. Deleted files (21) represent intentional migration

### Proposed Commit Structure (if checkpointing)

```
1. recovery/desktop-functional-changes (T10-B, T13)
2. payment/security-recovery (T08)
3. test-ci-infrastructure
4. engineering-control-v6-update
5. dependency-snapshot
```

**Cannot be safely separated without testing.**

---

## PHASE 5 — CI Audit

| Gate | Workflow | Job | Required for Merge |
|------|----------|-----|-------------------|
| Web lint/typecheck/test/build | ci.yml | web | NO |
| Playwright e2e | ci.yml | e2e | NO |
| Rust fmt/clippy/test/audit/deny | ci.yml | rust | NO |
| Desktop build | ci.yml | desktop | NO |
| Security audit (npm/rust) | security-audit.yml | npm-audit/cargo-audit | NO |

### Critical Findings

| Issue | Severity |
|-------|----------|
| No branch protection rules | **CRITICAL** |
| No required status checks | **CRITICAL** |
| Recent CI runs failing | **HIGH** |

---

## PHASE 6 — Milestone Policy Status

| Requirement | Status |
|-------------|--------|
| No normal direct development on main | ❌ NOT ENFORCED |
| Feature branches named `<task-id>/<desc>` | ❌ NOT ENFORCED |
| Required CI checks before merge | ❌ NOT ENFORCED |
| CI runs on PR | ✅ |
| PRs exist | ✅ (9 open) |

**Missing:** Branch protection, required status checks, push restrictions

---

## PHASE 7 — Checkpoint Decision

**STATUS: BLOCKED**

Cannot safely checkpoint because:
1. No branch protection on main
2. Interdependent changes (Cargo.toml ↔ Cargo.lock) cannot be safely separated
3. Recent CI failures need resolution

**Recommended Path:**
1. Configure branch protection on main
2. Resolve npm dependabot CI failures
3. Create T17 feature branch
4. Commit coherent changes
5. Open PR and wait for CI

---

## PHASE 8 — Repository State Summary

| Field | Value |
|-------|-------|
| Starting SHA | `ede495b55efd95cedd882d90a19d12b4777da852` |
| Ending SHA | `ede495b55efd95cedd882d90a19d12b4777da852` |
| Branch | `main` |
| GitHub State | 9 open dependabot PRs; no protection |
| VM State | Dirty — 59 modified, 21 deleted, 40+ untracked |
| Commits Created | 0 (checkpoint blocked) |
| Required Checks | None configured |
| Branch Protection | None configured |
| Unresolved Failures | npm dependabot PRs failing |
| Recovery Information | 10 stashes contain previous WIP |

---

## PHASE 9 — Next Exact Task

**Do NOT start next functional feature.**

**Immediate actions required:**

1. Configure branch protection on main:
   - Require pull request reviews (1+ approvers)
   - Require status checks to pass (ci)
   - Require branches to be up to date before merging
   - Restrict direct pushes to main

2. Resolve dependabot CI failures:
   - Investigate npm audit issues
   - Fix pnpm-lock.yaml conflicts

3. After protection enabled:
   - Create T17 feature branch
   - Commit coherent changes
   - Open PR
   - Wait for CI to pass

---

## Audit Trail

- Skill Gate: `github` skill loaded
- Audit Date: 2026-09-28
- Repository: `github.com/eySRbS4zgHuW3gMFZB2/soravo`
- Report Generated By: T17 Git/CI Milestone Control Process
