# Build-Artifact Cleanup Candidate Ranking — 2026-10-10T06:03:50Z (READ-ONLY)

Scope: rank only. Nothing deleted, modified, cleaned, pruned, or rebuilt. No guard bypass attempted.
Baseline: free space remeasured `1.3G avail, 99% full` (`/dev/sda3` 108G); project root
`/home/maya/Desktop/Soravo_Engineering_Specification_v2` (57G); worktree inventory matches all three prior
reports (14 worktrees + external `soravo-r1-gap-023` + 2 absent `/tmp/opencode/*` stubs).

## Shared preconditions (all candidates)
- No Rust toolchain activity: `ps` shows no `cargo`/`rustc`/`sccache`/`rust-analyzer`; no `.cargo-lock`
  in any examined `target/`; no `.cargo/config.toml` in root or any worktree; `CARGO_TARGET_DIR` empty →
  every target dir is a SEPARATE, non-redirected Cargo output dir. Deleting one never touches another's.
- `git ls-files <target>` = 0 tracked files for main + all three worktree targets; all covered by
  `.gitignore:6:target/` → untracked generated output, never source.
- Every target carries `CACHEDIR.TAG`; top levels contain only standard Cargo entries
  (`debug|release`, `build`, `deps`, `examples`, `incremental`, `resources`, binaries, `.rustc_info.json`).

## Candidate 1 — main `target/debug/incremental` — 2.9G — RANK #1 (safest; OWNER-EXECUTED ONLY)
- Absolute path: `/home/maya/Desktop/Soravo_Engineering_Specification_v2/target/debug/incremental`
  (124 session dirs, e.g. `soravo_audio-*`, `benchmark-*`; contents are `query-cache.bin`,
  `dep-graph.bin`, `work-products.bin`, `*.lock` — pure incremental-compilation cache).
- Exclusively generated: YES (highest confidence of the five — no binaries, no fixtures, no strays).
- Mixed valuables: NONE found (`find` for non-cache file types returns only cache internals).
- References: no active process, no lock file, no config redirection.
- Owner: main worktree, branch `feature/r1-gap-021-desktop-auth` @`18bc2133`, dirty (41 porcelain lines of
  active auth work — none of it inside `incremental/`).
- Rebuild cost: regenerates lazily on next `cargo build` (slower next build); needs ~3G transient —
  UNSAFE with 1.3G free, so no rebuild may follow until space is freed by other means.
- Data-loss risk: NONE. Recommended owner action: owner runs `rm -rf target/debug/incremental` directly
  (agent execution guard blocks this path; do not bypass).

## Candidate 2 — main `target/release` — 2.7G — RANK #2 (REQUIRES OWNER REVIEW)
- Absolute path: `.../target/release` (standard `build/deps/examples/incremental/soravo-desktop*`).
- Exclusively generated: HIGH confidence — top-level listing shows Cargo-standard entries only; the `.json`
  files present are `.fingerprint` internals.
- Mixed valuables: none found; but release binaries are the only optimized builds on disk — cannot verify
  nobody relies on the existing binaries for manual testing.
- References: no active process. Owner: same dirty main worktree as Candidate 1.
- Rebuild cost: full `cargo build --release`, the most expensive rebuild per byte of the five; multi-GB
  transient — UNSAFE now. Data-loss risk: LOW (regenerable) but rebuild-cost risk HIGH.
- Action: owner approval required; prefer Candidate 1 first.

## Candidate 3 — `r1-gap-023-wire` target — 7.6G (incremental 552M) — RANK #3 (REQUIRES OWNER REVIEW)
- Absolute path: `.../.swarm-worktrees/r1-gap-023-wire/target`
  (`CACHEDIR.TAG`, `.rustc_info.json`, `tmp/` (empty), `debug/{build,deps,examples,incremental,resources}`).
- Exclusively generated: HIGH confidence — extension sweep finds only `.rustc_info.json` + fingerprint
  `.json` (Cargo-internal); no `.gguf`/`.onnx`/audio/reports/models.
- Mixed valuables: NONE found.
- References: no locks/processes; separate target confirmed.
- Owner: worktree `r1-gap-023-wire`, branch `feature/r1-gap-023-wire-mirror` @`2520801b`, CLEAN (0 status
  lines) — cleanest parent of the three worktree candidates.
