# Disk Reclaim Audit — 2026-10-10T05:54:06Z (read-only, Phase 1)

Project root: `/home/maya/Desktop/Soravo_Engineering_Specification_v2`
Filesystem: `/dev/sda3` 108G total, 102G used, **1.3G avail (99% full)**.
Project size (`du -sh .`): **57G**.

## Canonical instructions inspected
- `03_AI_INSTRUCTIONS.md` §§1-6 (authority: safety > AI instructions > ADRs > TDD > PRD > plan; first-action reads; skill gate).
- `11_INTERRUPTION_HANDOFF.md` (STATUS/NEXT/ENVIRONMENT checkpoint files; never leave half-migrations, deleted working code, uncommitted dep changes unexplained).
- `14_ENVIRONMENT_AND_SECRETS.md` (gitignored secrets; platform stores; least-privilege MCP).
- Prior art: `STORAGE-CLEANUP-001-REPORT.md` (2026-09-28: target/ was 56G, cleaned), `T10-F-STORAGE-CLEANUP-REPORT.md` (56.5G freed then; rebuild has since regrown), `T11-POST-CLEANUP-STATE-AUDIT-REPORT.md` (post-cleanup verification pattern).

## Running processes (could use artifacts)
- `ps aux | grep -Ei 'cargo|rustc|rust-analyzer|sccache'`: **none running**.
- `ps aux | grep -Ei 'pytest|vitest|jest|next|vite|tauri|playwright|tsc'`: **none running**.
- Only host: OpenCode desktop (Electron, this session host) + geoclue agent. No build/test child using `target/`.
- `target/.cargo-lock`: absent. No cargo lock contention observed.

## Measured sizes (`du -sh`, no symlink follow)
- `target/`: **22G** (debug 19G: deps 10G, build 3.6G, incremental 2.5–2.9G, libsoravo_desktop_lib.a 1.5G, .so 438M, .rlib 224M; release 2.7G; x86_64-pc-windows-msvc 261M; aarch64-apple-darwin 20M; tmp 4K; t33p-scratch 12K; clipboard-v5-typecheck 8.4M)
- `.swarm-worktrees/`: **34G** (t10-commercial-model-gate 14G, parakeet-unified-impl 12G, r1-gap-023-wire 7.6G, r1-gap-023-adr032 176M, rest ≤12M each)
- `.git/`: **1.1G**
- `node_modules/`: **55M**; `.pnpm-store/`: **299M**; `.freebuff/`: **8.4M**; `.swarm/`: **63M** (summaries 7.1M, evidence 2.6M)
- `parakeet-unified-en-0.6b-Q8_0.gguf`: **698M** (2026-10-09 20:56)
- `dev-clean.tar.gz`: **323M compressed / 346M uncompressed** (LibriSpeech dev-clean speech fixture)
- `apps/`: 71M; `crates/`: 608K; `docs/`: 1.4M; `supabase/`: 16M (of which `.temp/` 15M); `test-results/`: 40K; `testsprite_tests/`: 12K
- `apps/desktop/src-tauri/transcribe-libs/`: **53M** (libggml*, libtranscribe.so.0.2, built Oct 10 11:10 — fresh, needed for dictation test)
- `apps/desktop/dist/`: 312K; `apps/website/dist/`: 668K; `packages/payment-domain/dist/`: 52K

