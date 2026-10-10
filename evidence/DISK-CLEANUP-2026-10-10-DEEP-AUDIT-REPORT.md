# SORAVO Deep Disk-Space Recovery Audit — 2026-10-10T06:23:22Z (READ-ONLY)

No deletion, prune, build, test, or modification performed. One new file created: this report
(deliverable). Prior reports treated as historical; every figure below remeasured this session.
Labels: VERIFIED = directly measured/read; INFERRED = reasoned from evidence; UNKNOWN = could not
establish read-only; BLOCKED = refused by guard/policy.

## 1. Disk-space baseline (VERIFIED)
- Filesystem `/dev/sda3`: 108G total, 102G used, **1.3G avail, 99% full** (`df -h`, unchanged all sessions).
- Project root (VERIFIED via `pwd`): `/home/maya/Desktop/Soravo_Engineering_Specification_v2` = **57G**.
  (File manager shows 60.4G — INFERRED unit/accounting variance: 698 MiB = 732 MB matches its "731 MB"
  for the GGUF exactly, so its figures are MB-apparent vs `du` MiB-blocks; `du` used throughout.)
- Largest children (VERIFIED): `.swarm-worktrees/` **34G**, `target/` **22G**, `.git/` **1.1G**,
  GGUF **698M**, `dev-clean.tar.gz` **323M**, `.pnpm-store/` **299M**, `apps/` 71M, `.swarm/` 63M,
  `transcribe-libs/` 53M, `node_modules/` 25M (prior 55M — UNKNOWN 30M variance, NOT claimed as freed),
  `supabase/` 16M (incl. `.temp/` 15M), `crates+docs+services+packages+tests+progress+decisions` <4M total.

## 2. Worktree inventory & preservation status (VERIFIED via `worktree list --porcelain` + per-worktree `status`)
| Worktree | Branch / HEAD | Status | Must preserve |
|---|---|---|---|
| main root | `feature/r1-gap-021-desktop-auth` @`18bc2133` | DIRTY 44 lines (22 modified/deleted tracked auth work + 22 untracked incl. GGUF, archive, 5 audit reports) | active feature work |
| parakeet-unified-impl | `feature/parakeet-unified-en06b-impl` @`17f34870` | DIRTY 8 (6 modified: MODEL_LICENSES×2, commercial.rs, model*.rs, transcription.rs + 2 reports) | active transcription work |
| t10-commercial-model-gate | `feature/t10-commercial-recon-005` @`17f34870` | 1 untracked: `T10-MOONSHINE-PILOT-EVIDENCE-015.md` (VERIFIED: 113-line license-provenance evidence report — valuable, lives OUTSIDE target/) | evidence file |
| r1-gap-023-wire | `feature/r1-gap-023-wire-mirror` @`2520801b` | CLEAN | — |
| r1-gap-023-adr032 | `docs/r1-gap-023-macos-gap-closed` @`9fdef83d` | 5 untracked PR-body/risk/self-review notes | handoff notes |
| state-audit-2026-10-09 (detached @`82ec2ecc`) | — | 2 untracked audit reports | reports |
| t10-r1-incident-audit (detached @`18bc2133`) | — | 1 untracked incident report | report |
| type-001-native-insertion | `feature/type-001-native-insertion` @`d5a1f846` | DIRTY 187 lines (mass deletions) — DO NOT TOUCH | explicit constraint |
| r1-gap-021-desktop-auth, pr113-merge-record, t10-upstream-provenance-008, phase1-task1.1/.3-hotkeys, freebuff wt, external soravo-r1-gap-023 | various | clean or trivial | — |
| 2× `/tmp/opencode/*` stubs | prunable, gitdirs point to non-existent paths | dirs absent from filesystem (VERIFIED) | prune = 0 bytes, needs auth |

