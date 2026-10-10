# SORAVO Repository State Reconciliation — State-Audit Report

**Date (UTC):** 2026-10-09 (~22:20 UTC)
**Repository location:** `/home/maya/Desktop/Soravo_Engineering_Specification_v2`
**Remote:** `https://github.com/eySRbS4zgHuW3gMFZB2/soravo`
**Report location:** `.swarm-worktrees/state-audit-2026-10-09/STATE-AUDIT-2026-10-09-REPORT.md` — fresh isolated worktree at detached `origin/main`, created after confirming the destination was absent. Zero new files in the dirty R1 worktree.
**Task type:** Read-only state audit. No product code changed, no commits, no merges, no model/registry changes, no cleanup.

## 1. Canonical instructions inspected — VERIFIED

Read before any state-changing action (full or bounded excerpts as noted):

- `docs/Soravo_Engineering_Docs_v6/00_README.md` (reading gate, authority ladder, determinism rule) — VERIFIED
- `docs/Soravo_Engineering_Docs_v6/01_AUTHORITY_AND_SOURCE_OF_TRUTH.md` (evidence vocabulary, state-audit minimum) — VERIFIED
- `docs/Soravo_Engineering_Docs_v6/07_IMPLEMENTATION_PLAN.md` (phase order, restore-before-refork, T34-Y execution order) — VERIFIED
- `docs/Soravo_Engineering_Docs_v6/08_TASK_BREAKDOWN.md` (T01–T15 acceptance, T34-Y execution order + binary remaining-step table) — VERIFIED
- `docs/Soravo_Engineering_Docs_v6/09_AI_AGENT_INSTRUCTIONS.md` (implementation discipline, permanent reading gate, both SPEC_MANIFESTs) — VERIFIED
- `docs/Soravo_Engineering_Docs_v6/10_AI_SKILLS.md` (skill registry + Skill Selection Gate, sections 1–80) — VERIFIED
- `docs/Soravo_Engineering_Docs_v6/18_INTERRUPTION_AND_HANDOFF.md` (resume = repeat the gate) — VERIFIED
- `docs/Soravo_Engineering_Docs_v6/19_STATE_AUDIT_PROTOCOL.md` (git/env/CI/external audit commands) — VERIFIED
- `docs/Soravo_Engineering_Docs_v6/20_ADR_INDEX.md` (ADR-001 through ADR-031+A1/A2/A3; ADR-027/028 PROPOSED) — VERIFIED
- `docs/Soravo_Engineering_Docs_v6/21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` (sections 1–60; pin cjpais/Handy @ ba10ce19) — VERIFIED
- `docs/Soravo_Engineering_Docs_v6/SPEC_MANIFEST.json` (pack v6.0.0, 24 files) + root `SPEC_MANIFEST.json` (older 15-doc pack, HISTORICAL/STALE per section 09) — VERIFIED
- `PROGRESS.md` head (~60 lines) + tail (~40 lines) — VERIFIED (full 12,607-line file NOT read; recorded as partial)
- `R1-BLOCKER-DECISION-PACKET-2026-10-08.md` (sections 1–80) — VERIFIED
- `T10-COMMERCIAL-GATE-EVIDENCE-019-REPORT.md` (full, 160 lines) — VERIFIED
- Skill stores: host-global `~/.agents/skills/` listed (29 skills); project-local `.opencode/skills/` ABSENT — VERIFIED

## 2. Verified local and remote commit identities — VERIFIED (local) / VERIFIED with staleness note (remote)

