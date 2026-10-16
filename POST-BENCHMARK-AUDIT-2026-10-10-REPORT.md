# POST-BENCHMARK CORE AUDIT & SILERO RESTORE REPORT (2026-10-10)

**Audit branch/HEAD at audit time:** `recovery/r1-t22-worktree-2026-10-10` @ `3bc65eda` →
work now on `fix/silero-asset-restore-2026-10-10` @ `fab10d47`. `origin/main` = `82ec2ecc` (unchanged).
No resets, force-pushes, merges, or deletions. Preservation branches intact (SHAs re-verified).

## 1. PR #116 status (unchanged, not re-polled in a loop)

OPEN, head `21601c65` == remote, base `main`, MERGEABLE/CLEAN, full CI green (verified prior session).
No merge performed (needs separate approval). GGUF benchmark work stays isolated from this task.

## 2. Silero VAD blocker — RESOLVED on main; restored locally (this session)

- PR #108 (`r1-gap-008/silero-vad-asset`) is MERGED (2026-10-08). `origin/main` carries
  `resources/models/{silero_vad_v4.onnx, SILERO_VAD_LICENSE_MIT.txt, SILERO_VAD_PROVENANCE.json}`
  + `bundle.resources: ["resources/**/*"]` in `tauri.conf.json`.
- License/provenance VERIFIED from remote blobs: MIT conclusively established (license file SHA
  `2e63e9a3…`, matches v4.0 tag record), onnx blob `e6db48d6` → SHA-256 `a35ebf52…` (matches the
  staged copy that powered all 5 live runs), triple-anchored to snakers4 v4.0 / Handy pin / vad-rs pin.
  Redistribution permitted with notice (bundled alongside). No waiver used.
- The blocker was therefore NOT a licensing/provenance gap and NOT a build defect — the R1 working
  tree had simply lost the 4 merged paths (3 deletions + 1 dropped JSON key). Fresh-clone breakage
  claim in `FRESH_VM_RECOVERY.md` is STALE for `main` (fresh clones get the asset); it was accurate
  only for the R1 working line, which this fix repairs.
- Remote branch `r1-gap-008/silero-vad-asset` (@ `06bdd577`) still exists; pre-merge point, no action.
  Tied worktree registrations under `/tmp` are gone from disk (stale, left unpruned).

## 3. Desktop acceptance matrix (Linux, this tree + prior verified evidence)

| Criterion | Status | Basis |
|---|---|---|
| Launch + session lifecycle | RUNTIME VERIFIED | T22 GUI runs; session ladder unit-tested |
| Microphone capture | E2E VERIFIED | T22 arecord + in-app samples ×5 |
| Silero asset + init | IMPLEMENTED (restored here); RUNTIME VERIFIED pre-deletion | This fix + 5 live runs w/ staged copy |
| Parakeet install + inference | E2E VERIFIED | T22 + harness (CPU, RTF ~0.15–0.2) |
| Final transcript + insertion | E2E VERIFIED (opencode field) | T22; xed NOT EXECUTED |
| Cancellation | DEFERRED-by-design (Linux) | Explicit no-op; cross-platform UNKNOWN |
| Stale rejection | UNIT TEST VERIFIED | Session/stale-discard tests green in CI |
| Settings (+persistence) | RUNTIME VERIFIED | Onboarding/model persisted across T22 launches |
| Hotkey (default) | E2E VERIFIED | T22 holds; customization NOT EXECUTED (G2) |
| Overlay / tray | IMPLEMENTED | Code + streaming-overlay logs; visual NOT EXECUTED |
| History | RUNTIME VERIFIED | Entries + retention cleanup in T22 logs |
| Model failure/rollback | IMPLEMENTED | Missing-file/load-failure tests; E2E rollback NOT EXECUTED |
| Auth/entitlement integration | IMPLEMENTED (dirty R1) / NOT EXECUTED E2E | No desktop enforcement in dictation path |
| Windows/macOS | UNKNOWN | Per ADR-019 bound; CI desktop-build jobs pass on PRs |
| Main-branch CI | BLOCKED (RED) | Latest main CI run `37805540732` FAILED (2026-10-08, unchanged) |

## 4. Blocker selected and executed: Silero restore (scope: 4 paths, data-only)

- New branch `fix/silero-asset-restore-2026-10-10` (stacked on the recovery tip; preservation intact).
- Restored from `origin/main`, byte-identical (empty diff + SHA match): 3 asset files + `bundle.resources` key.
- Commit `fab10d47`, pushed normally (no force). **PR #117** OPEN, base `main`, head verified
  `fab10d47`; status honest: **CONFLICTING** — expected, because the branch stacks the stale R1 snapshot
  and main already contains these exact bytes (rebasing onto main dissolves the diff, which is itself the
  proof the asset question is settled). CI: no checks reported yet — NOT green, do not merge.
- Commands: `git checkout -b`, `git checkout origin/main -- <3 paths>`, 1-line Edit, `sha256sum` ×3,
  `git diff origin/main -- <paths>` (empty), commit, push, `gh pr create`. No build/test run (data-only
  change; CI desktop job is the bundling gate). Disk 13 GB free throughout.
- Left untouched: decision-doc/mirror deletions (R1 state), all other worktrees/branches, PR #116.

## 5. Security/licensing

No secrets in any pushed content (pre-push greps clean). No licensing decision changed: the restored
MIT notice + provenance manifest are PR #108's reviewed content, reproduced byte-identically. Model
commercial gate (T10) still BLOCKED for release; Q8_0 local-test-only standing unchanged.

## 6. Next exact task

**Live recording re-verification with the restored asset** (the one thing this fix does not prove):
launch the R1-line GUI from a tree containing these 4 paths, dictate once, confirm `Initialized Silero
VAD backend` resolves from the worktree asset and transcript+insertion succeed. Needs mic + ~10 min user
time;_then_ close the Silero chapter. After that: G2 hotkey-rebind exposure (functional, backend-ready).