## 3. Cargo target audit (VERIFIED sizes; sharing VERIFIED independent)
Sharing evidence: `CARGO_TARGET_DIR` empty, no `.cargo/` dir anywhere, no `target/.cargo-lock` in ANY
target, no symlinks at any target top level, no cross-worktree hardlinks (the one nlink=2 pair,
parakeet's 1.5G `.a`, shares inode 3019379 between `debug/` and `debug/deps/` INSIDE one target —
`du` already counts once). No `cargo`/`rustc`/test/packaging processes running (only OS applets +
OpenCode host). → Deleting any one target cannot affect another (VERIFIED); rebuild interference is
workflow-level (branch activity), not mechanical.
| Candidate (absolute path) | Size | Only regenerable output? | Active use? | Rebuild peak (INFERRED) | Confidence / gate |
|---|---|---|---|---|---|
| `target/debug/incremental` | **2.9G** (124 session dirs; bins+locks only) | YES — highest | none | ~3–4G transient | VERIFIED safe content; **BLOCKED agent-side** (3rd guard refusal) → owner runs it |
| `target/release` | **2.7G** (standard; `release/incremental` 4K) | HIGH (fingerprints only) | none | full `--release` rebuild, multi-GB | owner approval (costliest/byte) |
| `.../r1-gap-023-wire/target` (incr **552M**) | **7.6G** | HIGH (only Cargo-internal `.json`) | none; parent CLEAN | ~8G | owner confirms branch inactive |
| `.../t10-commercial-model-gate/target` (incr **2.7G**, deps **8.2G**) | **13G** | HIGH (only Cargo-internal `.json`) | none; twin commit `17f34870` shared with parakeet branch | ~13G | owner confirms BOTH twins quiescent |
| `.../parakeet-unified-impl/target` (incr **1.7G** + `devclean-test` **5.9M**) | **12G** | NO — mixes 5.9M harness scratch | none; parent DIRTY/active | ~12G | owner only; scratch separately documented safe |
| `.../r1-gap-023-adr032/target` | **167M** | UNKNOWN (not content-swept; small) | none | ~0.2G | owner confirms docs branch done |
| `target/{x86_64-pc-windows-msvc 261M, aarch64-apple-darwin 20M}` | 281M | INFERRED cross-compile outputs | none | re-cross-compile | owner confirms no pending release task |

Parakeet sensitivity (VERIFIED): modified sources + 2 reports + `devclean-test/LibriSpeech` (52 files)
all present. Regenerability of the scratch VERIFIED against the archive: `dev-clean.tar.gz` holds 2703
flac incl. the exact referenced `1272-128104-0012.flac`, and its report documents the scratch as "safe
to delete" with re-extract/resume steps; the consuming test is `--ignored` and skips when audio absent.
Root archive + single project `.gguf` (no duplicates; silero `.onnx` absent-by-deletion with provenance
reports kept) are PRESERVE regardless.

## 4. Dependencies, caches & other files (VERIFIED sizes; no pruning performed)
- Cargo registry `/home/maya/.cargo/registry` **2.5G** — GLOBAL shared across machine's Rust projects;
  safest method `cargo cache --autoclean` (tool presence UNKNOWN) or registry `src/` prune; Phase C only.
- pnpm global store `/home/maya/.local/share/pnpm/store/v11` **595M** — GLOBAL shared; `store status` =
  untouched; Phase C only. Project `.pnpm-store/` **299M** — purpose/layout UNKNOWN (active store path is
  global); removal method UNKNOWN → Phase C with inspection first.
- `node_modules` 25M + nested ~14M — lockfiles present (`pnpm-lock.yaml`, `Cargo.lock`, workspaces file);
  safely reinstallable (INFERRED) but trivial yield → not worth the churn; no action proposed.
- `supabase/.temp` 15M (CLI state, gitignored, contents UNKNOWN) / `transcribe-libs` 53M (fresh
  dictation-test libs) / dist outputs ~1M / `test-results` 40K — PRESERVE or negligible; no action.
- Docker/Podman: NEITHER installed (VERIFIED) — no images/volumes to consider.
- Deleted-but-open: only pipewire memfds (~2K, audio subsystem) — irrelevant, no space held.
- Byte-identical duplicates: NOT verified by hashing (INFERRED duplicates: twin-commit `17f34870`
  checkouts each rebuilt ~identical dep trees → the 12G+13G overlap is the systemic duplication; no
  dedup proposed — rebuild-cost risk exceeds benefit).

