# STORAGE-AUDIT-REPORT.md — SORAVO read-only holistic disk usage audit

## 1. Audit timestamp and project path

- Audit timestamp (UTC): 2026-10-10 ~17:07–17:30 UTC (Asia/Dubai system clock observed 17:07 local-equivalent during audit; `uptime` showed 6h05m up, load 1.18/1.61/2.73).
- Absolute project path: `/home/maya/Desktop/Soravo_Engineering_Specification_v2`
- Audit mode: READ-ONLY. No delete/move/rename/truncate/compress/prune/rebuild/reinstall/modify was performed. No `git clean/reset/gc`, no worktree pruning, no Swarm delegation, no downloads, no compiles, no installs.
- Report file: `STORAGE-AUDIT-REPORT.md` (new file; verified absent before writing; nothing overwritten; not committed or pushed).

## 2. Filesystem baseline

| Item | Value |
|---|---|
| Device / filesystem | `/dev/sda3`, type `ext4`, mounted on `/` (`findmnt -T .`, `stat -f .` Block size 4096) |
| Mount options | `rw,relatime,errors=remount-ro` |
| Filesystem total | 108 GiB decimal-GB display (`df -h`) |
| Filesystem used | 98 GiB (`df -h`), 91% per `lsblk` FSUSE% (reserved-block accounting differs from `df` 96%) |
| Filesystem available | 5.1 GiB |
| Filesystem use% | 96% (`df -h`) — filesystem is critically full |
| Inodes total / used / free | 7,176,192 / 1,329,309 / 5,846,883 = 19% used (`df -i`) — inodes are NOT the constraint |
| BTRFS? | NO. `btrfs subvolume list .` → "not a btrfs filesystem". No snapshots, subvolumes, or reflink/dedupe effects. `ext4` has no transparent reflinks. |
| Project apparent size | 59,670,317,439 bytes (`du -sb .`) = 55.57 GiB = 59.67 GB |
| Project allocated size | 60,203,282,432 bytes (`du -s --block-size=1 .`) = 56.08 GiB = 60.20 GB |
| Apparent vs allocated | Allocated exceeds apparent by ~533 MB (block-rounding overhead). No large sparse-file discount observed. `du` does NOT equal reclaimable space (see hardlink note below). |
| Open / actively written | YES — `lsof +D .` shows PID 2059 (`ai.opencode.desktop` NodeService) holding `.swarm/swarm.db`, `swarm.db-wal`, `swarm.db-shm`, and `swarm.db-shm`, plus write handle on `.swarm/telemetry.jsonl`. `.swarm/` and `node_modules/` sizes shifted between consecutive passes (see variance note). Treat sizes as point-in-time. |
| Measurement variance warning | `node_modules` measured 57,606,144 B on the first `-d1` pass and 594,190,336 B on a later `-s` pass (~10×). Both passes used `du`; symlink count is 1,436. Either a concurrent install/write occurred during the audit or an early-pass truncation occurred. Both numbers are reported; cleanup estimates use the CURRENT (larger, safer) figure and flag re-verification. |

Hardlink accounting note: `du` counts each hardlinked inode once per invocation. Naive `find -printf %s | sum` DOUBLE-counts hardlinked pairs (e.g. `target/debug/libsoravo_desktop_lib.a` + `target/debug/deps/libsoravo_desktop_lib.a` share inode 2514052, nlink=2, 1,594,185,132 B stored once). Section 7 details this.

## 3. Top-level storage table (includes hidden files, `du -x`, bytes + human)

Ranked by allocated bytes. "Top-level files" row covers non-directory entries at depth 0 (the two giants dominate).

| Rank | Path | Allocated bytes | Human (GiB/GB) | Notes |
|---|---|---|---|---|
| 1 | `.swarm-worktrees/` | 35,830,607,872 | 33.37 GiB / 35.83 GB | 16 worktrees; 4 contain `target/` builds (see §4/§6) |
| 2 | `target/` (main checkout) | 21,537,640,448 | 20.06 GiB / 21.54 GB | `debug/` 18.39 GB + `release/` 2.84 GB + cross-targets |
| 3 | Top-level data files (`parakeet-*.gguf` + `dev-clean.tar.gz`) | 1,069,283,854 | 0.996 GiB / 1.07 GB | 731,357,568 + 337,926,286; untracked, NOT git-ignored |
| 4 | `.git/` | 1,154,588,672 | 1.08 GiB / 1.15 GB | pack 1.11 GB; worktree metadata 1.9 MB |
| 5 | `node_modules/` (main) | 594,190,336 (current; first pass 57,606,144 — see variance) | ~0.55 GiB / 0.59 GB | 1,436 symlinks (pnpm); `.pnpm/` 593,862,656 |
| 6 | `.pnpm-store/` | 312,811,520 | 0.29 GiB / 0.31 GB | `v11/files` 304,529,408; project-local, git-ignored |
| 7 | `apps/` | 76,103,680 | 72.6 MiB | `apps/desktop` 68,345,856 incl. `src-tauri` 60,039,168 |
| 8 | `.swarm/` | ~66,719,744 | ~63.6 MiB | evidence/telemetry/runs; live-written (see §8) |
| 9 | `.opencode/` | 65,413,120 | 62.4 MiB | `node_modules/effect` 48,988,160 dominates |
| 10 | `supabase/` | 16,277,504 | 15.5 MiB | `.temp/smoke-027` 15,638,528 (ignored) |
| 11 | `.freebuff/` | 8,753,152 | 8.4 MiB | 1 worktree checkout |
| 12 | `docs/` | 1,392,640 | 1.3 MiB | + `docs/spec-v3.zip` 152,968 |
| 13 | `crates/` | 1,245,184 | 1.2 MiB | workspace Rust source is SMALL; bulk is `apps/desktop/src-tauri` |
| 14 | Top-level `*.md` reports (~150 files) | ~3,330,048 total | ~3.2 MiB | largest `PROGRESS.md` 1,308,506; untracked set listed in §8 |
| 15 | `services/` | 241,664 | 236 KiB | |
| 16 | `Soravo_Engineering_Docs_v6/` | 200,704 | 196 KiB | |
| 17 | `progress/` | 151,552 | 148 KiB | |
| 18 | `packages/` | 135,168 | 132 KiB | |
| 19 | `decisions/` | 126,976 | 124 KiB | |
| 20 | `tests/` | 86,016 | 84 KiB | |
| 21 | `.github/` | 45,056 | 44 KiB | |
| 22 | `test-results/` | 40,960 | 40 KiB | ignored, regenerable |
| 23 | `testsprite_tests/` | 12,288 | 12 KiB | + `tmp/mcp.log` |
| 24 | `tasks/`, `scripts/` | 8,192 each | 8 KiB | |
| — | TOTAL project allocated | 60,203,282,432 | 56.08 GiB / 60.20 GB | matches "≈60 GB" report |

