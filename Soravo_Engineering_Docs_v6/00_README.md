# Soravo Engineering Documentation Pack v6

> ## NOT THE AUTHORITATIVE PACK — NON-AUTHORITATIVE MIRROR
>
> **The canonical pack is `docs/Soravo_Engineering_Docs_v6/`.** It is the only
> copy present on `origin/main`, and it is the copy the permanent reading gate
> must be read from. This directory is a duplicate created on this branch in
> `fc56c31b`; its content has been reconciled into the canonical directory as a
> union, so no control text is lost. Do not edit the control plane here.

Status: non-authoritative mirror of the authoritative engineering-control pack.
Pack version: `6.0.0`.
Generated: 2026-09-27.
Research HEAD: `2f96f3d21213bce24f049996d5ab897f16acd31b`.
Repository: `eySRbS4zgHuW3gMFZB2/soravo`.
Project-source file limit: 25.

## Purpose

This pack is the persistent engineering control plane for Soravo.

It exists specifically so an AI coding agent can resume work after context,
usage limits, model changes, or agent interruption without reconstructing
architecture from memory.

GitHub is implementation truth.
This pack is intent, constraints, workflow, acceptance, and agent-operating
truth.
`PROGRESS.md` is an evidence log, not an authority and never replaces
verification.

## Determinism rule

The agent MUST NOT infer missing facts.

Allowed evidence states:

- `IMPLEMENTED`
- `VERIFIED`
- `DEPLOYED`
- `E2E VERIFIED`
- `BLOCKED`
- `UNKNOWN`
- `HISTORICAL/STALE`

If evidence is missing, report `UNKNOWN`.
If two sources conflict, stop and resolve the conflict before broad changes.
Do not average, guess, or choose the more convenient interpretation.

## Authority ladder

1. Safety/security/legal non-negotiables.
2. This pack's explicit non-negotiable controls.
3. Accepted ADRs.
4. Current GitHub implementation and CI.
5. Product/technical contracts in this pack.
6. Current official upstream API documentation.
7. Test and benchmark evidence.
8. Historical progress/audit documents.
9. Agent preference.

The repository may contain older `SORAVO_PLAN.md` and `docs/spec-v3/` material.
Those are historical implementation-planning sources unless explicitly reconciled
with this pack. They must not silently override this pack's agent workflow or
security controls.

## Mandatory read order

> **The permanent reading gate itself is not reproduced here.** The read order
> below is a pointer only, and it was corrected here in T32-Y2 (it previously
> read `25.` for `SPEC_MANIFEST.json` and skipped entry 24). Read the gate —
> steps, substitution bans, `PROGRESS.md` governance, and the repeat-on-resume
> rule — from `docs/Soravo_Engineering_Docs_v6/00_README.md`. Duplicating control
> text here is the drift hazard the canonical/mirror split exists to prevent.

1. `00_README.md`
2. `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md`
3. `02_PRODUCT_REQUIREMENTS.md`
4. `03_TECHNICAL_DESIGN.md`
5. `04_HANDY_FORK_AND_REUSE_POLICY.md`
6. `05_DESKTOP_CONTRACTS.md`
7. `06_WEB_CLOUD_PAYMENT.md`
8. `07_IMPLEMENTATION_PLAN.md`
9. `08_TASK_BREAKDOWN.md`
10. `09_AI_AGENT_INSTRUCTIONS.md`
11. `10_AI_SKILLS.md`
12. `11_MCP_AND_AGENT_TOOLING.md`
13. `12_SECURITY_BASELINE.md`
14. `13_DEFINITION_OF_DONE_AND_QA.md`
15. `14_CI_CD_AND_BRANCHING.md`
16. `15_ENVIRONMENT_AND_SECRETS.md`
17. `16_TEST_AND_BENCHMARK_PROTOCOL.md`
18. `17_RELEASE_RUNBOOK.md`
19. `18_INTERRUPTION_AND_HANDOFF.md`
20. `19_STATE_AUDIT_PROTOCOL.md`
21. `20_ADR_INDEX.md`
22. `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`
23. `DESIGN.md` (authoritative Soravo design specification)
24. `SPEC_MANIFEST.json`

## First action for every OpenCode session

Read this pack, then perform a state audit.
Do not start implementation before the state audit is complete.

## Current-state warning

The research HEAD is a historical snapshot, not a permanent current-state
claim. A new session MUST audit GitHub and the VM before describing anything as
passing, deployed, licensed, or complete.

## Scope

Soravo is a local-first FOSS desktop dictation product. The desktop foundation
is Handy-derived, but Soravo owns requirements, contracts, security, privacy,
branding, payments, account, entitlement, model policy, benchmark policy, and
release policy.

The current recovery priority is desktop build stabilization before additional
feature expansion.