## 5. Systemic causes (INFERRED from VERIFIED evidence)
1. One full Rust workspace rebuild per worktree with zero target sharing → 4 debug targets ≈ 45G+ for
   (mostly) the same dependency graph; twin branches at identical commit double-pay 25G.
2. `cargo build` artifacts accumulate incrementally (`STORAGE-CLEANUP-001`: 56G in 2026-09-28; regrown
   to 22G+34G within 12 days) with no retention policy.
3. No `sccache`/shared-compilation cache, no `CARGO_TARGET_DIR` strategy, no worktree-retirement habit.
Feasible preventions (NOT implemented): per-worktree target dirs with `CARGO_TARGET_DIR` kept but
incremental-cache pruning cadence; `sccache` for shared compiled deps; retiring twin/merged worktrees
after owner sign-off; keeping extracted fixtures OUTSIDE `target/` (parakeet lesson). Sharing ONE live
target dir across concurrent branch worktrees is NOT feasible (cargo dir locking + feature-flag
poisoning would break isolation).

## 6. Recoverable-space estimates & post-step free space (current free: 1.3G)
- CONSERVATIVE (incremental-caches only, all owner-approved): 2.9 + 2.7 + 1.7 + 0.55 ≈ **7.9G** → ~9G free.
- OPTIMISTIC (whole worktree targets + main incremental + adr032 target + scratch): 13 + 12 + 7.6 + 0.167
  + 2.9 + 0.006 ≈ **35.7G** → ~37G free. Phase C shared caches (+2.5 + 0.6 + 0.3 ≈ 3.4G) would add only
  with cross-project risk — excluded from both estimates.
- Rebuild headroom (INFERRED from observed 19G debug tree): full `cargo build` peak ≈ existing tree +
  multi-GB transient → require **≥10G free** before full rebuild; incremental-regenerating build needs
  **≥5G free**. NEITHER condition holds today.

## 7. Phased cleanup plan (commands PROPOSED ONLY — not executed)
- **Phase A — low-risk regenerable caches** (gate: owner runs in own terminal; agent guard BLOCKED):
  `rm -rf target/debug/incremental` (≈2.9G). Then `df -h` must show ~4.2G before anything else.
- **Phase B — per-worktree build outputs** (gate: PER-WORKTREE explicit owner approval after confirming
  branch inactive; narrow-first): `rm -rf .swarm-worktrees/r1-gap-023-wire/target/debug/incremental`
  (552M) → full `.../r1-gap-023-wire/target` (7.6G); `.../t10-commercial-model-gate/target/debug/incremental`
  (2.7M…G) → full `.../t10-commercial-model-gate/target` (13G, twin-gate);
  `.../parakeet-unified-impl/target/debug/incremental` (1.7G) → `.../target/devclean-test` (5.9M,
  documented safe) → full target (12G) last; `.../r1-gap-023-adr032/target` (167M). NEVER `cargo clean`
  (would hit the wrong/shared scope) and NEVER remove a worktree source dir as a shortcut.
- **Phase C — shared caches** (gate: explicit approval + cross-project impact accepted):
  `pnpm store prune` (global; likely small yield); cargo registry clean via `cargo cache --autoclean`
  or versioned `registry/src` pruning; `.pnpm-store/` only after identifying its manager.
- **Phase D — structural** (gates: design review): incremental-cache cadence, `sccache` evaluation,
  twin-worktree retirement policy, fixtures-outside-`target/` rule. No implementation in this task.

## 8. Approval gates & verification checklist
Gates: G1 this report reviewed; G2 owner runs Phase A + remeasures; G3 per-worktree approvals (wire →
t10-twins → parakeet, each with branch-inactivity confirmation); G4 Phase C cross-project acceptance.
Checklist after each phase: `df -h` recorded; `git worktree list --porcelain` unchanged (except intended
retirements); per-worktree `status` counts unchanged; GGUF/archive/reports present with same sizes;
`target/devclean-test` state as intended; no new `cargo` activity; free space ≥5G (incremental rebuild)
or ≥10G (full rebuild) before any build; dictation test stays off until headroom VERIFIED.
