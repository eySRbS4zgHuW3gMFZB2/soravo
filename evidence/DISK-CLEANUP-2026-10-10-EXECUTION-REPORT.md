# Cleanup Execution Report — 2026-10-10T06:29:35Z (0 bytes reclaimed; both deletions guard-refused)

Audit basis: `DISK-CLEANUP-2026-10-10-DEEP-AUDIT-REPORT.md` (read in full) + all prior cleanup reports.
No Swarm, no agents, no builds/tests/dictation. No source, manifest, lockfile, config, or history change.

## Before measurements (fresh, VERIFIED)
- `df -B1 /`: total 115395379200, used 108661923840, **avail 1375207424 (~1.28 GiB), 99% full**.
- Root `/home/maya/Desktop/Soravo_Engineering_Specification_v2`; 17 worktree entries; main status 45 lines
  (pre-existing auth-work dirt + 6 cleanup-report deliverables); no cargo/rustc/pnpm/test processes.
- Candidates remeasured: main `target/debug/incremental` **2.9G**; wire `target` **7.6G**; t10 **13G**;
  parakeet **12G**. All match the audit (no stale-size surprises).

## Re-audit correction (wire target differs slightly from audit — resolved before proceeding)
- Wire `target/debug/resources/models/` holds `silero_vad_v4.onnx` (1.8M) + license/provenance files.
  The deep audit's extension sweep missed it (output truncated at head -10). VERIFIED: all three are
  byte-present as TRACKED source files in the same worktree (`git ls-files` lists them), so the target
  copies are build-produced duplicates — deletion would lose nothing unique. Consequence of wire-target
  deletion: reclaim ~7.6G; wire branch loses its debug cache (~8G rebuild transient); tracked model
  sources untouched.

## Commands executed
1. `rm -rf target/debug/incremental` (Phase A, all 6 audit conditions re-verified: 0 tracked, ignored,
   real dir, no processes/locks, no sharing) → **BLOCKED** (4th refusal; not allowlisted). Stopped, no bypass.
2. Approval question to owner for Phase B → approved: **wire 7.6G only** (t10/parakeet explicitly NOT approved).
3. `rm -rf .swarm-worktrees/r1-gap-023-wire/target` (wire re-verified above; parent clean, 0 status lines,
   no lock, no symlinks) → **BLOCKED** (`Nested safe artifact requires a verified active coder scope
   binding`). Stopped, no bypass, no substitute target.
4. Shared caches (pnpm store, cargo registry): NOT touched — no owner approval, scope unproven (Step 4).

## Candidates skipped / approval status
- t10-commercial 13G: re-verified size; untracked evidence file confirmed OUTSIDE target (safe), but twin-
  branch quiescence unconfirmed + owner approved wire-only → SKIPPED, approval missing.
- parakeet 12G: dirty/active parent + mixed scratch → SKIPPED, approval missing.
- Shared caches (cargo registry 2.5G global, pnpm store 595M global, `.pnpm-store` 299M): SKIPPED, Phase C gate.

## After measurements (VERIFIED — nothing changed)
- `df -B1 /`: avail **1373851648** (delta −1.4M = normal filesystem churn, NOT reclaimed space).
- Both targets present and intact (7.6G / 2.9G). 17 worktrees listed; main 45 lines; wire still clean (0).
- GGUF 698M + archive 323M intact; `git diff --stat` shows only the known 23-file auth-work dirt.
- **Actual bytes recovered: 0.** Cleanup is NOT complete — stated explicitly.

## Outstanding risks & rebuild policy
- Free space ~1.3G vs audit's estimated peaks (incremental regen ~3–4G; full debug ~10G+): NO build/test
  started or safe to start. No rebuild attempted in this task.
- Agent-side deletion of both approved paths is mechanically unavailable in this environment; every
  approved byte requires the owner (or a scope-bound coder session) to execute.
- Long-term (from audit Phase D, unimplemented): incremental-cache pruning cadence, `sccache` evaluation,
  retiring the twin `17f34870` worktrees after sign-off, fixtures outside `target/`.
