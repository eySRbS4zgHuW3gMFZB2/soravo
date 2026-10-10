# GITHUB SYNCHRONIZATION AUDIT (READ-ONLY — nothing staged, committed, or pushed)

**Date:** 2026-10-10 · **Remote:** `https://github.com/eySRbS4zgHuW3gMFZB2/soravo.git` (fetch OK; no auth action taken)
**Local branch:** `feature/r1-gap-021-desktop-auth` — HEAD `18bc2133` — **no upstream configured, no remote
counterpart** (no `origin/feature/r1-gap-021-desktop-auth` exists).
**origin/main:** `82ec2ecc` (verified 2026-10-10 via safe `git fetch origin`; worktree untouched).
**Ahead/behind:** HEAD is an ancestor of origin/main — **0 ahead / 22 behind**. Every local commit is already
on GitHub; everything publishable from this task is UNCOMMITTED worktree state. Default branch: `main`.
**Disk:** 9.3 GB free (no verification reruns performed per constraints).

## 1. Dirty/untracked summary (main worktree)

22 modified + 4 worktree-deleted (R1 auth/config/Silero deletions) + 34 untracked (now incl. this report).
Unrelated R1/auth/website/supabase/config/test work all preserved and out of scope. Full listing matches the
T23 §A inventory plus T11-A/G1/G1-CLOSURE/GGUF artifacts. Linked worktrees (14 registered): freebuff review
worktree clean; `parakeet-unified-impl` dirty (6 M + the two T10/T11 reports untracked — see §4);
r1-gap-021-desktop-auth clean (behind 24); r1-gap-023-adr032 has 5 untracked helper notes; r1-gap-023-wire,
pr113-merge-record, t10-commercial-model-gate (1 untracked), t10-upstream-provenance-008 clean;
state-audit + t10-r1-incident-audit detached with untracked reports only; phase1-*/type-001 show old
mass-deletion deltas (ancient bases, pre-existing). **`/home/maya/soravo-r1-gap-023`,
`/tmp/opencode/r1-gap-008-finalize`, `/tmp/opencode/r1-gap-021` are registered but MISSING from disk**
(stale worktree metadata — NOT pruned here; that would modify admin state).

## 2. Benchmark change set (exact, provenance-checked)

| File | Status | Provenance |
|---|---|---|
| `crates/stt/tests/gguf_benchmark.rs` | NEW, untracked | T11-A follow-through driver + 7 regression tests (this task line) |
| `crates/stt/tests/t11a_raw_parakeet.rs` | NEW, untracked | T11-A evidence probe (kept) |
| `crates/stt/tests/fixtures/` (3 WAV + 3 txt) | NEW, untracked | T11-A corpus; WAV SHAs re-verified §3 |
| `crates/stt/Cargo.toml` | M, single 3-line hunk | `sha2 = "0.10"` dev-dep only — no unrelated edits in file (diff-checked) |
| `crates/stt/src/benchmark.rs` | M, single hunk (4+/11−) | Dead `"dummy"` re-init removal only — no unrelated edits (diff-checked) |
| `Cargo.lock` | **MIXED** — R1 bulk delta + my 1 edge | My contribution: `soravo-stt` → already-locked `sha2 0.10.9` edge ONLY |
| `GGUF-BENCHMARK-IMPLEMENTATION-REPORT.md` (+ T11-A, G1-CLOSURE) | NEW, untracked | Evidence (convention keeps reports untracked) |

- `sha2 0.10.9` package entry verified present at HEAD (`git show HEAD:Cargo.lock`) — **zero new packages**;
  remaining lockfile additions (keyring/secret-service/deep-link/desktop-auth chains) trace to R1 manifest
  deps, not this task. No model (731 MB `.gguf`), archive, binary, credential, or R1 file in the set.
- Committed/pushed? **Neither.** No existing PR covers this work (open PRs: #115 T10-commercial + 8
  dependabots; none for benchmark or this branch). `git diff HEAD origin/main -- crates/stt` is EMPTY, so
  the set applies cleanly onto `origin/main`.

