# 14 — CI/CD and Branching
Normal engineering uses feature branches, never direct main edits.
Format: `<task-id>/<short-description>`.

Focused commits only. Never force-push or rewrite shared history.

CI families:
- web lint/typecheck/test/build;
- Playwright;
- Rust fmt/clippy/test;
- cargo audit/deny;
- desktop build;
- security audit;
- release;
- deployment.

Classify failures:
A code; B missing env/secret; C external service; D workflow config; E historical/stale; F unrelated.

Deployment success is not CI success. CI success is not deployment success. Record both.

The supplied 038A audit demonstrated that Cloudflare deployment can succeed while CI fails because deployment runs a narrower build path. Preserve this distinction in future reports.

PR evidence must include exact run IDs, commit, failed job/step, error and reproduction.

## Merge authority and owner-merge policy

Adopted by ADR-031 (owner-directed, 2026-10-04). The owner/primary maintainer
may merge their own pull request. Merge authority is granted by *this* policy
and is bounded by every gate below. It is not permission to bypass safeguards.

Merge is permitted only when all conditions hold (conjunction — any failure means
no merge):

- M1 the change arrives through a pull request against `main`;
- M2 required status checks `web`, `e2e`, `rust`, `desktop` all pass on the head SHA;
- M3 the branch is up to date with `main` (`strict`);
- M4 force-push and branch deletion stay disabled;
- M5 the PR carries no secrets, no fabricated evidence, no unrelated bundled work;
- M6 the change is classified normal-risk and that classification is recorded on the PR (§Deterministic high-risk classification);
- M7 `cargo-audit`, `cargo-deny`, `npm-audit` are green, or an ACCEPTED ADR records the accepted risk;
- M8 production/release gates are untouched and separately satisfied (`17_RELEASE_RUNBOOK.md`).

GitHub enforcement: `required_approving_review_count` is `0`. This is the only
setting that permits owner self-merge — GitHub never counts an author's approval
on their own PR, so any value ≥ 1 blocks owner self-merge permanently. Required
status checks, `strict`, `dismiss_stale_reviews`, force-push and deletion blocks
are unchanged. Never disable or rename a required check to obtain a merge.

### Mandatory — never relaxed by merge authority

- required CI/tests pass on the merged head;
- security and audit checks pass, or an ACCEPTED ADR records the risk;
- no force-push, no history rewriting;
- no disabling required checks to obtain a merge;
- no merge with failing required checks;
- no fabricated or self-created review approval — an agent may never write,
  synthesize or auto-approve a review, impersonate a reviewer, or manufacture the
  appearance of independent review;
- no use of GitHub's emergency "bypass rules" / admin override to work around a
  failing requirement, even by an admin.

If a required check cannot pass, the change does not merge: fix the check or
re-scope the change. Record the failure; never route around it.

### Designated-review changes

Security-sensitive and explicitly designated changes still require independent
human review by a non-author, and the agent must stop rather than merge.

A change is designated-review when the owner designates it in writing (including
the `requires-independent-review` PR label), or when it touches a security
boundary: auth, session, entitlements/RLS, payment/webhook handling, secrets,
CI/release workflow definitions, branch-protection settings, dependency policy
(`deny.toml`, lockfile policy), licence or model-licensing claims, or
Handy-derived desktop core behaviour.

> **Superseded in part by ADR-031-A2 (T34-U).** The paragraph above is retained
> verbatim as history. Its open-ended "touches a security boundary" test is
> **replaced** by the closed, decidable HR-1…HR-8 trigger list below, because the
> open test made almost every change designated-review — including the governance
> PR that defines the rule — and therefore unobtainable in a one-collaborator
> repository. What is **not** changed: security-sensitive changes still require
> independent non-author review, the agent still stops rather than merges, and
> nothing in the non-weakening clause above is relaxed.

### Effective date — prospective only (ADR-031-A1, T34-R)

The carve-out applies **only to pull requests opened on or after
`2026-10-04T00:00:00Z`**. It is not retroactive. A pull request opened before
that instant is judged under the merge authority in force when it was opened,
together with the non-weakening clause above, which is not date-bounded and
applies to every merge. Non-retroactivity removes only the extra
independent-review requirement for pre-existing PRs; it removes no automated
gate.

**Anti-deadlock rule.** Do not apply this carve-out so as to create a cycle
where PR A is needed to restore green CI on `main`, PR B is needed to permit A
to merge, and B cannot go green until A merges. Where that cycle would form, the
older pre-existing remediation PR merges first, by the **ordinary** merge path
with all required checks green — not by disabling protection, not by bypass, not
by "merge without waiting for requirements to be met".

