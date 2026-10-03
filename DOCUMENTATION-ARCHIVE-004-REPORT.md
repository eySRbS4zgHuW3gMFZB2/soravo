# DOCUMENTATION-ARCHIVE-004-REPORT — FINAL ARCHIVE INTEGRITY VERIFICATION

**Generated:** 2026-09-27 (UTC)
**Mode:** READ-ONLY verification. Nothing was deleted, moved, rewritten, or committed.
**Sources read:** `Soravo_Engineering_Docs_v6/00_README.md`,
`Soravo_Engineering_Docs_v6/01_AUTHORITY_AND_SOURCE_OF_TRUTH.md`,
`Soravo_Engineering_Docs_v6/19_STATE_AUDIT_PROTOCOL.md`,
`DOCUMENTATION-HYGIENE-002-REPORT.md`, `DOCUMENTATION-ARCHIVE-003-REPORT.md`.

---

## 1. Git State (exact)

| Field | Value |
|-------|-------|
| HEAD | `ede495b55efd95cedd882d90a19d12b4777da852` |
| origin/main | `ede495b55efd95cedd882d90a19d12b4777da852` |
| HEAD == origin/main | YES |
| Branch | `main` |
| Ahead / behind | 0 / 0 |
| Worktree state | **DIRTY (uncommitted move in progress, nothing committed)** |
| Staged changes | none |
| Unstaged tracked changes | 34 deletions under `docs/spec-v3/` (the archive-move source side) |
| Untracked entries | 17 (incl. `Soravo_Engineering_Docs_v6/`, `docs/archive/`, 8 report/audit `.md` files, 5 app/source additions, `deno.lock`) |
| `git diff --check` | clean (no whitespace errors) |

Untracked list (verbatim from `git status --porcelain=v1`):
`CI-BASELINE-AUDIT-002.md`, `DOCUMENTATION-ARCHIVE-003-REPORT.md`,
`DOCUMENTATION-HYGIENE-001-REPORT.md`, `DOCUMENTATION-HYGIENE-002-REPORT.md`,
`DOCUMENTATION-RECONCILIATION-002-REPORT.md`, `DOCUMENTATION-STATE-AUDIT-FINAL.md`,
`DOCUMENTATION-STATE-AUDIT-V6-001.md`, `MCP-ENVIRONMENT-AUDIT-001.md`,
`STATE-AUDIT-V6-002.md`, `Soravo_Engineering_Docs_v6/`,
`apps/desktop/.env.example`,
`apps/desktop/src-tauri/src/audio_toolkit/post_process.rs`,
`apps/desktop/src-tauri/src/commands/account.rs`,
`apps/desktop/src-tauri/src/helpers/`,
`apps/website/src/lib/payment-service.test.ts`, `deno.lock`, `docs/archive/`.

Linked worktrees present (not inspected, not touched):
`.swarm-worktrees/phase1-task1.1`, `.swarm-worktrees/phase1-task1.3-hotkeys`,
`.swarm-worktrees/type-001-native-insertion`.

---