- Current branch (main worktree): `feature/r1-gap-021-desktop-auth` — VERIFIED
- Local HEAD: `18bc2133dc5805b24874dc4f16e64817437f91e9` ("docs(config): ratify ADR-032 settings-store authority...") — VERIFIED
- `origin/main` (local ref): `82ec2ecc1ba279dfa9176f1612943368d65d3616` ("Merge PR #114") — VERIFIED
- `origin/main` liveness: `git ls-remote origin HEAD` returns `82ec2ecc...`, matching the local ref — VERIFIED
- Ancestry: HEAD is ancestor of `origin/main` (YES); `origin/main` is NOT ancestor of HEAD; `rev-list --count HEAD...origin/main` = 0 ahead / 22 behind; merge-base = `18bc2133` — VERIFIED
- Local ref freshness: `.git/refs/remotes/origin/main` mtime 2026-10-08 21:31 IST; no `git fetch` run before worktree creation (read-only posture toward dirty tree) — HISTORICAL/STALE (approx 25 h)
- PR #115 head: `17f348708a7611f7db90ce845463a5f281ad2bb6` via `git ls-remote origin refs/pull/115/head` — VERIFIED
- PR #115 merge-ref: `ba4b2749f82a9420573e94cc3e8f39bc6dfcb1a3` exists — VERIFIED (existence only; mergeability NOT inferred)
- PR #115 branch: `refs/heads/feature/t10-commercial-recon-005` = same SHA `17f34870` — VERIFIED

## 3. Worktree and branch inventory — VERIFIED

Registered worktrees (`git worktree list`) at audit time, plus the one created by this task:

- Main: repo root @ `18bc2133`, branch `feature/r1-gap-021-desktop-auth` — DIRTY (see section 4)
- `.swarm-worktrees/state-audit-2026-10-09` @ `82ec2ecc` detached — CREATED BY THIS TASK, CLEAN, holds only this report
- `.freebuff/worktrees/02b2b77b-...` @ `3fa30be2` — not inspected (out of scope)
- `.swarm-worktrees/phase1-task1.1` @ `83a506e8` — not inspected
- `.swarm-worktrees/phase1-task1.3-hotkeys` @ `7eaea96f` — not inspected
- `.swarm-worktrees/r1-gap-021-desktop-auth` @ `0d38eb4b`, branch `r1-gap-021/desktop-auth`, behind origin/main by 24 — CLEAN
- `.swarm-worktrees/r1-gap-023-adr032` @ `9fdef83d` — untracked `.pr-body*/.risk*/.self-review*` helper files only
- `.swarm-worktrees/r1-gap-023-pr113-merge-record` @ `fe98eb16` — CLEAN
- `.swarm-worktrees/r1-gap-023-wire` @ `2520801b` — CLEAN
- `.swarm-worktrees/t10-commercial-model-gate` @ `17f34870`, branch `feature/t10-commercial-recon-005` (= PR #115 head) — untracked `T10-MOONSHINE-PILOT-EVIDENCE-015.md` present, do not disturb
- `.swarm-worktrees/t10-r1-incident-audit` @ `18bc2133` detached — untracked `T10-R1-WORKTREE-INCIDENT-REPORT.md` present, do not disturb
- `.swarm-worktrees/t10-upstream-provenance-008` @ `f4a56b52` — CLEAN
- `.swarm-worktrees/type-001-native-insertion` @ `d5a1f846` — not inspected
- `/home/maya/Desktop/soravo-r1-gap-023` @ `0d38eb4b` (external worktree) — not inspected
- `/tmp/opencode/r1-gap-008-finalize`, `/tmp/opencode/r1-gap-021` — prunable stale entries (gitdir gone), no action taken

T10/R1/model/desktop-auth branches present include `feature/r1-gap-021-desktop-auth` (dirty, current), `feature/r1-gap-021-desktop-signin` (`a2bcbe0f`, remote), `r1-gap-021/desktop-auth`, `feature/r1-gap-023-wire-mirror`, `docs/r1-gap-023-*`, `feature/t10-commercial-recon-005`, `feature/t10-upstream-provenance-recovery-008`, `feature/t10-commercial-model-gate`, `feature/model-002-downloader`, `r1-gap-017/model-selector-wiring`, `r1-gap-028/desktop-e2e-harness-mocked-devices-models`. Exhaustive branch listing NOT EXECUTED.

## 4. Dirty/untracked work preservation notes — VERIFIED (must preserve, untouched by this task)

Main checkout CONTAINS user work that MUST be preserved. Zero destructive commands run (no reset/clean/forced-checkout/stash/commit; `git diff --check` exit 0). Post-task `git status` re-checked: dirty set identical, no new files added.

- Staged changes: none.
- Unstaged (23 paths): `Cargo.lock`, `Cargo.toml`, `PROGRESS.md`, `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/src/{account.rs, commands/account.rs, lib.rs, main.rs}`, `tauri.conf.json`, `apps/desktop/src/{components/account-panel.tsx, ipc.ts, test-utils/e2e-doubles.ts}`, `apps/website/src/app.tsx`, `crates/config/src/lib.rs`, `docs/.../20_ADR_INDEX.md`, `supabase/config.toml`, `tests/e2e-desktop/failure.spec.ts`; deleted-not-staged: `R1-GAP-008-SILERO-VAD-READINESS-2026-10-08.md`, `R1-GAP-023-ADR-032-SETTINGS-STORE-AUTHORITY.md`, `resources/models/silero_vad_v4.onnx` (+LICENSE/PROVENANCE sidecars), `crates/config/src/mirror.rs`.
- Untracked (must preserve): `R1-GAP-021-DESKTOP-AUTH-PROPOSAL.md`, `T10-COMMERCIAL-GATE-EVIDENCE-019-REPORT.md` (21,425 B, 2026-10-09 16:11 — prior existence confirmed, untouched), `T10-PROVENANCE-BATCH-013-REPORT.md`, `apps/desktop/src-tauri/src/auth_flow.rs`, website `desktop-auth` + `desktop-connect` sources/tests, `crates/desktop-auth/`, `parakeet-unified-en-0.6b-Q8_0.gguf`, `supabase/functions/desktop-auth-{mint,exchange}/`, `supabase/migrations/20260928090000_desktop_auth_codes.sql`, `supabase/tests/desktop-auth.test.mjs`, `.freebuff/`.
- Caution: the dirty tree REVERTS parts of ratified R1-GAP-023 mirror work (`crates/config/src/mirror.rs` deleted, Silero assets deleted) while ADDING desktop-auth implementation. It is NOT a clean base for review or new work. Do not `git add -A`, do not whole-tree commit, do not switch branches in this worktree.
- Stash list (10 entries) left untouched — NOT EXECUTED (contents not inspected).

## 5. PR #115 status and actual checks — head VERIFIED / state+checks UNKNOWN

- Head `17f34870` on `feature/t10-commercial-recon-005`; auto-merge ref `ba4b2749` present — VERIFIED via `git ls-remote` (2026-10-09 ~22:1x UTC).
- Title, state (open/merged), mergeable flag, review decision, CI/check runs: UNKNOWN — `gh pr view 115` and `gh pr checks 115` both exceeded the 120 s timeout, and `gh auth status` hung (exit 124 under `timeout 20`). Git protocol to the same remote works (`ls-remote` exit 0), so this is a `gh`/API-path failure, not proof of no network. Per safety rule 7, no PR state or check result is claimed. Retry path: `timeout 30 gh pr view 115 --json ...` in a fresh shell before any merge-related decision.
- Adjacent context (HISTORICAL/STALE, from repo records not re-verified): `origin/main` = PR #114 merge (R1-GAP-023 mirror-wiring record); PR #113 merged the mirror wiring; R1-GAP-021 implementation PR on `feature/r1-gap-021-desktop-signin` was opened HIGH-RISK pending self-review + green CI.

## 6. Canonical next task and prerequisite status

Per v6 section 08 execution order (gaps -> T10 -> T11 -> security -> T14-prep -> T13 -> T15 -> T14-validation -> rehearsal -> release) with every step REMAINING:

- Identified next task: T10 follow-up — close the six section-6 evidence gaps of `T10-COMMERCIAL-GATE-EVIDENCE-019` (moonshine-tiny chain: weight manifest at `390624e`, converter verification, LICENSE-text revision pin, redistribution authorization, `blob.handy.computer` hosting chain, org-alias resolution) PLUS the mandated independent reviewer pass (re-verify each chain link, rule on MIT-model-default to GGUF-weight grant, record outcome in `docs/COMPLIANCE/` trail). Evidence-only, no registry/catalog change, no model cleared — the pilot's own verdict is INCOMPLETE, BLOCKED for commercial-use/redistribution/hosting reliance, and section-08 T10 acceptance remains unsatisfied.
- Prerequisites: (a) isolated clean worktree from verified `origin/main` `82ec2ecc` — AVAILABLE (this task's worktree satisfies it and is reusable for the evidence follow-up); (b) primary-source reads only (HF/GitHub, no downloads needed for the manifest-enumeration subset) — AVAILABLE; (c) BLOCKED: owner/legal determinations (MIT model-default as weight-level GGUF redistribution grant; hosting authorization) and any byte-level artifact download + checksum re-verification (needs explicit authorization); (d) BLOCKED: R1-GAP-008/011/021/023 implementation tracks remain owner-gated (blocker packet: none safe to start; R1-GAP-023 ADR-032 + mirror wiring have since merged via PR #113/#114, but the dirty-tree reverts mean no new R1 wiring may be based on the dirty checkout).
- Explicitly NOT next: merging PR #115 (checks UNKNOWN), switching the dirty worktree branch, model-gate behavior changes, registry/catalog edits, Handy re-fork or sync (T34-SYNC items owner/ADR-gated).

## 7. Recommended safe workspace for implementation — VERIFIED (created + clean)

- For this report (used): `.swarm-worktrees/state-audit-2026-10-09/` — destination confirmed absent (`ls` failed pre-creation), worktree added at detached `82ec2ecc` (the `git ls-remote`-verified remote tip), post-creation status CLEAN (`## HEAD (no branch)`, empty porcelain), HEAD re-verified `82ec2ecc1ba279dfa9176f1612943368d65d3616`. The dirty R1 worktree received zero new files (post-task status shows only the pre-existing dirty set; the new worktree path does not pollute `git status`). VERIFIED.
- Note: an initial attempt to place the report under `/tmp/soravo-state-audit-2026-10-09/` (also confirmed absent, directory created) was abandoned because the file-writing tools are jailed to the working directory; the in-repo isolated worktree is the compliant alternative the task text provides ("the safe workspace"). The empty `/tmp/soravo-state-audit-2026-10-09/` directory remains as a harmless artifact outside the repo.
- For the next implementation task (recommended, NOT yet used): reuse this worktree (`git -C .swarm-worktrees/state-audit-2026-10-09 status` must be re-checked empty first) or add a sibling (e.g. `.swarm-worktrees/t10-019-followup`) with the same TOCTOU discipline. Do NOT reuse `t10-commercial-model-gate` (untracked pilot file), `t10-r1-incident-audit` (detached + untracked report), or the dirty main worktree.

## 8. Commands executed and relevant results

1. Directory read of repo root — 140 entries; report files + spec docs present.
2. `git branch --show-current; git rev-parse HEAD; git status --porcelain=v1 --branch; git worktree list --porcelain; git log --oneline -8` — branch `feature/r1-gap-021-desktop-auth`, HEAD `18bc2133`, 23 unstaged paths, 14 untracked groups, 15 worktrees.
3. `git diff --cached --stat; git diff --stat; git branch -vv; git rev-parse origin/main; git log origin/main -5; git stash list` — staged empty; `origin/main` `82ec2ecc` (PR #114); 10 stashes preserved.
4. `git merge-base --is-ancestor` x2 + `rev-list --count HEAD...origin/main` + branch greps + `ls .swarm-worktrees/ .freebuff/` — 0 ahead / 22 behind; T10/R1/model/auth branches enumerated; candidate audit paths confirmed absent.
5. Reads: root SPEC_MANIFEST.json, `04_IMPLEMENTATION_PLAN.md`, `05_TASK_BREAKDOWN.md` (1–120), v6 docs 00/01/19/18/07/08/09/20/21/10, canonical SPEC_MANIFEST.json, R1 blocker packet (1–80), T10-019 report (full) — see section 1.
6. PROGRESS.md via `head -60` + `tail -40` + `wc -l` (12,607 lines) — PARTIAL read recorded honestly (one tool-truncated tail attempt).
7. `gh pr view 115 ...; gh pr checks 115` — TIMEOUT (>120 s), no output — NOT EXECUTED.
8. `timeout 20 gh auth status` — exit 124 (hung) — NOT EXECUTED.
9. `timeout 15 git ls-remote origin HEAD` -> `82ec2ecc... HEAD`, exit 0 — VERIFIED remote tip.
10. `timeout 20 git ls-remote origin refs/pull/115/head refs/pull/115/merge` -> `17f34870` / `ba4b2749`, exit 0 — VERIFIED.
11. `timeout 20 git ls-remote --heads origin | grep -iE ...` — PR #115 branch SHA match — VERIFIED.
12. `ls .opencode/skills/` (absent) + `ls ~/.agents/skills/` (29 entries) — VERIFIED.
13. `ls -la` on the two protected reports + `git log -- T10-...` (empty = untracked, never committed) + per-worktree status/rev-parse for 6 worktrees + candidate-dest `ls` (both absent) + `git diff --check` (exit 0) — VERIFIED.
14. `mkdir -p /tmp/soravo-state-audit-2026-10-09` (empty dir, unused fallback) + `git worktree add .swarm-worktrees/state-audit-2026-10-09 82ec2ecc...` (exit 0, detached HEAD) + post-creation status/HEAD verification + this report file — delivery, VERIFIED.

No destructive command was run at any point. The single state-changing command was the sanctioned isolated-worktree creation at a pre-verified-absent destination.

## 9. Unresolved questions and risks

1. PR #115 true state/checks UNKNOWN (`gh` path hangs). Risk: acting on assumed-green CI. Next safe action: `timeout 30 gh pr view 115 --json number,title,state,mergeable,mergeStateStatus,reviewDecision,headRefOid,baseRefOid,url`, then `gh pr checks 115`; if `gh` still hangs, try the REST API directly. — NOT EXECUTED.
2. `T10-COMMERCIAL-GATE-EVIDENCE-019` prior-existence question unresolved by design: untracked, present before this task; authorship/approval not investigated (out of scope). Preserved untouched. — DEFERRED.
3. Dirty-tree intent UNKNOWN: whether the `mirror.rs`/Silero-asset deletions on `feature/r1-gap-021-desktop-auth` are deliberate user edits or incidental damage is unclassified. Risk: a future rebase/merge silently drops ratified R1-GAP-023 work or user auth work. Next safe action: ask the owner; do not reconcile mechanically. — UNKNOWN.
4. PROGRESS.md read PARTIAL (head+tail only of 12,607 lines). Risk: a newer entry may name a different next task. Mitigation: v6 section-08 order + T10-019's self-declared gaps converge on the section-6 recommendation, but a full PROGRESS read is required before implementation starts. — HISTORICAL/STALE risk noted.
5. `origin/main` local ref approx 25 h old at audit time (mtime 2026-10-08 21:31 IST; no fetch performed to keep this task side-effect-free), though `ls-remote` confirmed the remote tip still equals it. Re-verify with `git fetch origin --prune` + `git rev-parse origin/main` immediately before implementation work begins. — DEFERRED.
6. Project-local skill store absent (`.opencode/skills/` missing; host-global has 29 skills). Per v6 section 10, any skill named-but-absent is UNKNOWN and a stop condition for tasks claiming it. The T10 follow-up must re-run the Skill Selection Gate against the actually-loadable set. — UNKNOWN (per-task).
7. Prunable `/tmp/opencode/*` worktree entries point at gone gitdirs. Harmless; `git worktree prune --dry-run` first, real prune only with owner approval. — DEFERRED.
8. Interruption resume point: no implementation started, nothing to resume. Exact next safe action for the following session: repeat the reading gate per section 18 (it invalidates across sessions), re-run items 5–6 of section 9, then use the section-7 worktree.

*End of report. Audit-only; no implementation performed.*