**Named exception — PR #64** (`fix/t34-l-braces-dependency-remediation`, head
`1cf65c02e5763fc80ab93d990bb9cf3a4d7ff351`, opened `2026-10-03T10:47:11Z`) is
**owner-mergeable and not subject to this carve-out**, on four recorded grounds:
it predates ADR-031; it is the known remediation for the pre-existing red `main`
(`CI` `36339104443` and `Security Audit` `37173073676` both failing at
`ede495b5`); its required CI and security checks are green (`37179463666`,
`37179463669`); and its merge is required to restore the repository's CI signal.
It must be merged ordinarily — never reconstructed, duplicated, rebased,
cherry-picked, force-pushed, or merged with any failing or unverified check.

**Not a precedent.** Every dependency-, CI/workflow-, security- and
release-sensitive PR authored on or after `2026-10-04T00:00:00Z` remains fully
subject to this carve-out, without exception or waiver. This amendment changes
no required check, no branch-protection field, and no non-weakening clause, and
it authorizes no bypass, no admin override and no fabricated approval. The
governance PR carrying ADR-031 itself (PR #65, opened `2026-10-04T07:26:40Z`)
is on or after the effective date.

> **Superseded in part by ADR-031-A2 (T34-U).** The final sentence above —
> PR #65 "remains fully subject to this carve-out" — is retained verbatim as
> history and is **no longer operative**. PR #65 is classified **normal-risk**
> under §5.5, on the mechanical test recorded in the ADR: its diff is Markdown
> only and is wholly additive. Every other sentence in this block stands.

### Deterministic high-risk classification (ADR-031-A2, T34-U)

**The default is normal-risk (NR); the independent-review requirement is the
exception.** A change matching no HR trigger is NR and is owner-mergeable when
M1–M8 hold. Only **high-risk (HR)** requires independent non-author review.

The trigger list is **closed**. An agent may not extend it on its own authority;
adding a trigger is an owner amendment to ADR-031.

| # | HR trigger | Deterministic test |
|---|---|---|
| HR-1 | Security-boundary implementation | A non-Markdown change under `apps/`, `crates/`, `services/`, `packages/`, `supabase/` touching auth, session, entitlement/RLS, payment/webhook, secrets, CSP or Tauri capabilities, typed IPC, model download/verification, or telemetry. |
| HR-2 | CI / release / deployment definition | Any change under `.github/**`, or to release, publish, or deployment configuration or a script CI invokes. |
| HR-3 | Repository-protection mutation | Any action or IaC mutating branch protection, repository settings, secrets, or environment configuration. Also any change to `12_SECURITY_BASELINE.md`. |
| HR-4 | Dependency admission | A package not already in the merged lockfile enters the graph; a new dependency declaration; a change to `deny.toml`, `.cargo/config.toml`, a licence allow/deny list, an advisory ignore/suppression list, or a registry/mirror/source configuration; a model/asset pipeline or catalogue change. |
| HR-5 | Handy-derived desktop core | Any change to Handy-derived core source or to the preserved upstream Handy tests (`04`, `09`, `21`, ADR-018/019). |
| HR-6 | Secrets / environment / signing | Any change to `15_ENVIRONMENT_AND_SECRETS.md`, `.env*`, secret handling, or signing-credential handling. |
| HR-7 | Removal or relaxation of a control | Any diff deleting, commenting out, inverting, or making optional an existing prohibition, gate, mandatory check, or stop condition — including in this pack or in ADR-031 itself. |
| HR-8 | Owner designation | The `requires-independent-review` label is present, or the owner designates the change in writing. |

**Procedure — six steps, no judgement, no memory.**

1. Run HR-1…HR-8 against the PR's actual diff at its head SHA.
2. Any trigger matches → **HR**: do not merge; stop and request independent review.
3. No trigger matches → **NR**.
4. **Record it on the PR before merge.** HR: the `requires-independent-review`
   label plus the matched trigger ids. NR: the literal line
   `risk-classification: normal (ADR-031 §5.5)` plus the trigger ids tested.
   **Neither present → classification missing → STOP, do not merge.** This is a
   documentation stop, discharged in one line.
5. **Escalation is unilateral and always available** to any agent, reviewer, or
   the owner before merge. No agreement, no justification.
6. **De-escalation is the owner's alone**, in writing, naming the PR, the trigger
   ids set aside, and the reason, visible on the PR. It may never remove a §4
   protection, waive a required check, or authorize a bypass, admin override, or
   fabricated approval.

**Ambiguity fails safe:** a non-mechanically-decidable match is **HR** until the
owner records a determination under step 6. An agent never resolves ambiguity
toward NR.

### Dependency changes: admission vs maintenance (ADR-031-A2)

| Class | Definition | Review |
|---|---|---|
| **HR-D admission** | A package not already in the merged lockfile enters the graph; a new dependency declaration; `deny.toml`, `.cargo/config.toml`, licence allow/deny, advisory ignore/suppression, or registry/mirror/source change; a model/asset pipeline or catalogue change. | **Independent non-author review required.** |
| **NR-D maintenance** | A version bump or removal **within an already-admitted package name**, with no new package entering the graph, no licence/source admission change, no advisory ignore or suppression added, and `cargo-audit`, `cargo-deny` and `npm-audit` green (or an ACCEPTED ADR records the residual risk, as ADR-030 does). | **Owner-mergeable**, M1–M8 and §4 in full. |

A dependency change is **never** escalated to HR merely because no independent
reviewer is available — reviewer unavailability is not a property of the change.
NR-D still forbids adding an advisory ignore or suppression (that is HR-D),
changing a licence decision, changing a registry/mirror/source, adding a package
by any route, or merging with red, unknown, or unverified audit output.

### Subordination of merge authority (ADR-031-A2)

Merge authority is a **permission** and is **strictly subordinate to the
non-weakening clause above**. No owner instruction, ADR, amendment, label,
comment, or classification — including NR — permits: merging with a failing or
unverified CI, security, or audit check; force-pushing or rewriting history;
using GitHub's emergency "bypass rules" or any admin override; fabricating,
synthesizing, self-creating, or impersonating a review; disabling, renaming, or
"expecting" a required check; or treating a merge as release readiness.
`required_approving_review_count: 0` removes a quantity requirement only — it
removes no protection and does not make an HR change mergeable.

Recorded limitation: GitHub branch protection cannot express a *conditional*
review requirement. Enforcement of this carve-out is procedural and
agent-enforced, not platform-enforced. The owner must grant another person
review access before a designated change is authored, or no genuinely
independent approval can exist. The agent will not grant access.

### High-Risk AI Self-Review (ADR-031-A3)

Where independent non-author review of an HR change is **unobtainable** (one
collaborator; reviewer access not granted), the authoring AI agent may perform
the mandatory **High-Risk AI Self-Review** defined in ADR-031 §5.10. It is a
substitute control, never "independent review": a distinct post-implementation
phase re-evaluating the final diff, live repo and PR state, re-derived HR-1…HR-8
classification (higher-risk wins), security/CI/protection/secrets/supply-chain/
rollback/test-evidence implications, against the fixed C1–C18 checklist, with
workflow semantics inspected hunk by hunk for HR-2 (green CI alone is not
evidence). The HR classification and the `requires-independent-review` label
stay; the agent records `High-Risk AI Self-Review: PASS` (never "I approve my
own PR", never an `APPROVE` review) with reviewed/base SHAs, run IDs, and the
no-fabrication/no-bypass statement as a PR comment. Merge requires the reviewed
head to still be the head, mergeability, all required and security checks green,
no unresolved `BLOCKED` finding, synchronized `PROGRESS.md`, and no bypass of
any kind — otherwise STOP. Where a reviewer is available, independent review
remains the path. Governance-policy amendments adopt through the narrow §5.11
bootstrap (owner-directed, governance-text-only, all-gates-green, PASS recorded,
no enforcement change, auditable) — never as a general bypass.

### Deterministic merge decision procedure

1. Confirm the PR is against `main` and is not a draft.
2. Confirm required checks `web`, `e2e`, `rust`, `desktop` are green on the
   current head SHA — read them, never infer from an earlier run.
3. Confirm security checks are green or an ACCEPTED ADR records the risk.
4. Confirm the branch is up to date with `main`.
5. Confirm the diff contains no secrets and no unrelated bundled changes.
6. Classify the change (ADR-031 §5.5 / *Deterministic high-risk
   classification*). Apply the effective-date test first: only a PR opened on or
   after `2026-10-04T00:00:00Z` is in scope. Then run HR-1…HR-8 against the
   actual diff. Any match → HR → do not merge; stop and request independent
   review, **unless** the §5.10 High-Risk AI Self-Review path applies
   (independent review unobtainable, full C1–C18 review, `PASS` recorded with the
   §5.10.5 evidence comment, §5.10.6 preconditions all true). No match → NR. In
   both cases the classification must be **recorded on the PR** (label, or the
   `risk-classification: normal (ADR-031 §5.5)` line); if it is not recorded,
   stop. A PR opened before the effective date is judged under the authority in
   force when it was opened, plus the non-weakening clause, which always
   applies.
7. Confirm no open conversation is unresolved and no gate is bypassed.
8. Merge normally. Record run IDs, head SHA and the state observed.
9. Report merged/ not-merged with evidence. Never report a merge that did not happen.

Merging into `main` never implies production readiness and closes no release gate.
