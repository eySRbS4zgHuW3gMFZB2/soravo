# T33-O — POST-T33-N CI BASELINE AND HANDY READINESS AUDIT — REPORT

**Task:** T33-O — POST-T33-N CI FINALIZATION + HANDY RECOVERY GATE
**Type:** Audit + documentation only. No production code, test, catalog,
model-asset, dependency, workflow, or UI change.
**Date:** 2026-09-30
**Branch:** `t31/soravo-wrapper-completion` @ `df527558d01cebbe4388425da53ee20b5a9896c0`
**PR:** #63 OPEN, `mergeStateStatus: BLOCKED`, `reviewDecision: REVIEW_REQUIRED`
**Verdict:** T33-N is **fully green and final**. PR #63 is **open and unmerged**.
No regression. All repository invariants hold. The previous `254/2` catalog
state and the `brace-expansion` web failure are both **gone, verified from CI
logs**. Four V1 gates remain open; none is closed by green Linux CI.

---

## 0. Reading gate — completed in the mandated order

1. Root `SPEC_MANIFEST.json` (spec_version 2.0, 16-entry `documents` array) — read.
2. **Every document the manifest names, in manifest order** — all 16 read in
   full: `README.md`, `01_PRD.md`, `02_TDD.md`, `03_AI_INSTRUCTIONS.md`,
   `04_IMPLEMENTATION_PLAN.md`, `05_TASK_BREAKDOWN.md`, `06_DOD_QA.md`,
   `07_AI_SKILLS.md`, `08_MCP_AND_AGENT_TOOLING.md`, `09_SECURITY_BASELINE.md`,
   `10_ADR_INDEX.md`, `11_INTERRUPTION_HANDOFF.md`, `12_BENCHMARK_PROTOCOL.md`,
   `13_RELEASE_RUNBOOK.md`, `14_ENVIRONMENT_AND_SECRETS.md`.
3. `PROGRESS.md` — 5,187 lines. Full heading index extracted; head (authority /
   strategy / status tables / priority, lines 1–385) read verbatim; the complete
   T33 sequence read verbatim (T33-I §4415–4721, T33-J §4723–4812, T33-K
   §4816–4885, T33-L §4889–4969, T33-M §4971–5019, T33-N §5023–5187).
4. Fresh GitHub state — see §2. Established this session from `git fetch`,
   `gh pr view`, `gh run list`, `gh run view --json jobs`,
   `gh run view --job --log`, `gh pr checks`, and the branch-protection API.
5. T33-N report — read in full (423 lines).
6. T33-M report — read in full (415 lines).
7. T33-K, T33-L, T33-J reports — read in full (329 / 346 / 224 lines).
8. v6 authority documents: canonical `SPEC_MANIFEST.json`,
   `00_README.md` (banner), `08_TASK_BREAKDOWN.md`,
   `09_AI_AGENT_INSTRUCTIONS.md`, `20_ADR_INDEX.md`,
   `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`.

**No prior report's conclusion was accepted on report.** Every CI, PR, byte,
and licence fact below was re-derived first-hand this session from GitHub
run logs, the GitHub API, Git object inspection, and `npm view`.

### Correction to the task brief (recorded, not treated as a discrepancy)

The brief reported the T33-N documentation commit as `218752d4` and PR #63
implied to be at that SHA. **The actual PR head is `df527558`**, one T33-N
documentation commit *newer* than `218752d4`:

```
df527558 docs(t33-n): add worktree-incident addendum and job-level CI detail
218752d4 docs(t33-n): record post-push CI verification for web audit remediation
0913e7c5 fix(web): refresh transitive audit findings to fixed versions (T33-N)
```

`df527558` is the commit that records the mid-task worktree incident documented
in `PROGRESS.md` §T33-N addendum. It is a **Markdown-only** T33-N commit and it
was pushed. Both `218752d4` and `df527558` carry green CI. This is an
additional T33-N documentation commit, not an unattributable change, and not a
STOP condition. All T33-N claims in this report are verified against **`df527558`**,
the real current head.

---

## 1. STEP 1 — T33-N documentation CI: VERIFIED FROM GITHUB

The brief said run `36673230042` was IN PROGRESS at hand-off. It is **not**. It
completed. Inspected directly:

| Item | Value |
|---|---|
| Run | `36673230042` — `CI`, event `pull_request` |
| **Final status** | `completed` |
| **Conclusion** | **`success`** |
| Head SHA | `218752d4d48f21adae340f4e012716ee87001a27` |
| Created / completed | `2026-09-30T05:24:07Z` / `2026-09-30T05:35:02Z` |
| URL | `https://github.com/eySRbS4zgHuW3gMFZB2/soravo/actions/runs/36673230042` |

Job-level (`gh run view 36673230042 --json jobs`):