Special-attention areas (all read-only, sizes allocated):
- `target/`: §4. `node_modules/`: main 594 MB (variance-flagged) + `g2-hotkey-rebind` 561,008,640 + `t10-commercial-model-gate` 24,424,448 + `apps/desktop/node_modules` 7.3 MB + `apps/website/node_modules` 6.3 MB.
- `.git/`: `objects/pack/pack-f80327….pack` 1,109,799,651 B (1.03 GiB) + `.idx` 1.2 MB; `count-objects`: 858 loose (36.36 MiB), 41,571 in-pack (1.03 GiB).
- Cargo registry/git caches are OUTSIDE the project: `~/.cargo` 2.7 GB (`registry` 2.5 GB, `git` 27 MB). Shared with other projects — excluded from all scenarios.
- Model/downloaded archives: single `*.gguf` in project (697.5 MiB), `dev-clean.tar.gz` (322.3 MiB, LibriSpeech corpus — `tar -tzf` lists `LibriSpeech/dev-clean/...flac`, NOT extracted anywhere; no `dev-clean/` or `LibriSpeech/` directory exists on disk).
- Playwright/browser artifacts: `~/.cache/ms-playwright` 658 MB (OUTSIDE project, shared); in-project `test-results/` + `playwright.config.ts` negligible; `supabase/.temp/smoke-027/pw-profile` 15 MB.
- Logs/temp/core: `*.log` hits are `supabase/.temp/smoke-027/step5_manual.log`, `testsprite_tests/tmp/mcp.log`, `.pnpm-store/t34o/ci-watch*.log`; `*.tmp` none material; NO `core*` dumps at depth ≤2; `target/**/deps/*.d` are build depfiles, not dumps.
- Hidden build dirs: `.pnpm-store/`, `.opencode/node_modules`, `.swarm/`, `.freebuff/` covered above. No other hidden giants.

## 4. Top 30 nested directories (`du -x --block-size=1`, bytes + human)

| # | Bytes | Human | Path |
|---|---|---|---|
| 1 | 35,830,607,872 | 33.37 GiB | `.swarm-worktrees/` |
| 2 | 21,537,640,448 | 20.06 GiB | `target/` |
| 3 | 18,391,048,192 | 17.13 GiB | `target/debug/` |
| 4 | 14,030,786,560 | 13.07 GiB | `.swarm-worktrees/t10-commercial-model-gate/` |
| 5 | 13,937,659,904 | 12.98 GiB | `.swarm-worktrees/t10-commercial-model-gate/target/` |
| 6 | 12,643,328,000 | 11.78 GiB | `.swarm-worktrees/parakeet-unified-impl/` |
| 7 | 12,575,006,720 | 11.71 GiB | `.swarm-worktrees/parakeet-unified-impl/target/` |
| 8 | 12,202,655,744 | 11.36 GiB | `target/debug/deps/` |
| 9 | 8,810,569,728 | 8.21 GiB | `.swarm-worktrees/g2-hotkey-rebind/` |
| 10 | 8,181,026,816 | 7.62 GiB | `.swarm-worktrees/g2-hotkey-rebind/target/` |
| 11 | 3,847,962,624 | 3.58 GiB | `target/debug/build/` |
| 12 | 2,843,811,840 | 2.65 GiB | `target/release/` |
| 13 | 2,606,485,504 | 2.43 GiB | `target/release/deps/` |
| 14 | 1,831,288,832 | 1.71 GiB | `target/debug/incremental/` |
| 15 | 1,154,588,672 | 1.08 GiB | `.git/` |
| 16 | 1,150,324,736 | 1.07 GiB | `.git/objects/` |
| 17 | 1,111,146,496 | 1.03 GiB | `.git/objects/pack/` |
| 18 | 561,008,640 | 535.0 MiB | `.swarm-worktrees/g2-hotkey-rebind/node_modules/` |
| 19 | 312,811,520 | 298.3 MiB | `.pnpm-store/` |
| 20 | 309,080,064 | 294.8 MiB | `.pnpm-store/v11/` |
| 21 | 304,529,408 | 290.4 MiB | `.pnpm-store/v11/files/` |
| 22 | 273,661,952 | 261.0 MiB | `target/x86_64-pc-windows-msvc/` (cross-compile) |
| 23 | 218,357,760 | 208.2 MiB | `target/release/build/` |
| 24 | 184,446,976 | 175.9 MiB | `.swarm-worktrees/r1-gap-023-adr032/` |
| 25 | 174,948,352 | 166.8 MiB | `.swarm-worktrees/r1-gap-023-adr032/target/` |
| 26 | 76,103,680 | 72.6 MiB | `apps/` |
| 27 | 68,345,856 | 65.2 MiB | `apps/desktop/` |
| 28 | 68,079,616 | 64.9 MiB | `.swarm-worktrees/r1-gap-023-wire/` (no target/, source-size worktree) |
| 29 | 66,719,744 | 63.6 MiB | `.swarm/` (`runs/` 9,609,216; `summaries/` ~7.9 MB; `session/` ~2.8 MB; `evidence/` ~2.7 MB) |
| 30 | 65,413,120 | 62.4 MiB | `.opencode/` (`node_modules/effect` 48,988,160) |
| — | 61,300,736 | 58.5 MiB | `.swarm-worktrees/t10-commercial-model-gate/apps/` (largest per-worktree source copy; mirrors main `apps/`) |

