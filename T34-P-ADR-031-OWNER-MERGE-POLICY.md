# T34-P — ADR-031 — Owner Merge Policy

Status: **ACCEPTED (owner-directed)**
Owner authorization: 2026-10-04, direct owner instruction ("GOVERNANCE CHANGE —
OWNER MERGE POLICY"), superseding the prior requirement for a second human
approval on every normal PR.
Task: T34-P
Repository: `eySRbS4zgHuW3gMFZB2/soravo`
Base commit at decision time: `ede495b5` (`origin/main`)
Supersedes: nothing. Amends: nothing. This is a new, standalone control.

---

## 1. The problem this ADR resolves

The requirement for a second human approval on every normal PR was never stated
in the canonical engineering-control pack. It existed in exactly two places:

1. **GitHub branch protection on `main`** —
   `required_pull_request_reviews.required_approving_review_count = 1`, applied
   by T23 (`T23-GITHUB-BRANCH-PROTECTION-REPORT.md`). Because the repository
   owner is also the sole collaborator, the sole PR author, and the sole
   approver, this setting made normal PRs unmergeable by the person the project
   actually depends on.
2. **Historical task reports and `PROGRESS.md` evidence logs** — which recorded
   the blocking state as fact ("Review PR #64 and approve it (1 required)").

Verification performed before deciding: read the canonical pack
(`docs/Soravo_Engineering_Docs_v6/`, all 24 manifest documents), searched every
canonical document for approval/merge-authority language, and read the live
protection payload. No canonical document mandated a second approver. The
governance gap and the operational blocker were the same single fact.

Consequence: the required governance change is **small, additive, and does not
remove any existing control.** It restores a merge path that never existed in
the control plane, and it does so only behind every gate that already existed.

## 2. Decision

**The repository owner / primary maintainer may merge their own pull request
when, and only when, every required automated check and every repository-defined
safety gate passes.**

The normal PR workflow remains the default. This ADR does not introduce direct
commits to `main`, does not permit editing `main` directly, and does not change
branching, commit, or push discipline.

Merge is permitted only when **all** of the following are true. This is a
conjunction; failing any single condition means the merge does not happen.

| # | Condition | Enforced by |
|---|---|---|
| M1 | The change arrives through a pull request against `main` | branch protection |
| M2 | Required status checks `web`, `e2e`, `rust`, `desktop` all report success on the current head SHA | branch protection |
| M3 | The branch is up to date with `main` (`strict`) | branch protection |
| M4 | Force-push and branch deletion remain disabled | branch protection |
| M5 | The PR contains no secrets, fabricated evidence, or unrelated bundled work | agent discipline + review |
| M6 | The change is not a designated-review change (§5) | agent discipline + owner designation |
| M7 | Security-relevant checks (`cargo-audit`, `cargo-deny`, `npm-audit`) are green or their accepted-and-documented risk is recorded in an ACCEPTED ADR | CI + ADR record |
| M8 | Production/release gates (§6) are untouched and remain separately satisfied | release runbook |

## 3. The change actually made to GitHub protection

Exactly one field was modified. Everything else was read back and confirmed
byte-identical.

| Field | Before | After |
|---|---|---|
| `required_pull_request_reviews.required_approving_review_count` | `1` | `0` |
| `required_status_checks.contexts` | `["web","e2e","rust","desktop"]` | **unchanged** |
| `required_status_checks.strict` | `true` | **unchanged** |
| `dismiss_stale_reviews` | `true` | **unchanged** |
| `require_code_owner_reviews` | `false` | **unchanged** |
| `allow_force_pushes.enabled` | `false` | **unchanged** |
| `allow_deletions.enabled` | `false` | **unchanged** |
| `enforce_admins.enabled` | `false` | **unchanged** |
| all other fields | — | **unchanged** |

Required status checks were **not** disabled, renamed, or relaxed. `web`,
`e2e`, `rust` and `desktop` remain mandatory and gate every merge.

`required_approving_review_count = 0` is the minimum change that permits the
owner to merge their own PR. It is the only mechanism GitHub offers for this:
GitHub does not permit a pull-request author to approve their own pull request,
so any value ≥ 1 makes owner self-merge impossible. Setting the count to `0`
removes the human-approval *quantity* requirement while leaving every automated
gate in place.

## 4. What remains mandatory — the non-weakening clause

None of the following is relaxed, weakened, deferred, or made advisory by this
ADR. An agent may not treat any of them as negotiable:

- Required CI/tests must pass on the head being merged.
- Security and audit checks must pass, or an ACCEPTED ADR must record the
  accepted risk (as ADR-030 does for the dev-graph `braces` advisory).
- **No force-push and no history rewriting.** Shared history is never rewritten.
- **No disabling required checks to obtain a merge.** Required checks are not
  removed, renamed, made optional, or replaced with weaker equivalents.
- **No merge with failing required checks.**
- **No fabricated or self-created review approval.** An agent may never write,
  synthesize, or auto-approve a review; may never impersonate a reviewer; and
  may never manufacture the appearance of independent review. A review authored
  by the change's author, or by an agent acting for them, is not a review.
- **No use of GitHub's emergency "bypass rules" / admin override mechanism to
  work around a failing requirement.** This is prohibited even when the owner
  holds admin rights, and even when it would be faster. If a required check
  cannot pass, the change does not merge; the check is fixed or the change is
  re-scoped.
- Required checks may not be marked "expected", neutralized, or skipped as a
  merge strategy.

## 5. Carve-out: designated-review changes still require independent human review

Security-sensitive and explicitly designated changes **do not** become
self-mergeable.

A change is a **designated-review change** if any of the following is true:

1. The owner designates it, in writing, for that change (including by applying
   the `requires-independent-review` label to the PR).
2. It touches a security boundary: authentication, session, entitlements/RLS,
   payment/webhook handling, secret or key handling, CI/release workflow
   definitions, branch-protection settings, dependency policy, `deny.toml`,
   `Cargo.lock`/`pnpm-lock.yaml` policy, or licence/model-licensing assertions.
3. It is a dependency-strategy change — the class ADR-030 explicitly deferred to
   its own ADR and owner approval (the floating `"latest"` specifier class).
4. It touches Handy-derived desktop core behaviour, where the V1 Handy-core
   preservation policy (ADR-018/ADR-019) and the source boundary apply.

For a designated-review change, independent human review by a person who is not
the author of the change is **required**, and the agent must stop rather than
merge.

**Honest limitation, recorded rather than papered over.** GitHub branch
protection cannot express a *conditional* review requirement — it is all-or-
nothing per branch. With `required_approving_review_count = 0`, the GitHub-side
enforcement of this carve-out is therefore **procedural and agent-enforced, not
platform-enforced.** This is a real reduction in platform-enforced assurance
and is accepted knowingly, because the previous setting was not merely
strict — it was unusable, blocking every normal merge indefinitely. The
compensating controls are:

- the agent-side stop condition in `09_AI_AGENT_INSTRUCTIONS.md`, which makes
  merging a designated-review change a stop condition, not a judgement call;
- the owner's explicit written designation;
- the ADR record, which is the audit trail for any accepted risk.

**Owner action required to make the carve-out fully effective.** This repository
has exactly one collaborator (`eySRbS4zgHuW3gMFZB2`, admin). Until the owner
grants another person read access so they can review and approve, a designated-
review change cannot obtain a genuinely independent approval. Reviewer
access must be granted before, not after, a designated change is authored. The
agent will not grant access to anyone.

## 6. Production and release gates remain separate

This ADR governs **source merges into `main` only**. It does not authorize any
release, publication, or production change. The release runbook
(`17_RELEASE_RUNBOOK.md`) preconditions are unchanged and remain independently
satisfied: required CI green, verified target desktop builds, verified model
licences, verified payment E2E, completed security, no unresolved P0/P1, and
reproducible artifacts. Signing credentials remain external secrets. Razorpay
LIVE activation still requires business/provider approval and remains forbidden
on code-readiness alone.

Merging a PR to `main` never implies production readiness. Merging does not
close any release gate, and this ADR asserts no release claim.

## 7. Canonical documentation changed by this ADR

Authoritative control plane: `docs/Soravo_Engineering_Docs_v6/`.

| Document | Change |
|---|---|
| `14_CI_CD_AND_BRANCHING.md` | New section "Merge authority and owner-merge policy": the M1–M8 conditions, the non-weakening clause, the designated-review carve-out, and the deterministic merge decision procedure. |
| `09_AI_AGENT_INSTRUCTIONS.md` | Merge-authority rules for the agent; additions to `Forbidden` covering fabricated approval, disabling required checks for a merge, and emergency bypass; merge of a designated-review change added as a stop condition; reporting line for merge state. |
| `13_DEFINITION_OF_DONE_AND_QA.md` | Clarified that `diff review` is the agent's independent self-review of the diff and remains mandatory; merge authority does not substitute for it. |
| `17_RELEASE_RUNBOOK.md` | One line recording that source-merge authority (ADR-031) is separate from, and does not satisfy, any release precondition. |
| `20_ADR_INDEX.md` | This ADR registered as ADR-031. |

Deliberately **not** changed:

- `12_SECURITY_BASELINE.md` — no security requirement was weakened; it never
  contained a merge-authority rule.
- `.github/workflows/**` — no CI job, gate, or trigger was added, removed, or
  altered. Required checks are unchanged.
- `docs/Soravo_Engineering_Docs_v6/SPEC_MANIFEST.json` — no document was added
  to or removed from the canonical pack directory, so `file_count: 24` and the
  24 manifest entries remain exact and reconciled. This ADR's text lives at the
  repository root by the pack's own convention ("ADR text is not stored in this
  pack").
- Root mirror `Soravo_Engineering_Docs_v6/**` — that copy is declared a
  **non-authoritative mirror** by `docs/…/00_README.md`, whose instruction is
  verbatim "Do not edit the control plane here." Editing it would be a
  governance violation, so it is left untouched. `docs/…/20_ADR_INDEX.md`
  remains the single index of record.
- Root `SPEC_MANIFEST.json` and root `01_`–`14_*.md` — already declared
  `HISTORICAL/STALE` by the canonical pack pending owner reconciliation
  (open item O-5). This ADR does not reopen that reconciliation.
- PR #64's code, commits, and dependencies — untouched.

## 8. Interaction with PR #64 (recorded for the next task)

PR #64 (`fix/t34-l-braces-dependency-remediation`) is the in-flight security
remediation. It carries the newest canonical governance text — `09` (+263 lines)
and `20_ADR_INDEX.md` (ADR-019 … ADR-030) exist only on that branch, not on
`main`. This ADR was therefore committed on a separate branch based on
`origin/main`, to keep the governance change focused and to avoid rebundling
governance text into a security-remediation PR.

**Known, deterministic merge interaction — not a surprise, not improvised.** When
PR #64 is merged into `main`, two files will need a manual union:

- `docs/Soravo_Engineering_Docs_v6/09_AI_AGENT_INSTRUCTIONS.md`
- `docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md`

Exact resolution recipe:

1. Keep PR #64's version of both files in full — it is the newer control-plane
   text and supersedes the `main`-based copy structurally.
2. Re-apply this ADR's additions to the newer files: the merge-authority section
   and the `Forbidden`/stop-condition additions in `09`, and the ADR-031 entry in
   `20_ADR_INDEX.md` immediately after the ADR-030 entry.
3. Confirm ADR-030 and ADR-031 both remain present and neither is truncated.
4. `13`, `14` and `17` are byte-identical on both bases and merge automatically.

`14_CI_CD_AND_BRANCHING.md`, `13_DEFINITION_OF_DONE_AND_QA.md` and
`17_RELEASE_RUNBOOK.md` were verified byte-identical between `origin/main` and
the PR #64 head specifically so this change would not create conflicts there.

## 9. Verification performed

- Live protection payload read authenticated **before** the change and saved;
  read again **after** the change; every non-target field compared.
- `required_status_checks.contexts` confirmed still exactly
  `["web","e2e","rust","desktop"]` after the change.
- Canonical pack read to confirm no existing control was contradicted or lost.
- Worktree inspected before staging; untracked T2x/T3x/T34 reports and
  `apps/desktop/.env.example` confirmed unrelated and deliberately left
  untracked. No `git add -A` was used; every path was staged explicitly.
- No history rewriting, no force-push, no direct edit to `main`.

## 10. Next task

The owner's next action is to decide whether to merge this governance PR, then
to merge PR #64 through the ordinary path now that the merge gate is
deterministic. PR #64 is **not** merged by T34-P.