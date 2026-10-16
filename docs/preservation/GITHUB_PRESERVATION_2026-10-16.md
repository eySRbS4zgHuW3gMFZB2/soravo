# GitHub Preservation Report — 2026-10-16 (VM-deletion readiness)

## Final status: READY FOR VM DELETION

Every valuable, non-recreatable item found on the VM is now preserved on
GitHub and remotely verified. Every excluded item is either sensitive
(never uploaded) or safely recreatable from a documented, hash-pinned,
live-checked canonical source. No push failures, no permission blocks,
no history rewrites, no deletions of original state.

READY here means *recoverable after VM deletion*. It does NOT mean the
product is release-ready. PR #115 (model legal/provenance) is still open,
installer/payment/signing gates are still closed, and no acceptance test
is claimed as passed. See RESUME_FIRST.md.

## 1. Repository and worktree inventory (Stage A, 2026-10-16 pre-change)

- Canonical checkout: `/home/maya/Desktop/Soravo_Engineering_Specification_v2`
- Remote: `https://github.com/eySRbS4zgHuW3gMFZB2/soravo` (PUBLIC, default `main`)
- `origin/main` at inventory: `33d3d4c56e2cf029835d774e47df7cbd8611dbf4`
- Primary branch `r1-overlay-settings` HEAD `9cec3eed92f28a29d6163c0dffafe2369039720c`
  (1 commit ahead of `origin/main`, no upstream, working tree dirty: 37
  tracked modifications/deletions, 0 staged).
- ~45 registered worktrees/branches inspected: 40+ under `.swarm-worktrees/`
  (all checked CLEAN except the primary), 1 `.freebuff` checkout (8.4 MB),
  4 external entries (`/home/maya/soravo-r1-gap-023`, 3× `/tmp/...`) whose
  directories were ALREADY ABSENT before this task (pre-existing stale
  metadata; left untouched, NOT pruned). Their branch tips are all
  recoverable from GitHub (same-SHA remote refs or merged into `main`).
- 10 local stashes (`stash@{0}`..`stash@{9}`), all retained (none dropped).
- 13 open PRs verified live: #133, #124, #123, #122, #117, #116, #115, #71,
  #59, #45, #43, #41, #40. PR #115 head `17f34870`, state OPEN,
  mergeable CONFLICTING — unresolved, not touched.

## 2. Local branches and stash preservation status

- `git branch --merged origin/main` covered the large majority of local
  branches (recoverable via `main`).
- Every unmerged tip WITHOUT an identical remote ref was pushed to a NEW
  `preservation/checkpoint-20261016-*` branch (20 total, §4). No existing
  branch was modified, no force-push, no merge of any PR.
- All 10 stashes exported: tracked diffs as `preservation/stashes/stash-N.patch`
  (stash@{6} is untracked-only — its 14 crate stubs preserved as files;
  stash@{2} untracked file verified byte-identical to a tracked repo file;
  stash@{9} untracked part is node_modules/pnpm cache junk, excluded).
  Original stashes NOT dropped; staged/unstaged per-hunk separation is the
  one distinction not reproducible from patches (documented in commit message).

## 3. Local-only files and evidence inventory

- Preserved at original paths on the preservation branch: 22 untracked root
  audit/benchmark/diagnosis reports (~250 KB total), 3 STT integration tests
  (`gguf_benchmark.rs`, `librispeech_tier_a.rs`, `t11a_raw_parakeet.rs`),
  6 T11a fixture files (3 WAV + 3 ground-truth TXT). All secret-scanned clean.
- Excluded, sensitive: `services/license-api/.env.local` (gitignored secrets).
- Excluded, recreatable: `node_modules`, `target/`, `.pnpm-store`, `.swarm/`,
  `.opencode/`, `test-results/`, `dev-clean.tar.gz` (322 MB generated archive
  of OpenSLR dev-clean — re-downloadable, §5).
- Excluded by policy (never uploaded to Git): model `.gguf` + `LibriSpeech/`
  (§5). `.freebuff/` checkout dir: duplicate of committed objects, excluded.

## 4. Preservation branches and verified remote SHAs

Main branch (4 commits on top of `9cec3eed`, independent clone-verified):

| Branch | Verified remote SHA |
|---|---|
| `preservation/checkpoint-20261016-r1-overlay-settings-worktree` | `cc59b9b87ff9262569ceed551f9335b24f79f371` |

Tip-preservation branches (remote SHA == pushed local SHA via `ls-remote`):