| Job | Status | Conclusion | Duration |
|---|---|---|---|
| `web` | completed | **success** | 47s |
| `e2e` | completed | **success** | 52s |
| `rust` | completed | **success** | 6m24s |
| `desktop` | completed | **success** | 10m50s |

Security Audit `36673230041` (same head `218752d4`) — `success`.

**No new failures. No failure to root-cause. Handy recovery was not begun.**

### Newer runs on the actual current head `df527558`

| Run | Workflow | Head | Status | Conclusion |
|---|---|---|---|---|
| `36673473955` | CI | `df527558` | completed | **success** |
| `36673473744` | Security Audit | `df527558` | completed | **success** |

`36673473955` jobs: `web` success (1m0s) · `e2e` success (57s) ·
`rust` success (8m45s) · `desktop` success (10m50s).
`36673473744` jobs: `npm-audit` success (17s) · `cargo-deny` success (41s) ·
`cargo-audit` success (11s).

**Determination: T33-N documentation CI is green. The whole T33-N task is
finalized. No STOP condition 1.**

---

## 2. STEP 2 — PR #63 state

Inspected directly via the GitHub API and `gh pr checks`.

| Item | Value |
|---|---|
| Number / title | #63 — "T31 + T32: Soravo wrapper milestone — security-audit ignore sync, Handy-V1 policy reconciliation, payment-checkout hardening" |
| **Current head SHA** | **`df527558d01cebbe4388425da53ee20b5a9896c0`** |
| Head branch → base | `t31/soravo-wrapper-completion` → `main` |
| **Mergeable** | **`MERGEABLE`** |
| `mergeStateStatus` | `BLOCKED` |
| `reviewDecision` | **`REVIEW_REQUIRED`** |
| Reviews submitted | **0** (`gh pr view --json reviews` returned an empty array) |
| **Approvals** | **0 of 1 required** |
| **State** | `OPEN` |
| **Merged?** | **NO** — `mergedAt: null`, `closed: false` |
| Draft | `false` |

**PR #63 was NOT merged by this task and was not touched by this task.**

### Required checks — all 7 currently PASS

```
cargo-audit  pass  11s     cargo-deny   pass  41s
desktop      pass  10m50s   e2e          pass  57s
npm-audit    pass  17s     rust         pass  8m45s
web          pass  1m0s
```

### Branch protection on `main` (read-only API read)

```
required_status_checks: strict=true
  contexts: [web, e2e, rust, desktop]
required_pull_request_reviews:
  required_approving_review_count: 1
  dismiss_stale_reviews: true
  require_code_owner_reviews: false
allow_force_pushes:      false
allow_deletions:         false
required_linear_history: false
enforce_admins:          false
lock_branch:             false
```

**Assessment against the authoritative specification:**

1. All four required contexts (`web`, `e2e`, `rust`, `desktop`) are satisfied.
   The historical `rust`-red blocker is **cleared**.
2. The single remaining blocker is **0 of 1 required approving review** — a
   human action.
3. `strict: true` correctly requires the branch to be up to date with `main`
   before merge — protection is behaving as specified.
4. `allow_force_pushes: false` and `allow_deletions: false` match the
   v6 `09` prohibition on force-pushing shared history.
5. `required_linear_history: false` and `enforce_admins: false` are **not**
   required by the current authoritative pack; recorded as observed, not as a
   defect.

**Determination: PR #63 remains open and unmerged. No STOP condition 2.**

---

## 3. STEP 3 — COMPLETE CURRENT CI BASELINE (from GitHub only)

Established from the latest actual runs on head `df527558`. **No success is
inferred from a local run.**

| Gate | Run | Job | Result | CI log evidence |
|---|---|---|---|---|
| **rust** | `36673473955` | `rust` | **PASS** 8m45s | `test result: ok. 256 passed; 0 failed; 0 ignored` (desktop lib) |
| **web** | `36673473955` | `web` | **PASS** 1m0s | `pnpm audit --prod` → **`No known vulnerabilities found`** |
| **e2e** | `36673473955` | `e2e` | **PASS** 57s | job conclusion `success` |
| **desktop** | `36673473955` | `desktop` | **PASS** 10m50s | Tauri build, job conclusion `success` |
| **security — npm** | `36673473744` | `npm-audit` | **PASS** 17s | `pnpm audit --prod --audit-level=high` → **`No known vulnerabilities found`** |
| **security — cargo-audit** | `36673473744` | `cargo-audit` | **PASS** 11s | `Scanning Cargo.lock …` + 13-entry pre-existing ignore list, exit 0 |
| **security — cargo-deny** | `36673473744` | `cargo-deny` | **PASS** 41s | conclusion `success` (only `warning[duplicate]` notes) |

Full `cargo test --workspace` from CI run `36673473955`: **every binary green,
0 failures repo-wide** — 256 (desktop lib) · 27 · 20 · 31 · 6 · 5 · 4 · 4
(1 passed, 3 ignored) · 3 · 2 · 0×7.