## 2. Check Results (15 checks)

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | v6 pack contains exactly its declared files | **PASS** | 24 files on disk; `SPEC_MANIFEST.json` declares `"file_count": 24`; `00_README.md` read order lists 22 numbered docs + `DESIGN.md` + `SPEC_MANIFEST.json` = 24. Full listing: `00_README.md`, `01`–`21` (21 files), `DESIGN.md`, `SPEC_MANIFEST.json`. |
| 2 | DESIGN.md remains authoritative design file | **PASS** | `00_README.md:83` lists `DESIGN.md` as "(authoritative Soravo design specification)"; v6 `SPEC_MANIFEST.json` authority block: `"design_authority": "DESIGN.md is the sole authoritative Soravo design specification"`. File present, SHA-256 `96439028415ea67b…` — prefix `96439028415e` matches HYGIENE-002 record. Unmodified (untracked, never committed, never edited by this task). |
| 3 | v6 remains current engineering authority | **PASS** | `00_README.md` status line: "authoritative engineering-control pack"; `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md` defines engineering-control truth = "this documentation pack, accepted ADRs and explicit contracts". No competing authority claim found. |
| 4 | GitHub main remains implementation truth | **PASS** | v6 authority ladder (`00_README.md:41-51`, `01:12`) reserves implementation truth to "Current GitHub implementation and CI". HEAD == origin/main (`ede495b5…`), ahead/behind 0/0. No local commit competes with main. |
| 5 | `docs/archive/v2-root-engineering-pack` contains all 14 expected root v2 documents | **FAIL** | **Only 6 of 14 present:** `01_PRD.md`, `02_TDD.md`, `03_AI_INSTRUCTIONS.md`, `04_IMPLEMENTATION_PLAN.md`, `05_TASK_BREAKDOWN.md`, `06_DOD_QA.md`. **Missing:** `07_AI_SKILLS.md`, `08_MCP_AND_AGENT_TOOLING.md`, `09_SECURITY_BASELINE.md`, `10_ADR_INDEX.md`, `11_INTERRUPTION_HANDOFF.md`, `12_BENCHMARK_PROTOCOL.md`, `13_RELEASE_RUNBOOK.md`, `14_ENVIRONMENT_AND_SECRETS.md`. The 6 present are byte-identical to root originals (see §4). Root originals for all 14 are **still in place** — the ARCHIVE-003 "move" was a partial copy, not a move. `docs/archive/README.md` claim of "14 root-level engineering documents" is therefore incorrect. |
| 6 | `docs/archive/spec-v3` contains all 39 archived v3 documents | **FAIL AS STATED — see detail** | HEAD's tracked `docs/spec-v3/` set is **34 files, not 39** (`git ls-tree -r HEAD -- docs/spec-v3/` = 34; `05_TASK_BREAKDOWN.md` never existed at HEAD — `git show` returns fatal). Archive top level holds **37 files + `decisions/ADR-027…` = 38 entries**. All 34 HEAD-tracked files verify byte-identical in the archive (34/34 PASS, §4). The 4 surplus files (`MODEL_AND_BENCHMARK_REUSE_AUDIT.md`, `MODEL_PROVENANCE_MATRIX.md`, `SORAVO_UI_INTEGRATION_PLAN.md`, `STT-BENCHMARK-RESULTS-016.md`) have **no HEAD counterpart** — they came from untracked worktree state, provenance unverified. Anomaly: nested duplicate `docs/archive/spec-v3/spec-v3/` (38 files) as already noted in ARCHIVE-003 §NOTE. Total `docs/archive/` = 83 files. |
| 7 | `docs/archive/README.md` correctly identifies all archived material as historical | **PASS WITH DEFECT** | Intent and authority model are correct: "Archived documents are NOT engineering authority", current authority = v6 / DESIGN.md / GitHub main / decisions/ / progress/. **Defect:** §"v2 Root Engineering Pack" claims 14 documents; only 6 exist (§check 5). |
| 8 | `decisions/` remains untouched | **PASS** | `git status --porcelain -- decisions/` empty. 14 files (README + 13 ADRs incl. ADR-026) intact, matching HYGIENE-002 inventory. |
| 9 | `progress/` remains untouched | **PASS** | `git status --porcelain -- progress/` empty. 16 files intact, matching HYGIENE-002 inventory. |
| 10 | No source files changed | **PASS (tracked)** | `git diff --name-status` over `apps/ crates/ packages/ services/ tests/ scripts/ supabase/` plus manifests = empty. Only **untracked additions** exist (`.env.example`, `post_process.rs`, `account.rs`, `helpers/`, `payment-service.test.ts`, `deno.lock`) — no tracked source file modified or deleted. |
| 11 | No CI files changed | **PASS** | `git status --porcelain -- .github/` empty; no tracked diff under `.github/`. |
| 12 | No MCP configuration changed | **PASS** | `git status --porcelain -- .opencode/` empty; no tracked diff under `.opencode/`. |
| 13 | No current source/config/CI references point at obsolete paths | **CONDITIONAL PASS — 1 tracked exception** | No references to `docs/spec-v3/`, `spec-v2-archive/`, or `docs/superseded*` in tracked source, configs, `.github/`, or `.opencode/` (excluding build output and `node_modules`). **Exception:** tracked test `supabase/tests/webhook-hardening.test.mjs:5` cites `docs/spec-v3/RAZORPAY-PAYMENT-ARCHITECTURE-021.md` in a provenance comment — now a stale path (file lives at `docs/archive/spec-v3/`). Untracked ephemeral `supabase/.temp/smoke-027/progress_section.md` cites the old path twice (not tracked, no action required). The `(01_PRD.md §10)` hit in `apps/website/dist/` is a build-artifact UI string, not a file reference. |
| 14 | No v6 document incorrectly treats v2/v3 as current authority | **PASS** | Sole v6 mention is `00_README.md:53-56`: older `SORAVO_PLAN.md` / `docs/spec-v3/` material is "historical … unless explicitly reconciled … must not silently override this pack". Correct historical framing. No `authoritative/current-authority` claim for v2/v3 anywhere in v6 (case-insensitive grep for `spec-v3.*authoritative`, `v2.*authoritative`, `current.*authority` = empty). |
| 15 | No information was lost during the moves | **PARTIAL — no byte loss detected, coverage incomplete** | (a) All 6 copied v2 files SHA-256-identical to root originals. (b) All 34 HEAD-tracked spec-v3 files SHA-256-identical to archive copies (34/34). (c) Root v2 originals all still present, so missing archive members (07–14) are recoverable — no loss, but archive coverage incomplete. (d) The 4 surplus archive files have no HEAD blob to compare against — preserved, but provenance unverified. (e) Nested `spec-v3/spec-v3/` duplicates preserve bytes while creating ambiguity (which copy is canonical). |

