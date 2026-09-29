# 09 — AI Agent Instructions

## Mission

`inspect → understand → plan → implement → verify → security review → QA → document → checkpoint → commit → push → PR`

## Permanent implementation discipline (non-negotiable)

The mandatory step order for every task is:

`inspect → understand → plan → implement minimally → test → security review → docs/ADR → diff review → commit → push → CI → exact report`

Rules:

- **Never skip directly from a report to implementation.** A task report is
  evidence about an earlier task, never a licence to act. Implementation always
  follows this session's own inspection and plan.
- Implement **minimally**: the smallest coherent change that satisfies the
  requirement. No speculative generalization.
- **Diff review precedes commit.** Inspect the exact staged content before
  committing; never commit the whole worktree.
- **CI state is recorded after push**, not assumed from the commit succeeding.
- A step may be skipped only by an explicit recorded reason.

## Permanent reading gate (non-negotiable)

At the beginning of **every** task and **every** new agent session, before any
other action:

1. read `SPEC_MANIFEST.json`;
2. read every authoritative document in `SPEC_MANIFEST.json` read order, in
   full, from the canonical pack `docs/Soravo_Engineering_Docs_v6/`;
3. read `PROGRESS.md` in full;
4. perform a fresh Git/VM/PR/CI state audit;
5. only then read task-specific reports.

### Which `SPEC_MANIFEST.json` (two exist)

The gate is driven by the **canonical pack manifest**,
`docs/Soravo_Engineering_Docs_v6/SPEC_MANIFEST.json`, because this pack is
canonical (see *Duplicate pack copies* in `00_README.md`).

A second, older `SPEC_MANIFEST.json` exists at the repository root listing 15
root-level documents (`01_PRD.md` … `14_ENVIRONMENT_AND_SECRETS.md`). **Read it
and read the documents it names**, then treat their relationship to this pack as
**`HISTORICAL/STALE` pending owner reconciliation (open item O-5)**. They are
read for traceability only. They must never be used to override this pack, and
no claim about their authority may be asserted while O-5 is open.

Never guess which manifest applies. Read both; apply this pack.

### What may never substitute for the gate

None of the following is an acceptable substitute for reading the pack, reading
`PROGRESS.md` in full, and running the state audit:

- previous task reports;
- the most recent / a single latest task report;
- chat history or conversation context;
- agent memory or recalled notes;
- summaries, digests or condensed recaps;
- `PROGRESS.md` alone.

Each is evidence about *one* task or *one* moment. This pack is the control
plane that governs **every** task, and GitHub/VM state is the only
implementation truth (`01_AUTHORITY_AND_SOURCE_OF_TRUTH.md`).

### Repeat the gate

Repeat the **entire** gate — pack, `PROGRESS.md`, state audit — whenever a task
is interrupted, restarted, resumed, handed over, or when context is compacted or
a session is lost and later continued. A compacted or summarized context is
**not** a completed gate. Re-read; do not trust the carried summary.

If any two sources conflict: record both statements · identify the authority
level · verify against GitHub/VM · reconcile the documentation · **do not
guess**.

## Permanent PROGRESS governance

`PROGRESS.md` MUST be updated at the end of **every** task. Every entry records:
exact task ID · objective · work performed · exact files changed · exact files
deliberately unchanged (protected files) · evidence/commands · tests · CI ·
security · blockers · decisions · commit/push/PR state · exact next task.

**Never finish a task without recording it.** An agent must never end a task
while leaving `PROGRESS.md` unaware of the work performed.

## Permanent source boundary (every desktop subsystem)

Before touching **any** desktop subsystem, and before writing any desktop
abstraction:

1. locate the existing Soravo implementation;
2. locate the Handy-derived equivalent;
3. inspect the **actual source** — not filenames, not documentation summaries;
4. classify it (per `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`);
5. preserve exactly **one implementation per responsibility**.

**No duplicate stack.** If a compatible implementation already exists, reuse or
adapt it; do not add a second one alongside it. Retaining two implementations of
one responsibility requires an ADR (`04_HANDY_FORK_AND_REUSE_POLICY.md`).

A subsystem touched without a recorded classification is not finished.

## Permanent V1 Handy preservation (non-negotiable)

Soravo V1 is a **wrapper/platform around the Handy-derived desktop core**.

**Default V1 strategy: KEEP HANDY CORE INTACT + ADD SORAVO WRAPPER/PLATFORM
CAPABILITIES AROUND IT.**

**Never introduce:**

- Soravo post-processing;
- Soravo filler-word removal;
- Soravo normalization;
- Soravo capitalization transformation;
- Soravo punctuation transformation;
- Soravo language-specific transcription transformation;
- a second STT pipeline;
- a parallel transcript producer;
- a parallel dictated-text insertion path.

**Do not modify Handy transcription behavior to satisfy a stale or contradictory
test.** A test that fails because it asserts V1-out-of-scope behavior is STOP-
gated, not a specification of the implementation (see *Stop conditions*, and
`04_HANDY_FORK_AND_REUSE_POLICY.md` *If Tests Conflict with V1 Handy Behavior*).

**If a proposed change could alter Handy transcription behavior: STOP and require
an explicit owner decision and/or an ADR.** Proximity is not permission — a
change to Handy-adjacent glue that is expected to be behaviour-neutral must be
proven neutral, not assumed.

Freezing behavior is not endorsing it. Where the frozen behavior is itself
undesirable, that is an owner product decision to be recorded — never a silent
fix, and never a test edit that launders the defect into the specification.

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

Stop rather than inventing information when any of the following holds:

- model metadata is missing;
- model licensing is unknown;
- Handy provenance / a required source identity is unknown;
- provider IDs are missing;
- secrets are unavailable;
- platform evidence is unavailable;
- architecture must change;
- two implementations would coexist;
- a test conflicts with frozen V1 behavior;
- source-of-truth documents conflict;
- the task would require changing a Handy behavior;
- database history diverges;
- security would have to be weakened;
- a dependency change crosses subsystem boundaries;
- the first compiler error indicates a wider migration than the task scope;
- **V1 HANDY-CORE PRESERVATION VIOLATIONS** (STOP and request product decision):
  - Changing Handy core STT behavior (audio, VAD, transcription, language detection, normalization, punctuation)
  - Adding Soravo transcription post-processing layer (filler removal, normalization, rewriting)
  - Creating duplicate STT/typing/clipboard implementations
  - Test conflicts with preserved Handy behavior
  - Modifying Handy STT output semantics to match test expectations

### Duty when stopped

When any stop condition is triggered, the agent MUST:

1. **stop work on that item** — do not proceed by guessing or by choosing the
   more convenient interpretation;
2. **document the exact missing evidence** — the precise fact, artifact, value or
   decision that is absent, and where it would come from;
3. **create the smallest deterministic next task** — one action, one named
   prerequisite, no bundled work;
4. **record the stop in `PROGRESS.md`** with the same field list as any other
   task entry.

A stop is a deliverable, not a failure. Inventing the missing evidence is a
violation.

## Permanence and scope of these rules

The rules in this file are **permanent** and apply to **all future tasks and all
future agent sessions** of this repository. They are not per-task guidance, not
a preference, and not a temporary hardening measure.

They may be amended only by the owner, only in writing, and only with the change
recorded in `PROGRESS.md`. They may never be relaxed by an agent to unblock
progress — a blocked task is reported as blocked, not re-scoped past a
non-negotiable.

These rules are **additive to** the rest of the pack. Where any other document
appears to permit something this file forbids, this file wins. Where this file
is silent, the rest of the pack applies unchanged.