### The two prior red states are confirmed GONE, verified from CI

1. **The `254 passed / 2 failed` catalog state is gone.** CI itself reports
   `256 passed; 0 failed` for the desktop lib — the exact `254/2 → 256/0`
   transition T33-L predicted and T33-K analysed. Confirmed from the run's own
   log, not from a local run and not from `PROGRESS.md`.
2. **The `brace-expansion` web failure is gone.** CI `web` reports `No known
   vulnerabilities found` at `pnpm audit --prod` (bare gate), and the Security
   Audit `npm-audit` job reports the same at `--audit-level=high`.

### Failure classification

**No failure remains in any gate.** Classification A–E is therefore not
required, and nothing was fixed, masked, suppressed, or retried in this task.

### Historical CI narrative (context, not current state)

| Head | CI run | CI result | Note |
|---|---|---|---|
| `640157aa` T33-I | `36657041713` | FAILURE | `rust` 203/7 — **by design** |
| `12b569fa` T33-J | `36659943960` | FAILURE | `rust` 254/2 — 5 RC-1 fixed |
| `c693dea9`+`1c850af4` T33-L | `36667412074` | FAILURE | `rust` GREEN 256/0; `web` red |
| `a8a4d151` | `36668791974` | FAILURE | `web` red (6 advisories) |
| **`0913e7c5` T33-N** | **`36672260194`** | **success** | all four green |
| `218752d4` | `36673230042` | **success** | docs-only delta |
| **`df527558`** | **`36673473955`** | **success** | **current head** |

---

## 4. STEP 4 — REPOSITORY INVARIANTS

Every invariant re-verified first-hand at `df527558`.

### Byte-level restoration proofs

| Invariant | Required | Measured | Result |
|---|---|---|---|
| `catalog.json` is the exact T33-L Handy catalog | 127,334 B; blob `64fc3482a8c7ff8b0a053a043e789b22113045ec`; SHA-256 `063dfdd5…76a94e` | **127,334 B**; `git hash-object` = **`64fc3482a8c7ff8b0a053a043e789b22113045ec`**; `sha256sum` = **`063dfdd5ec56867e863fb362110a90611a00ef38ba41fe4d0c08f23f8776a94e`** | **HOLD** |
| `audio_toolkit/text.rs` exact upstream | blob `82d45b5aced133ae5424365a707017cbf69cff98`, 29,496 B | **`82d45b5aced133ae5424365a707017cbf69cff98`**, 29,496 B | **HOLD** |
| `audio_toolkit/lang_id.rs` exact upstream | blob `82834bdb7eb2196664fa999774c4678cb2c8534b`, 6,685 B | **`82834bdb7eb2196664fa999774c4678cb2c8534b`**, 6,685 B | **HOLD** |
| `post_process.rs` removed | absent | `ls` → *No such file or directory* | **HOLD** |
| `transcription.rs` untouched | last touched `fc56c31b` (T22) | `git log --oneline -- …/managers/transcription.rs` → `fc56c31b`, `a156c8c9`. Never touched by T33-I/J/L/N. | **HOLD** |

### No test files were changed by T33-J / T33-L / T33-N

```
git diff --name-only 640157aa..df527558 | grep -iE 'test|spec'
→ (empty)
```

**Zero test or spec files changed across the entire T33 recovery window.**

### No Handy behaviour file modified outside the authorized recovery

Complete non-Markdown change set across the whole T33 window
(`640157aa` = T33-I → `df527558`):

| File | Δ | Attributed to | Authorized? |
|---|---|---|---|
| `apps/desktop/src-tauri/src/audio_toolkit/text.rs` | +828 / −0 (A) | T33-J exact-source restore | yes |
| `apps/desktop/src-tauri/src/audio_toolkit/lang_id.rs` | +170 / −0 (A) | T33-J exact-source restore | yes |
| `apps/desktop/src-tauri/src/audio_toolkit/mod.rs` | +6 / −5 (M) | T33-J surgical re-point | yes |
| `apps/desktop/src-tauri/src/audio_toolkit/post_process.rs` | +0 / −280 (D) | T33-J substitution removal | yes |
| `apps/desktop/src-tauri/Cargo.toml` | +5 / −0 | T33-J 5 pin-exact deps | yes |
| `Cargo.lock` | +100 / −11 | T33-J dependency resolution | yes |
| `apps/desktop/src-tauri/src/catalog/catalog.json` | +2239 / −1 | T33-L exact-byte restoration | yes |
| `pnpm-lock.yaml` | +13 / −13 | T33-N 3-snapshot refresh | yes |

```
git diff --name-status 640157aa..df527558 -- apps/desktop/src-tauri/src/managers/
→ (empty)          # transcription.rs and model.rs untouched
git diff --name-only 640157aa..df527558 -- .github/ crates/ apps/website/src \
    apps/desktop/src services/ packages/ supabase/
→ (empty)          # no workflow, no frontend, no service, no crate, no SQL change
```

