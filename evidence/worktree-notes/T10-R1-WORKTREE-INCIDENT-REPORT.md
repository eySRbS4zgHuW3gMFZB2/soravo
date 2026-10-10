# T10/R1 Worktree Incident — Containment & Audit Report

**Date:** 2026-10-09 (UTC)
**Auditor task:** Contain and audit the T10 evidence report worktree incident (read-only toward R1)
**Affected worktree (R1):** `/home/maya/Desktop/Soravo_Engineering_Specification_v2` (branch `feature/r1-gap-021-desktop-auth`, HEAD `18bc2133…`)
**This report's location:** `.swarm-worktrees/t10-r1-incident-audit/T10-R1-WORKTREE-INCIDENT-REPORT.md` — a separate, clean, dedicated detached-HEAD worktree created for this audit. It is excluded from the R1 worktree's Git status (`.git/info/exclude` covers `.swarm-worktrees/`), so its creation adds no tracked or status-visible change to R1.
**Skills actually used:** `github` (content loaded and read; used for the GitHub/Git read-only inspection workflow). Considered and deliberately NOT loaded: all implementation/review/scan skills (`rust-engineer`, `rust-review`, `security-guidance`, `supply-chain-risk-auditor`, `semgrep`, `codeql`, `supabase`, `tauri`, frontend/testing/Cloudflare skills) — reason: audit-only task, no code written, no scans in scope. No skill is claimed as authority over repository state.

---

## 1. Authority, protocols, constraints honoured

- `03_AI_INSTRUCTIONS.md` §2 authority ladder applied: (1) security/safety, (2) `03_AI_INSTRUCTIONS.md`, (3) ADRs, (4) TDD, (5) PRD, (6) implementation plan, (7) task, (8) code comments, (9) agent preference. Skill Selection Gate (§5) and `07_AI_SKILLS.md` matrix observed; only the genuinely relevant skill was loaded.
- `11_INTERRUPTION_HANDOFF.md` observed: the repository is the source of continuity; no checkpoint/commit/push performed by this audit (containment only).
- `DOCUMENTATION-STATE-AUDIT-FINAL.md` §0.1–§0.2 state-audit protocol observed: committed history is authority over implementation truth; a dirty working tree is observational only; where evidence does not exist the finding is `UNKNOWN`; no source, manifest, CI, migration, or existing documentation file was created, modified, deleted, moved, or renamed inside the affected worktree; no commit/push/tag/release performed; no secret reproduced.
- Mandatory safety rules honoured: no modify/clean/reset/restore/switch/rebase/commit/delete in the R1 worktree; the report was not moved, deleted, overwritten, or repaired; no preservation claim made without proof; unchanged HEAD never treated as proof of an unchanged working tree; all new documentation written in the dedicated audit worktree, never in R1; no unrelated implementation/licensing/registry/PR changes.

## 2. Verification results (all read-only toward R1)

| # | Fact | Result |
|---|---|---|
| V1 | Affected worktree path | **VERIFIED:** `/home/maya/Desktop/Soravo_Engineering_Specification_v2` is the checkout on branch `feature/r1-gap-021-desktop-auth` per `git worktree list --verbose` + `git branch --show-current`. |
| V2 | Branch | **VERIFIED:** `feature/r1-gap-021-desktop-auth`. |
| V3 | HEAD | **VERIFIED:** `18bc2133dc5805b24874dc4f16e64817437f91e9` per `git rev-parse HEAD`; matches the task-stated known HEAD exactly. `git log -3` dates HEAD to 2026-10-08 13:55:52 +0530; `git reflog` shows checkout onto this branch 2026-10-08 14:15:54 +0530 with no HEAD movement since. Reflog tracks HEAD only, never working-tree writes. |
| V4 | Report path | **VERIFIED:** `<R1-worktree>/T10-COMMERCIAL-GATE-EVIDENCE-019-REPORT.md` exists at the root of the affected worktree. |
| V5 | Report size | **VERIFIED:** 21425 bytes per `ls -l` and `stat` (mtime 2026-10-09 16:11:14.725504749 +0530, birth 2026-10-09 16:11:14.724505249 +0530). |
| V6 | Report SHA-256 | **VERIFIED:** `e8223ce52f3332bb59cad21d9d52e56f5ed71f952340c0b6d520eb1499f88b39` per `sha256sum`; matches the previously recorded hash exactly — report content unchanged since that recording. |
| V7 | Report Git state | **VERIFIED:** untracked (`git ls-files --error-unmatch` fails; `git status --porcelain=v1` and `git ls-files --others --exclude-standard` list it as `??`). Never committed (`git log --all --oneline -- <report>` returns empty). |
| V8 | Worktree dirtiness | **VERIFIED:** dirty at audit time. `git status --porcelain=v1 --branch` shows ~22 modified/deleted tracked paths plus ~30 untracked paths including the report, `T10-PROVENANCE-BATCH-013-REPORT.md` (mtime 2026-10-09 15:37:55), `R1-GAP-021-DESKTOP-AUTH-PROPOSAL.md`, `crates/desktop-auth/`, `supabase/functions/desktop-auth-*/`, `supabase/migrations/20260928090000_desktop_auth_codes.sql`, and a nested `.freebuff/` worktree. |
| V9 | Placement violation | **VERIFIED (task grant + filesystem fact):** the report exists inside the R1 worktree; the task states this placement violated the instruction to keep the R1 worktree untouched. Filesystem location confirms the placement; the violated instruction itself is taken as task-granted fact, not independently re-proven from repo docs. |
| V10 | Audit left R1 unmodified | **VERIFIED:** re-ran `git rev-parse HEAD` (= `18bc2133…`), `sha256sum` + `stat` of the report (= same hash/size/mtime), and `git status --porcelain=v1` (same dirty set; only expected delta is the admin-side registration of the new excluded audit worktree, which is status-invisible). No checkout/clean/reset/restore/add/commit/mv/rm and no file write inside the R1 working tree. The `git worktree add --detach` used to create this audit worktree touched only `.git/worktrees/` admin metadata and the new excluded directory; it changed no R1 branch, HEAD, tracked file, or status-visible entry. |

