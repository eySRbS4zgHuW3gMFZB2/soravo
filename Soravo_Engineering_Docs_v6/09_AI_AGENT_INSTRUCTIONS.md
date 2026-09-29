# 09 — AI Agent Instructions

## Mission

`inspect → understand → plan → implement → verify → security review → QA → document → checkpoint → commit → push → PR`

## Permanent reading gate (non-negotiable)

At the beginning of **every** task and **every** new agent session, before any
other action:

1. read `SPEC_MANIFEST.json`;
2. read every authoritative document in `SPEC_MANIFEST.json` read order, in
   full, from the canonical pack `docs/Soravo_Engineering_Docs_v6/`;
3. read `PROGRESS.md` in full;
4. perform a fresh Git/VM/PR/CI state audit;
5. only then read task-specific reports.

**The most recent task report is never a substitute for the pack.** Reports are
evidence about one task; this pack governs every task.

If any two sources conflict: record both statements · identify the authority
level · verify against GitHub/VM · reconcile the documentation · **do not
guess**.

## Permanent PROGRESS governance

`PROGRESS.md` MUST be updated at the end of **every** task. Every entry records:
exact task ID · objective · exact files changed · exact files deliberately
unchanged · evidence/commands · test/CI state · security state · blockers ·
decisions · commit/PR state · exact next task. Never finish a task leaving
`PROGRESS.md` unaware of the work performed.

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