## 3. Evidence verification (no rerun)

- Model SHA `4b50b6dd…2f38795` + all 3 fixture WAV SHAs re-hashed this session: **match** (§2 table).
- Test results (7 unit + 1 ignored bench, exit ok) exist as report claims only — **REPORTED, not re-executed**.
- **New evidence upgrading prior labels:** the "missing" `T10-PARAKEET-UNIFIED-IMPL-020` and
  `T11-PARAKEET-DEVCLEAN-SPEECH-021` reports were FOUND in `.swarm-worktrees/parakeet-unified-impl`
  (untracked there). T11 verified by inspection: 3 LibriSpeech samples, aggregate WER 0.0000/27 words
  (normalized), deterministic repeat, production transcribe-cpp path, RTF ≈ 0.15; archive
  `dev-clean.tar.gz` re-hashed `76f87d09…903728ab3` (337,926,286 B) — **matches**; devclean test code
  present there (2 hits), absent here (0). T10 describes a test-only commercial-gate exception for the exact
  artifact (MODEL_LICENSES files exist ONLY on that branch — main worktree has none; clean separation).
  Prior HISTORICAL/STALE labels → upgrade to **VERIFIED-as-reported, unmerged side-branch, tests NOT
  re-executed here**. CLI panic re-confirmed BLOCKED at that revision (exit 101, §9 of that report).

## 4. Publication plan (PROPOSED — no step executed; needs owner approval)

Goal: publish ONLY the §2 set, never R1/auth/licensing/cleanup/model/reports-bulk.
1. Owner approves scope: 9 code/fixture paths + the single `Cargo.lock` soravo-stt edge hunk; reports stay
   untracked per convention; `.gguf`, `dev-clean.tar.gz`, `target/`, R1 files NEVER added
   (note: `.gitignore` does NOT cover `*.gguf`/`*.tar.gz` — **forbid `git add -A`**; use explicit pathspecs).
2. Create branch `t11b/gguf-benchmark-harness` from `origin/main` (no checkout performed here; when
   approved, do it in a location that does not disturb this worktree — new worktree creation also needs
   approval first).
3. Port the 9 paths onto it (working tree copy or `git checkout 18bc2133 -- <paths>` from the new branch —
   exact command at execution time, never now), stage the `Cargo.lock` edge hunk ONLY via `git add -p`
   (verify with `git diff --cached` that no R1 hunk is staged), commit focused, push branch, open PR against
   `main` (CI must go green; `benchmark_parakeet_batch` ONNX failure and `gguf_benchmark_fixed_corpus`
   #[ignore] status must be disclosed in the PR body).
4. Explicitly NOT published: R1 auth stack, MODEL_LICENSES gate exception (stays on parakeet branch + PR
   #115 lane), T10/T11 side-branch reports (stay in place), model artifact, archives, binaries, cleanup reports.
5. Do NOT merge the parakeet worktree branch as part of this (gate-exception semantics need separate review).

## 5. Risks, blockers, owner decisions required

- RISK: `git add -p` on Cargo.lock mis-staging R1 hunks → mitigate by cached-diff review before commit.
- RISK: `git add -A` sweeping the 731 MB model/secrets-adjacent files → explicit pathspecs only.
- BLOCKED-until-approved: branch creation, any staging/committing/pushing, any worktree add/prune
  (3 stale registrations noted in §1).
- DECISIONS NEEDED: (a) approve §4 scope (code+fixtures+edge; reports untracked); (b) confirm model never
  published; (c) confirm parakeet-branch gate exception stays separate; (d) whether to disclose the stale
  worktree registrations for a later admin prune.
- Conclusion labels: sync STATE VERIFIED; benchmark files UNCOMMITTED/UNPUSHED (no PR); T10/T11 reports
  FOUND (side-branch, unmerged); evidence hashes VERIFIED; publication plan PROPOSED, BLOCKED on approval.
