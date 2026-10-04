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
