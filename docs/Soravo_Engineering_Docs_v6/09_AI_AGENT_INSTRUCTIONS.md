# 09 — AI Agent Instructions

## Mission

`inspect → understand → plan → implement → verify → security review → QA → document → checkpoint → commit → push → PR`

## Mandatory first sequence

1. read the entire engineering pack;
2. run the state audit;
3. inspect Git/worktrees/CI;
4. classify dirty/untracked work;
5. inspect only task-relevant source;
6. inspect Handy-derived equivalent before creating desktop abstractions;
7. load the narrowest applicable skill;
8. verify fast-moving official APIs;
9. write a bounded implementation plan;
10. implement minimally;
11. test;
12. security-review;
13. update docs/ADR;
14. inspect diff;
15. commit only scoped changes;
16. push feature branch;
17. inspect CI;
18. report exact evidence.

## Dirty worktree rule

Never reset, clean, checkout-over, stash-over, or delete unknown changes.

First classify:

- task-owned;
- previous task;
- unrelated;
- generated;
- unknown.

Preserve unknown work.

## Search-before-abstraction

Before creating a new module/helper/component:

1. search Soravo repository;
2. inspect Handy-derived implementation;
3. inspect applicable skills;
4. inspect official API;
5. only create new abstraction if no compatible implementation exists.

## Test ladder

Run:

1. targeted compile/test;
2. package tests;
3. integration tests;
4. security checks;
5. CI-equivalent broad validation.

Do not skip earlier levels.

## Forbidden

Never:

- commit secrets;
- put provider secrets in browser/desktop;
- disable RLS/CSP/signature verification to make tests pass;
- fake payment success;
- fabricate model licensing;
- fabricate benchmarks;
- claim E2E without executing it;
- claim deployment from a successful build alone;
- silently bypass failing CI;
- overwrite unrelated work;
- force-push shared history;
- fabricate, synthesize, auto-approve or self-create any review approval, or
  impersonate a reviewer, in order to satisfy a review requirement;
- disable, rename, make optional, "expect" or otherwise neutralize a required
  status check in order to obtain a merge;
- use GitHub's emergency "bypass rules" / admin override, or any equivalent
  admin escape hatch, to work around a failing requirement;
- merge a pull request while any required check is failing or unverified;
- merge a designated-review change (`14_CI_CD_AND_BRANCHING.md`) instead of
  stopping for independent review.

The owner may merge their own pull request once every required automated check
and repository-defined safety gate passes (ADR-031). That merge authority does
not license any item above, and the agent may not exercise it to close its own
outstanding work faster.

## Merge authority (ADR-031)

The agent may, on the owner's instruction, verify and perform an ordinary merge
of the owner's own pull request once M1–M8 in
`14_CI_CD_AND_BRANCHING.md` are confirmed satisfied.

It is not the agent's decision to relax a gate. If any condition fails, report the
failure and stop; never re-scope the task past a non-negotiable to obtain a merge.
Read the checks from their live state — never infer a merge outcome from an
earlier run, a prior report, or `PROGRESS.md`.

Branch protection, workflows, and required checks are repository settings the
agent may not weaken. Changing `required_approving_review_count`, required
check contexts, or `strict` is an owner-only decision, and reducing a required
check is forbidden outright.

## Completion report schema

Every task report MUST contain:

- TASK ID;
- objective;
- branch;
- start SHA;
- end SHA;
- changed files;
- unchanged relevant files;
- commands;
- exact results;
- tests;
- security;
- CI;
- deployment;
- external configuration;
- blockers;
- ADR/docs updated;
- commit;
- PR;
- merge state (`merged` / `not merged`, with the observed gate state);
- next exact task.

## Stop conditions

Stop and request review when:

- architecture must change;
- a required source identity is unknown;
- model licensing is unknown;
- database history diverges;
- security requires weakening;
- two implementations would coexist;
- a dependency change crosses subsystem boundaries;
- the first compiler error indicates a wider migration than the task scope;
- a change is designated-review (`14_CI_CD_AND_BRANCHING.md`) and no independent
  non-author reviewer is available — stop and report that independent review is
  unobtainable, rather than merging it or approving it on the owner's behalf;
- a merge can only be completed by weakening, removing or bypassing a gate.
