# GITHUB SYNC EXECUTION REPORT — GGUF benchmark publication

**Date:** 2026-10-10 · **Scope:** `GITHUB-SYNC-AUDIT-REPORT.md` §2 set only. No merge. Normal session, no Swarm.

## 1. Result

- **Branch:** `t11b/gguf-benchmark-harness` (new worktree `.swarm-worktrees/t11b-gguf-benchmark`,
  based at verified `origin/main` `82ec2ecc`; tracks `origin/t11b/gguf-benchmark-harness`).
- **Commit:** `3b0c2d6` (`test(stt): deterministic GGUF benchmark driver over fixed 3-clip corpus`,
  11 files, +455/−11). Local SHA == remote SHA (both `3b0c2d63349529141014ceecaa879b116a52d895`) — VERIFIED.
- **PR:** https://github.com/eySRbS4zgHuW3gMFZB2/soravo/pull/116 — OPEN, base `main`, head verified.
  PR diff = exactly the 11 approved files (listed via API) — VERIFIED, no model/archive/secrets/R1 content.
- **Method:** clean-worktree isolation (no stash, no checkout-switch, no history rewrite, no force-push).
  All copies byte-verified (SHA-256) against the dirty-tree sources; lockfile diff exactly 1 edge line;
  `cargo metadata` full-resolve green with no further lockfile mutation.

## 2. Pre-push validation (no full rebuild, per scope)

- `cargo metadata --no-deps` + full `cargo metadata` in the new worktree: exit 0, resolve green.
- Staged-diff review pre-commit: 11/11 paths approved; `.gguf`/`.tar.gz`/`target/`/reports/R1 absent.
- Byte evidence (tests, hashes, benchmark numbers) carried over from
  `GGUF-BENCHMARK-IMPLEMENTATION-REPORT.md` — not re-executed here (stated in PR body).

## 3. CI state (reported accurately, not claimed)

PR #116 checks at creation: `cargo-audit` PASS; `cargo-deny`, `desktop` (+macOS ×2, Windows),
`e2e`, `npm-audit`, `rust`, `web` PENDING (runs 38040915575 / 38040915429). **CI is NOT green yet —
merge must wait for required checks.** Do NOT merge on this report.

## 4. Preservation (verified post-push)

- Original worktree: still `feature/r1-gap-021-desktop-auth` @ `18bc2133`, dirty/R1/untracked state
  byte-unchanged (status re-read after push). No stash, reset, or switch ever performed.
- Unpublished and intact: R1 auth stack, MODEL_LICENSES gate exception (parakeet branch), T10/T11 side
  reports, model artifact, dev-clean archive, all evidence reports, other worktrees.
- New worktree `.swarm-worktrees/t11b-gguf-benchmark` is the only worktree added (clean, single commit).

## 5. Remaining blockers / next safe actions

- Await CI completion on PR #116, then owner-approved merge (separate authorization required).
- Project is NOT fully synchronized: R1/auth/licensing/cleanup work remains deliberately unpublished.
- Suggested next (needs approval): corpus extension + streaming-harness fix (G4/G8 follow-ups), or
  unrelated gap work. Disk 9.2 GB free.