Every change is attributable to an authorized task. **No STOP condition 5.**

### `pnpm-lock.yaml` contains only the intended T33-N resolution changes

Full diff `a8a4d151..df527558 -- pnpm-lock.yaml` — exactly **13 changed lines,
0 added packages, 0 removed packages**:

| Package | Before | After | Parent refs updated |
|---|---|---|---|
| `brace-expansion` | `5.0.9` | **`5.0.12`** | `minimatch@10.2.6` |
| `fast-uri` | `3.1.7` | **`3.1.8`** | `ajv@8.20.0` |
| `ip-address` | `10.7.0` | **`10.7.1`** | `express-rate-limit@8.7.0`, `socks@2.8.10` |

All three are patch-line bumps inside existing parent ranges; no parent,
manifest, or workspace declaration changed.

**Integrity hashes independently re-verified against the live npm registry
this session** (materially important given the T33-N worktree incident):

| Package | Lockfile `dist.integrity` | `npm view <pkg> dist.integrity` | Match |
|---|---|---|---|
| `brace-expansion@5.0.12` | `sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ==` | identical | **YES** |
| `fast-uri@3.1.8` | `sha512-GZMtZUTNRpOVIECoXwLNZS5xUGE+mVNbTB8h/7Rwh2TFWcBQiPzTgyZi05BF9UMZKkLJv8XBRJTlU7zg8+ZfMg==` | identical | **YES** |
| `ip-address@10.7.1` | `sha512-4OUAqU9Z1i3vCnS05hzGiFnEMDpQ+62pAD/MVQOp83fYyNC8GleCqaS0QikQBmcWCrKFiUs/B8ztRRiYOAXuCA==` | identical | **YES** |

**No hash was fabricated.** The lockfile is authentic.

### No unexpected `package.json` changes

```
git diff a8a4d151..df527558 -- '*package.json' --stat
→ (empty)
```

No `package.json` (root, `apps/desktop`, `apps/website`, `services/*`,
`packages/*`) was modified by T33-N. No `pnpm.overrides` /
`pnpm.resolutions` key was added.

### No source / workflow / UI changes introduced by T33-N

T33-N's complete file list is **3 files**:

```
PROGRESS.md
T33-N-WEB-DEPENDENCY-AUDIT-AND-REMEDIATION-REPORT.md
pnpm-lock.yaml
```

Only `pnpm-lock.yaml` is non-Markdown. Zero source, zero test, zero workflow,
zero UI, zero config, zero secret.

### v6 canonical / mirror invariants remain intact

Byte-hash comparison of `docs/Soravo_Engineering_Docs_v6/` (canonical) against
the root mirror `Soravo_Engineering_Docs_v6/`:

| File | Result |
|---|---|
| `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md` | IDENTICAL |
| `02_PRODUCT_REQUIREMENTS.md` | IDENTICAL |
| `04_HANDY_FORK_AND_REUSE_POLICY.md` | IDENTICAL |
| `07_IMPLEMENTATION_PLAN.md` | IDENTICAL |
| `08_TASK_BREAKDOWN.md` | IDENTICAL |
| `09_AI_AGENT_INSTRUCTIONS.md` | IDENTICAL |
| `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` | IDENTICAL |
| `00_README.md` | **DIFFERS** (banner-bearing — expected) |
| `20_ADR_INDEX.md` | **DIFFERS** (banner-bearing, pointer — expected) |

**HOLD** — exactly the two banner-bearing files differ, unchanged from
T32-Y / T32-Y2 / T33-I. Manifest invariant on the branch: `file_count: 24` =
24 `files[]` = 24 `read_order[]` entries; 26 files on disk = 24 + the 2
disclosed `22_IMPLEMENTATION_COMPLETION_MATRIX*` extras. **Manifest not
amended.** Pack header on the branch reads `Pack v6`; manifest `version: 6.0.0`.

### PROGRESS.md accuracy

`PROGRESS.md` accurately recorded T33-J, T33-K, T33-L, T33-M and T33-N,
including the T33-N addendum that correctly recorded runs
`36673230042` / `36673230041` as *"not load-bearing"* and declined to claim
their result. That was the correct call and is now resolved by §1.

One **defect** was found and is corrected by this task: the `Last audited
(T33-N)` header block still stated `HEAD a8a4d151`, *"`web` + Security Audit
RED"*, and *"PR #63 OPEN/BLOCKED (required `rust` red…)"*. All three are now
false. Following the file's own established precedent (the T32-X block is
retained and marked `HISTORICAL/STALE`), the T33-N header block is preserved
verbatim and marked stale, and a new `Last audited (T33-O)` block is added.
**No historical T33 entry was rewritten.**

---

## 5. STEP 5 — LICENSING: EVIDENCE PRESERVED, NO CLEARANCE CLAIMED

