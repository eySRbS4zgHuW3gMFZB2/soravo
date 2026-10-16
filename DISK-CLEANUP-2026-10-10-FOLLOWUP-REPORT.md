# Disk-Space Cleanup Follow-up Report — 2026-10-10T05:59:26Z

Prior reports read before acting: `DISK-CLEANUP-2026-10-10-AUDIT-REPORT.md`,
`DISK-CLEANUP-2026-10-10-REPORT.md`. All size figures below were remeasured;
prior figures treated as historical until re-confirmed.

## 1. Before-and-after free space (measured)
- Before (this session): `/dev/sda3` 108G total, 102G used, **1.3G avail, 99% full**.
- After (this session): `/dev/sda3` 108G total, 102G used, **1.3G avail, 99% full**.
- Net change: **0 bytes reclaimed**. No estimates claimed.

## 2. Actual space reclaimed per operation
| Operation | Result (measured) |
|-----------|-------------------|
| Candidate A `target/debug/incremental` removal | **0 bytes — BLOCKED by execution guard** (see §4) |
| Candidate B `pnpm store prune` | **0 bytes — NOT RUN** (shared global store; owner approval required, see §4) |
| Candidate C worktree targets | **0 bytes — NOT TOUCHED** (owner approval required by standing instructions) |
| Candidate D `git worktree prune` | **0 bytes — NOT RUN** (authorization not established; prune reclaims ~nothing anyway, see §4) |
| **Total** | **0 bytes** |

## 3. Exact commands and results
1. `pwd` → `/home/maya/Desktop/Soravo_Engineering_Specification_v2` (project root confirmed).
2. `df -h / /home/maya/Desktop` → 1.3G avail, 99% full (matches prior reports).
3. `du -sh . target .swarm-worktrees .git` → **57G / 22G / 34G / 1.1G** (matches prior reports).
4. `ps aux | grep -Ei 'cargo|rustc|pytest|vitest|jest|pnpm|npm|node|tauri'` → only OpenCode desktop host + system services; **no cargo/rustc/test/package-manager processes**.
5. `ls target/.cargo-lock` → absent (no cargo contention).
6. Candidate A pre-checks: `ls -ld target/debug/incremental` → exists, 124 entries; `du -sh` → **2.9G**;
   `git ls-files target/debug/incremental` → empty (untracked); `git check-ignore -v` → `.gitignore:6:target/`;
   `CARGO_TARGET_DIR` empty; no `.cargo/config.toml` → separate (not shared/redirected) target confirmed;
   no active process using it (step 4 + no lock file).
7. `rm -rf target/debug/incremental` → **BLOCKED**: `Recursive delete target "target/debug/incremental" is not an
   allowlisted build/cache artifact.` Per non-bypass rule the operation was stopped; no alternative deletion
   mechanism attempted. Directory verified still present afterwards (`ls -ld` + `du -sh` → 2.9G).
8. `which pnpm; pnpm --version; pnpm store path` → pnpm 11.17.0, store
   `/home/maya/.local/share/pnpm/store/v11` (GLOBAL, outside project).
9. `pnpm store status` → `Packages in the store are untouched`; `du -sh` → global store **595M**,
   project `.pnpm-store/` **299M**. Prune NOT run (see §4).
10. `du -sh` worktree targets → parakeet-unified-impl **12G**, t10-commercial-model-gate **13G**,
    r1-gap-023-wire **7.6G**, r1-gap-023-adr032 176M. No deletions.
11. `ls -ld /tmp/opencode/r1-gap-008-finalize /tmp/opencode/r1-gap-021` → **both absent from filesystem**;
    `git worktree list --porcelain` still lists both as `prunable gitdir file points to non-existent location`.
    `git worktree prune` NOT run (see §4).
12. Canonical check: `03_AI_INSTRUCTIONS.md` authority §2 → `security/safety` first; no rule found authorizing
    guard bypass or blanket cache deletion.
13. Verification: `df`, `du`, `ls -lh parakeet*.gguf dev-clean.tar.gz`, per-worktree `git -C … status`,
    `git worktree list`, `ps` → §5/§6.

No `git clean`, `git reset --hard`, checkout, commit, push, merge, branch switch, `cargo clean`,
source modification, process termination, or action outside the project.

## 4. Operations blocked by guards or owner-approval requirements
- **Candidate A (2.9G incremental): guard-blocked.** Deletion was authorized by this task's Phase 2A *if
  permitted by the execution environment*; the environment refused. Stopped that operation; no bypass,
  no equivalent deletion via another tool, no broader `cargo clean` (explicitly forbidden).
