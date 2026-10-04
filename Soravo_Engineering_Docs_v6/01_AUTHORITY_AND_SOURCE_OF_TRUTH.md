# 01 — Authority and Source of Truth

## Rule

There are two distinct truths:

- **Implementation truth:** GitHub repository state, commits, branches, PRs,
  CI, deployment records and externally verified service state.
- **Engineering-control truth:** this documentation pack, accepted ADRs and
  explicit contracts.

Neither replaces the other.

## Evidence vocabulary

`IMPLEMENTED` = code exists and targeted validation passes.

`VERIFIED` = all required evidence for the stated claim exists.

`DEPLOYED` = the target service confirms the exact artifact/commit.

`E2E VERIFIED` = the real integrated path was executed and evidence recorded.

`BLOCKED` = a named prerequisite prevents verification.

`UNKNOWN` = evidence is insufficient.

`HISTORICAL/STALE` = evidence refers only to an earlier state.

## Forbidden reasoning

Never use:

- probably;
- should work;
- seems deployed;
- likely licensed;
- likely inherited from Handy;
- CI probably passes;
- model license assumed from software license.

## Conflict protocol

When sources disagree:

1. identify the exact conflicting statements;
2. record both;
3. determine which authority level applies;
4. verify against the repository/service;
5. update the affected documentation/ADR;
6. only then continue implementation.

Do not resolve conflicts by intuition.

## State audit minimum

Every milestone audit must record:

- timestamp;
- local HEAD;
- `origin/main`;
- branch;
- ahead/behind;
- worktree state;
- untracked files;
- latest relevant CI;
- deployment commit;
- Supabase function configuration;
- secret existence without values;
- Razorpay TEST/LIVE mode;
- payment evidence;
- model licensing evidence;
- desktop build/test status;
- benchmark status;
- security status;
- blockers;
- exact next task.

## Progress file

`PROGRESS.md` is useful evidence history but is not authoritative by itself.
A statement in PROGRESS.md must be revalidated before being reused as current
state.

## Architecture changes

Any change to:

- system boundary;
- payment semantics;
- auth/storage;
- session/transcript contract;
- Handy reuse classification;
- model policy;
- release architecture;
- dependency strategy;

requires an ADR and affected contract updates.
