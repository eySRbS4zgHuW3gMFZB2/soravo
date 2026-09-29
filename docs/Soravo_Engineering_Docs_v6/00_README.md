# Soravo Engineering Documentation Pack v6

Status: authoritative engineering-control pack.
Pack version: `6.0.0` (this directory, this README, and `SPEC_MANIFEST.json`
all state **v6**; earlier revisions of this file said "v5" while the directory
name and manifest said v6 — corrected in T32-Y).
Canonical path: `docs/Soravo_Engineering_Docs_v6/`.
Generated: 2026-09-27.
Research HEAD: `2f96f3d21213bce24f049996d5ab897f16acd31b`.
Repository: `eySRbS4zgHuW3gMFZB2/soravo`.
Project-source file limit: 25.
Manifest entries: 24 (see *Directory contents versus the manifest* below).

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

This is a **PERMANENT READING GATE**. It is performed at the beginning of
**every** task and **every** new agent session, without exception and without
being asked.

| # | Document | # | Document |
|---|---|---|---|
| 1 | `00_README.md` | 13 | `12_SECURITY_BASELINE.md` |
| 2 | `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md` | 14 | `13_DEFINITION_OF_DONE_AND_QA.md` |
| 3 | `02_PRODUCT_REQUIREMENTS.md` | 15 | `14_CI_CD_AND_BRANCHING.md` |
| 4 | `03_TECHNICAL_DESIGN.md` | 16 | `15_ENVIRONMENT_AND_SECRETS.md` |
| 5 | `04_HANDY_FORK_AND_REUSE_POLICY.md` | 17 | `16_TEST_AND_BENCHMARK_PROTOCOL.md` |
| 6 | `05_DESKTOP_CONTRACTS.md` | 18 | `17_RELEASE_RUNBOOK.md` |
| 7 | `06_WEB_CLOUD_PAYMENT.md` | 19 | `18_INTERRUPTION_AND_HANDOFF.md` |
| 8 | `07_IMPLEMENTATION_PLAN.md` | 20 | `19_STATE_AUDIT_PROTOCOL.md` |
| 9 | `08_TASK_BREAKDOWN.md` | 21 | `20_ADR_INDEX.md` |
| 10 | `09_AI_AGENT_INSTRUCTIONS.md` | 22 | `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` |
| 11 | `10_AI_SKILLS.md` | 23 | `DESIGN.md` (authoritative Soravo design specification) |
| 12 | `11_MCP_AND_AGENT_TOOLING.md` | 24 | `SPEC_MANIFEST.json` |

Then, in order: read `PROGRESS.md` in full · perform a fresh Git/VM/PR/CI state
audit · and only then read task-specific reports.

**Which manifest.** The gate is driven by this directory's `SPEC_MANIFEST.json`.
A second, older `SPEC_MANIFEST.json` exists at the repository root; read it and
the documents it names for traceability, treat them as `HISTORICAL/STALE` pending
owner reconciliation (open item O-5), and never let them override this pack.

**Nothing may substitute for the gate.** Not previous task reports, not the most
recent or single latest task report, not chat history, not agent memory, not
summaries or digests, not `PROGRESS.md` alone. Each is evidence about one task
or one moment; this pack is the control plane that governs **every** task.

**Repeat the gate whenever the work is interrupted, restarted, resumed, handed
over, or the context is compacted or summarized.** A carried summary is not a
completed gate. Re-read the pack, re-read `PROGRESS.md` in full, and re-run the
state audit.

**The latest task report is never a substitute for this pack.** A report is
evidence about one task; this pack is the control plane that governs every task.

**`PROGRESS.md` governance.** `PROGRESS.md` MUST be updated at the end of
**every** task, recording: exact task ID · objective · work performed · exact
files changed · exact files deliberately unchanged (protected files) ·
evidence/commands · tests · CI · security · blockers · decisions ·
commit/push/PR state · exact next task. **Never finish a task without recording
it.** An agent must never finish a task while leaving `PROGRESS.md` unaware of
the work performed.

**Permanence.** This gate and the governance rules in `09_AI_AGENT_INSTRUCTIONS.md`
are permanent and apply to all future tasks. An agent may not relax them to
unblock progress.

**If sources conflict:** record both statements · identify the authority level ·
verify against GitHub/VM · reconcile the documentation · never guess.

## First action for every OpenCode session

Read this pack, then perform a state audit.
Do not start implementation before the state audit is complete.

## Directory contents versus the manifest

`SPEC_MANIFEST.json` declares `file_count: 24` and lists exactly those 24
entries. This directory also contains two files that are **not** manifest
entries:

- `22_IMPLEMENTATION_COMPLETION_MATRIX.md`
- `22_IMPLEMENTATION_COMPLETION_MATRIX_UPDATE.md`

They are retained milestone artifacts, are **not** part of the control plane,
and are **not** read by the gate. They are disclosed here so that the
directory listing and the manifest are reconcilable without deleting history.
The manifest is **not** amended to absorb them: the manifest is the authority for
what the gate reads, and the gate is unchanged by their presence.

## Duplicate pack copies

A second, byte-divergent copy of this pack exists at the repository root
(`Soravo_Engineering_Docs_v6/`). **This directory,
`docs/Soravo_Engineering_Docs_v6/`, is the canonical copy and the index of
record**, on three independent bases:

1. it is the only copy present on `origin/main`;
2. it is the path recorded in the pack-location convention used by the task
   control plane;
3. `20_ADR_INDEX.md` inside this directory is the single index of record.

The root copy is a **non-authoritative mirror**. Its ADR index carries a pointer
to this file instead of a second current entry. Any edit to the control plane
belongs here.

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