The owner decision is recorded: *"We intend to use the Handy catalog/models and
credit the upstream/model licensors appropriately on Soravo's website."*

**This is treated as intent, not as permission to ignore any individual
licence.** No model metadata or licensing file was modified by this task. No
model, licence, hash, mirror, or URL was fabricated, cleared, or upgraded.

### T33-L's inventory remains available

`T33-L-HANDY-CATALOG-RESTORATION-REPORT.md` §6 is intact and unmodified since
`a8a4d151`. It carries a **69-row** per-model table (verified by row count).
Its obligation vocabulary is intact: 64 occurrences of `requires notice`.

### License histogram independently re-derived from the restored bytes

```
$ grep -o '"license": *"[^"]*"' apps/desktop/src-tauri/src/catalog/catalog.json \
    | sed 's/.*: *"//;s/"//' | sort | uniq -c | sort -rn
     25 apache-2.0
     21 mit
     15 cc-by-4.0
      7 other
      1 cc-by-nc-4.0
model entries: 69
```

**Byte-for-byte agreement with T33-L's recorded histogram.** The obligations
recorded by T33-L have not been lost.

### The one `cc-by-nc-4.0` model — confirmed, still uncleared

`handy-computer/canary-1b-gguf` ("Canary 1B"), base model `nvidia/canary-1b`.
Status `restricted`: **non-commercial**. Commercial distribution requires
separate permission or a release-time carve-out. **Unchanged. Unresolved.**

### The seven `other` entries — confirmed, still uncleared

```
handy-computer/Fun-ASR-MLT-Nano-2512-gguf
handy-computer/Fun-ASR-Nano-2512-gguf
handy-computer/medasr-gguf
handy-computer/multitalker-parakeet-streaming-0.6b-v1-gguf
handy-computer/nemotron-3.5-asr-streaming-0.6b-gguf
handy-computer/nemotron-speech-streaming-en-0.6b-gguf
handy-computer/SenseVoiceSmall-gguf
```

**These seven are NOT declared cleared.** Each still requires per-model
source-repository licence review against the v6 `08` **T10** ten-item
acceptance list (exact artifact · publisher · source URL · license · commercial
use · redistribution · hosting · checksum · provenance · release decision).
`PROGRESS.md` still records the T28 §7 / T10 checklist at **0 of 9** for
distribution purposes.

### Obligations the later licensing task must keep separate

Per v6 `21` *Two separations that must never be collapsed*:

1. **Software/licence obligations** — Handy is MIT; Soravo's own licence file
   is unchanged and was not touched.
2. **Model/weight licence obligations** — 69 separate per-model gates. The
   catalog string is *Handy metadata*, **not** a weight-licence grant. A
   weight licence is never inferred from the software licence.
3. **Attribution/notice obligations** — 61 models `requires notice`: Apache-2.0
   NOTICE, MIT copyright notice, CC-BY-4.0 attribution, plus credit to
   `cjpais/Handy` and each publisher **without any ownership claim**.
4. **The one `cc-by-nc-4.0` model** — `canary-1b-gguf`, non-commercial,
   owner/legal decision required.
5. **The seven `other` entries** — per-model source/licence review required.

Status totals carried forward unchanged: `requires notice` ×61 ·
`restricted` ×1 · `unknown` ×7 · **`compatible` ×0**. **No model is marked
distributable-approved.** Weights remain **reference/download only**; none
bundled, none vendored, none downloaded.

**Licensing evidence is sufficient to state the obligations; it is NOT
sufficient to clear any model. No clearance is claimed. No STOP condition 6.**

---

## 6. STEP 6 — V6 DOCUMENT STATUS (determined from GitHub)

### Is the v6 canonical pack present on `origin/main`?

**NO — the v6 canonical pack is not on `main`.** `origin/main` @ `ede495b55efd95cedd882d90a19d12b4777da852`
does contain a directory named `docs/Soravo_Engineering_Docs_v6/`, but it is
the **pre-v6 generation of that directory**, not the reconciled v6 pack.

| Probe | `origin/main` | Branch `df527558` |
|---|---|---|
| `00_README.md` header | **`# Soravo Engineering Documentation Pack v5`** | `# Soravo Engineering Documentation Pack v6` |
| `PERMANENT READING GATE` in `09` | **0 hits** | present |
| `ADR-019` in `20_ADR_INDEX.md` | **0 hits** | present, `ACCEPTED` |
| `21` provenance status | records upstream identity as **`UNKNOWN`** | resolved to `ba10ce19` |
| `22_IMPLEMENTATION_COMPLETION_MATRIX*.md` | **ABSENT** | present (2 files) |

### Does the manifest have the expected entry count?

**Yes, and it is the same file on both refs.** Blob
`15fb55d4c2216be63c3e71892b7ff6018769de4b` on `origin/main` **and** on the
branch — byte-identical, declaring `version: 6.0.0`, `file_count: 24`,
24 `files[]`, 24 `read_order[]` entries. `main` holds exactly 24 files in that
directory; the branch holds 26 (24 + the 2 disclosed `22_*` extras).