## Worktrees (`git worktree list`)
- MAIN: `/home/.../Soravo_Engineering_Specification_v2` @18bc2133 branch `feature/r1-gap-021-desktop-auth` — **DIRTY (39 porcelain lines: 22 modified/deleted tracked + 17 untracked incl. auth work, gguf, dev-clean.tar.gz)**. MUST PRESERVE.
- `.freebuff/worktrees/02b2b77b-...` @3fa30be2 — clean per `git -C` status (no output). Has report file. PRESERVE.
- `.swarm-worktrees/parakeet-unified-impl` @17f34870 — **DIRTY** (6 modified tracked + 2 untracked reports). Target 12G. PRESERVE.
- `.swarm-worktrees/phase1-task1.1`, `phase1-task1.3-hotkeys` — exist; small (528K each, no separate target measured → likely share nothing / nascent).
- `.swarm-worktrees/r1-gap-021-desktop-auth` @0d38eb4b — clean. PRESERVE.
- `.swarm-worktrees/r1-gap-023-adr032` — untracked `.pr-body*`, `.risk-record.md`, `.self-review-032.md`. PRESERVE.
- `.swarm-worktrees/r1-gap-023-pr113-merge-record` — clean. PRESERVE.
- `.swarm-worktrees/r1-gap-023-wire` @2520801b — **DIRTY** (1 untracked evidence md). Target 7.6G. PRESERVE.
- `.swarm-worktrees/state-audit-2026-10-09` (detached) — untracked 2 reports. PRESERVE.
- `.swarm-worktrees/t10-commercial-model-gate` @17f34870 — clean. Target 13G. PRESERVE (same commit as parakeet-impl but different branch; shares no target).
- `.swarm-worktrees/t10-r1-incident-audit` (detached @18bc2133) — untracked incident report. PRESERVE.
- `.swarm-worktrees/t10-upstream-provenance-008` — clean. PRESERVE.
- `.swarm-worktrees/type-001-native-insertion` — **HEAVILY DIRTY** (mass deletions of tracked files). PRESERVE, DO NOT TOUCH.
- External `/home/maya/Desktop/soravo-r1-gap-023` [main] + 2 prunable `/tmp/opencode/*` entries (gitdir points to non-existent location; outside project — NOT acting on them per rule 8).

## Cargo target sharing
- `CARGO_TARGET_DIR` env: **empty**. No `.cargo/config.toml` in root nor in the 3 large worktrees. → **Each worktree target/ is SEPARATE, not shared/redirected.** Cleaning MAIN `target/` therefore does not delete worktree outputs, and vice versa. Still, worktree targets are NOT cleanup candidates without owner approval (active/dirty agent state).

## Ignored vs valuable (`git status --ignored`, `.gitignore`)
- Ignored: `target/`, `node_modules/`, `.pnpm-store/`, `.swarm-worktrees/`, `.swarm/`, `apps/*/dist/`, `apps/*/node_modules/`, `transcribe-libs/`, `supabase/.temp/`, `test-results/`, `testsprite_tests/`, `services/license-api/.env.local`, `*.log`.
- `git ls-files target | wc -l` = **0**; `git check-ignore` confirms `target/debug`, `target/release` ignored. → main `target/` contents are generated, untracked.
- Largest files are duplicated `libsoravo_desktop_lib.a` (1.5G each ×3 worktrees+main), `soravo-desktop` binaries (~604M), `deps/soravo_desktop-*` (~604M) — i.e., the same Rust workspace rebuilt per-worktree.

## `.swarm-worktrees/` composition
- Bulk is per-worktree `target/debug` (12G + 13G + 7.6G). Remainder: source checkouts + untracked reports/logs/agent state. No `.cargo` redirection. No model-copy duplication found in worktrees (gguf lives only at root; `.onnx` deleted from main per dirty status, provenance reports preserved).

## `dev-clean.tar.gz`
- Contents: LibriSpeech dev-clean fixture (flac + trans.txt). Referenced by `apps/desktop/src-tauri/src/managers/transcription.rs` (parakeet worktree) and `T11-PARAKEET-DEVCLEAN-SPEECH-021-REPORT.md`. **REQUIRED for future testing. DO NOT DELETE (per task rule 9).** PRESERVE.

## Parakeet model (698M)
- Root `parakeet-unified-en-0.6b-Q8_0.gguf` referenced by `apps/desktop/src-tauri/src/catalog/catalog.json` (+ reports). No duplicate `.gguf` found elsewhere in project (`find -type f ( -name *.gguf -o -name *.onnx )` only matches root after deletions; silero `.onnx` shows as deleted-not-present in main). Each copy status: single root copy, referenced, active test asset. **PRESERVE. DO NOT DELETE.**

## Phase 2 classification (summary; full table in final cleanup report)
- SAFE GENERATED OUTPUT (untracked, regenerable, no active user): MAIN `target/debug/incremental` (~2.5G), `target/tmp`, `target/t33p-scratch`.
- PRESERVE: `.git/`, all worktrees + their `target/`s, source, `parakeet*.gguf`, `dev-clean.tar.gz`, `transcribe-libs/`, reports/handoffs, `.swarm/`, `.freebuff/`, configs, `node_modules/` (small, needed), `supabase/.temp/` (ambiguous CLI state), dist/ (tiny).
- REQUIRES OWNER APPROVAL: any worktree `target/` (incl. their `incremental/` 1.7G/2.7G), `.pnpm-store/` blanket removal (CLI prune only), full `target/debug` or `cargo clean`, `target/release`, cross-compile dirs.