---

## 3. File Counts

| Location | Count |
|----------|-------|
| `Soravo_Engineering_Docs_v6/` (worktree root, untracked) | **24** (22 numbered + `DESIGN.md` + `SPEC_MANIFEST.json`) |
| `docs/Soravo_Engineering_Docs_v6/` (tracked copy inside `docs/`) | present, tracked, clean (pre-existing; noted, not evaluated further) |
| `docs/archive/v2-root-engineering-pack/` | **6** (expected 14 — see check 5) |
| `docs/archive/spec-v3/` top level | **37 files + 1 `decisions/` file = 38 entries** (HEAD tracked set = 34) |
| `docs/archive/spec-v3/spec-v3/` (nested duplicate) | 38 files |
| `docs/archive/` total | **83 files** (incl. `README.md`) |
| `docs/spec-v2-archive/` | intact, 19 files + 2 subdirs (duplicates pending human deletion per HYGIENE-002) |
| `decisions/` | 14 (README + 13 ADRs) — untouched |
| `progress/` | 16 — untouched |
| Root v2 originals (`01_PRD.md`–`14_ENVIRONMENT_AND_SECRETS.md`) | all 14 still at root (tracked, unmodified) |

---

## 4. SHA-256 Verification Summary

- **v2 root → archive (6/6 MATCH):**
  `01_PRD.md b449ce70…`, `02_TDD.md 600de2bf…`, `03_AI_INSTRUCTIONS.md 2696ba0d…`,
  `04_IMPLEMENTATION_PLAN.md 8187b307…`, `05_TASK_BREAKDOWN.md 7bb42df1…`,
  `06_DOD_QA.md 47467c7b…` — full 64-char digests identical both sides.
  `07`–`14` have no archive counterpart (MISSING).
- **spec-v3 HEAD blobs → archive (34/34 MATCH, 0 MISMATCH, 0 MISSING):**
  every file from `git ls-tree -r HEAD -- docs/spec-v3/` hashes identical to
  `docs/archive/spec-v3/<same path>` (full-file `git show HEAD:… | sha256sum` comparison).
- **v6 anchors:** `DESIGN.md 96439028415e…` matches HYGIENE-002 prefix `96439028415e`;
  `00_README.md` and `SPEC_MANIFEST.json` prefixes recorded in HYGIENE-002 retained for reference.
- **Surplus archive files (no HEAD baseline, hashes recorded, not verifiable):**
  `MODEL_AND_BENCHMARK_REUSE_AUDIT.md b1fe5f21…`, `MODEL_PROVENANCE_MATRIX.md bb882735…`,
  `SORAVO_UI_INTEGRATION_PLAN.md 10c4e985…`, `STT-BENCHMARK-RESULTS-016.md dbc5ad3b…`.

---

## 5. Broken-Reference Result

- Build/config/CI/MCP reference scan (tracked files, `node_modules`/`dist`/`target` excluded): **no live references** to `docs/spec-v3/`, `spec-v2-archive/`, or superseded paths.
- One stale provenance comment in tracked test `supabase/tests/webhook-hardening.test.mjs:5` (old `docs/spec-v3/…` path). Cosmetic; does not affect builds. Recommend updating the comment to `docs/archive/spec-v3/…` in a future human-approved change — **not done here** (read-only task).
- `SPEC_MANIFEST.json` (root) still references the 14 root v2 documents — intentional historical record per ARCHIVE-003 §5; root files still exist, so references resolve.
- v6 pack is self-contained: no references to root v2 documents found (consistent with ARCHIVE-003 §5).

---

## 6. Authority Result

| Authority level | Location | Status |
|----------------|----------|--------|
| Engineering-control truth | `Soravo_Engineering_Docs_v6/` (24 files) | CURRENT |
| Sole design spec | `Soravo_Engineering_Docs_v6/DESIGN.md` | CURRENT |
| Implementation truth | GitHub main (`ede495b5…`, in sync) | CURRENT |
| ADR history | `decisions/` (14 files) | CURRENT, untouched |
| Execution evidence | `progress/` (16 files) | HISTORICAL, untouched |
| Historical evidence | `docs/archive/` (+ `docs/spec-v2-archive/`, root v2 originals) | ARCHIVED, non-authoritative |

No authority conflict introduced. Archive README's authority model matches v6's ladder.