Further reference: `target/aarch64-apple-darwin/` 20,348,928; `target/clipboard-v5-typecheck` 9,609,216; `supabase/.temp` 15,638,528; small worktrees `t11b-gguf-benchmark` 12,210,176 / `recovery-evidence` 11,956,224 / `recovery-proof` 11,948,032 / `state-audit` 11,624,448 / `r1-gap-023-pr113-merge-record` 11,587,584 / `t10-r1-incident-audit` 11,300,864 / `t10-upstream-provenance-008` 11,763,712 / `r1-gap-021-desktop-auth` 9,375,744 / `type-001-native-insertion` 544,768 / `phase1-task1.1` + `phase1-task1.3-hotkeys` 540,672 each.

## 5. Top 50 individual files (`find . -xdev -type f -printf '%s'`, logical bytes + MiB)

Logical size; hardlinked pairs share storage (marked HL). `du` project total already de-duplicates them.

| # | Bytes | MiB | Path |
|---|---|---|---|
| 1 | 1,603,120,058 | 1528.9 | `.swarm-worktrees/t10-commercial-model-gate/target/debug/deps/libsoravo_desktop_lib.a` |
| 2 | 1,596,448,660 | 1522.5 | `.swarm-worktrees/parakeet-unified-impl/target/debug/libsoravo_desktop_lib.a` (HL with #3) |
| 3 | 1,596,448,660 | 1522.5 | `.swarm-worktrees/parakeet-unified-impl/target/debug/deps/libsoravo_desktop_lib.a` (HL with #2) |
| 4 | 1,594,185,132 | 1520.3 | `target/debug/libsoravo_desktop_lib.a` (HL with #5) |
| 5 | 1,594,185,132 | 1520.3 | `target/debug/deps/libsoravo_desktop_lib.a` (HL with #4) |
| 6 | 1,109,799,651 | 1058.4 | `.git/objects/pack/pack-f803270d42ad05aa0ab52095a02d92fdad26556a.pack` |
| 7 | 731,357,568 | 697.5 | `parakeet-unified-en-0.6b-Q8_0.gguf` (top-level, untracked) |
| 8 | 636,722,288 | 607.2 | `target/debug/soravo-desktop` (HL with #9) |
| 9 | 636,722,288 | 607.2 | `target/debug/deps/soravo_desktop-077c4965a8bced0e` (HL with #8) |
| 10 | 633,650,608 | 604.3 | `.swarm-worktrees/parakeet-unified-impl/target/debug/soravo-desktop` (HL with #11) |
| 11 | 633,650,608 | 604.3 | `.swarm-worktrees/parakeet-unified-impl/target/debug/deps/soravo_desktop-077c4965a8bced0e` (HL with #10) |
| 12 | 493,002,552 | 470.2 | `.swarm-worktrees/parakeet-unified-impl/target/debug/deps/soravo_desktop_lib-4b176d9529097c5f` |
| 13 | 487,181,776 | 464.6 | `.swarm-worktrees/t10-commercial-model-gate/target/debug/deps/soravo_desktop_lib-d81cee05063454f0` |
| 14 | 486,863,736 | 464.3 | `.swarm-worktrees/t10-commercial-model-gate/target/debug/deps/soravo_desktop_lib-4b176d9529097c5f` |
| 15 | 486,054,744 | 463.5 | `.swarm-worktrees/g2-hotkey-rebind/target/debug/deps/soravo_desktop_lib-4b176d9529097c5f` |
| 16 | 485,168,104 | 462.7 | `target/debug/deps/soravo_desktop_lib-4b176d9529097c5f` |
| 17 | 461,934,192 | 440.5 | `.swarm-worktrees/t10-commercial-model-gate/target/debug/deps/libsoravo_desktop_lib.so` |
| 18 | 459,863,336 | 438.6 | `.swarm-worktrees/parakeet-unified-impl/target/debug/libsoravo_desktop_lib.so` (HL with #19) |
| 19 | 459,863,336 | 438.6 | `.swarm-worktrees/parakeet-unified-impl/target/debug/deps/libsoravo_desktop_lib.so` (HL with #18) |
| 20 | 459,260,336 | 438.0 | `target/debug/libsoravo_desktop_lib.so` (HL with #21) |
| 21 | 459,260,336 | 438.0 | `target/debug/deps/libsoravo_desktop_lib.so` (HL with #20) |
| 22 | 394,692,376 | 376.4 | `target/release/deps/libsoravo_desktop_lib.a` |
| 23 | 337,926,286 | 322.3 | `dev-clean.tar.gz` (top-level, untracked, LibriSpeech corpus) |
| 24 | 236,186,054 | 225.2 | `.swarm-worktrees/t10-commercial-model-gate/target/debug/deps/libsoravo_desktop_lib.rlib` |
| 25 | 235,974,164 | 225.0 | `.swarm-worktrees/parakeet-unified-impl/target/debug/libsoravo_desktop_lib.rlib` (HL with #26) |
| 26 | 235,974,164 | 225.0 | `.swarm-worktrees/parakeet-unified-impl/target/debug/deps/libsoravo_desktop_lib.rlib` (HL with #25) |
| 27 | 234,439,742 | 223.6 | `target/debug/libsoravo_desktop_lib.rlib` (HL with #28) |
| 28 | 234,439,742 | 223.6 | `target/debug/deps/libsoravo_desktop_lib.rlib` (HL with #27) |
| 29 | 131,348,920 | 125.3 | `.swarm-worktrees/t10-commercial-model-gate/node_modules/.pnpm/@cloudflare+workerd-linux-64@1.20260915.1/.../bin/workerd` |
| 30 | 131,348,920 | 125.3 | `.swarm-worktrees/g2-hotkey-rebind/node_modules/.pnpm/.../bin/workerd` (copy of #29) |
| 31 | 131,348,920 | 125.3 | `node_modules/.pnpm/@cloudflare+workerd-linux-64@1.20260915.1/.../bin/workerd` (copy of #29) |
| 32 | 117,389,256 | 112.0 | `target/debug/deps/soravo_desktop-6f2005bab70fa5d8` |
| 33 | 99,242,800 | 94.6 | `.swarm-worktrees/t10-commercial-model-gate/target/debug/deps/benchmark-6c5e9edf3d7c92a9` |
| 34 | 99,219,112 | 94.6 | `target/debug/deps/benchmark-fbe908e043537f59` |
| 35 | 99,125,208 | 94.5 | `.swarm-worktrees/t10-commercial-model-gate/target/debug/deps/soravo_stt-358663eaf8cbd4d7` |
| 36 | 99,100,728 | 94.5 | `target/debug/deps/soravo_stt-b704c60481c79bc7` |
| 37 | 99,058,264 | 94.5 | `target/debug/deps/benchmark-b375ed8038e283dd` |
| 38 | 98,864,128 | 94.3 | `target/debug/deps/soravo_stt-3526639e108a7697` |
| 39 | 92,466,666 | 88.2 | `target/debug/deps/libort_sys-db1ea93e61f56b75.rlib` (+3 same-size siblings in main `deps/`) |
| 40 | 92,466,666 | 88.2 | `target/debug/deps/libort_sys-8573b9c6fb438bd2.rlib` (same size, separate inode) |
| 41 | 92,466,666 | 88.2 | `target/debug/deps/libort_sys-7042b2e8eae34ca7.rlib` (same size, separate inode) |
| 42 | 92,466,666 | 88.2 | `target/debug/deps/libort_sys-224d8604f9310333.rlib` (same size, separate inode) |
| 43 | 92,466,666 | 88.2 | `.swarm-worktrees/t10-commercial-model-gate/target/debug/deps/libort_sys-db1ea93e61f56b75.rlib` |
| 44 | 92,466,666 | 88.2 | `.swarm-worktrees/parakeet-unified-impl/target/debug/deps/libort_sys-db1ea93e61f56b75.rlib` |
| 45 | 92,466,666 | 88.2 | `.swarm-worktrees/parakeet-unified-impl/target/debug/deps/libort_sys-7042b2e8eae34ca7.rlib` |
| 46 | 92,466,666 | 88.2 | `.swarm-worktrees/g2-hotkey-rebind/target/debug/deps/libort_sys-db1ea93e61f56b75.rlib` |
| 47 | 91,811,092 | 87.6 | `target/release/deps/libort_sys-025c3c69f52530bf.rlib` |
| 48 | 91,807,216 | 87.6 | `target/debug/deps/gguf_benchmark-b413f0fab33c1551` |
| 49 | 90,973,392 | 86.8 | `target/debug/deps/t11a_raw_parakeet-adb6ab601cba1785` |
| 50 | 87,470,247 | 83.4 | `target/debug/build/transcribe-cpp-sys-e35f354d3280ba6a/out/build/ggml/src/ggml-vulkan/mul_mm.comp.cpp` (+5 same-size copies across `target*/build/transcribe-cpp-sys-*/…`, see §7) |

Largest NON-build files for context: `PROGRESS.md` 1,308,506; `Cargo.lock` 217,464; `pnpm-lock.yaml` 201,965; `MODEL_LICENSES.json` 53K + `MODEL_LICENSES.md` 8.2K (in parakeet worktree only); `silero_vad_v4.onnx` 1,807,522 (tracked resource); `libggml-vulkan.so` 34,295,792 (tracked transcribe-lib in worktree).

## 6. Complete worktree inventory (read-only: `worktree list --porcelain`, `status`, `rev-parse`, `branch`, `du -x`)

Current branch (main checkout): `fix/silero-asset-restore-2026-10-10` @ `fab10d47`, tracking `origin/fix/silero-asset-restore-2026-10-10`, NO local-only commits (empty `origin/branch..HEAD`). Status DIRTY (see §8).

| # | Worktree path | Branch / HEAD | Upstream / pushed? | Status | Size (B) | Build size (target/, B) | Unique / irreplaceable content |
|---|---|---|---|---|---|---|---|
| 0 | `.` (main) | `fix/silero-asset-restore-2026-10-10` / `fab10d47` | in sync with origin | DIRTY: 2 modified (`crates/stt/Cargo.toml`, `crates/stt/src/benchmark.rs`) + 25 untracked (19 reports, `.freebuff/`, `fixtures/`, 2 test files, gguf, tarball) | 60,203,282,432 (whole project) | 21,537,640,448 | ALL untracked items in §8 live ONLY here |
| 1 | `.swarm-worktrees/parakeet-unified-impl` | `recovery/parakeet-2026-10-10` / `cfcefb7c` | in sync with origin | 2 untracked (`T10-PARAKEET-UNIFIED-IMPL-020-REPORT.md`, `T11-PARAKEET-DEVCLEAN-SPEECH-021-REPORT.md`) | 12,643,328,000 | 12,575,006,720 | MODEL_LICENSES.json/md (license decisions, tracked on branch); 2 untracked reports; largest non-build: `transcribe-libs/libggml-vulkan.so` 34 MB |
| 2 | `.swarm-worktrees/t10-commercial-model-gate` | `feature/t10-commercial-recon-005` / `17f34870` | in sync with origin | 1 untracked (`T10-MOONSHINE-PILOT-EVIDENCE-015.md`) | 14,030,786,560 | 13,937,659,904 | 1 untracked evidence report |
| 3 | `.swarm-worktrees/g2-hotkey-rebind` | `feat/g2-hotkey-rebind-exposure` / `a3aef2ec` | in sync with origin | CLEAN | 8,810,569,728 | 8,181,026,816 | clean; `node_modules` 561 MB copy |
| 4 | `.swarm-worktrees/r1-gap-023-adr032` | `docs/r1-gap-023-macos-gap-closed` / `9fdef83d` | in sync with origin | 5 untracked dotfiles (`.pr-body-*.md`, `.risk-record.md`, `.self-review-032.md`) | 184,446,976 | 174,948,352 | 5 untracked review dotfiles |
| 5 | `.swarm-worktrees/r1-gap-023-wire` | `feature/r1-gap-023-wire-mirror` / `2520801b` | in sync with origin | CLEAN | 68,079,616 | none | clean source-size worktree |
| 6 | `.swarm-worktrees/t11b-gguf-benchmark` | `t11b/gguf-benchmark-harness` / `21601c65` | in sync with origin | CLEAN | 12,210,176 | none | benchmark harness branch (protected, §8) |
| 7 | `.swarm-worktrees/recovery-evidence-2026-10-10` | `recovery/evidence-2026-10-10` / `72da6425` | in sync with origin | CLEAN | 11,956,224 | none | recovery branch checkout (protected) |
| 8 | `.swarm-worktrees/recovery-proof-2026-10-10` | DETACHED / `fcb2baed` | n/a (detached) | CLEAN | 11,948,032 | none | detached evidence snapshot — do not infer push coverage |
| 9 | `.swarm-worktrees/state-audit-2026-10-09` | DETACHED / `82ec2ecc` (=`origin/main` PR #114) | n/a | 2 untracked (`STATE-AUDIT-2026-10-09-REPORT.md`, `T10-COMMERCIAL-GATE-EVIDENCE-020-REPORT.md`) | 11,624,448 | none | 2 untracked audit reports exist ONLY here |
| 10 | `.swarm-worktrees/t10-r1-incident-audit` | DETACHED / `18bc2133` | n/a | 1 untracked (`T10-R1-WORKTREE-INCIDENT-REPORT.md`) | 11,300,864 | none | 1 untracked incident report ONLY here |
| 11 | `.swarm-worktres/t10-upstream-provenance-008` | `feature/t10-upstream-provenance-recovery-008` / `f4a56b52` | NO upstream (local-only branch) | CLEAN | 11,763,712 | none | branch has no origin counterpart — locally unique until pushed |
| 12 | `.swarm-worktrees/r1-gap-023-pr113-merge-record` | `docs/r1-gap-023-pr113-merge-record` / `fe98eb16` | in sync with origin | CLEAN | 11,587,584 | none | merge-record checkout |
| 13 | `.swarm-worktrees/r1-gap-021-desktop-auth` | `r1-gap-021/desktop-auth` / `0d38eb4b` | behind `origin/main` by 24 (branch points at old `main`) | CLEAN | 9,375,744 | none | stale-looking (old base) but PRESERVED |
| 14 | `.swarm-worktrees/phase1-task1.1` | `phase1/task1.1-port-handy` / `83a506e8` | NO upstream | MASS-DELETED worktree (dozens of ` D` entries: CI workflows, desktop app files) | 540,672 | none | STALE-LOOKING; deletions are unstaged worktree state — unique state, must review before any action |
| 15 | `.swarm-worktrees/phase1-task1.3-hotkeys` | `phase1/task1.3-hotkeys` / `7eaea96f` | NO upstream | MASS-DELETED worktree (same pattern as #14) | 540,672 | none | STALE-LOOKING; same warning as #14 |
| 16 | `.swarm-worktrees/type-001-native-insertion` | `feature/type-001-native-insertion` / `d5a1f846` | upstream GONE (`[gone]`) | MASS-DELETED worktree | 544,768 | none | STALE-LOOKING; remote ref deleted — local branch is the only copy |
| 17 | `.freebuff/worktrees/02b2b77b-…` | `freebuff/task-t34-aa-…` / `3fa30be2` | no upstream shown | CLEAN (porcelain empty) | 8,753,152 | none | third-party worktree system — PRESERVED per instructions |

External (NOT inside project bytes, listed for completeness):
- `/home/maya/Desktop/soravo-r1-gap-023` — branch `main` @ `0d38eb4b`, a full sibling checkout (size not counted in §3).
- `/tmp/opencode/r1-gap-008-finalize` and `/tmp/opencode/r1-gap-021` — `git worktree list` reports "prunable: gitdir file points to non-existent location". Metadata remnants in `.git/worktrees/` (116 KB + 100 KB); checked-out dirs are already gone. `git worktree prune` was NOT run (audit-only).

Stale-looking (no removal performed): #13 (behind-24 base), #14/#15/#16 (mass-deletion worktree state, two with no upstream, one with gone upstream), detached #8/#9/#10, and the two prunable `/tmp` metadata ghosts.

## 7. Duplicate-data findings (verified read-only; no hashes computed on >500 MB files to avoid disk load)

1. **Hardlinks (shared storage, verified by `stat` inode+nlink):** `target/debug/libsoravo_desktop_lib.a` ≡ `target/debug/deps/libsoravo_desktop_lib.a` (inode 2514052, nlink 2, 1.59 GB stored ONCE); same pattern for `.so`/`.rlib` pairs and `soravo-desktop` binaries. `find target -links +1` additionally shows hardlinked `incremental/*.o` objects. Consequence: logical file-size sums overstate disk use; `du` (which de-duplicates) is authoritative — allocated figures in §3/§4 are already correct.
2. **Independent `target/` builds (NOT shared):** main 21.54 GB + parakeet 12.58 GB + t10-commercial 13.94 GB + g2 8.18 GB + adr032 0.17 GB = 56.41 GB across 5 trees. Different dependency fingerprints coexist (e.g. `soravo_desktop_lib-4b17…` vs `-d81c…`), so these are genuinely independent compilations, not links. Each regenerates via `cargo build` but at multi-GB / long-rebuild cost.
3. **Same-size copies (separate inodes, treated as copies — content hash NOT verified to avoid load):** `libort_sys-*.rlib` 92,466,666 B ×8 across 4 trees; `@cloudflare/workerd` 131,348,920 B ×3 across main + 2 worktree `node_modules`; `mul_mm.comp.cpp` 87,470,247 B ×6 across `build/transcribe-cpp-sys-*/…`. Deleting one tree does not affect the others.
4. **No reflinks:** ext4 cannot reflink; no snapshot/dedupe layer found. "Apparent duplicates" are real copies except the hardlink pairs in (1).
5. **Models/archives:** exactly ONE `*.gguf` in the project (`parakeet-unified-en-0.6b-Q8_0.gguf`, 731,357,568 B, top-level). No second copy, no extracted copy. `dev-clean.tar.gz` (337,926,286 B) has NO extracted `dev-clean/` or `LibriSpeech/` directory — tarball is the only copy. `docs/spec-v3.zip` (152,968 B) is the only zip.
6. **Caches shared with other projects:** `~/.cargo` (2.7 GB: registry 2.5 GB + git 27 MB) and `~/.cache/ms-playwright` (658 MB) live OUTSIDE the project and are shared system-wide — excluded from every scenario. Project-local `.pnpm-store/` (312.8 MB) is project-owned (git-ignored) and safe to reason about independently.
7. **Source duplication across worktrees:** each of the 16 worktrees carries a full source checkout (~9–68 MB of `apps/`+reports each). Small vs build outputs; the 3 giant worktrees additionally duplicate `apps/` (~59–61 MB each). Negligible next to their `target/` trees.

## 8. Local-only and irreplaceable data warnings (loss = difficult/impossible recovery)

**Dirty worktree data (uncommitted, unpushed):**
- Main: `M crates/stt/Cargo.toml`, `M crates/stt/src/benchmark.rs` — modified source with NO local-only commits above upstream (work itself is the diff).
- Phase1/type-001 worktrees: mass `D` (deleted-but-unstaged) state — the deletions ARE the worktree state; rebuilding the worktree from the branch would NOT reproduce them.

**Untracked + NOT git-ignored (all local-only; `git check-ignore` returns empty for them):**
- Main top-level: `parakeet-unified-en-0.6b-Q8_0.gguf` (697.5 MiB — required by `crates/stt/tests/t11a_raw_parakeet.rs` + `gguf_benchmark.rs`); `dev-clean.tar.gz` (322.3 MiB — LibriSpeech corpus); 19 `*-REPORT.md` files (~150 KB total, listed in `git status`); `crates/stt/tests/fixtures/{audio/3×.wav,ground_truth/3×.txt}` (tiny, hand-made T11A fixtures); `crates/stt/tests/gguf_benchmark.rs`; `crates/stt/tests/t11a_raw_parakeet.rs`.
- Parakeet worktree: `T10-PARAKEET-UNIFIED-IMPL-020-REPORT.md`, `T11-PARAKEET-DEVCLEAN-SPEECH-021-REPORT.md`.
- T10-commercial worktree: `T10-MOONSHINE-PILOT-EVIDENCE-015.md`.
- ADR032 worktree: 5 dotfiles (`.pr-body-*.md`, `.risk-record.md`, `.self-review-032.md`).
- Detached `state-audit-2026-10-09`: `STATE-AUDIT-2026-10-09-REPORT.md`, `T10-COMMERCIAL-GATE-EVIDENCE-020-REPORT.md`.
- Detached `t10-r1-incident-audit`: `T10-R1-WORKTREE-INCIDENT-REPORT.md`.

**Model/licensing decisions:** `MODEL_LICENSES.json` (53 KB) + `MODEL_LICENSES.md` (8.2 KB) exist ONLY in `.swarm-worktrees/parakeet-unified-impl/` on branch `recovery/parakeet-2026-10-10` (tracked there and pushed to `origin/recovery/parakeet-2026-10-10`). They do NOT exist in the main checkout. Deleting that worktree checkout would remove the only working-copy copy (remote branch would remain, but local access would be gone).

**Recovery branches (verified, unchanged):** all four exist locally AND on `origin` at identical SHAs — `recovery/r1-t22-worktree-2026-10-10` `3bc65eda`, `recovery/parakeet-2026-10-10` `cfcefb7c`, `recovery/evidence-2026-10-10` `72da6425`, `t11b/gguf-benchmark-harness` `21601c65`. BUT: a remote branch does NOT contain untracked files — the untracked reports/fixtures above are NOT covered by pushing branches. Do not treat "pushed" as "everything safe".

**Secrets (paths/sizes only, contents never read):** `services/license-api/.env.local` (274 B, IGNORED via `.gitignore:.env.*`, untracked — local secret, loss breaks local runs); `services/license-api/.env.example` (966 B, tracked); `apps/website/.env.example` (1,213 B, tracked).

**Live evidence:** `.swarm/` (66.7 MB: `runs/`, `evidence/`, `session/`, telemetry) is being written NOW by the running OpenCode process — excluded from all scenarios.

**Single-copy fail-closed list (do NOT include in any scenario without explicit review):** the `.gguf`, the tarball, all untracked reports/fixtures, `.env.local`, detached-worktree reports, phase1 mass-deletion state, `.git/` (1.15 GB incl. 1.03 GB pack + 1.9 MB worktree metadata — object DB cannot be regenerated from working copies alone).

## 9. Cleanup estimates (estimates only — NOTHING was deleted)

Legend: REGENERABLE_BUILD_OUTPUT (RBO) / REGENERABLE_CACHE (RC) / REDOWNLOADABLE_MODEL_OR_ARTIFACT (RMA) / TRACKED_SOURCE (TS) / LOCAL_ONLY_SOURCE_OR_EVIDENCE (LOSE) / DIRTY_WORKTREE_DATA (DWD) / GIT_OR_WORKTREE_METADATA (GWM) / UNKNOWN_REQUIRES_REVIEW (URR).

### Scenario A — Conservative (clearly regenerable build outputs only): ~56,406,282,240 B (~52.54 GiB / 56.41 GB)

| Path | Bytes | Class | Reclaim certainty | Rebuild cost |
|---|---|---|---|---|
| `target/` | 21,537,640,448 | RBO | Certain on ext4 (no reflinks) | Full `cargo build` + release + cross-targets; hours on this machine |
| `.swarm-worktrees/parakeet-unified-impl/target/` | 12,575,006,720 | RBO | Certain | Same; parakeet feature build |
| `.swarm-worktrees/t10-commercial-model-gate/target/` | 13,937,659,904 | RBO | Certain | Same; largest single tree |
| `.swarm-worktrees/g2-hotkey-rebind/target/` | 8,181,026,816 | RBO | Certain | Same |
| `.swarm-worktrees/r1-gap-023-adr032/target/` | 174,948,352 | RBO | Certain | Small rebuild |
| TOTAL A | 56,406,282,240 | | Space recovery certain; `du -x` already de-duplicates hardlinks | |

Verification before deletion: `git status --short` in main + each of the 4 worktrees shows no output under `target/` (all `target/` paths are git-ignored — confirmed in `.gitignore`); record `HEAD` SHAs; confirm no process holds open files under `target/` (`lsof` showed only `.swarm/` handles). Mixed-category risk: NONE inside these paths (pure build output; largest non-build file nearby is 34 MB `libggml-vulkan.so` OUTSIDE `target/` — untouched).

### Scenario B — Moderate (A + individually verified disposable caches/generated artifacts): +~1,508,073,472 B (~1.40 GiB / 1.51 GB); running total ~57,914,355,712 B (~53.95 GiB)

| Path | Bytes | Class | Reclaim certainty | Cost to recreate |
|---|---|---|---|---|
| `.pnpm-store/` | 312,811,520 | RC (project-local) | Certain | `pnpm install` (network) |
| `node_modules/` (main) | 594,190,336 (re-verify; first pass read 57 MB — active-write variance) | RC | Certain if re-verified just before deletion | `pnpm install` (network) |
| `.swarm-worktrees/g2-hotkey-rebind/node_modules/` | 561,008,640 | RC | Certain | `pnpm install` in that worktree |
| `.swarm-worktrees/t10-commercial-model-gate/node_modules/` | 24,424,448 | RC | Certain | `pnpm install` in that worktree |
| `supabase/.temp/` | 15,638,528 | RC (ignored) | Certain | Supabase CLI regenerates |
| `test-results/` + `testsprite_tests/` | 53,248 | RC | Certain | Test rerun |
| TOTAL B increment | 1,508,073,472 | | Certain after re-`du` (variance note) | |

EXCLUDED from B (ownership/impact not fully understood): `~/.cargo` 2.7 GB, `~/.cache/ms-playwright` 658 MB (shared, outside project); `.opencode/node_modules` 65 MB (tool runtime — leave); `.swarm/` (live evidence); `.git/` (metadata).

### Scenario C — Aggressive but controlled (B + redundant downloaded artifacts ONLY after source/evidence preserved elsewhere): +~1,069,283,854 B (~1.00 GiB / 1.07 GB); running total ~58,983,639,566 B (~54.94 GiB)

| Path | Bytes | Class | Prerequisites (ALL required) | Risks |
|---|---|---|---|---|
| `dev-clean.tar.gz` | 337,926,286 | RMA | Confirm LibriSpeech URL archived; confirm `crates/stt/tests/fixtures/` (tiny, hand-made) is backed up — it is NOT derived from the tarball (no `dev-clean/` dir on disk; tests reference fixtures, tarball is corpus stock) | Re-download ~322 MB on next STT corpus need; public corpus, no credentials |
| `parakeet-unified-en-0.6b-Q8_0.gguf` | 731,357,568 | RMA→LOSE until proven (treat as local-only) | Confirm exact download URL + checksum recorded SOMEWHERE DURABLE (not found in main checkout — only `MODEL_LICENSES.*` in parakeet worktree); back up file off-disk first; confirm `MODEL_LICENSES.json/md` preserved | Re-download 698 MB + license re-verification; STT tests (`t11a_raw_parakeet`, `gguf_benchmark`) fail without it; licensing gate evidence chain breaks if MODEL_LICENSES lost |
| TOTAL C increment | 1,069,283,854 | | | |

NOT in C: worktree checkout removal (would destroy untracked reports + mass-deletion state + MODEL_LICENSES working copies); `.git` pack; `.swarm/`; `.env.local`; detached-worktree reports; anything classified LOSE/DWD/GWM/URR/TS.

Post-all-scenarios residue ≈ 1.2 GB (tracked source ~150 MB + `.git` 1.15 GB + `.swarm` 67 MB + `.opencode` 65 MB + reports 3 MB) plus excluded external caches.

## 10. Recommended cleanup order (lowest risk first)

1. **Scenario A, smallest first:** `r1-gap-023-adr032/target` (167 MB) → validate procedure, then `g2/target` (8.2 GB) → `parakeet/target` (12.6 GB) → `t10-commercial/target` (13.9 GB) → main `target/` (21.5 GB) LAST (main is the active checkout; rebuild blocks all work). Re-`du` each path immediately before removal (variance observed).
2. **Scenario B caches:** `supabase/.temp` → `test-results`/`testsprite_tests` → `.pnpm-store` → per-worktree `node_modules` → main `node_modules` last (re-verify the 57 MB vs 594 MB discrepancy first).
3. **Scenario C only after §8 backups:** archive `dev-clean.tar.gz` + `.gguf` + all untracked reports/fixtures + `.env.local` + `MODEL_LICENSES.*` to durable off-disk storage, record model URLs/checksums, THEN consider the two artifact removals. Never remove worktree checkouts as a "cleanup" step.

## 11. Exact commands for later use (NOT executed — quoted for review only)

Pre-verification (read-only, run first):
```
df -h . ; df -i . ; du -x -sh target .swarm-worktrees/parakeet-unified-impl/target .swarm-worktrees/t10-commercial-model-gate/target .swarm-worktrees/g2-hotkey-rebind/target .swarm-worktrees/r1-gap-023-adr032/target
git status --short --branch
git -C .swarm-worktrees/parakeet-unified-impl status --short --branch
git -C .swarm-worktrees/t10-commercial-model-gate status --short --branch
git -C .swarm-worktrees/g2-hotkey-rebind status --short --branch
git -C .swarm-worktrees/r1-gap-023-adr032 status --short --branch
git check-ignore -v target .swarm-worktrees/parakeet-unified-impl/target node_modules .pnpm-store supabase/.temp
lsof +D .swarm 2>/dev/null | head
ls -lh parakeet-unified-en-0.6b-Q8_0.gguf dev-clean.tar.gz
```

Scenario A (run ONLY after §10 step-1 verification; one path at a time; re-`du` first):
```
rm -rf .swarm-worktrees/r1-gap-023-adr032/target
rm -rf .swarm-worktrees/g2-hotkey-rebind/target
rm -rf .swarm-worktrees/parakeet-unified-impl/target
rm -rf .swarm-worktrees/t10-commercial-model-gate/target
rm -rf target
```

Scenario B (run ONLY after A + re-verification of the node_modules variance):
```
rm -rf supabase/.temp test-results testsprite_tests/tmp
rm -rf .pnpm-store
rm -rf .swarm-worktrees/g2-hotkey-rebind/node_modules .swarm-worktrees/t10-commercial-model-gate/node_modules
rm -rf node_modules
```

Scenario C (run ONLY after off-disk backup + URL/checksum recording):
```
mkdir -p /path/to/DURABLE-backup && cp -a parakeet-unified-en-0.6b-Q8_0.gguf dev-clean.tar.gz services/license-api/.env.local crates/stt/tests/fixtures /path/to/DURABLE-backup/
# then only:
rm -f dev-clean.tar.gz
rm -f parakeet-unified-en-0.6b-Q8_0.gguf
```

NEVER run: `git clean`, `git reset`, `git gc`, `git worktree prune`, `git worktree remove`, anything under `.git/`, anything under `.swarm/`, or removal of whole worktree directories.

## 12. Confirmation

- No files were created (except this report), modified, deleted, moved, renamed, truncated, compressed, pruned, rebuilt, reinstalled, or had permissions changed during this audit. All inspection used read-only commands (`df`, `du -x`, `find -printf`, `stat`, `ls`, `tar -tzf`, `git status/rev-parse/branch/log/check-ignore/ls-files/count-objects/cherry`, `lsof`, `ps`, `cat .gitignore`).
- The two `/tmp/opencode` prunable worktree entries were left untouched (no `git worktree prune`).
- `.swarm-worktrees/` fully preserved (all 16 worktrees intact, including mass-deletion-state and detached ones).
- Secret values never printed (only paths/sizes/ignore-status for `.env*`).
- Symlinks were not followed for accounting (`-xdev` used on `find`; `du -x` used throughout; no double-counting across filesystems; hardlink pairs identified by inode rather than summed twice).

## Verdict

**`REQUIRES MANUAL REVIEW BEFORE CLEANUP`**

Rationale: the filesystem is 96% full (5.1 GB free) so cleanup is urgent, and Scenario A (~56.4 GB of pure `target/` output) is technically certain — but the project contains dirty source diffs, 25+ untracked local-only files (698 MB model + 322 MB corpus + evidence reports + hand-made fixtures), detached worktrees with single-copy reports, mass-deletion worktree states, a branch-local-only licensing record, an ignored `.env.local` secret, live `.swarm/` writes, and an unresolved 10× `node_modules` measurement variance. Review §8 backups and §10 order before authorizing any deletion.