## 3. Commands used (all read-only toward R1; none wrote inside the R1 working tree)

1. `git worktree list --verbose; git branch --show-current; git rev-parse HEAD; git status --porcelain=v1 | head -n 100`
2. `ls -l <report>; stat -c …; sha256sum <report>; git log --oneline -15; git status --porcelain=v1 --branch; git diff --name-only; git ls-files --others --exclude-standard`
3. `stat <report>; git reflog --date=iso -10; git log -3 --format='%H %ad %s' --date=iso; head -n 30 <report>; git ls-files --error-unmatch <report>`
4. `ls -lt --time-style=full-iso progress/; ls -lt .swarm/; ls -lt *.md; git log --all --oneline -- <report>; git status --porcelain=v1 --untracked-files=all | grep -i T10`
5. `grep -i <report-name> .swarm/events.jsonl; grep -i <r1-branch/untouched-terms> .swarm/events.jsonl; ls -lt <selected dirty files>; ls -lt <state-audit docs>`
6. File reads: `11_INTERRUPTION_HANDOFF.md`, `DOCUMENTATION-STATE-AUDIT-FINAL.md` (partial), `T21-WORKTREE-ATTRIBUTION-REPORT.md` (partial), `SPEC_MANIFEST.json`, `STATE-AUDIT-V6-002.md`, `03_AI_INSTRUCTIONS.md` (partial), `07_AI_SKILLS.md` (partial), `.swarm/workspace-snapshot.digest`, `.swarm/checkpoints.json`.
7. `git check-ignore -v <audit path>; git worktree list --porcelain`; `git worktree add --detach .swarm-worktrees/t10-r1-incident-audit 18bc2133…` (creates only the dedicated audit worktree + `.git/worktrees/` admin registration; sanctioned by the task's "separate, clean, dedicated worktree" instruction).

**NOT EXECUTED:** content dumps of R1 implementation files, secret scans, builds, tests, `gh` API calls, full file-content snapshots beyond the report header (first 30 lines, non-sensitive) — deliberately avoided to prevent secret exposure and out-of-scope entanglement.

## 4. Pre-incident evidence search

| Source examined | Outcome |
|---|---|
| `.swarm/events.jsonl` (mtime 2026-10-09 14:52:19, predates report birth 16:11:14) | **VERIFIED ABSENT:** no entries mentioning `T10-COMMERCIAL-GATE-EVIDENCE-019`, the R1 branch, or an untouched-worktree instruction. No contemporaneous command log for the incident. |
| `.swarm/checkpoints.json` | **VERIFIED INSUFFICIENT:** two entries (2026-10-08T12:29:56Z, 12:31:11Z) record only HEAD SHA `18bc2133…`. Commits prove HEAD, never working-tree contents. Per safety rule 5, not evidence the tree was unchanged. |
| `.swarm/workspace-snapshot.digest` (2026-10-08 18:03) | **VERIFIED INSUFFICIENT:** single opaque hash `27ff9f5b…`, no file manifest or per-file hashes. Cannot reconstruct or verify any pre-incident working-tree state. |
| `progress/STATUS.md`, `progress/NEXT.md` | **VERIFIED STALE:** mtimes 2026-09-27; predate the R1 work entirely. Not evidence of pre-incident R1 state. |
| `git log --all -- <report>`, reflog | **VERIFIED:** report never committed; reflog shows no HEAD movement since 2026-10-08 14:15:54, but reflog tracks HEAD only, not working-tree writes. |

**Net: VERIFIED** — no trustworthy full-tree snapshot, hash manifest, or `git status` capture predating 2026-10-09 16:11:14 was located during this audit. Later recollections or status outputs are NOT contemporaneous evidence. This matches the task's known fact that no trustworthy pre-task snapshot exists.

## 5. Attribution: verified facts vs inference vs unknowns

- **VERIFIED (placement violation):** exactly one new filesystem fact is attributable to this incident — the untracked file `T10-COMMERCIAL-GATE-EVIDENCE-019-REPORT.md` (21425 bytes, hash above, birth 2026-10-09 16:11:14) exists in the R1 worktree in violation of the keep-untouched instruction.
- **UNKNOWN (all other work):** whether any other pre-existing tracked modification, deletion, or untracked file in §2-V8 was created, altered, or deleted by this incident **cannot be established**. No baseline exists to diff against. Other dirty entries carry earlier mtimes (e.g. `PROGRESS.md` 2026-10-08 15:00, `account.rs` 2026-10-08 14:25, `T10-PROVENANCE-BATCH-013-REPORT.md` 2026-10-09 15:37:55), which is consistent with — but does NOT prove — them predating the incident; mtimes are not tamper-proof and prove nothing about content integrity.
- **INFERENCE (labelled, not fact):** the co-presence of a second same-day untracked T10 report (`T10-PROVENANCE-BATCH-013-REPORT.md`, ~33 min earlier) suggests the same session may have written twice to the wrong worktree — but the actor, working-directory configuration, and causal chain are **UNKNOWN** (no command log found). No historical state is reconstructed by guesswork.
- **BLOCKED:** content-level comparison of pre-existing R1 files against any "original" state is blocked — there is no original to compare to.

## 6. Authority / permitted handling of the misplaced report

- Searched `03_AI_INSTRUCTIONS.md` (authority ladder), `07_AI_SKILLS.md`, `11_INTERRUPTION_HANDOFF.md`, `STATE-AUDIT-V6-002.md`, `DOCUMENTATION-STATE-AUDIT-FINAL.md` (§0 constraints: no existing-doc create/modify/move/rename; audit writes only to outside locations), `T21-WORKTREE-ATTRIBUTION-REPORT.md`, `SPEC_MANIFEST.json`.
- **Finding: NOT FOUND / UNKNOWN.** No examined authority explicitly pre-authorizes either (a) retaining a misplaced evidence report in place with a documented exception, or (b) relocating it to an approved evidence location. The state-audit protocol's no-move/rename constraint means the report must be preserved exactly as found until handling is authorized.
- **Disposition: owner decision recorded in §10.** At audit time this was BLOCKED pending owner decision; the owner has since directed RETAIN IN PLACE WITH DOCUMENTED EXCEPTION (see §10). This audit itself performed neither a move nor a retention change to the report.

## 7. Preservation

**VERIFIED:** the report has been preserved exactly as found — not moved, deleted, overwritten, regenerated, or repaired. Hash re-verified at §2-V6/V10 after all inspections.

## 8. Unresolved questions

1. **UNKNOWN:** full pre-incident working-tree manifest (no baseline exists). 2. **UNKNOWN:** actor/session and exact command that wrote the report into the R1 worktree (no command log). 3. **UNKNOWN:** whether any pre-existing R1 change was touched by the incident (unresolvable without a baseline). 4. **NOT EXECUTED:** content integrity review of R1 implementation files (out of scope; would risk secret exposure and unrelated entanglement).

## 9. Recommended standing action

Do not touch the R1 worktree. Establish a mandatory pre-task snapshot ritual (status capture + hash manifest to a timestamped location outside the worktree) before any future work near dirty worktrees. Any future disposition change for the retained report requires a fresh explicit owner authorization with before/after hash manifests proving byte-identity.

---

## 10. Owner disposition record (authorized, separate location)

- **Decision: RETAIN IN PLACE WITH DOCUMENTED EXCEPTION — VERIFIED** (owner directive received 2026-10-09, after the audit in §§1–9 above).
- **What was authorized:** the existing report `T10-COMMERCIAL-GATE-EVIDENCE-019-REPORT.md` stays exactly where it is in the dirty R1 worktree. It is **not** to be moved, deleted, overwritten, or modified.
- **Exception recorded:** the report was created in the dirty R1 worktree (`feature/r1-gap-021-desktop-auth`, HEAD `18bc2133…`) in violation of the isolation requirement to keep that worktree untouched (§2-V9). This retention is a documented exception to that requirement, not a finding that the placement was acceptable.
- **Incident status: UNRESOLVED regarding possible effects on pre-existing changes.** No trustworthy pre-incident snapshot exists (§4), so whether other pre-existing R1 work was affected remains **UNKNOWN**. The worktree is **not** claimed to be unaffected, and the incident is **not** claimed to be fully resolved.
- **Standing constraint:** do not touch the R1 worktree; any future disposition change requires a fresh explicit owner authorization with before/after hash manifests.

---

*End of incident report. Every claim above carries its inline VERIFIED / NOT EXECUTED / BLOCKED / UNKNOWN label. No model cleared, no registry classification changed, no PR or release action taken.*
