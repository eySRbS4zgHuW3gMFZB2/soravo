# RESUME_FIRST — Soravo VM Preservation Checkpoint (read this before any dev work)

> Preservation checkpoint created 2026-10-16 (UTC) during GitHub-only
> preservation before eventual VM deletion. This file was ADDED by the
> preservation task; it does not replace PROGRESS.md or progress/STATUS.md.
> Preservation is NOT release approval. The product is NOT release-ready.

## Project

- Repository: https://github.com/eySRbS4zgHuW3gMFZB2/soravo (PUBLIC, default branch `main`)
- Local canonical checkout at preservation time:
  `/home/maya/Desktop/Soravo_Engineering_Specification_v2`
  (treat as historical context, not a required future path)

## Verified SHAs (2026-10-16, UTC)

- `origin/main`: `33d3d4c56e2cf029835d774e47df7cbd8611dbf4`
- Primary checkout branch `r1-overlay-settings` HEAD: `9cec3eed92f28a29d6163c0dffafe2369039720c`
  (1 commit ahead of `origin/main`; no upstream configured; working tree dirty
  exactly as snapshotted on the preservation branch below)

## Preservation branches (all NEW refs, no history rewritten)

- `preservation/checkpoint-20261016-r1-overlay-settings-worktree`
  commits: working-tree tracked snapshot (`cb692750`-era) + 22 local evidence
  reports + 3 STT test files + 6 fixtures + all-10-stash exports +
  this file + preservation report. Verify remote SHA after push (see report).

## Where to resume

1. Read this file, then `PROGRESS.md` (canonical status), then
   `progress/STATUS.md` and `progress/NEXT.md` (interruption protocol).
2. Authority hierarchy: `01_PRD.md`, `02_TDD.md`, `09_SECURITY_BASELINE.md`,
   `11_INTERRUPTION_HANDOFF.md`, `14_ENVIRONMENT_AND_SECRETS.md`,
   `docs/Soravo_Engineering_Docs_v6/` (canonical docs), `10_ADR_INDEX.md`.
3. State-audit and chain-of-custody rules in the v6 docs still apply.
4. Open PRs at preservation time (13 OPEN, verified via `gh`): #133 (release
   reproducible packaging), #124/#123/#122 (dependabot cargo/npm),
   #117 (Silero asset restore), #116 (GGUF benchmark harness), #115 (T10
   commercial license recon — merge state DIRTY/CONFLICTING, unresolved),
   #71/#59/#45/#43/#41/#40 (dependabot). Do NOT merge as part of resuming;
   re-verify each PR head/base before acting.
5. Known blockers carried forward, NOT reopened here: model licensing gate
   (PR #115: 0/69 cleared, fail-closed); installer redistribution
   restrictions; no signing/updater/payment credentials assumed; no live
   payment/signed-installer/updater/install/upgrade/runtime acceptance
   claimed. Initial model remains Parakeet Unified EN 0.6B Q8_0 only.

## Next safe development step (from current evidence, not invented)

- Re-verify the preservation branches pushed 2026-10-16 (fetch + SHA check),
  then continue R1 overlay-settings verification and pill/dup-insertion
  integration testing exactly as recorded in `PROGRESS.md` tail and the
  `test/r1-*` branches. Do not start release packaging or close licensing
  gates without fresh evidence and owner approval.

## What was preserved / excluded / left unresolved

- Preserved on GitHub: primary HEAD commit + full tracked working-tree
  snapshot + 22 evidence reports + STT tests/fixtures + 10 stash exports.
- Intentionally excluded: `parakeet-unified-en-0.6b-Q8_0.gguf` (731357568 B,
  SHA-256 `4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795`;
  source `https://huggingface.co/handy-computer/parakeet-unified-en-0.6b-gguf`,
  CC-BY-4.0, NVIDIA base — re-download, PR #115 still unresolved),
  `LibriSpeech/` test-clean subset (358 MB, CC-BY-4.0, re-download from
  OpenSLR), `dev-clean.tar.gz` (322 MB generated archive, recreatable),
  `services/license-api/.env.local` (sensitive), build caches / target /
  node_modules (recreatable).
- See `docs/preservation/GITHUB_PRESERVATION-2026-10-16.md` for the full
  inventory, verification results, and any unresolved items.

## WARNING

VM-deletion safety is decided ONLY by the final status in the preservation
report. If the report says NOT READY or BLOCKED, do NOT treat the VM as
disposable. Preservation does NOT mean the product is release-ready.