---

## 7. Final Recommended Documentation Tree

No changes were made. The tree below describes the **recommended steady state**
(corrections to current worktree state are marked **[TODO — human approval required]**).

```
.
├── Soravo_Engineering_Docs_v6/        # CURRENT — engineering-control truth (24 files)
│   ├── 00_README.md … 21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md
│   ├── DESIGN.md                     # SOLE authoritative design spec
│   └── SPEC_MANIFEST.json            # declares file_count 24
├── decisions/                        # CURRENT — ADR history (14 files, untouched)
├── progress/                         # HISTORICAL evidence (16 files, untouched)
├── docs/
│   ├── archive/
│   │   ├── README.md                 # historical marker [TODO: fix "14 documents" → actual count]
│   │   ├── v2-root-engineering-pack/ # [TODO: copy root 07–14 (8 files) with SHA-256 logging,
│   │   │                             #  then remove root originals ONLY with explicit human approval]
│   │   │   ├── 01_PRD.md … 06_DOD_QA.md            (present, verified)
│   │   │   └── 07_AI_SKILLS.md … 14_ENVIRONMENT_AND_SECRETS.md  (MISSING)
│   │   └── spec-v3/
│   │       ├── 00_README.md … 19_DOCUMENT_GOVERNANCE.md (no 05_TASK_BREAKDOWN — never existed at HEAD)
│   │       ├── MODEL_AND_BENCHMARK_REUSE_AUDIT.md / MODEL_PROVENANCE_MATRIX.md /
│   │       │   SORAVO_UI_INTEGRATION_PLAN.md / STT-BENCHMARK-RESULTS-016.md
│   │       │                             # [TODO: confirm provenance of these 4 untracked-origin files]
│   │       ├── RAZORPAY-*.md (13 files) + SPEC_MANIFEST.json
│   │       ├── decisions/ADR-027…    # (present, verified)
│   │       └── spec-v3/              # [TODO: remove nested duplicate WITH human approval once
│   │                                 #  top-level copy is confirmed canonical — do NOT delete silently]
│   ├── spec-v2-archive/              # duplicates; [TODO: human-approved deletion per HYGIENE-002 §10]
│   ├── spec-v3.zip                   # untracked/ignored artifact; [TODO: human decides keep/remove]
│   ├── Soravo_Engineering_Docs_v6/   # tracked copy; [TODO: human decides canonical location —
│   │                                 #  root v6 vs docs/ copy duplication]
│   ├── README.md / ARCHITECTURE.md / HANDY_V1_PLAN.md / SECURITY_POLICY.md  # legacy; as inventoried
│   └── compliance/ + COMPLIANCE/     # historical compliance; as inventoried
├── 01_PRD.md … 14_ENVIRONMENT_AND_SECRETS.md  # root v2 originals still present (tracked);
│                                              # [TODO: remove ONLY after archive holds all 14 verified
│                                              #  copies AND with explicit human approval]
└── DOCUMENTATION-*-REPORT.md / STATE-AUDIT-*.md / *-AUDIT-*.md  # audit trail (untracked, kept)
```

**Recommended next actions (all require explicit human approval; none taken here):**
1. Copy root `07_AI_SKILLS.md`–`14_ENVIRONMENT_AND_SECRETS.md` into
   `docs/archive/v2-root-engineering-pack/` with SHA-256 logging, correcting check 5.
2. Fix `docs/archive/README.md` v2 file-count claim to match reality.
3. Confirm provenance of the 4 surplus spec-v3 archive files; record the outcome.
4. Designate `docs/archive/spec-v3/` top level canonical; remove nested `spec-v3/spec-v3/` only with approval.
5. Update stale comment path in `supabase/tests/webhook-hardening.test.mjs:5`.
6. Decide canonical v6 location (root vs `docs/` copy) and disposition of `docs/spec-v3.zip`.
7. Only after 1–4 verify green: remove root v2 originals and `docs/spec-v2-archive/` duplicates, then commit — all with explicit human approval.

---

## 8. Deterministic Verdict

- **Restructuring completeness: INCOMPLETE** — v2 archive holds 6/14; spec-v3 archive count (38 entries) does not match the declared 39 because HEAD only ever contained 34 tracked files.
- **Determinism of what WAS archived: VERIFIED** — every file actually placed in the archive is byte-identical to its source (6/6 v2, 34/34 spec-v3), and authority markers are correct.
- **Safety invariants: HELD** — `decisions/`, `progress/`, all tracked source/CI/MCP config untouched; HEAD == origin/main; nothing committed or pushed.
- **Information loss: NONE DETECTED** — all missing-from-archive material still exists at its original location.

**STOP.** Verification complete. Report created; repository otherwise unmodified.