**Pre-existing internal inconsistency on `main`, recorded not repaired:** the
manifest already labels itself v6.0.0 while the pack header still reads
"Pack v5" and the content predates the reading gate, ADR-019, and the
provenance correction. This will resolve when PR #63 merges. It is a
documentation defect in `main`'s committed state, **not** an unattributable
change and **not** a STOP condition.

### Do the canonical pack and mirror invariants hold?

**YES** — see §4. Only `00_README.md` and `20_ADR_INDEX.md` differ between the
canonical pack and the root mirror, both banner-bearing, exactly as designed.
The canonical `20_ADR_INDEX.md` correctly states the mirror
"carries a pointer here instead of its own current entries. If the two ever
disagree, this file wins."

### Does the GitHub `main` branch actually contain the v6 reading gate?

**NO.** `main`'s `09_AI_AGENT_INSTRUCTIONS.md` has **0** hits for
`PERMANENT READING GATE`. The permanent reading gate, the permanent
implementation discipline, the permanent V1 Handy-preservation policy, and the
permanent source boundary exist **only on the unmerged branch**.

### Does the authority declaration still have stale references?

**YES — O-5 is still open, and it is materially worse than a stale pointer.**
The root authority documents direct every reader to a path that **does not
exist**:

```
$ ls -d docs/spec-v3
ls: cannot access 'docs/spec-v3': No such file or directory

$ ls docs/
ARCHITECTURE.md  COMPLIANCE  HANDY_V1_PLAN.md  README.md  SECURITY_POLICY.md
Soravo_Engineering_Docs_v6  archive  compliance  spec-v2-archive  spec-v3.zip
```

`docs/spec-v3/` has been replaced by the archive artifact `docs/spec-v3.zip`.
The following all point at the **non-existent** directory:

- `README.md:13` — `The detailed authoritative specification is: **docs/spec-v3/**`
- `README.md:28-32` — five V3 quick links, all broken
- `README.md:69-72` — four "Getting Started" steps, all broken
- `SORAVO_PLAN.md:11` — *"This document (`SORAVO_PLAN.md`) and `docs/spec-v3/` are the current authoritative Soravo plan."*
- `SORAVO_PLAN.md:15` — V3 marked **Authoritative / Implementation authority**
- `SORAVO_PLAN.md:265-284` — **20** further broken table entries

**30 broken authority references across the two root authority documents.**
Any agent or contributor following the root `README.md` today is directed to a
path that does not exist. This is the exact condition v6 `09` warns about
("no claim about their authority may be asserted while O-5 is open").

**No documentation was repaired in this task** — repairing O-5 is not required
to finalize T33-N, and the v6 rules forbid an agent asserting a resolution to
an owner-gated item. It is recorded and escalated.

### Assessment against the expected governed state

The v6 authority state **matches** the governed state recorded by T33-I:
v6 is unmerged, `main` still reads "Pack v5", lacks the reading gate and
ADR-019, records provenance `UNKNOWN`, and lacks the `22_*` artifacts.

One quantitative difference: T33-I recorded **9** differing pack files;
the measured count is now **13**. This is the **expected and fully explained**
consequence of T33-I's own authorized commits (`00`, `02`, `03`, `04`, `06`,
`07`, `08`, `09`, `18`, `20`, `21`) plus the 2 `22_*` artifacts — the
divergence grew because the governed work landed on the branch, not because
anything unattributable occurred. The 9→13 difference was checked file by file
and is fully accounted for. **Not a material unexpected divergence. No STOP
condition 4.**

---

## 7. STEP 7 — HANDY RECOVERY READINESS

### Preconditions

| Precondition | Status |
|---|---|
| T33-N CI fully green | **MET** — `36673230042` success; current head `36673473955` success |
| PR #63 remains unmerged | **MET** — `OPEN`, `mergedAt: null` |
| No unexpected regression | **MET** — 0 failures; `256/0`; all invariants hold; all 8 changed files attributed |
| Repository invariants hold | **MET** — §4, all HOLD |

**All four preconditions are met. Readiness is established. The next task is
identified below and is NOT executed.**

### Remaining V1 gates — green Linux CI closes none of these

