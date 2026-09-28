# T04-D CI Protection Readiness Report

## Audit Date
2026-09-28

## 1. Current CI State

**CI Workflow Status:**
- Workflow: `ci.yml` (active on `main` branch)
- Jobs (4): `web`, `e2e`, `rust`, `desktop`
- All 4 jobs failed on latest CI run (SHA: `f10c511a`, Dependabot PR)

**Individual Job Status (latest run):**
| Job | Conclusion | Primary Failure Point |
|-----|------------|----------------------|
| web | failure | `pnpm install --frozen-lockfile` |
| e2e | failure | `pnpm install --frozen-lockfile` |
| rust | failure | `cargo fmt --all -- --check` |
| desktop | failure | `pnpm install --frozen-lockfile` |

**Note:** Recent local repairs to web lint and Rust formatting have been applied to the repo but are not reflected in the CI workflow execution (lockfile sync required).

## 2. Current Check Names

The following job names appear in CI check results on GitHub:
- `web`
- `e2e`
- `rust`
- `desktop`

These are the exact names that would be required as status checks if branch protection were enabled.

## 3. Current Branch Protection State

**main branch protection: NOT CONFIGURED**

```
gh api repos/eySRbS4zgHuW3gMFZB2/soravo/branches/main/protection
→ HTTP 404: {"message":"Branch not protected"}
```

No required status checks are enforced. Pushes to `main` bypass all CI gates.

## 4. Current Workflow/Deployment Relationship

**Pages deployment workflow: INDEPENDENT of CI**

- Workflow: `pages-deployment.yaml`
- Triggers: `push` to `main`, `workflow_dispatch`
- Has own job: `deploy` (runs separate from CI jobs)
- No `needs: CI` or status check dependency on CI workflow
- Deployment proceeds on any `main` push where `CLOUDFLARE_API_TOKEN` secret is set

**Verified:** Deployment runs independently. A red-CI commit still deploys if the secret is configured.

## 5. Required-Check Names (T03-F Spec)

Per T03-F findings, the final required checks should be:
1. `web`
2. `rust`
3. `e2e`
4. `desktop`

**Note:** `deploy` is explicitly excluded from required checks (it is a downstream deployment, not a CI gate).

## 6. Workflow Changes Since T03-F

**No workflow changes detected since T03-F.**

- `ci.yml`: Structure unchanged (4 jobs: web, e2e, rust, desktop)
- `pages-deployment.yaml`: Structure unchanged (independent deploy job)

The job names and workflow architecture remain identical to T03-F documentation.

## 7. Prerequisites Remaining Before Protection Can Be Enabled

| Prerequisite | Status | Owner |
|--------------|--------|-------|
| Fix `web` job (lockfile sync) | Pending | T04-<task> |
| Fix `rust` job (formatting compliance) | Pending | T04-<task> |
| Fix `e2e` job (lockfile sync) | Pending | T04-<task> |
| Fix `desktop` job (STOP-rule resolution: locale sourcegen + unsafe FFI) | Pending | T03-E recovery work |
| CI green baseline achieved (all 4 jobs pass on HEAD) | Pending | - |
| Branch protection enabled with required checks | Pending | Human action |

## 8. T03-F Discrepancy Check

| T03-F Finding | Current Audit | Discrepancy |
|---------------|---------------|-------------|
| CI workflow and Pages deployment independent | Verified | None |
| main has no branch protection | Verified | None |
| Required checks: web, rust, e2e, desktop | Verified | None |
| deploy should not be a required check | Verified | None |

**No new discrepancies identified.**

## 9. Risk Assessment

**Current Risk: HIGH**

- `main` is unprotected; any commit can be pushed without CI validation
- Red-CI commits have deployed to Pages in the past
- No enforcement of the green-baseline requirement

**Mitigation:** Do not enable branch protection until all 4 CI jobs pass consistently on HEAD (green baseline achieved).

## 10. STOP

This report stops at readiness audit. No workflow modifications or branch protection changes have been made.