- **Candidate B (pnpm): owner approval required — prune NOT run.** The active store is global/shared
  (`/home/maya/.local/share/pnpm/store/v11`, 595M), so pruning reaches outside this project and affects
  other projects' caches and future downloads. `store status` reports packages untouched (no evidence of
  reclaimable garbage). The project-local `.pnpm-store/` (299M) was not inspected for safe CLI handling
  beyond sizing; blanket removal is forbidden. Decision: stop, report.
- **Candidate C (worktree targets ~32.6G): owner approval required — untouched.** Standing instructions
  require explicit approval; several parent worktrees are dirty/active (see §5).
- **Candidate D (stale worktree records): NOT pruned.** Both `/tmp/opencode/*` directories are genuinely
  absent (gitdir targets non-existent), so the records are genuinely stale; however pruning was not
  established as authorized by project rules, and pruning admin records would reclaim ~0 bytes (contents
  already gone). Decision: stop, report.

## 5. Worktree status before → after (unchanged)
`git worktree list --porcelain` identical to prior reports: main `18bc2133
[feature/r1-gap-021-desktop-auth]` + 13 linked worktrees + external
`/home/maya/Desktop/soravo-r1-gap-023 [main]` + 2 prunable `/tmp/opencode/*` stubs.
Dirty/untracked line counts (`git -C … status --porcelain=v1 | wc -l`), before = after:
main **41** (39 original + 2 prior cleanup reports now present as untracked), parakeet-unified-impl **8**,
t10-commercial-model-gate **1**, r1-gap-023-wire **0**, r1-gap-021-desktop-auth **0**,
r1-gap-023-adr032 **5**, state-audit-2026-10-09 **2**, t10-r1-incident-audit **1**,
t10-upstream-provenance-008 **0**, type-001-native-insertion **187** (untouched per rule 5).
No branch, HEAD, or dirty-status change from this session.

## 6. Preserved files and worktrees
 intact with identical sizes/mtimes: `parakeet-unified-en-0.6b-Q8_0.gguf` (698M),
`dev-clean.tar.gz` (323M), `target/t33p-scratch` (untouched per rule 6),
`apps/desktop/src-tauri/transcribe-libs/` (18 entries), both prior cleanup reports,
all 14 worktrees, `.git/` (1.1G), `.swarm/`, `.freebuff/`, source, configs, `node_modules/`,
`supabase/.temp/`. No build/test/agent process interrupted (pre/post `ps` confirms none running).

## 7. Ranked next cleanup candidates (sizes remeasured; risks stated; approval required)
1. `.swarm-worktrees/t10-commercial-model-gate/target` — **13G**. Parent worktree clean (1 untracked evidence
   file). Risk: MEDIUM-HIGH — same commit as parakeet-impl branch; rebuild ~13G transient; confirm no agent
   will resume this branch before cleaning.
2. `.swarm-worktrees/parakeet-unified-impl/target` — **12G**. Parent DIRTY (6 tracked modifications + 2
   untracked reports) → Risk: HIGH — active transcription work; cleaning forces expensive rebuild and could
   disrupt in-flight agent state. Owner must confirm quiescence.
3. `.swarm-worktrees/r1-gap-023-wire/target` — **7.6G**. Parent clean. Risk: MEDIUM — confirm wire-mirror
   branch inactive before cleaning.
4. `target/debug/incremental` (main) — **2.9G**. Ignored/regenerable/separate/no active user; Risk if run by
   owner: LOW content risk, but rebuild needs ~3G transient on a 99%-full disk — free space must be confirmed
   first. Blocked for agents by execution guard; owner runs `rm -rf target/debug/incremental` directly.
5. `target/release` (main) — **2.7G**. Risk: MEDIUM — full release rebuild expensive; approve explicitly.
6. Global pnpm store `/home/maya/.local/share/pnpm/store/v11` — **595M** — Risk: LOW-MEDIUM but cross-project;
   `pnpm store prune` only with owner approval; expected yield likely small (status: untouched).
7. `.pnpm-store/` (project-local) — **299M** — Risk: UNKNOWN contents handling; CLI-only, owner approval.
8. `target/x86_64-pc-windows-msvc` — **261M** — Risk: LOW-MEDIUM; cross-compile artifacts, confirm no
   Windows-release task needs them.
9. Stale `/tmp/opencode/*` git records — **~0 bytes** yield; authorize `git worktree prune` for hygiene only.

## 8. Rebuild safety assessment
**Insufficient free space to safely attempt a Rust/Tauri rebuild.** 1.3G free cannot accommodate the
multi-GB transient of any `target/debug` regeneration (10G+ for full debug; ~3G even for incremental-only).
No rebuild, test, GUI launch, or dictation test performed or resumed in this task — stopping here per
instructions. Next step is owner approval of one or more §7 candidates, executed by the owner where the
execution guard requires it, followed by remeasurement before any build is attempted.