| # | Gate | State (measured this session) | Owner-gated? |
|---|---|---|---|
| 1 | **Model/weight licensing review** (v6 `08` T10; ADR-011; T28 §7) | **0 of 9** checklist items closed. 61 `requires notice` · 1 `restricted` (`cc-by-nc-4.0`) · 7 `unknown` (`other`) · **0 approved for distribution** | **Yes** (legal) + agent research |
| 2 | **Model assets / Silero VAD** | **0 `*.onnx` repo-wide; no `resources/` directory.** `silero_vad_v4.onnx` (1,807,522 B upstream) absent | **Yes** (supply chain) |
| 3 | **Selected model availability** | `settings.selected_model` default is empty; `load_model(&settings.selected_model)` at `managers/transcription.rs:764` has no default to satisfy it. ADR-019 **I4** holds | Yes (depends on 1 & 2) |
| 4 | **macOS build** | **NOT BUILT.** Every job in `.github/workflows/ci.yml` is `runs-on: ubuntu-latest`. ADR-019 records macOS compilation as `UNKNOWN` | **No** |
| 5 | **Windows build** | **NOT BUILT.** Same as above. ADR-019 records Windows compilation as `UNKNOWN` | **No** |
| 6 | **T1 boot gate** (ADR-019 outstanding obligation) | Recorded outstanding in `20_ADR_INDEX.md`. T32-V produced a Linux boot proof (15 s launch, exit 124, 0 panics); the ADR obligation itself is not recorded closed | No |
| 7 | **Release exercise** (v6 `08` T14) | Not started. Requires 1–6 plus payment release gate | Yes |
| 8 | **UI truthfulness** (O-4) | `apps/desktop/src/app.tsx:191-197` still tells users *"Speech recognition, microphone access, global shortcuts, and text insertion are **deliberately unavailable** until their dedicated, testable phases."* After T32-X runtime restoration this is **stale and understates real capability** | No |
| 9 | **Remaining T32/T33 governance** | O-4 open · **O-5 open (30 broken authority refs, §6)** · 31 untracked prior-task `T*.md` audit reports never committed · PR #63 title still says "T31 + T32" though the branch carries T33 work | No |

`## T32-U` is **present** in `PROGRESS.md` (the gap T33-I recorded is closed).
The `Last audited` header defect is corrected by this task.

**`SPEC_MANIFEST.json` declares `primary_platforms: ["macOS", "Windows"]`. Gates
4 and 5 are therefore not optional polish — they are the declared primary
platforms, and neither has ever been compiled.**

### The exact next task

> ## T33-P — T2 macOS/WINDOWS BUILD VERIFICATION GATE (ADR-019)
>
> **Add `macos-latest` and `windows-latest` build jobs to
> `.github/workflows/ci.yml` (build/compile verification only — no packaging,
> no signing, no notarization, no release artifacts), push, and record the
> actual compile result for each primary platform.**

**Why this is next, from the current authoritative state:**

1. **It is a ratified, recorded obligation, not a new proposal.** `v6
   20_ADR_INDEX.md` ADR-019 (ACCEPTED) lists exactly three outstanding
   obligations: *"T1 boot gate, T2 macOS/Windows build jobs, `app.tsx`
   truthfulness."* T33-P closes one of the three. No ADR is required; no owner
   decision is required; no architecture, licensing, or product change.
2. **It closes the single highest-severity UNKNOWN in the repository.**
   ADR-019 states verbatim: *"macOS/Windows compilation is `UNKNOWN`; only
   `x86_64-unknown-linux-gnu` was compiled and launched."* Every green run
   since — including all of T33-J/L/N — executed on `ubuntu-latest`. The
   code T33-J restored byte-identically from upstream has **never been compiled
   on either declared primary platform.**
3. **It is the one remaining substantive gate that is fully agent-executable
   with no external input.** It needs no credentials, no legal ruling, no
   upstream asset, no model licence, and no owner choice. Contrast: gate 1 is
   legal-gated; gates 2 and 3 are supply-chain-gated and depend on gate 1; gate
   7 depends on all of them.
4. **It directly tests the thing that was recovered.** T33-J restored
   `text.rs` (+828 L) and `lang_id.rs` (+170 L) with five new dependencies
   (`regex`, `strsim`, `natural`, `whatlang`, `isolang`). `natural` (Cranelift
   bindings), `rust-stemmers`, `phf`, `ahash` and the macOS/Windows input paths
   are exactly where a restored file can compile on Linux and fail on a
   primary platform. Proving compilation is the minimum honest test of the
   recovery.
5. **It is strictly bounded and reuses proven machinery.** The `desktop` job
   already runs `pnpm tauri build` on Linux with proven Tauri system
   dependencies. Two `runs-on` variants of the same build step reuse that
   machinery rather than inventing a pipeline.
6. **It unblocks honest release and platform claims.** v6 `13`
   `17_RELEASE_RUNBOOK.md` §8 forbids claiming an unsupported OS. T14 cannot
   pass, and no macOS/Windows download link may be published, until this gate
   is closed with real evidence.
7. **Per v6 `09` it must be one action, not bundled.** The 31 untracked
   reports, the PR #63 retitle, the `app.tsx` truthfulness fix (O-4), and the
   O-5 authority repair are each **separate** tasks and are **not** bundled
   here.