| Branch | Remote SHA |
|---|---|
| `...-feat-r1-overlay-settings` | `029fe23ed4a1d19ef83ebe9cd8eb525d8511edcf` |
| `...-test-r1-overlay-settings-gaps` | `8a1f53f52da618c9a44927c9c568914cdef9840a` |
| `...-test-r1-overlay-full-integration` | `b4240bfeeeca1c0592380b9cef09cb006d2be686` |
| `...-test-r1-overlay-live-integration` | `a11750b45a21cbe06560790380085debeff2eef6` |
| `...-test-r1-pill-dup-integration` | `1e019ac98d1199912e30d06277ff400c7b613b3c` |
| `...-test-r1-settings-pill-integration` | `393de70e0c09cae1d8f6952c082e451360f307d5` |
| `...-t10-upstream-provenance` | `f4a56b52abb50deae27c039335050d4cc9043f25` |
| `...-typing-linux-helper-timeout` | `16b069fa17c3cd0da7fa983f06c6737ed88049ee` |
| `...-razorpay-payments` | `bfbffc8d9f4aa7ca970f48244f921c38df57c030` |
| `...-t10-commercial-model-gate` | `df4f9d6d5761bc1cbdd1dd07bbae6f6ebc180eda` |
| `...-type-clean` | `b774141db22370f3c2b2e2a8515622c218d38194` |
| `...-audio-capture-001` | `740c3786421db8ff73a8641c4d2b4799ac782781` |
| `...-handy-fork-feasibility` | `05478757be2ee008eff69e292948f9db92fd9e33` |
| `...-spec-v3-handy-foundation` | `98fdb679f1195b7c3faf7097889eb19f27918bad` |
| `...-desktop-account-foundation` | `021a723dd0d175de251f05a113b6a499282165cf` |
| `...-cloud-009-skeleton` | `9cbea872b817a7ef940c8cb13fd7b1aa2a6f385d` |
| `...-handy-migration-001` | `d58e46b25f11fcad2f2e63852056daf421c3142d` |
| `...-handy-foundation-audit` | `702350d16628f65b72160a53164637da2e6af3f5` |
| `...-stt-foundation` | `573c5f823fff92a75b94fa11c486bc17cb913873` |

(`...` = `preservation/checkpoint-20261016`; full ref list: 20 refs.)

## 5. Remote verification results

- `git ls-remote`: all 20 refs present with EXACT expected SHAs.
- GitHub API: `RESUME_FIRST.md` readable at the preservation branch;
  tree listing confirms reports, tests, stash patches present.
- Independent clone (`/tmp/soravo-verify-20261016`, kept): HEAD
  `cc59b9b87ff9262569ceed551f9335b24f79f371`, ancestry
  `cc59b9b8 > 49cc21dd > 9aff4458 > cb692750 > 9cec3eed`, files readable
  (`RESUME_FIRST.md`, all stash exports, reports, tests).
- This report is committed on the same branch AFTER the above checks; its
  commit was pushed and re-verified via `ls-remote` + API (see §8).

## 6. Large assets and reproducibility findings

- `parakeet-unified-en-0.6b-Q8_0.gguf`: 731,357,568 bytes (expected
  731357568 ✓), SHA-256
  `4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795` ✓.
  NOT uploaded (policy). Canonical source LIVE-CHECKED 2026-10-16:
  `https://huggingface.co/handy-computer/parakeet-unified-en-0.6b-gguf`
  lists `parakeet-unified-en-0.6b-Q8_0.gguf` at 731 MB. Retrieval:
  download that file, verify size + SHA-256 above.
  LICENSE NOTE: the live HF page states **NVIDIA Open Model License**,
  contradicting the repo's older `cc-by-4.0` note — PR #115 stays
  unresolved; owner/legal review required before any redistribution.
- `LibriSpeech/` (358 MB extracted test-clean): NOT uploaded (policy).
  Canonical source LIVE-CHECKED 2026-10-16: OpenSLR SLR12
  (`http://www.openslr.org/12`), CC BY 4.0, `test-clean.tar.gz` [346M],
  `dev-clean.tar.gz` [337M]. Local `dev-clean.tar.gz` (322.3 MiB = 338 MB)
  matches the OpenSLR dev-clean archive; local `LibriSpeech/` matches
  extracted test-clean. Retrieval: download from OpenSLR SLR12 mirrors.
- Neither asset was downloaded, moved, or modified during this task.

## 7. Secret / sensitive-data exclusions (values never recorded)

- `services/license-api/.env.local` (Razorpay TEST placeholder + secrets):
  excluded, left in place. Staged diffs, 22 reports, 9 stash patches, and
  stash-6 stubs scanned for private keys/tokens/AWS patterns: zero matches.
- No credentials, SSH config, or env dumps were committed or printed.

## 8. Push / permission / licensing / size issues

- None. All 20 pushes created NEW branches; no force-push; repository
  stayed PUBLIC with protections untouched (no visibility/protection change
  was ever attempted). No approval bypass (no PR merged).
- This report's own commit: pushed to the existing preservation branch as a
  fast-forward (no rewrite), remote SHA re-fetched and noted in the final
  handoff message.

## 9. Unresolved items that would be lost on VM deletion

- NONE for code, history, evidence, or configuration. The only VM-local
  items without a GitHub copy are, by enforced policy: the 731 MB model
  file, the 358 MB corpus + 322 MB archive (all re-downloadable per §6),
  one gitignored secrets file (must be re-created, never backed up to Git),
  and recreatable caches/build outputs. Stale worktree metadata for already-
  absent `/tmp` + `/home/maya/soravo-r1-gap-023` checkouts was left as-is.

## 10. Resume pointers

- `RESUME_FIRST.md` (branch root, on GitHub) + `PROGRESS.md` +
  `progress/STATUS.md` + `progress/NEXT.md`, then authority docs in §11 of
  the task (01/02/09/11/14 + `docs/Soravo_Engineering_Docs_v6/`).
- Initial model stays Parakeet Unified EN 0.6B Q8_0 only. PR #115 open.
  No release readiness claimed or implied.
