# 18 — Interruption and Handoff
When context/time/usage/tool limits approach:
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