- Rebuild cost: full debug rebuild, ~8G transient — UNSAFE now. Data-loss risk: NONE for the target itself;
  approval risk is workflow (isolated-worktree preservation rule), not content.
- Action: owner confirms `r1-gap-023-wire-mirror` inactive, then cleans.

## Candidate 4 — `t10-commercial-model-gate` target — 13G (incremental 2.7G) — RANK #4 (REQUIRES OWNER REVIEW)
- Absolute path: `.../.swarm-worktrees/t10-commercial-model-gate/target` (same standard layout as #3).
- Exclusively generated: HIGH confidence — same clean sweep (only Cargo-internal `.json`).
- Mixed valuables: NONE found.
- References: no locks/processes; separate target confirmed.
- Owner: worktree `t10-commercial-model-gate`, branch `feature/t10-commercial-recon-005` @`17f34870`,
  1 untracked file (`T10-MOONSHINE-PILOT-EVIDENCE-015.md`, lives OUTSIDE `target/`, unaffected).
  Note: same commit as parakeet-impl's branch — twin checkouts; confirm neither side needs the cache.
- Rebuild cost: ~13G transient — highest absolute rebuild, UNSAFE now.
- Action: owner confirms branch quiescent (both twins), then cleans. Ranked below #3 despite larger size
  because of twin-branch coupling and larger rebuild.

## Candidate 5 — `parakeet-unified-impl` target — 12G (incremental 1.7G) — RANK #5 (REQUIRES OWNER REVIEW)
- Absolute path: `.../.swarm-worktrees/parakeet-unified-impl/target` — standard Cargo layout PLUS
  `target/devclean-test/LibriSpeech/dev-clean/{1272,2277,...}` (**5.9M** extracted speech fixture).
- Exclusively generated: NO — this target mixes harness scratch into the Cargo dir (the only candidate
  that fails the exclusivity test).
- The 5.9M scratch IS documented-regenerable: `T11-PARAKEET-DEVCLEAN-SPEECH-021-REPORT.md` §4/§7 states it
  is "retained at handoff; safe to delete" and gives re-extraction resume steps from the preserved root
  `dev-clean.tar.gz` (which must NOT be deleted). `transcription.rs` consumes it only via the
  `SORAVO_DEVCLEAN_FLAC` env var at test time (test is `--ignored`, skips when audio absent).
- References: no locks/processes. Owner: worktree `parakeet-unified-impl`, branch
  `feature/parakeet-unified-en06b-impl` @`17f34870`, DIRTY (6 modified tracked incl. `transcription.rs`,
  `model*.rs`, `commercial.rs` + 2 untracked reports) — actively-worked branch.
- Rebuild cost: ~12G transient — UNSAFE now. Data-loss risk of full-target deletion: LOW content-wise but
  HIGH workflow-wise (deletes handoff-retained scratch on a dirty branch against standing worktree rules).
- Action: at most the documented 5.9M scratch, owner-executed, after confirming the handoff consumer is
  done; full 12G only after the branch is quiescent AND owner accepts the rebuild.

## Verdict
- **No candidate is safe for autonomous agent deletion.** Candidate 1 is content-safe but execution-guard
  blocked; Candidates 2–5 require explicit owner approval (dirty/clean worktree parents, rebuild costs).
- **Safest high-value recommendation for OWNER action: Candidate 1** (main `target/debug/incremental`,
  2.9G, zero data-loss risk, smallest rebuild). Expected yield ~2.9G → ~4.2G free: enough to resume
  development headroom but still NOT enough to safely rebuild any debug target — state that explicitly.
- **Rebuild safety: NONE of the five can be rebuilt safely at 1.3G free.** Every rebuild path (even the
  ~3G incremental regeneration) exceeds available space. Do not start any rebuild or the dictation test
  until the owner frees space and free space is remeasured.
- Suggested owner sequence: (1) owner deletes main `incremental` (2.9G); (2) remeasure; (3) confirm
  `r1-gap-023-wire-mirror` inactive → clean 7.6G; (4) confirm both `t10` twins quiescent → clean 13G;
  (5) parakeet scratch 5.9M only when handoff consumer done; (6) remeasure before ANY build.
