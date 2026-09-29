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
- force-push shared history.

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
- **V1 HANDY-CORE PRESERVATION VIOLATIONS** (STOP and request product decision):
  - Changing Handy core STT behavior (audio, VAD, transcription, language detection, normalization, punctuation)
  - Adding Soravo transcription post-processing layer (filler removal, normalization, rewriting)
  - Creating duplicate STT/typing/typing implementation
  - Test conflicts with preserved Handy behavior
  - Modifying Handy STT output semantics to match test expectations
