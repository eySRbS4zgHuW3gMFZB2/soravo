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

## Permanent Skill Selection Gate (non-negotiable)

**No substantive task may be planned or implemented until the Skill Selection
Gate has been run, its skills loaded, and its result recorded.** The gate is
defined in full — classification, inventory, mandatory/optional, loading,
tool/MCP selection, authority boundary, conflict check, record schema,
re-evaluation, and the no-skill rule — in `10_AI_SKILLS.md`. This file makes it
a permanent, STOP-grade control; `10_AI_SKILLS.md` is the single skill registry
of record.

The mandatory order is:

```text
READING GATE
  → TASK CLASSIFICATION
  → SKILL INVENTORY
  → SKILL SELECTION
  → SKILL LOADING
  → MCP / TOOL SELECTION
  → AUTHORITY + CONFLICT CHECK
  → PLAN → IMPLEMENT → TEST → AUDIT → COMMIT / PUSH
```

Rules:

- **Never skip from the reading gate to planning.** `READING GATE → PLAN →
  IMPLEMENT → discover a relevant skill later` is forbidden. A task that reaches
  planning without a recorded skill selection is not ready to start.
- **Never carry a skill across tasks.** A task does not proceed because the
  agent "knows" a skill's contents from a previous task, a previous session, a
  report, or a summary. Reload every mandatory skill for the current task, in
  the same way the reading gate is repeated on every task.
- **Skills and tools are separate obligations.** A loaded skill is never
  evidence that a tool or MCP was called; an available MCP is never evidence
  that a skill was loaded. Select a tool because the task requires that action,
  not because the tool exists.
- **Never invent a skill.** If no skill exists for a task, that is not
  permission to improvise: determine whether this pack already covers the task,
  and if not, STOP and record the missing capability.
- **Re-run the gate when scope changes.** If execution introduces a new
  domain — frontend, workflows, licensing, model downloads, Supabase, or any
  other — pause the implementation path, select and load the additional
  mandatory skills and tools, and record the re-evaluation. Scope is never
  silently expanded.
- **Record it.** Every substantive task report carries a `## Skill Selection`
  section with the schema in `10_AI_SKILLS.md`: task classification, mandatory
  skills, optional skills considered, MCP/tools selected, skills deliberately
  not selected, authority/source boundary, conflicts found, and
  `Result: CLEAR | STOP`. Omitting it is a report defect.
- **A mark is not a load.** A `## Skill Selection` block in `PROGRESS.md` or in
  any prior report is evidence that a gate was run, never that a skill was read
  in the current task. See `10_AI_SKILLS.md` *A skill mark is not a loaded
  skill*.

## Mandatory first sequence

1. read the entire engineering pack;
2. run the state audit;
3. inspect Git/worktrees/CI;
4. classify dirty/untracked work;
5. inspect only task-relevant source;
6. inspect Handy-derived equivalent before creating desktop abstractions;
7. run the Skill Selection Gate: classify domains, inventory, select the
   narrowest applicable skill set, **load every mandatory applicable skill**,
   select tools/MCPs, and check the authority boundary and skill conflicts
   (`10_AI_SKILLS.md`);
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
  stopping for independent review;
- resolve an ambiguity in the ADR-031 §5.5 high-risk classification toward
  normal-risk, or extend the HR-1…HR-8 trigger list on your own authority —
  ambiguity is high-risk, and only the owner may add a trigger or record a
  written de-escalation;
- escalate a change to high-risk merely because no independent reviewer is
  available, or treat reviewer unavailability as evidence that a change is
  high-risk.
- submit an `APPROVE` review on your own pull request, or author any review
  action that manufactures the appearance of independent review — the
  High-Risk AI Self-Review (ADR-031 §5.10) is recorded as a PR **comment**
  (`High-Risk AI Self-Review: PASS`), never as a review approval;
- describe a High-Risk AI Self-Review as "independent review", or state "I
  approve my own PR" — the only permitted affirmative statement is
  "High-Risk AI Self-Review: PASS", and only when every §5.10.6 precondition
  holds.

The owner may merge their own pull request once every required automated check
and repository-defined safety gate passes (ADR-031). That merge authority does
not license any item above, and the agent may not exercise it to close its own
outstanding work faster.

Merge authority is a **permission** and is **strictly subordinate to the
non-weakening clause** in `14_CI_CD_AND_BRANCHING.md`. No classification,
including normal-risk, and no owner instruction, permits merging with a failing
or unverified CI, security, or audit check; force-pushing or rewriting history;
using GitHub's emergency "bypass rules" or any admin override; or fabricating,
synthesizing, self-creating, or impersonating a review. `required_approving_review_count: 0`
removes a review *quantity* requirement only — it removes no protection and does
not make a high-risk change mergeable.