**Explicitly NOT in T33-P:** no model/licence change · no catalog change ·
no weight or VAD asset · no `package.json` or dependency change · no test
edit · no Handy behaviour change · no `app.tsx`/UI change · no O-5 repair ·
no release packaging, signing, or notarization · no merge of PR #63 · no
commit of the 31 untracked reports.

**After T33-P, in order:** O-4 `app.tsx` truthfulness (agent-executable, small)
→ T1 boot gate closure → the T10/licensing review (agent research plus one
legal ruling on `canary-1b-gguf`) → Silero VAD + selected-model asset
acquisition → T14 release exercise.

**T33-P is NOT started by this task.**

---

## 8. Security

- **Provider mutations: ZERO.** No Razorpay, Supabase, Cloudflare, or GitHub
  write API. All GitHub access read-only (`gh pr view`, `gh run view`,
  `gh run list`, `gh pr checks`, `gh api …/branches/main/protection`).
- **No secret** read, printed, or committed. Secret state was not inspected
  because it was not needed.
- **No `unsafe`.** No security boundary moved: CSP,
  `capabilities/default.json`, RLS, webhook HMAC and `verify_jwt` untouched.
- **No advisory** suppressed, allowlisted, or downgraded. No audit gate
  weakened. The 13-entry `cargo audit` ignore list in CI is **pre-existing**
  and was not modified.
- **Licensing claim discipline:** no model cleared, no licence asserted, no
  attribution fabricated. `compatible` remains ×0.
- **MCP not used.** Only Markdown was written.

---

## 9. Completion report

| Field | Value |
|---|---|
| **TASK ID** | T33-O |
| **Objective** | Finalize the T33-N state; establish the exact repository/CI baseline; verify PR #63, invariants, v6 status and licensing evidence; identify the next Handy-recovery task without executing it |
| **Branch** | `t31/soravo-wrapper-completion` |
| **Start SHA** | `df527558d01cebbe4388425da53ee20b5a9896c0` |
| **End SHA** | recorded in `PROGRESS.md` after commit |
| **Changed files** | `T33-O-POST-T33-N-CI-BASELINE-AND-HANDY-READINESS-AUDIT.md` (new), `PROGRESS.md` (T33-O entry + `Last audited` header correction) |
| **Deliberately unchanged** | All production code, tests, `catalog.json`, model assets, `Cargo.toml`, `Cargo.lock`, `pnpm-lock.yaml`, every `package.json`, all workflows, all UI, all licence files, the canonical v6 pack and its root mirror |
| **Tests** | None run locally. **All CI results read from GitHub run logs**, per the requirement not to infer success from local results |
| **Security** | Zero provider mutations; read-only GitHub; no secret; no boundary moved; no suppression; no licence cleared |
| **CI** | `36673230042` success (`218752d4`) · `36673473955` success (`df527558`, current head) · `36673473744` success |
| **Deployment** | None. Not requested, not performed |
| **External configuration** | None changed |
| **Blockers** | PR #63 needs 1 human approval. Gates 1–3 and 7 are owner/legal-gated. **O-5 open (30 broken authority references)** |
| **ADR/docs updated** | This report + `PROGRESS.md` only. **No ADR required** — a documentation audit corrects no decision |
| **Commit** | recorded in `PROGRESS.md` after commit |
| **PR** | #63 — remains **OPEN and UNMERGED** |
| **Stop conditions** | **None triggered.** Each assessed in §10 |
| **Next exact task** | **T33-P — T2 macOS/Windows build verification gate (ADR-019). NOT started.** |

---

## 10. Stop conditions — none triggered

| Condition | Assessment |
|---|---|
| T33-N documentation CI not green | **NOT TRIGGERED** — `36673230042` `completed`/`success`, 4/4 jobs green |
| PR #63 unexpectedly merged | **NOT TRIGGERED** — `state: OPEN`, `mergedAt: null`, `closed: false` |
| A new regression found | **NOT TRIGGERED** — 0 failures in 7 jobs; `256 passed; 0 failed`; `No known vulnerabilities found` |
| v6 authority state differs materially from the expected governed state | **NOT TRIGGERED** — matches T33-I's record. The 9→13 differing-file count is fully explained by T33-I's own authorized commits (§6). One pre-existing `main` inconsistency recorded, not repaired |
| A source/test/catalog/workflow change that cannot be attributed to an authorized task | **NOT TRIGGERED** — all 8 non-Markdown files attributed to T33-J / T33-L / T33-N (§4) |
| Licensing evidence insufficient to make a claim | **NOT TRIGGERED** — no clearance claimed. Evidence sufficient to state obligations; the 7 `other` + 1 `cc-by-nc-4.0` remain explicitly uncleared |
| GitHub state cannot be verified | **NOT TRIGGERED** — fully verified: PR, 7 checks, 25 recent runs, job-level results, raw job logs, branch protection |

---

**STOP. T33-O is complete. T33-P and all later tasks are NOT started.**
**PR #63 is NOT merged.**
