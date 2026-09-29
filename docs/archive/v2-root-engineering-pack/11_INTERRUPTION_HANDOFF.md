# 11 — AI Agent Interruption and Recovery Protocol

## Problem

AI coding agents can stop because of:
- usage/token limits;
- tool timeout;
- VM shutdown;
- network failure;
- MCP failure;
- provider outage;
- context exhaustion.

A feature must therefore be designed so an interruption is recoverable.

## Required repository files

```text
progress/
  STATUS.md
  NEXT.md
  ENVIRONMENT.md
  SKILLS.md
  MCP.md
  BENCHMARKS.md
```

## STATUS.md template

```text
Current phase:
Current task:
Branch:
Skills selected/loaded (per the Skill Selection Gate):
Last commit:
Last successful test:
Current implementation state:
Files changed:
Known failures:
Security status:
TestSprite status:
Benchmark status:
Next exact action:
```

## NEXT.md template

```text
Resume task:
Read first:
Skills to load (per the Skill Selection Gate):
Inspect:
Exact next implementation step:
Tests to run:
Security checks:
Expected completion condition:
Do not change:
```

## Agent stop procedure

When interruption is likely:
1. stop new feature work;
2. save code;
3. run formatter;
4. run the smallest meaningful test;
5. inspect git diff;
6. update STATUS;
7. update NEXT;
8. commit a checkpoint if coherent;
9. push;
10. record PR/commit.

## Checkpoint quality

A checkpoint is acceptable when another agent can answer:
- what was being built?
- what is already done?
- what is broken?
- what exact code path remains?
- which tests failed?
- which decisions were made?
- what must not be redone?

## Never leave

Avoid:
- half-completed migrations without notes;
- deleted working code with no replacement;
- uncommitted dependency changes with no explanation;
- schema changes without migrations;
- changed API contracts without tests;
- benchmark results only in chat.

## Resuming agent

A new agent must:
1. read all engineering docs;
2. read STATUS (note skills selected/loaded);
3. read NEXT (note skills to load);
4. inspect git status/log;
5. inspect current branch/PR;
6. run the Skill Selection Gate and load the skills required for the resumed task (`07_AI_SKILLS.md`);
7. run relevant tests;
8. continue from the exact checkpoint.

Do not restart the feature from scratch unless the checkpoint is corrupted.

## Usage-limit strategy

Tasks are intentionally atomic.

A large feature is split into:
- data model;
- backend;
- UI;
- integration;
- tests;
- security;
- QA.

Each should be independently checkpointable.

This prevents a usage limit from destroying a large in-progress feature.

## Human involvement

The human should not need to remember what the AI was doing. The repository is the source of continuity.
