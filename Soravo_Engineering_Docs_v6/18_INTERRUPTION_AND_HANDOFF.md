# 18 — Interruption and Handoff

## Resume = repeat the gate

An interruption, restart, resume, handover, or context compaction **invalidates
a previously completed reading gate**. On resume, repeat the **entire** permanent
reading gate before any other action: read `SPEC_MANIFEST.json` and every
authoritative document in read order from `docs/Soravo_Engineering_Docs_v6/` ·
read `PROGRESS.md` in full · run a fresh Git/VM/PR/CI state audit · and only
then read task-specific reports.

A carried summary, a compacted context, a previous task report, chat history,
agent memory or a condensed recap is **not** a completed gate and may not
substitute for it. The recorded resume point tells you *where* work stopped; it
does not tell you *what the rules are*.

Re-verify the invariants that a resume can silently invalidate — one STT path,
one insertion path, no Handy behavior change, no unedited test made green.

## When context/time/usage/tool limits approach:
1. stop starting new work;
2. finish the smallest coherent unit;
3. validate;
4. inspect diff;
5. update status;
6. commit/push if safe;
7. record resume point.

Never reset unknown changes or delete other worktrees.

Handoff schema:
TASK
BRANCH
HEAD
OBJECTIVE
COMPLETED
IN_PROGRESS
FIRST_FAILING_COMMAND
FIRST_FAILING_ERROR
MODIFIED_FILES
UNTRACKED_FILES
PASSING_TESTS
FAILING_TESTS
SECURITY
EXTERNAL_BLOCKERS
NEXT_EXACT_COMMAND
NEXT_EXACT_FILE
DO_NOT_REPEAT

A new agent must reproduce the first failure before continuing.
