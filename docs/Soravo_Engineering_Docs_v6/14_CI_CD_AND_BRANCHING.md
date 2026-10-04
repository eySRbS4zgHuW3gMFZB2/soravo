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
- M6 the change is not designated-review (§Designated-review changes);
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

Recorded limitation: GitHub branch protection cannot express a *conditional*
review requirement. Enforcement of this carve-out is procedural and
agent-enforced, not platform-enforced. The owner must grant another person
review access before a designated change is authored, or no genuinely
independent approval can exist. The agent will not grant access.

### Deterministic merge decision procedure

1. Confirm the PR is against `main` and is not a draft.
2. Confirm required checks `web`, `e2e`, `rust`, `desktop` are green on the
   current head SHA — read them, never infer from an earlier run.
3. Confirm security checks are green or an ACCEPTED ADR records the risk.
4. Confirm the branch is up to date with `main`.
5. Confirm the diff contains no secrets and no unrelated bundled changes.
6. Test the designated-review conditions. If any applies, do not merge; stop and
   request independent review.
7. Confirm no open conversation is unresolved and no gate is bypassed.
8. Merge normally. Record run IDs, head SHA and the state observed.
9. Report merged/ not-merged with evidence. Never report a merge that did not happen.

Merging into `main` never implies production readiness and closes no release gate.
