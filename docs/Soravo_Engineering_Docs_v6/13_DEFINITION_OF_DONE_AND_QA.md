# 13 — Definition of Done and QA
Universal DoD:
- requirement mapped;
- implementation complete;
- no duplicate architecture;
- targeted tests;
- typecheck/build;
- security;
- docs/ADR;
- diff review;
- focused commit;
- pushed branch/PR;
- CI recorded.

`diff review` is the agent's own review of the complete diff against its base,
performed before commit. It is mandatory and it is not satisfied by a green
check, by a merged PR, or by owner merge authority (ADR-031): the checks prove
the code runs, the diff review proves the change is the intended change and
carries nothing unrelated. Both stand.

Levels:
L0 static; L1 unit; L2 integration; L3 E2E; L4 release smoke.

Payment acceptance:
lifetime INR TEST: authenticated user → server order → checkout → webhook signature → ledger → exactly one entitlement → account → desktop.
Monthly: Plan → Subscription → payment → webhook lifecycle → entitlement → renewal/cancellation.

Failure cases include invalid JWT/product/currency, forged webhook, duplicate webhook, payment failure, refund, cancellation and expiry.

Desktop acceptance includes build, launch, microphone, hotkey, session, VAD, STT, tentative display, committed/final injection, cancellation, stale rejection, settings, model install/rollback and entitlement.

TestSprite supplements unit/integration/security/E2E; it is not sole acceptance.

## Final E2E QA — a dedicated post-redesign pass (added by T34-Y)

Added by T34-Y (2026-10-04) to remove the ambiguity between "the `e2e` CI job
is green" and "final E2E QA is done". These are different things.

- **Final E2E QA is a dedicated validation pass executed AFTER the Soravo
  visual/UI/UX redesign (`T13`) is complete.** It is task `T15` in
  `08_TASK_BREAKDOWN.md` and step R7 in `07_IMPLEMENTATION_PLAN.md`.
- **A green `e2e` CI job does not satisfy final E2E QA.** The required `e2e`
  context proves the Playwright suite passed against one commit's UI. It says
  nothing about the redesigned product and must never be reported as final E2E
  QA.
- **Existing E2E coverage is retained and keeps gating every merge.** The
  `tests/e2e/` suite remains required CI for the whole of development as
  regression and functional coverage. Final E2E QA is *additional*; it does not
  replace, relax, skip, or weaken any existing test.
- Final E2E QA is not closed by planning, by scheduling, or by a redesign
  passing review. It is closed only by an executed pass with recorded evidence.
- The redesign must not be treated as permission to weaken the contracts final
  E2E QA verifies. Changing auth, payment, IPC, privacy, entitlement, or any
  other established product contract requires an explicit ADR.

This section adds an obligation. It removes no item from the universal DoD above,
no QA level, and no payment or desktop acceptance criterion.