The independent-review requirement applies **only** to changes classified
high-risk under the closed HR-1…HR-8 list in
`14_CI_CD_AND_BRANCHING.md`. A change matching no trigger is normal-risk and is
owner-mergeable when M1–M8 hold; its classification must be recorded on the PR
before merge, and its absence is a stop condition. Security-boundary, CI/workflow,
dependency-**admission**, Handy-core, secrets, control-weakening, and
owner-designated changes remain high-risk and are **not** self-mergeable.

The designated-review carve-out is prospective: it governs PRs opened on or
after `2026-10-04` only. It must not be used to create a circular dependency in
which one PR is needed to restore green CI while another PR is needed to permit
the first to merge; in that situation the older pre-existing remediation PR
merges first, ordinarily, with every required check green. PR #64
(`1cf65c02`) is recorded as owner-mergeable on that basis. This is not a licence
to merge anything failing: if any required check on the head being merged is
failing or unverified, the merge does not happen.

Under ADR-031-A2 the carve-out above is bounded by the **closed** HR-1…HR-8
trigger list: it applies to high-risk changes only, and a dependency change is
high-risk by **admission** (a new package, a new declaration, a licence/advisory/
source-policy change) but not by **maintenance** (a version bump within an
already-admitted package, no new package in the graph, audit and deny green).
See `14_CI_CD_AND_BRANCHING.md`.

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

**Classify before merging, and record the classification.** Before any merge the
agent runs HR-1…HR-8 (`14_CI_CD_AND_BRANCHING.md`) against the PR's actual diff
and records the result on the PR: the `requires-independent-review` label for a
high-risk change, or the line `risk-classification: normal (ADR-031 §5.5)` with
the trigger ids tested for a normal-risk change. **No recorded classification →
no merge.** The agent never records a normal-risk classification for a change it
could not fully inspect, never resolves ambiguity toward normal-risk, and never
extends the trigger list.

**Self-review before merging a high-risk change without a reviewer (ADR-031
§5.10).** Where independent review is unobtainable, the agent performs the
High-Risk AI Self-Review as a distinct post-implementation phase with fresh
reads, re-derives HR-1…HR-8 on the final diff, works the fixed C1–C18 checklist,
and records `High-Risk AI Self-Review: PASS` with the reviewed/base SHAs, run
IDs, and the no-fabrication/no-bypass statement as a PR comment. Merge is
permitted only if the final head is still the reviewed head and every §5.10.6
precondition holds; any new commit reopens the review. The HR label stays on
the PR throughout.

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
- `## Skill Selection` (schema in `10_AI_SKILLS.md`; mandatory for every
  substantive task);
- merge state (`merged` / `not merged`, with the observed gate state);
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
- a change is designated-review (`14_CI_CD_AND_BRANCHING.md`) and no independent
  non-author reviewer is available — stop and report that independent review is
  unobtainable, rather than merging it or approving it on the owner's behalf,
  **unless** the change completes the High-Risk AI Self-Review (ADR-031 §5.10)
  with a recorded `PASS` and every §5.10.6 precondition true. An HR change with
  no recorded `PASS` remains stopped.
  This stop condition applies only to PRs opened on or after `2026-10-04`, when
  ADR-031 was adopted; for an earlier PR the non-weakening clause still applies
  in full and the carve-out does not;
- a change's ADR-031 §5.5 risk classification is **not recorded on the pull
  request**, or cannot be determined from the diff — stop and record the
  classification. Ambiguity is high-risk; do not default to normal-risk;
- a merge can only be completed by weakening, removing or bypassing a gate.
- **SKILL SELECTION FAILURES** (STOP, document, and escalate):
  - the skill registry cannot be located, or a second registry is found;
  - a named skill's `SKILL.md` is absent from the live store;
  - a selected skill conflicts with this pack, an accepted ADR, the V1
    Handy-core preservation policy, the source boundary, the security baseline,
    licensing requirements, CI/CD policy, the definition of done, or a stop
    condition in this list;
  - a mandatory applicable skill cannot be loaded, and no substitute evidence
    is available for the claim it governs;
  - a task domain has no covering skill **and** no covering instruction in this
    pack — the missing capability is recorded, never improvised;
  - the canonical pack and a root mirror of a skill document disagree
    materially;
  - MCP/tool ownership for a required action is ambiguous;
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
