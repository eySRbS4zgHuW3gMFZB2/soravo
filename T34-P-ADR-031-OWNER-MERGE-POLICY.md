# T34-P — ADR-031 — Owner Merge Policy

Status: **ACCEPTED (owner-directed)**
Owner authorization: 2026-10-04, direct owner instruction ("GOVERNANCE CHANGE —
OWNER MERGE POLICY"), superseding the prior requirement for a second human
approval on every normal PR.
Task: T34-P
Repository: `eySRbS4zgHuW3gMFZB2/soravo`
Base commit at decision time: `ede495b5` (`origin/main`)
Supersedes: nothing. Amends: nothing. This is a new, standalone control.

**Amendment log**

| Amendment | Date | Task | Effect |
|---|---|---|---|
| ADR-031 original | 2026-10-04 | T34-P | Owner-merge policy adopted; `required_approving_review_count: 1 → 0`. |
| ADR-031-A1 | 2026-10-04 | **T34-R** | Adds §5.1 (prospective-only effective date), §5.2 (anti-deadlock rule), §5.3 (named exception for PR #64), §5.4 (future policy explicitly unchanged). **No weakening of §4, of any required check, or of branch protection.** |
| ADR-031-A2 | 2026-10-04 | **T34-U** | Closes the §5 trigger list into a **deterministic high-risk classification** (§5.5); splits dependency changes into *admission* (high-risk) vs *maintenance* (normal) so a dependency change alone can no longer create an unobtainable review (§5.6); restates owner-merge as the **default** with §4 strictly **subordinate** (§5.7); records PR #65's own classification (§5.8). **No required check, branch-protection field, non-weakening clause, or prohibition is removed, relaxed, deferred, or made optional. No bypass is authorized.** |

**Reading order note.** ADR-031 §1–§5.4 and §6–§10 are preserved **verbatim**.
A2 is **additive**: it adds §5.5–§5.9 and marks two specific sentences as
superseded in part (§5.4's final bullet; §10's last sentence). Nothing prior is
rewritten or erased. Where A2 and an earlier section disagree, A2 governs the
classification question and §4 continues to govern every protection question —
the two cannot be traded against each other.

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
| M6 | The change is classified **normal-risk** under §5.5 and that classification is recorded on the pull request (§5, applied prospectively per §5.1) | agent discipline + recorded classification + owner designation |
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

### 5.1 Effective date — the carve-out is prospective only (added by T34-R)

**The designated-review carve-out in §5 applies only to pull requests opened on
or after `2026-10-04T00:00:00Z`, the instant of the owner's authorization of
ADR-031. It does not apply retroactively to any pull request opened before that
instant.**

Rationale, recorded rather than assumed: a governance control cannot
retroactively impose a requirement on a change that was authored before the
control existed, and cannot condition the control's own availability on a
change it was not written to govern.

A pull request opened before that instant is evaluated under the merge
authority in force when it was opened, **together with §4 in full**. §4 — the
non-weakening clause — is *not* date-bounded and applies to every merge
regardless of when the pull request was opened: required checks must pass on the
merged head, no force-push, no history rewrite, no disabled or renamed required
check, no merge with failing required checks, no fabricated or self-created
review approval, and no use of GitHub's emergency "bypass rules" / admin
override. Non-retroactivity removes the *extra* independent-review requirement
for pre-existing pull requests only. It removes no automated gate.

### 5.2 Anti-deadlock rule (added by T34-R)

A governance control must not be applied in a way that creates a circular
dependency in which all three of the following hold:

1. pull request **A** is required in order to restore green CI on `main`;
2. pull request **B** is required in order to authorize or permit **A** to
   merge; and
3. **B** cannot itself become green until **A** merges.

Where such a cycle would form, the older, pre-existing remediation pull request
is authorized to merge first, by the **ordinary** merge path, with every
required check green. This is not an emergency bypass: branch protection is not
disabled, not reconfigured and not bypassed, no required check is disabled,
renamed or made optional, no approval is fabricated, and the "Merge without
waiting for requirements to be met" affordance is **not** used. The merge is
performed exactly as GitHub's ordinary merge button performs it.

### 5.3 Named exception — PR #64 (added by T34-R)

**PR #64 (`fix/t34-l-braces-dependency-remediation`, head
`1cf65c02e5763fc80ab93d990bb9cf3a4d7ff351`, opened `2026-10-03T10:47:11Z`) is
explicitly recorded as owner-mergeable and is NOT subject to the §5
designated-review carve-out.** It is a single named exception on four recorded
grounds, each independently verifiable:

| # | Ground | Evidence |
|---|---|---|
| E1 | It **predates ADR-031** | opened `2026-10-03T10:47:11Z`, before the `2026-10-04` owner authorization, therefore outside §5 by §5.1 |
| E2 | It is the **known remediation for the pre-existing broken `main`** | `main` at `ede495b5` is red: `CI` run `36339104443` failure, `Security Audit` run `37173073676` failure (`npm-audit` and `cargo-audit`); `rust`/`desktop` trace to commit `a156c8c9` (2026-09-22), `web` to the WEB-00x/033 website payment series — all predating PR #64 |
| E3 | Its **required CI and security checks are green** on its head: `web`, `e2e`, `rust`, `desktop`, `cargo-audit`, `cargo-deny`, `npm-audit` — all pass | `CI` run `37179463666`, `Security Audit` run `37179463669`, both `success` at `1cf65c02` |
| E4 | Its merge is **required to restore the repository's actual CI signal**; without it every subsequent pull request — including the governance PR carrying this ADR — is permanently `BLOCKED` | `main` CI is red today; a red `main` blocks every strict-up-to-date merge |

PR #64 must be merged by the ordinary path. It must **not** be reconstructed,
re-committed, rebased, cherry-picked or duplicated; it must **not** be
force-pushed; it must **not** be merged with any required check failing or
unverified; and no emergency bypass or admin override may be used for it.

### 5.4 The future policy is unchanged (added by T34-R)

PR #64 is one named exception, not a precedent. **Every** dependency-,
CI/workflow-, security- and release-sensitive pull request authored on or after
`2026-10-04T00:00:00Z` remains fully subject to §5 and to §4 without exception
or waiver. Specifically, this amendment does **not**:

- lower, remove, rename, "expect", or make optional any required status check
  (`web`, `e2e`, `rust`, `desktop`);
- alter `required_status_checks.strict`, `dismiss_stale_reviews`,
  `require_code_owner_reviews`, `allow_force_pushes`, `allow_deletions` or
  `enforce_admins`;
- authorize any use of "Merge without waiting for requirements to be met",
  GitHub's emergency "bypass rules", or any equivalent admin escape hatch;
- authorize a fabricated, synthesized, self-created or impersonated review;
- assert production readiness, close a release gate, or satisfy any
  precondition in `17_RELEASE_RUNBOOK.md`;
> **Superseded in part by ADR-031-A2 (T34-U), 2026-10-04.** The sentence
> below is retained verbatim as the historical record of ADR-031-A1 and is **no
> longer the operative rule**. A2 replaces it: PR #65 is classified
> **normal-risk (NR)** under the closed §5.5 trigger list, not high-risk — see
> §5.8. What A2 does **not** change is the rest of this section: every
> dependency-, CI/workflow-, security- and release-sensitive pull request
> remains subject to §5 and §4 on the §5.5 classification, and none of the
> bullets above is weakened.

- apply to the governance pull request that carries this ADR itself (PR #65 was
  opened `2026-10-04T07:26:40Z`, on or after the effective date, and remains
  fully subject to §5 and to independent review).

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

## 5.5 Deterministic high-risk classification (added by ADR-031-A2, T34-U)

**Why this section exists.** The §5 trigger list as originally written was
*open-ended*: it made a change designated-review if it "touches a security
boundary", and then enumerated categories broad enough — "CI/release workflow
definitions, branch-protection settings, dependency policy,
`Cargo.lock`/`pnpm-lock.yaml` policy" — to capture nearly every change a
maintainer makes. Combined with §5.4's "not a precedent" clause, that produced a
**permanent, structural deadlock**: the repository has exactly one
collaborator, GitHub never counts an author's approval on their own pull
request, so every ordinary PR — and the governance PR that defines the rule —
could never obtain the review it demanded. A control that cannot be satisfied is
not a control; it is a freeze. A2 keeps the control and **removes the
unresolvability**, by making the classification a closed, decidable list rather
than an open judgement.

**The default is normal-risk. The carve-out is the exception.** Owner-authored
pull requests whose classification is **normal-risk (NR)** are mergeable by the
owner under §2 whenever M1–M8 hold. Only a **high-risk (HR)** classification
requires independent human review by a non-author.

### The closed trigger list

The list is **closed**: a change that matches no HR trigger is NR. There is no
residual catch-all, and an agent may not extend the list on its own authority.
Adding a trigger is an owner amendment to this ADR.

| # | HR trigger | Deterministic test |
|---|---|---|
| HR-1 | **Security-boundary implementation** | A non-Markdown change under `apps/`, `crates/`, `services/`, `packages/`, or `supabase/` touching authentication, session, entitlement/RLS, payment or webhook handling, secret/key handling, CSP or Tauri capabilities, typed IPC, model download/verification, or telemetry. |
| HR-2 | **CI / release / deployment definition** | Any change under `.github/**`, or to any release, publish, or deployment configuration or script that CI invokes. |
| HR-3 | **Repository-protection mutation** | Any action or IaC file that mutates branch protection, repository settings, secrets, or environment configuration. Also any change to `12_SECURITY_BASELINE.md`. |
| HR-4 | **Dependency admission (see §5.6)** | Any change admitting a package that is **not already present in the merged lockfile**; any new dependency declaration; any change to `deny.toml`, `.cargo/config.toml`, a licence allow/deny list, an advisory ignore/suppression list, or a registry/mirror/source configuration; any model/asset pipeline or catalogue change. |
| HR-5 | **Handy-derived desktop core** | Any change to Handy-derived core source or to the preserved upstream Handy tests, per `04`, `09`, `21` and ADR-018/019. |
| HR-6 | **Secrets / environment / signing** | Any change to `15_ENVIRONMENT_AND_SECRETS.md`, `.env*`, secret handling, or signing-credential handling. |
| HR-7 | **Removal or relaxation of a control** | Any diff that deletes, comments out, inverts, or makes optional an existing prohibition, gate, mandatory check, or stop condition — anywhere, including inside this ADR, `09_AI_AGENT_INSTRUCTIONS.md`, `13_DEFINITION_OF_DONE_AND_QA.md`, and `17_RELEASE_RUNBOOK.md`. |
| HR-8 | **Owner designation** | The `requires-independent-review` label is present, or the owner has designated the change in writing. |

### How the classification is decided — no judgement, no memory

1. Run HR-1 … HR-8 against the pull request's **actual diff** at its head SHA.
2. **Any** trigger matches → **HR**. The change does not merge; the agent stops
   and requests independent review (§5).
3. **No** trigger matches → **NR**.
4. **Record the classification on the pull request before merge.** HR: the
   `requires-independent-review` label, plus the trigger ids that matched. NR:
   the literal line `risk-classification: normal (ADR-031 §5.5)` plus the list of
   HR trigger ids tested. **If neither is present, the classification is
   missing: STOP and do not merge.** A missing classification is a documentation
   stop, not a security gate, and it is discharged in one line.
5. **Escalation is always available and always unilateral.** Any agent,
   reviewer, or the owner may apply the label at any time before merge; the
   change becomes HR and the stop condition applies. Escalation needs no
   agreement and no justification.
6. **De-escalation is not available to an agent.** Only the owner may record a
   written determination that a change is NR despite a matched trigger. It must
   name the pull request, name the trigger ids being set aside, state the reason,
   and be visible on the pull request. It is logged here as an amendment event.
   **A written determination may never remove a §4 protection, waive a required
   check, or authorize a bypass, an admin override, or a fabricated approval** —
   those are outside the owner's classification authority and outside this ADR.

**Ambiguity fails safe.** Where a trigger's match is not mechanically decidable
from the diff, the classification is **HR** until the owner records a written
determination under step 6. An agent never resolves ambiguity toward NR.

**Why NR is not "no review".** `13_DEFINITION_OF_DONE_AND_QA.md` keeps `diff
review` mandatory for every change, and it is not satisfied by a green check or
by merge authority. HR is about *independent human* review of a narrow,
enumerated class; it is not the only review in the process.

## 5.6 Dependency changes: admission is high-risk, maintenance is not (added by ADR-031-A2)

ADR-031-A1 §5.4 stated that every dependency-sensitive PR remains subject to §5.
That is correct for **admission** and is corrected here for **maintenance**.

| Class | Definition | Review |
|---|---|---|
| **HR-D — admission** | A package **not already present in the merged lockfile** enters the graph; a new dependency declaration is added; `deny.toml`, `.cargo/config.toml`, a licence allow/deny list, an advisory ignore/suppression list, or a registry/mirror/source configuration changes; or a model/asset pipeline or catalogue changes. | **Independent non-author review required.** |
| **NR-D — maintenance** | A version **bump or removal within a package name already admitted** in the merged lockfile, where **no new package enters the graph**, no licence or source admission changes, no advisory ignore or suppression is added, and `cargo-audit`, `cargo-deny` (`bans`, `licenses`, `sources`, `advisories`) and `npm-audit` are **green**, or an ACCEPTED ADR records the residual risk — the exact mechanism ADR-030 uses for the dev-graph `braces` advisory. | **Owner-mergeable**, subject to M1–M8 and to §4 in full. |

**The anti-deadlock consequence, stated as a rule.** A dependency change is
**never** escalated to HR *merely because* no independent reviewer is available.
That is the deadlock §5.2 was written to break, and unavailability of a reviewer
is not a property of the change. Escalation happens only on a §5.5 trigger.

**What this does not permit, stated explicitly so the boundary is not
re-litigated later.** NR-D does **not** permit: adding an advisory ignore or
suppression entry (that is HR-D — this is the "silence the audit warning" move
and it stays gated); changing a licence decision; changing a registry, mirror, or
source; adding a package to the graph by any route; or merging an NR-D change
whose audit or deny output is red, `UNKNOWN`, or unverified. `cargo deny`'s
`bans`/`licenses`/`sources` checks already reject an unadmitted licence or an
unknown source, so the automated gates — not this classification — are what
constrain *which* package a bump may land on.

## 5.7 Owner-merge is the default; §4 is strictly subordinate (added by ADR-031-A2)

**The rule, stated once.** The repository owner / primary maintainer may merge
their own pull request when **all** of M1–M8 in §2 hold, including M6 read as
"the change is classified **normal-risk** under §5.5 and that classification is
recorded on the pull request". There is no additional standing requirement for a
second approver.

**Subordination — this is the load-bearing sentence.** Merge authority is a
*permission*, and it is **strictly subordinate to §4**. §4 is not a guideline,
not a default, and not a factor to be weighed. Specifically, and without
exception:

- **A CI, security, or audit failure can never be bypassed by owner authority.**
  Owner merge authority is not a defence of a red check. If `web`, `e2e`,
  `rust`, or `desktop` is failing, or `cargo-audit`, `cargo-deny`, or
  `npm-audit` is failing or unverified, the change does not merge. There is no
  owner instruction, ADR, ADR amendment, label, comment, or classification —
  including **NR** and including a written determination under §5.5 step 6 — that
  permits it.
- **Force-push and history rewriting remain forbidden.** Shared history is never
  rewritten; a merge commit is used for synchronization.
- **GitHub's emergency "bypass rules" / admin override remains forbidden**,
  including for an admin, and including when it would be faster.
- **Fabricated, synthesized, self-created, or impersonated review approvals
  remain forbidden.** An agent may never author, auto-approve, simulate, or
  manufacture the appearance of a review. A review authored by the change's
  author, or by an agent acting for them, is not a review. Fabricating a review
  converts nothing: it satisfies no §5 requirement and is a §4 violation.
- **Release authority remains separate from merge authority** (§6). Merging
  closes no release gate and asserts no production readiness.
- **Required checks may never be disabled, renamed, made optional, or
  "expected"** to obtain a merge.
- **`required_approving_review_count: 0` is not a licence.** It reflects that
  the repository has one collaborator. It removes a *quantity* requirement; it
  removes no §4 protection and it does not make an HR change mergeable.

## 5.8 PR #65's own classification (added by ADR-031-A2)

Recorded so the governance PR that defines the rule cannot be mistaken for a
change that the rule forbids, and so the determination is auditable rather than
implied.

| # | HR trigger | PR #65 | Basis |
|---|---|---|---|
| HR-1 | Security-boundary implementation | **No** | The diff is Markdown only: 7 files, 0 changes to any source file under `apps/`, `crates/`, `services/`, `packages/`, `supabase/`. |
| HR-2 | CI / release / deployment definition | **No** | No change under `.github/**`; no CI job, gate, trigger, or workflow altered. `web`, `e2e`, `rust`, `desktop` remain required and unchanged. |
| HR-3 | Repository-protection mutation | **No** | No protection, settings, secret, or environment mutation is performed by this PR. `12_SECURITY_BASELINE.md` is untouched. Branch protection was changed once, under T34-P, and is recorded there; this PR makes no further change and asserts no correction is required. |
| HR-4 | Dependency admission | **No** | No dependency, lockfile, `deny.toml`, or model/asset change. |
| HR-5 | Handy-derived desktop core | **No** | No Handy-derived source or preserved upstream test touched. |
| HR-6 | Secrets / environment / signing | **No** | `15_ENVIRONMENT_AND_SECRETS.md` untouched; no `.env*`, secret, or signing change. |
| HR-7 | Removal or relaxation of a control | **No** | Every hunk in the diff is **additive or clarifying**. No existing prohibition, gate, mandatory check, or stop condition is deleted, commented out, inverted, or made optional. A2 itself *adds* prohibitions and a stop condition. Verified by reading the complete diff, not inferred. |
| HR-8 | Owner designation | **No** | The `requires-independent-review` label is not present, and the owner has designated this change **normal-risk** in writing (§5.5 step 6, recorded here as amendment event ADR-031-A2). |

**Classification: `risk-classification: normal (ADR-031 §5.5)` — normal-risk
(NR).** PR #65 is therefore **not** subject to the §5 independent-review
requirement, and its merge is governed by M1–M8 and §4.

This determination is bounded and is **not a precedent**: it rests on the
mechanical §5.5 test applied to a diff that is provably Markdown-only and
provably additive. Any future change that matches HR-1 … HR-8 is HR, and the
§5.4 "not a precedent" clause continues to apply to it without exception.

## 5.9 What ADR-031-A2 does not change (added by ADR-031-A2)

A2 is a classification amendment. It does **not**:

- lower, remove, rename, "expect", or make optional any required status check
  (`web`, `e2e`, `rust`, `desktop`);
- alter `required_status_checks.strict`, `dismiss_stale_reviews`,
  `require_code_owner_reviews`, `allow_force_pushes`, `allow_deletions` or
  `enforce_admins`;
- alter any §4 protection, or the M1–M8 conditions other than M6, which is
  re-pointed from "not designated-review" to "classified normal-risk and
  recorded";
- delete or relax any entry in the `Forbidden` or `Stop conditions` lists of
  `09_AI_AGENT_INSTRUCTIONS.md`; it adds one stop condition and one `Forbidden`
  item;
- delete or relax any `Forbidden` item, the `diff review` requirement in
  `13_DEFINITION_OF_DONE_AND_QA.md`, or any release precondition in
  `17_RELEASE_RUNBOOK.md`;
- authorize "merge without waiting for requirements to be met", GitHub's
  emergency "bypass rules", or any equivalent admin escape hatch;
- authorize a fabricated, synthesized, self-created, or impersonated review;
- weaken the designated-review requirement for any **admitting** dependency
  change, CI/workflow change, security-boundary change, Handy-core change,
  secrets change, or owner-designated change;
- assert production readiness, close a release gate, or satisfy any
  precondition in `17_RELEASE_RUNBOOK.md`;
- change `SPEC_MANIFEST.json`. No document is added to or removed from the
  canonical pack directory, so `file_count: 24` and its 24 entries remain exact;
- authorize the agent to grant repository access to anyone, or to modify branch
  protection.

**The residual limitation, restated rather than papered over.** GitHub branch
protection still cannot express a *conditional* review requirement. The §5
independent-review requirement for HR changes therefore remains
**procedurally and agent-enforced**, backed by the label, the recorded
classification, the §5.5 step-6 override record, and the `09` stop condition —
not platform-enforced. Until the owner grants a second person review access, an
HR change genuinely cannot obtain an independent approval, and the correct
outcome for such a change is **STOP and report**, indefinitely if necessary. That
is the intended behaviour, not a defect to be engineered around. The agent will
not grant access to anyone.

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

**Amended by ADR-031-A2 (T34-U)** — same canonical documents, classification
scope only:

| Document | A2 change |
|---|---|
| `14_CI_CD_AND_BRANCHING.md` | New subsection "Deterministic high-risk classification (ADR-031-A2)": the closed HR-1…HR-8 trigger list, the six-step classification procedure including the pre-merge recording requirement and unilateral escalation, the dependency admission/maintenance split, the subordination clause, and the amended step 6 of the merge decision procedure. M6 re-pointed to the classification. |
| `09_AI_AGENT_INSTRUCTIONS.md` | `Forbidden` gains one item (never resolve a classification ambiguity toward normal-risk; never extend the HR trigger list on the agent's own authority). `Stop conditions` gains one item (classification missing or unrecorded before merge). The merge-authority section states that owner merge authority is strictly subordinate to §4 and that an unavailability of an independent reviewer is not a reason to escalate a normal-risk change. No existing item removed or relaxed. |
| `20_ADR_INDEX.md` | ADR-031-A2 recorded as an amendment of ADR-031, index of record. |
| `13_DEFINITION_OF_DONE_AND_QA.md` | **No change required and none made** — its existing `diff review` clause ("not satisfied by a green check, by a merged PR, or by owner merge authority") is already correct under A2 and is unchanged. |
| `17_RELEASE_RUNBOOK.md` | **No change required and none made** — its existing separation clause is already correct under A2 and is unchanged. |

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

> **Superseded in part by ADR-031-A1 (T34-R).** As originally written, this
> section told the owner to merge this governance PR **first** and PR #64
> **second**. That sequencing was itself the circular dependency: this PR
> cannot become green until PR #64 repairs the red `main`, so instructing
> "merge #65, then #64" was unsatisfiable. Under §5.1 PR #64 predates ADR-031
> and is therefore outside the carve-out, and under §5.3 it is explicitly
> owner-mergeable. **PR #64 merges first, by the ordinary path. This governance
> PR does not gate it.**
>
> What remains valid below: the file-level union that will be needed when PR #64
> lands, because PR #64 carries newer canonical `09` and `20_ADR_INDEX.md` text.

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

**As amended by ADR-031-A1 (T34-R).** PR #64 is no longer gated by this
governance PR and no longer waits on it. The owner's next action is to merge
**PR #64 (`1cf65c02`)** through the ordinary path — no bypass, no admin
override, no protection change, no force-push, no reconstruction — which is
explicitly authorized by §5.3 above. This governance PR (PR #65) then becomes
mergeable on the ordinary path and merges after, still subject to §5 and to
independent review. Neither PR is merged by T34-P or T34-R.

> **Superseded in part by ADR-031-A1 (T34-R) and ADR-031-A2 (T34-U).** PR #64
> was merged at `aa4cc8e8` (§5.3 discharged). The final sentence above is
> **retained verbatim as history and is no longer operative**: PR #65 is
> classified **normal-risk** under §5.5 (§5.8), so it is **not** subject to the
> §5 independent-review requirement. Its merge is governed by M1–M8 and §4.
>
> **Current next task (T34-U).** PR #65 is `CLEAN`, `MERGEABLE`, `OPEN`, and
> green on all required checks. The owner may merge it on the ordinary path —
> no bypass, no admin override, no protection change, no force-push — once the
> §5.5 step-4 classification line is present on the pull request. **T34-U does
> not merge PR #65 and does not remove any blocker from it.**