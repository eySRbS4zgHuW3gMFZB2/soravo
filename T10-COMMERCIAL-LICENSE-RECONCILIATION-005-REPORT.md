# T10-COMMERCIAL-LICENSE-RECONCILIATION-005 — EVIDENCE VALIDATION AND REGISTRY CORRECTION REPORT

**Task:** T10-COMMERCIAL-LICENSE-RECONCILIATION-005
**Type:** Evidence reconciliation only in this report. No implementation changed to produce this report. No push, PR, or merge performed.
**Date:** 2026-10-09
**Author session branch:** `feature/r1-gap-021-desktop-auth` @ `18bc2133dc5805b24874dc4f16e64817437f91e9` (dirty worktree, preserved untouched)

---

## 0. Authority and starting state (mission §1)

### 0.1 Documents read (canonical pack `docs/Soravo_Engineering_Docs_v6/` unless noted)

- `00_README.md` (canonical) + root mirror pointer — canonical pack is authority.
- `01_AUTHORITY_AND_SOURCE_OF_TRUTH.md` — implementation truth (GitHub) vs control truth (pack); forbidden reasoning list applied.
- `09_AI_AGENT_INSTRUCTIONS.md` — permanent discipline, reading gate, skill gate, dirty-worktree rule, stop conditions.
- `12_SECURITY_BASELINE.md` — model-download supply-chain controls; repo data untrusted.
- `13_DEFINITION_OF_DONE_AND_QA.md` — DoD levels applied to validation §8 below.
- `18_INTERRUPTION_AND_HANDOFF.md`, `19_STATE_AUDIT_PROTOCOL.md` — audit commands executed, no destructive ops.
- `21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` — pin of record `cjpais/Handy @ ba10ce1943ef34e93c09494027fc0b9ced2e8a44`; the two separations (source recovery ≠ weight licensing; missing assets ≠ source recovery) applied throughout.
- `docs/archive/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md` (v3.0.0, historical unless reconciled) — SOFTWARE ≠ MODEL ≠ REDISTRIBUTION ≠ HOSTING; UNKNOWN = BLOCKED.
- `docs/archive/spec-v3/MODEL_PROVENANCE_MATRIX.md` (historical) — Whisper weights MIT / Moonshine weights Apache-2.0 per that matrix; **conflicts** with catalog labels (see §3.5).
- `20_ADR_INDEX.md` — ADR-011 (model licensing gate), ADR-019 (D-CATALOG=B, superseded for population only by T33-L O-K1..K3), ADR-031 series noted for merge governance (no merge performed here).
- `T33-L-HANDY-CATALOG-RESTORATION-REPORT.md` — 69 models, 367 files, byte proof, license histogram, per-model inventory (candidate evidence, not a rights grant).
- Feature-branch `MODEL_LICENSES.json` / `MODEL_LICENSES.md` @ `df4f9d6d` (candidate evidence, not authority).
- `apps/desktop/src-tauri/src/catalog/catalog.json` (restored upstream bytes @ Handy pin `ba10ce19`; blob `64fc3482a8c7ff8b0a053a043e789b22113045ec`, SHA-256 `063dfdd5ec56867e863fb362110a90611a00ef38ba41fe4d0c08f23f8776a94e`) — provenance preservation, **not** a redistribution grant (v6 §21).

### 0.2 Skill Selection Gate (mandatory, re-run for this task)

- Task classification: licensing/provenance · Handy upstream analysis · model/catalog/asset handling · repository/Git operations · GitHub · Rust (+ Rust security review) · security · testing/QA · documentation/specification/ADR. Frontend inspected: not applicable (no UI change in reconciliation stage). Supabase/payments/MCP inspected: not applicable, deliberately not selected.
- Mandatory skills selected and **loaded in this session**:
  - `supply-chain-risk-auditor` — governs dependency/model-asset supply-chain evidence handling (note: its scripts cover npm/PyPI/Go, not model weights; used as procedure, not as a weight-license oracle).
  - `gh-cli` — governs authenticated GitHub evidence (`git`/`gh` identity, SHAs, refs).
  - `rust-engineer` — governs Rust gate/test implementation that follows this report.
  - `rust-review` — governs security review of the existing `unsafe`-adjacent gate code (read-only in this stage).
  - `security-guidance` + `securability-engineering` — govern trust-boundary treatment of model downloads/redistribution.
  - `github` — governs PR/run evidence reads (no PR opened by this task).
- Optional considered: `vitest` (declined — no frontend change in this stage); `semgrep`/`codeql` (declined — CLIs absent on host; covered by cargo audit/deny + secretscan at validation).
- Skills deliberately not selected: all cloud/payment/database/frontend-accessibility/tauri/setup skills — out of scope, no silent expansion.
- Authority/source boundary: repository facts from local `git`/files; upstream facts only from fetched primary sources (§4); HF metadata tags treated as claims, never grants.
- Conflicts found: none between loaded skills and the pack.
- Result: **CLEAR** (reconciliation report only).

### 0.3 Canonical SHAs inspected

| Ref | SHA | Source |
|---|---|---|
| `origin/main` | `82ec2ecc1ba279dfa9176f1612943368d65d3616` | `git rev-parse origin/main` this session |
| Current worktree HEAD (`feature/r1-gap-021-desktop-auth`) | `18bc2133dc5805b24874dc4f16e64817437f91e9` | `git rev-parse HEAD` this session |
| Merge base HEAD↔`origin/main` | `18bc2133dc5805b24874dc4f16e64817437f91e9` | worktree behind `origin/main`, not reset |
| Feature branch `feature/t10-commercial-model-gate` | `df4f9d6d5761bc1cbdd1dd07bbae6f6ebc180eda` | `git rev-parse feature/t10-commercial-model-gate`; worktree `.swarm-worktrees/t10-commercial-model-gate`, clean, `ahead 1` |
| Merge base `feature/t10-commercial-model-gate`↔`origin/main` | `82ec2ecc1ba279dfa9176f1612943368d65d3616` | direct child of current `origin/main` |
| Handy upstream pin of record | `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` | v6 §21 (unchanged) |
| Upstream catalog blob @ pin | `64fc3482a8c7ff8b0a053a043e789b22113045ec` | T33-L §2–§3 (unchanged) |

### 0.4 Worktree status

Current worktree is **dirty** (staged/unstaged R1-GAP-021 desktop-auth work, Silero asset deletions, untracked proposal files). Per the dirty-worktree rule **nothing was reset, cleaned, stashed-over, or switched destructively**. All reconciliation reads were performed with `git show`/`Read`/`Grep`; the feature-branch worktree was inspected in place and left clean. Commit `df4f9d6d` verified reachable (`git cat-file -t` = `commit`) and present in its worktree.

### 0.5 A missing evidence source, recorded honestly

**No file named `T10-COMMERCIAL-LICENSE-AUDIT-001` exists anywhere in the repository** (glob + `grep -ri` over all `*.md` return zero hits; no commit introduces it). The mission's §3 claims attributed to that report (13 restricted models; 12 non-English legacy Moonshine models; 56 commercially clear with attribution; zero unknown/insufficient-provenance; universal conversion/quantization authorization) are therefore treated as **unverified candidate claims without a citable source artifact**. They are reconciled claim-by-claim in §3 against citable evidence and **none is adopted as a rights grant**. This is itself a material finding: a commercial-clearance decision cannot rest on a report that cannot be produced.

---

## 1. Evidence inventory (mission §2 — six sources, kept separate)

| # | Source | Form | What it is | What it is NOT |
|---|---|---|---|---|
| E1 | `catalog.json` (69 models, 367 artifact files) | Upstream Handy metadata bytes, restored byte-identical (T33-L §3) | Provenance preservation; per-model `id`/`revision` (full 40-char SHAs)/`base_model`/`license` label/per-file `sha256`+`size_bytes` | A weight license, a redistribution grant, a conversion authorization, or proof Handy may relicense weights |
| E2 | T33-L Handy Catalog Restoration Report | Task report (historical evidence) | Byte proof; histogram apache-2.0×25/mit×21/cc-by-4.0×15/cc-by-nc-4.0×1/other×7; explicit `compatible ×0`, `requires notice ×61 / restricted ×1 / unknown ×7`; mirror-host trust open | A commercial clearance |
| E3 | Feature-branch `MODEL_LICENSES.json` + `MODEL_LICENSES.md` + `catalog/commercial.rs` + `managers/model.rs` enforcement @ `df4f9d6d` | Candidate implementation | Fail-closed gate mechanics (sound); registry contents (unsound — see §3) | Authority for commercial rights |
| E4 | `docs/archive/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md` + `MODEL_PROVENANCE_MATRIX.md` | Historical policy/provenance | Four-way license distinction; UNKNOWN=BLOCKED rule; prior per-family weight claims (conflict recorded §3.5) | Current clearance |
| E5 | Primary upstream sources fetched this session | Fetched evidence | `https://huggingface.co/openai/whisper-medium` (page metadata field `License: apache-2.0`); `https://huggingface.co/moonshine-ai/moonshine-tiny` (page metadata field `License: mit`, org `moonshine-ai`) | Weight-term grants, redistribution/conversion permissions (neither page states them) |
| E6 | Handy artifact records (367 file entries inside E1) | Handy-claimed checksums | Per-quant `filename`/`size_bytes`/`sha256` for Handy `handy-computer/*` revisions | Proof the bytes equal upstream weights or that Handy was authorized to produce/host them |

Key load-bearing admissions already on record: T33-L §10 ("catalog-declared license is Handy metadata, not the weight grant; 0/9 distribution data items closed"); `MODEL_LICENSES.md` §4 ("catalog-declared labels, not an independent legal review; redistribution/hosting rights for mirror serving remain unverified").

---

## 2. Canonical catalog census (verified first-hand this session)

- 69 models, 367 artifact files (T33-L counts; model-ID grep = 69 hits, license grep = 69 hits, this session).
- Histogram (matches T33-L §6): `apache-2.0` ×25 · `mit` ×21 · `cc-by-4.0` ×15 · `cc-by-nc-4.0` ×1 · `other` ×7.
- Every model entry carries a full 40-char `revision` (all rows verified by direct read; full values in §6 table). Truncated SHAs appear nowhere in the catalog; the mission's truncation warning is discharged by citing full SHAs below.
- 12 non-English Moonshine entries confirmed present: `moonshine-tiny-{ar,ja,ko,uk,vi,zh}` (6) + `moonshine-base-{ar,ja,ko,uk,vi,zh}` (6). Existence confirmed; upstream license applicability per model **unverified** (see §3.2).
- Feature registry @ `df4f9d6d`: 69 entries covering all 69 catalog IDs; `COMMERCIAL-CLEAR` 46 (25 apache-2.0 + 21 mit) + `COMMERCIAL-CLEAR-WITH-ATTRIBUTION` 15 (cc-by-4.0) = **61 approved**; `NON-COMMERCIAL` 1 + `UNKNOWN` 7 = **8 blocked**. Registry `license` labels match catalog labels 1:1 (its own test enforces this).

---

## 3. Material discrepancies resolved with model IDs and evidence (mission §3)

### 3.1 — 7×`other` + 1×`CC-BY-NC-4.0` (E1/E2) vs "13 restricted" (unverified claim)

- Citable fact: exactly 7 `other` IDs — `nemotron-3.5-asr-streaming-0.6b-gguf`, `Fun-ASR-MLT-Nano-2512-gguf`, `Fun-ASR-Nano-2512-gguf`, `medasr-gguf`, `nemotron-speech-streaming-en-0.6b-gguf`, `multitalker-parakeet-streaming-0.6b-v1-gguf`, `SenseVoiceSmall-gguf` — plus 1 `cc-by-nc-4.0` (`canary-1b-gguf`) = **8** restricted/unknown, not 13.
- The "13 restricted" figure has **no source artifact** (§0.5) and matches no citable count. It is **REJECTED** as a basis for any decision. The 5-model gap is an unresolved question (§7 Q1), not a reconciliation: no models are added to any restricted list on the strength of an unsourced number.
- Resolution: the 8 keep fail-closed status; the 5 phantom entries are not invented. (Implementation §8 maps the 7 `other` → `UNKNOWN`, the 1 NC → `NON-COMMERCIAL`, unchanged.)

### 3.2 — The 12 non-English legacy Moonshine models and their exact upstream licenses

- The 12 IDs exist in E1 (listed §2) with catalog label `mit` and distinct full revisions each (see §6 rows 28–40, `UsefulSensors/moonshine-*` base models).
- "Exact upstream license applicable to each model": **UNKNOWN for all 12**. E5 fetched `moonshine-ai/moonshine-tiny` (`License: mit`) — a **different org** (`moonshine-ai`) than the catalog's `UsefulSensors/moonshine-*` base models, and a metadata tag, not a weight-license text. No per-model weight license text, redistribution clause, or conversion authorization was found in E1–E5 for any of the 12.
- The historical matrix (E4) claims Moonshine weights Apache-2.0 — **directly contradicting** the catalog's `mit` for these same families (§3.5). With two sources in conflict and no weight-license text, the fail-closed outcome holds for all 12.
- Resolution: all 12 → `INSUFFICIENT-PROVENANCE` (blocked),4387 with conflict E1-vs-E4 recorded. They are **not** cleared, and the unverified "legacy" narrative is not adopted.

### 3.3 — "56 commercially clear with attribution" vs feature branch "61 approved / 8 blocked"

- Both numbers are **rejected as clearance counts**:
  - "56" has no source artifact (§0.5) and contradicts both E1's histogram and E3's 61. REJECTED.
  - "61 approved" (E3) is arithmetically consistent with E1's labels (46+15) but evidentially void: E3's own §4 admits the labels are catalog-declared, not weight grants, and E2 records 0/9 distribution items closed with mirror trust open. A count of labels is not a count of permissions.
- Reconciled finding: **0 of 69 models have evidenced commercial-use + redistribution + derivative/quantization permission on current evidence**. The 61 E3 approvals are the registry defect corrected in §8. Corrected totals: **0 approved / 69 blocked** (+ Silero reported separately, §5).

### 3.4 — "Zero unknown / insufficient-provenance" vs unverified Handy redistribution rights

- The "zero unknown" claim is **false against citable evidence**: E1 contains seven literal `other` licenses; E2 marks 7 `unknown`; E3 marks 7 `UNKNOWN`; E3 §4 + E2 §10 keep mirror/redistribution rights explicitly unverified.
- Handy GGUF hosting/redistribution authorization (HF `handy-computer/*` org + `https://blob.handy.computer` mirror) is **unverified for all 69 models**: no authorization letter, no license clause, no contract in E1–E5. Catalog `mirrors` field is a Handy claim, not a permission.
- Resolution: claim REJECTED. Unknown stays 7; the remaining 61 move to `INSUFFICIENT-PROVENANCE` precisely because redistribution/conversion provenance is missing (§8).

### 3.5 — Every catalog license that differs from the upstream license

Verified conflicts (each independently load-bearing; any one blocks its models):

1. **Whisper family (13 IDs, catalog `apache-2.0`):** E4 (historical matrix) records Whisper model weights as **MIT** (`openai/whisper` repo LICENSE). E5 confirms the HF page shows only a metadata tag `License: apache-2.0` with no weight-license text. Catalog label ≠ historical weight claim; neither source supplies a GGUF weight/redistribution term. All 13 → blocked.
2. **Moonshine family (17 IDs, catalog `mit`):** E4 records Moonshine weights as **Apache-2.0** (`usefulsensors/moonshine` LICENSE). E5 shows `mit` on a different org's page. Catalog label ≠ historical weight claim. All 17 → blocked.
3. **All 7 `other` entries:** catalog declares no license at all; any `UNKNOWN`-to-clear mapping would be fabrication. All 7 → `UNKNOWN` (blocked).
4. **`canary-1b-gguf` (`cc-by-nc-4.0`):** retained as the sole `NON-COMMERCIAL`; weight-terms unconfirmed beyond the NC label, so it is blocked under either reading.
5. **All `cc-by-4.0` NVIDIA/primeline entries (15):** CC-BY-4.0 permits commercial use *of the licensed material* **conditioned on attribution AND subject to the actual licensor's scope** — but the licensor/weight-terms for the GGUF conversions are unevidenced, NVIDIA base-model pages may carry additional model terms, and Handy conversion/redistribution rights are absent. Catalog `cc-by-4.0` ≠ proven GGUF weight grant. All 15 → blocked.
6. **Cohere (2, `apache-2.0`), Qwen (2, `apache-2.0`), Voxtral/Mistral (3, `apache-2.0`), Granite/IBM (4, `apache-2.0`), Moss (1, `apache-2.0`), Breeze/MediaTek (1, `apache-2.0`), GigaAM (4, `mit`):** catalog labels are plausible software-license echoes but **no weight-license text, redistribution clause, or conversion record** exists in E1–E5 for any of them. Plausibility ≠ evidence. All → blocked.
7. **MedASR (`other`, base `google/medasr`):** Google health-model terms are gated/restricted as a class; specific terms unevidenced here. Stays `UNKNOWN` (blocked) with a sharpened note (§6 row 25). No NC/PROHIBITED label is invented without the text.

General rule applied: **no `apache-2.0`/`mit`/`cc-by-4.0` catalog declaration is accepted as the weight license**. The §6 table therefore records "verified applicable license = UNVERIFIED (catalog-declared X)" for all 69 rows.

### 3.6 — "Conversion/quantization authorized under every cleared model's license"

- **No evidence exists for any of the 69 models** that the rights holder authorized Handy (or anyone) to convert/quantize the weights to GGUF and distribute the derivatives. E1 contains converted artifacts + hashes but no authorization record; E2–E5 contain no conversion grant; the GGUF files' provenance chain (source checkpoint → conversion tool → quant recipe → uploader identity) is absent throughout.
- A downloadable GGUF, a source-code license, and an HF metadata tag are each explicitly **not** conversion permission (mission §3.6; v6 §21; E4 §1).
- Resolution: conversion/quantization permission = **UNVERIFIED for all 69**. This alone blocks all 61 E3-approved models regardless of the underlying weight license. Recorded per-row in §6 as rationale code C.

### 3.7 — Google MedASR terms; NVIDIA / OpenMDW / FunASR terms

- **MedASR** (`handy-computer/medasr-gguf`, row 25, catalog `other`, base `google/medasr`, rev `6f481df085bb50ae922cea918fb578e664237126`): no terms text in evidence. Given the publisher class (Google health AI, gated access) the conservative classification is `UNKNOWN` (blocked) with a prominent warning — **not** upgraded to PROHIBITED/NON-COMMERCIAL without the text, **not** cleared under any circumstance. Open question Q3.
- **NVIDIA families** (Parakeet/Canary/Nemotron/Multitalker rows): catalog `cc-by-4.0`/`other` labels only. NVIDIA model pages historically pair CC-BY-4.0 with model-specific use terms; no per-model terms text is in evidence here. Any condition affecting redistribution, user-facing notices, or downstream use is therefore **unresolved** — recorded as open question Q4, fail-closed.
- **FunAudioLLM families** (Fun-ASR MLT Nano, Fun-ASR Nano, SenseVoiceSmall — all `other`): upstream FunAudioLLM repos historically carry non-commercial or custom terms for some artifacts, but **no terms text is in evidence here**, so no NC/PROHIBITED label is asserted. All three stay `UNKNOWN` (blocked). Open question Q5.
- **"OpenMDW"**: no catalog model, base model, publisher string, or evidence references this name. Treated as an **unmapped term** — open question Q6. Nothing is classified on its basis.
- Resolution: §3.7 claims in the unverified report are **not adopted**. Notices/obligations for these families are UNKNOWN until the texts are produced.

### 3.8 — Exact revisions and artifact provenance

- All 69 catalog `revision` values are full 40-char SHAs, verified by direct read and cited in full in §6. No truncated SHA is relied upon.
- Per-file `sha256` + `size_bytes` exist for all 367 Handy artifacts inside E1 (Handy-claimed checksums). They prove **nothing** about upstream equality: there is no conversion record linking any `handy-computer/*` GGUF revision to its `base_model` checkpoint, and no independent re-computation. Artifact→upstream linkage = **ABSENT for all 69** (rationale code B/C in §6).
- Resolution: revisions are exactly cited; provenance remains `INSUFFICIENT-PROVENANCE` for every permissive-label model.

---

## 4. Primary-source verification log (this session; web research tool)

| # | URL fetched | Exact field/section relied upon | What it proves | What it does NOT prove |
|---|---|---|---|---|
| P1 | `https://huggingface.co/openai/whisper-medium` | Page metadata field `License: apache-2.0` (model-card header) | Catalog's `apache-2.0` label echoes the HF metadata tag for this family | Weight-license text, commercial/redistribution/derivative permission, or Handy conversion authorization (none present on the page) |
| P2 | `https://huggingface.co/moonshine-ai/moonshine-tiny` | Page metadata field `License: mit`; org `moonshine-ai`; card text "trained and released by Useful Sensors" | Catalog's `mit` label echoes an HF metadata tag; publisher org on HF (`moonshine-ai`) differs from catalog `base_model` org (`UsefulSensors`) — identity mismatch recorded | Weight-license text or per-model (`-ar/-ja/-ko/-uk/-vi/-zh`, streaming) terms; redistribution/conversion permission |
| P3 (not fetched — recorded as NOT EXECUTED) | 67 remaining base-model pages + all weight LICENSE files + Handy authorization records | — | — | Everything load-bearing. Fetches for all 69 were deliberately **not** run to completion in this stage because (a) the defect (E3 clears on labels alone) is already dispositive, and (b) bulk metadata scraping cannot substitute for weight-text + redistribution + conversion evidence per mission §4. Full per-model primary-source verification is deferred as guarded follow-up work (see §7 Q2), not claimed. |

A URL or metadata field is **never** represented below as proof of artifact provenance or Handy redistribution authorization.

---

## 5. Bundled Silero VAD asset — separate classification (mission §5)

| Item | Evidence |
|---|---|
| Asset | `apps/desktop/src-tauri/resources/models/silero_vad_v4.onnx` (1,807,522 B upstream; R1-GAP-008 record) |
| Upstream | `snakers4/silero-vad`, tag `v4.0`, file `files/silero_vad.onnx` |
| License evidence | `SILERO_VAD_LICENSE_MIT.txt` (MIT verbatim) + `SILERO_VAD_PROVENANCE.json` alongside the asset on `origin/main` (commit `57b109fc`); reported SHA-256 `a35ebf52…` (truncated in the R1-GAP-008 title — full hash to be rebound from the provenance JSON before release) |
| Chain | 4-way byte match recorded (Handy pin blob `e6db48d6`, vad-rs fixture, wh1teagle release) — software-asset provenance, **not** a model-weight clearance |
| Current worktree state | **DELETED** in the dirty `feature/r1-gap-021-desktop-auth` worktree (`D` ×3: onnx + license + provenance). Deletion is uncommitted work-in-progress on another task; no conclusion is drawn from it here |
| Classification | **COMMERCIAL-CLEAR-WITH-ATTRIBUTION (provisional, asset-only)** — MIT-licensed software asset with verbatim license + provenance manifest on `origin/main`. Provisional because (i) the full SHA-256 must be rebound from the provenance JSON, (ii) the current worktree deletes the asset, and (iii) bundling/notice surfacing must be re-verified at release. Reported **separately**; excluded from the 69-count. |
| Commercial use / redistribution | Permitted under MIT subject to preserved copyright/permission notice; the notice file travels alongside the asset on `origin/main`. No GGUF-conversion issue applies (onnx shipped as-is). |

---

## 6. 69-row catalog reconciliation table

**Column key.** `Cat.lic` = E1 catalog-declared label (Handy metadata). `Ver.lic` = verified applicable weight license (always `UNVERIFIED` below — see §3.5). `Com` = commercial-use decision. `Red` = redistribution decision (Handy GGUF). `Class` = reconciled classification. `Rationale` codes: **A** weight commercial permission unevidenced · **B** Handy GGUF redistribution/hosting authorization unevidenced (E2 §10; E3 §4) · **C** conversion/quantization authorization unevidenced · **D** catalog label is Handy metadata, not the weight grant · **E** explicit NC / `other` (no license to clear on) · **F** HF tag/card ≠ grant; source-repo weight terms unverified (P1/P2 show tags only) · **G** label-vs-history conflict (Whisper MIT per E4 vs catalog apache-2.0; Moonshine Apache-2.0 per E4 vs catalog mit; Moonshine org mismatch P2).
Decisions use `NO` (not permitted on current evidence) / `UNKNOWN` (no license content to decide on). Notices: `—` = none evidenced; attribution strings are preserved in the registry only where a cleared classification would require them — with zero cleared models, no attribution is currently dispositive (E3 notices retained verbatim in implementation for audit trail, §8).

| # | Catalog model ID | Upstream base_model + pinned revision (full) | Cat.lic | Ver.lic | Evidence (field/section) | Com | Red | Notices | Class | Rationale |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | handy-computer/parakeet-unified-en-0.6b-gguf | nvidia/parakeet-unified-en-0.6b @ `7e948f21b7bdbac698d3318db9d350f1096f3b6c` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L9–40; E2 row 1; P-class: no weight text (cf. P1/P2 pattern) | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 2 | handy-computer/nemotron-3.5-asr-streaming-0.6b-gguf | nvidia/nemotron-3.5-asr-streaming-0.6b @ `6d44e540bc31b0de1dbe174a3cea87f53a7f22fb` | other | unknown | E1 L42–73; E2 row 2 (`unknown`) | UNKNOWN | UNKNOWN | — | UNKNOWN | E,B,C |
| 3 | handy-computer/canary-180m-flash-gguf | nvidia/canary-180m-flash @ `b147f9dc52b59f0998e410540a84727bd86457fd` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L75–107; E2 row 3 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 4 | handy-computer/cohere-transcribe-03-2026-gguf | CohereLabs/cohere-transcribe-03-2026 @ `dfa4adebb64f3076b7b6b90b721275cc069cb421` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L108–140; E2 row 4 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 5 | handy-computer/whisper-medium-gguf | openai/whisper-medium @ `ec78f06fded51aa82cde751678b78f76f78c8b7f` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L141–173; E2 row 5; E4 Whisper=MIT (conflict); P1 tag apache-2.0 only | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 6 | handy-computer/Voxtral-Mini-4B-Realtime-2602-gguf | mistralai/Voxtral-Mini-4B-Realtime-2602 @ `b3e1c979e3775cbd0a49a65878a0ec7f06789ed7` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L174–206; E2 row 6 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 7 | handy-computer/parakeet-tdt-0.6b-v3-gguf | nvidia/parakeet-tdt-0.6b-v3 @ `85ac09ea12fc4b1112fa76810059364bc6adc9de` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L207–239; E2 row 7 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 8 | handy-computer/parakeet-tdt-0.6b-v2-gguf | nvidia/parakeet-tdt-0.6b-v2 @ `07cee0616125a08ef619729bb47f40ef747e4bc4` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L240–272; E2 row 8 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 9 | handy-computer/Qwen3-ASR-0.6B-gguf | Qwen/Qwen3-ASR-0.6B @ `e4e16599b900eb0cb36e524514756bb92eb092b7` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L273–305; E2 row 9 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 10 | handy-computer/Fun-ASR-MLT-Nano-2512-gguf | FunAudioLLM/Fun-ASR-MLT-Nano-2512 @ `0b8f9c7bc545a219658aeb1dd4eeaa55d1cf89f3` | other | unknown | E1 L306–338; E2 row 10 (`unknown`); §3.7 FunAudioLLM terms unevidenced | UNKNOWN | UNKNOWN | — | UNKNOWN | E,B,C |
| 11 | handy-computer/canary-1b-flash-gguf | nvidia/canary-1b-flash @ `b427664769b93c021df108a2fa8bfb858ae236c1` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L339–371; E2 row 11 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 12 | handy-computer/canary-1b-v2-gguf | nvidia/canary-1b-v2 @ `58d13c2c0102229aad45f7e19a77ddc42b41dd9a` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L372–404; E2 row 12 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 13 | handy-computer/canary-1b-gguf | nvidia/canary-1b @ `f2eaa93b2221b6a28e5a00111a3e93f62964dff3` | cc-by-nc-4.0 | cc-by-nc-4.0 (catalog-declared; weight text unconfirmed) | E1 L405–437; E2 row 13 (`restricted`) | NO | NO | NC notice required if ever permitted (not permitted) | NON-COMMERCIAL | E |
| 14 | handy-computer/canary-qwen-2.5b-gguf | nvidia/canary-qwen-2.5b @ `3370d4e2f28cc70eea79dfc9f2f43fb91eef3163` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L438–470; E2 row 14 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 15 | handy-computer/cohere-transcribe-arabic-07-2026-gguf | CohereLabs/cohere-transcribe-arabic-07-2026 @ `715cbe09ca9b60fc1e497db1e4478fa9fcf4ac21` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L471–503; E2 row 15 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 16 | handy-computer/Fun-ASR-Nano-2512-gguf | FunAudioLLM/Fun-ASR-Nano-2512 @ `30360f003f99929c1e25c3f6222d02eccb04663c` | other | unknown | E1 L504–536; E2 row 16 (`unknown`); §3.7 terms unevidenced | UNKNOWN | UNKNOWN | — | UNKNOWN | E,B,C |
| 17 | handy-computer/gigaam-v3-ctc-gguf | ai-sage/GigaAM-v3 @ `c3c611444004820c21c3b68312a41c83c1e4813b` | mit | UNVERIFIED (catalog-declared mit) | E1 L537–569; E2 row 17 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 18 | handy-computer/gigaam-v3-e2e-ctc-gguf | ai-sage/GigaAM-v3 @ `075dff81f843cf23d22b4ce943ffdc4dd8650cd7` | mit | UNVERIFIED (catalog-declared mit) | E1 L570–602; E2 row 18 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 19 | handy-computer/gigaam-v3-rnnt-gguf | ai-sage/GigaAM-v3 @ `8f30356b4607ae2d79353ab7dc9e5eea6dc46b48` | mit | UNVERIFIED (catalog-declared mit) | E1 L603–635; E2 row 19 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 20 | handy-computer/gigaam-v3-e2e-rnnt-gguf | ai-sage/GigaAM-v3 @ `f719d70812344f4d0fb8c11c0887b190501a7465` | mit | UNVERIFIED (catalog-declared mit) | E1 L636–668; E2 row 20 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 21 | handy-computer/granite-speech-4.1-2b-nar-gguf | ibm-granite/granite-speech-4.1-2b-nar @ `ca53e8273416eb7e888f19bcebbcb9b6ab3edc17` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L669–701; E2 row 21 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 22 | handy-computer/granite-4.0-1b-speech-gguf | ibm-granite/granite-4.0-1b-speech @ `5899f364fb5bc4bae48c54dec8489aff40b70253` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L702–734; E2 row 22 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 23 | handy-computer/granite-speech-4.1-2b-gguf | ibm-granite/granite-speech-4.1-2b @ `58e7710fd7039ded5a185668eef5f71ca5d9d919` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L735–767; E2 row 23 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 24 | handy-computer/granite-speech-4.1-2b-plus-gguf | ibm-granite/granite-speech-4.1-2b-plus @ `f73a59df77fef89ac0a34bc539d09d756793b065` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L768–800; E2 row 24 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 25 | handy-computer/medasr-gguf | google/medasr @ `6f481df085bb50ae922cea918fb578e664237126` | other | unknown | E1 L801–833; E2 row 25 (`unknown`); §3.7 Google health-model gating unevidenced | UNKNOWN | UNKNOWN | — (gated-terms warning, §3.7) | UNKNOWN | E,B,C |
| 26 | handy-computer/moonshine-streaming-tiny-gguf | UsefulSensors/moonshine-streaming-tiny @ `85ddff612fa3a2cf40b2f745abcfa90ef82f293b` | mit | UNVERIFIED (catalog-declared mit) | E1 L834–863; E2 row 26; E4 Moonshine=Apache-2.0 (conflict) | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 27 | handy-computer/moonshine-tiny-gguf | UsefulSensors/moonshine-tiny @ `f5c11906eba3f44cf305eed30feb9cbfb0b4b9d0` | mit | UNVERIFIED (catalog-declared mit) | E1 L864–893; E2 row 27; P2 (different org, tag only) | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 28 | handy-computer/moonshine-tiny-ar-gguf | UsefulSensors/moonshine-tiny-ar @ `2360cb6893cb523da51875eaffc8050d2ca7b56d` | mit | UNVERIFIED (catalog-declared mit) | E1 L894–923; E2 row 28; per-model terms unevidenced (§3.2) | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 29 | handy-computer/moonshine-tiny-ja-gguf | UsefulSensors/moonshine-tiny-ja @ `627aae63193d6c47cbdf316346119dcdc65d9b0d` | mit | UNVERIFIED (catalog-declared mit) | E1 L924–953; E2 row 29; per-model terms unevidenced | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 30 | handy-computer/moonshine-tiny-ko-gguf | UsefulSensors/moonshine-tiny-ko @ `b858a303948b69c8b2442f700e936a07ba5f64da` | mit | UNVERIFIED (catalog-declared mit) | E1 L954–983; E2 row 30; per-model terms unevidenced | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 31 | handy-computer/moonshine-tiny-uk-gguf | UsefulSensors/moonshine-tiny-uk @ `b4c991eb4223caa4de770843185476b0c86056b4` | mit | UNVERIFIED (catalog-declared mit) | E1 L984–1013; E2 row 31; per-model terms unevidenced | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 32 | handy-computer/moonshine-tiny-vi-gguf | UsefulSensors/moonshine-tiny-vi @ `d97be0111a74a9058689beacc05b38969d2b68aa` | mit | UNVERIFIED (catalog-declared mit) | E1 L1014–1043; E2 row 32; per-model terms unevidenced | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 33 | handy-computer/moonshine-tiny-zh-gguf | UsefulSensors/moonshine-tiny-zh @ `2aca379ba0dc978d878b84b76231d5ba5550e738` | mit | UNVERIFIED (catalog-declared mit) | E1 L1044–1073; E2 row 33; per-model terms unevidenced | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 34 | handy-computer/moonshine-base-gguf | UsefulSensors/moonshine-base @ `3ef112378a8cf46ac8b278d9bfa2d15c846704b8` | mit | UNVERIFIED (catalog-declared mit) | E1 L1074–1103; E2 row 34; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 35 | handy-computer/moonshine-base-ar-gguf | UsefulSensors/moonshine-base-ar @ `1ae85af52b16eac8bcebda0287e6195ed1956e86` | mit | UNVERIFIED (catalog-declared mit) | E1 L1104–1133; E2 row 35; per-model terms unevidenced | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 36 | handy-computer/moonshine-base-ja-gguf | UsefulSensors/moonshine-base-ja @ `aac5cfff17ae28b6f17ae790a3e309ae0ca5911c` | mit | UNVERIFIED (catalog-declared mit) | E1 L1134–1163; E2 row 36; per-model terms unevidenced | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 37 | handy-computer/moonshine-base-ko-gguf | UsefulSensors/moonshine-base-ko @ `03813c71abe85b40cd0671d3cfa420e831d7e333` | mit | UNVERIFIED (catalog-declared mit) | E1 L1164–1193; E2 row 37; per-model terms unevidenced | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 38 | handy-computer/moonshine-base-uk-gguf | UsefulSensors/moonshine-base-uk @ `d6ec586909c5209c0c17243dc4f5e55164f85dfb` | mit | UNVERIFIED (catalog-declared mit) | E1 L1194–1223; E2 row 38; per-model terms unevidenced | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 39 | handy-computer/moonshine-base-vi-gguf | UsefulSensors/moonshine-base-vi @ `76ccec93f5854ae16d2dab72d5b762fe10c0df81` | mit | UNVERIFIED (catalog-declared mit) | E1 L1224–1253; E2 row 39; per-model terms unevidenced | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 40 | handy-computer/moonshine-base-zh-gguf | UsefulSensors/moonshine-base-zh @ `64385c681d79767be73ce8591b4609854ac750c9` | mit | UNVERIFIED (catalog-declared mit) | E1 L1254–1283; E2 row 40; per-model terms unevidenced | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 41 | handy-computer/moonshine-streaming-small-gguf | UsefulSensors/moonshine-streaming-small @ `41444173ed8210852a883e046fadcfba3e7bfbae` | mit | UNVERIFIED (catalog-declared mit) | E1 L1284–1313; E2 row 41; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 42 | handy-computer/moonshine-streaming-medium-gguf | UsefulSensors/moonshine-streaming-medium @ `c722a9455a40a1844c3d25267dc84eff61d8dd84` | mit | UNVERIFIED (catalog-declared mit) | E1 L1314–1343; E2 row 42; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 43 | handy-computer/moss-transcribe-diarize-gguf | OpenMOSS-Team/MOSS-Transcribe-Diarize @ `6fdfa33aed776bbb0ac11a1a9835634fe6d75dd7` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L1344–1376; E2 row 43 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 44 | handy-computer/nemotron-speech-streaming-en-0.6b-gguf | nvidia/nemotron-speech-streaming-en-0.6b @ `7d9b719206789e4068d87c6398262ab4dfd4e45d` | other | unknown | E1 L1377–1408; E2 row 44 (`unknown`) | UNKNOWN | UNKNOWN | — | UNKNOWN | E,B,C |
| 45 | handy-computer/parakeet-tdt_ctc-110m-gguf | nvidia/parakeet-tdt_ctc-110m @ `9d66d34f9e1594075c5dd72c90c0f4c321b29f21` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L1410–1441; E2 row 45 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 46 | handy-computer/multitalker-parakeet-streaming-0.6b-v1-gguf | nvidia/multitalker-parakeet-streaming-0.6b-v1 @ `31042fb4b5018be38240018492bdbde1923789dc` | other | unknown | E1 L1443–1480 (12 files incl. `bundle/`); E2 row 46 (`unknown`) | UNKNOWN | UNKNOWN | — | UNKNOWN | E,B,C |
| 47 | handy-computer/parakeet-ctc-0.6b-gguf | nvidia/parakeet-ctc-0.6b @ `cdc56f0467ec675a9509a46ef2e83f4c9e49af94` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L1482–1514; E2 row 47 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 48 | handy-computer/parakeet-rnnt-0.6b-gguf | nvidia/parakeet-rnnt-0.6b @ `6001ebcc1c64dd821cf70b7b4ffdd4d18097760a` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L1516–1547; E2 row 48 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 49 | handy-computer/parakeet-ctc-1.1b-gguf | nvidia/parakeet-ctc-1.1b @ `a9607fbeb480b4a66a3e8bd77efc490e8410cdd4` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L1548–1580; E2 row 49 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 50 | handy-computer/parakeet-primeline-gguf | primeline/parakeet-primeline @ `90880dc372f8cc0025ae7a08d2c887278124a538` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L1581–1612; E2 row 50 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 51 | handy-computer/parakeet-tdt-1.1b-gguf | nvidia/parakeet-tdt-1.1b @ `8c21810615694c53a4f4745996190fcca880f8e5` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L1614–1645; E2 row 51 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 52 | handy-computer/parakeet-rnnt-1.1b-gguf | nvidia/parakeet-rnnt-1.1b @ `58c3f5108699a6aba6d6dbb21f8fa153fe7d3f62` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L1647–1678; E2 row 52 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 53 | handy-computer/parakeet-tdt_ctc-1.1b-gguf | nvidia/parakeet-tdt_ctc-1.1b @ `f1ea20171bfb7a1741e8b695d02e0a9bb2855996` | cc-by-4.0 | UNVERIFIED (catalog-declared cc-by-4.0) | E1 L1680–1712; E2 row 53 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 54 | handy-computer/Qwen3-ASR-1.7B-gguf | Qwen/Qwen3-ASR-1.7B @ `92282af1610a2db19d66f2bef1e260f5deca782d` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L1713–1744; E2 row 54 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 55 | handy-computer/SenseVoiceSmall-gguf | FunAudioLLM/SenseVoiceSmall @ `4a08b8e900b38a977e32eb08d5d0697d6e72ba04` | other | unknown | E1 L1746–1777; E2 row 55 (`unknown`); §3.7 terms unevidenced | UNKNOWN | UNKNOWN | — | UNKNOWN | E,B,C |
| 56 | handy-computer/Voxtral-Mini-3B-2507-gguf | mistralai/Voxtral-Mini-3B-2507 @ `5690205813042c07cbaa86d2a9dcc585fcd31304` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L1779–1810; E2 row 56 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 57 | handy-computer/Voxtral-Small-24B-2507-gguf | mistralai/Voxtral-Small-24B-2507 @ `3b85044238d7d73b0063c54ee6d0754b5f061795` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L1812–1843; E2 row 57 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 58 | handy-computer/whisper-tiny-gguf | openai/whisper-tiny @ `6687f30c99641ee265df421e582354adbc8848fc` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L1845–1876; E2 row 58; E4 Whisper=MIT (conflict); P1 pattern | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 59 | handy-computer/whisper-tiny.en-gguf | openai/whisper-tiny.en @ `becb8bcb804405dc97b380a523d9975888820986` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L1878–1909; E2 row 59; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 60 | handy-computer/whisper-base-gguf | openai/whisper-base @ `e0f69524f648720eca44c024d1d0dbb7027d1fa0` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L1911–1942; E2 row 60; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 61 | handy-computer/whisper-base.en-gguf | openai/whisper-base.en @ `cf0804db15fb341d00c9274b90da9cbb4fe2e5c6` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L1944–1975; E2 row 61; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 62 | handy-computer/whisper-small.en-gguf | openai/whisper-small.en @ `41b0f75fd44415ba127a5356c5ba9ed450c1debd` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L1977–2008; E2 row 62; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 63 | handy-computer/whisper-small-gguf | openai/whisper-small @ `c0214bd34be9296695486f838e0142f900803159` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L2010–2041; E2 row 63; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 64 | handy-computer/whisper-medium.en-gguf | openai/whisper-medium.en @ `f25c70d9095dcfdad187ebb3b113d157b414aee8` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L2043–2074; E2 row 64; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 65 | handy-computer/whisper-large-v3-turbo-gguf | openai/whisper-large-v3-turbo @ `5eaf945c7978e564bae5b28a5b1639dd93c2bfb1` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L2076–2106; E2 row 65; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 66 | handy-computer/Breeze-ASR-25-gguf | MediaTek-Research/Breeze-ASR-25 @ `1e5e8d7295110e1e14e305e9cf7411d82711beaa` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L2108–2139; E2 row 66 | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F |
| 67 | handy-computer/whisper-large-gguf | openai/whisper-large @ `1b99acc257d1a605153c9e4d818a065569a3fdcd` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L2141–2172; E2 row 67; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 68 | handy-computer/whisper-large-v2-gguf | openai/whisper-large-v2 @ `b64d145562182428ef04ca992b182aec8c61e578` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L2174–2205; E2 row 68; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |
| 69 | handy-computer/whisper-large-v3-gguf | openai/whisper-large-v3 @ `e3e29bee6389c7da4a141406f07bb80ddac5337c` | apache-2.0 | UNVERIFIED (catalog-declared apache-2.0) | E1 L2207–2237; E2 row 69; E4 conflict | NO | NO | — | INSUFFICIENT-PROVENANCE | A,B,C,D,F,G |

Artifact hashes: every row's per-quant `sha256`/`size_bytes` are Handy-claimed values inside E1 at the cited lines (367 files total); they are **not** upstream-confirmed and no conversion record links any Handy revision to its base checkpoint — hence rationale B/C on every row. No hash is reproduced here as proof of anything beyond "E1 claims it". Default-quant example (directly read): row 1 default `Q8_0` → `parakeet-unified-en-0.6b-Q8_0.gguf`, sha256 `4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795` (E1 L33) — Handy-claimed, unconfirmed.

### Reconciled classification totals (must sum to exactly 69; Silero separate)

| Classification | Count | IDs |
|---|---|---|
| COMMERCIAL-CLEAR | **0** | — |
| COMMERCIAL-CLEAR-WITH-ATTRIBUTION | **0** | — |
| NON-COMMERCIAL | **1** | row 13 (`canary-1b-gguf`) |
| PROHIBITED | **0** | — (no terms text evidences a prohibition finding; MedASR/FunASR stay UNKNOWN per §3.7) |
| UNKNOWN | **7** | rows 2, 10, 16, 25, 44, 46, 55 |
| INSUFFICIENT-PROVENANCE | **61** | all remaining rows (25 apache-2.0 + 21 mit + 15 cc-by-4.0 by catalog label) |
| **Total catalog entries** | **69** | 0+0+1+0+7+61 = 69 ✔ |
| Silero VAD asset (separate, §5) | 1 asset | provisional COMMERCIAL-CLEAR-WITH-ATTRIBUTION, not counted in the 69 |

---

## 7. Explicit unresolved questions and evidence conflicts

- **Q1.** The "13 restricted" figure (unsourced): which 5 models beyond the citable 8? No source artifact — cannot resolve; nothing classified on it.
- **Q2.** Full per-model primary-source verification (67 remaining base-model pages, all weight LICENSE texts, Handy authorization records) — NOT EXECUTED in this stage (§4 P3); required before any future clearance.
- **Q3.** Exact MedASR (`google/medasr`) terms text — missing; model stays UNKNOWN with gating warning.
- **Q4.** NVIDIA per-model terms (Parakeet/Canary/Nemotron/Multitalker) incl. any redistribution/notice/downstream conditions — missing.
- **Q5.** FunAudioLLM per-artifact terms (Fun-ASR MLT Nano, Fun-ASR Nano, SenseVoiceSmall) — missing; no NC/PROHIBITED asserted without text.
- **Q6.** "OpenMDW" — unmapped name; no catalog/base-model/publisher match; no classification based on it.
- **Q7.** "56 commercially clear" figure — unsourced; rejected (§3.3).
- **Q8.** Universal conversion/quantization authorization — zero evidence for all 69 (§3.6).
- **Q9.** Handy redistribution/hosting authorization (HF org + blob mirror) — zero evidence for all 69 (§3.4).
- **C1.** E1-vs-E4 Whisper license conflict (apache-2.0 vs MIT) — recorded, fail-closed (§3.5.1).
- **C2.** E1-vs-E4 Moonshine license conflict (mit vs Apache-2.0) + P2 org mismatch — recorded, fail-closed (§3.5.2).
- **C3.** Supplied-audit claims vs E1/E2/E3 counts (13 vs 8; 56 vs 61/0; zero-unknown vs 7+61) — recorded, candidate claims rejected (§3.1/3.3/3.4).
- **C4.** Silero full SHA-256 pracuje truncation + current-worktree deletion — recorded, provisional only (§5).

No contradictory evidence was silently reconciled. Every conflict above keeps the affected models blocked.

---

## 8. Implementation decision (mission §6 — proposed corrections; status: PROPOSED, not yet implemented at report time)

The feature-branch registry (E3) is **incorrect as a clearance**: it exposes 61 models on catalog labels alone. Focused correction (no unrelated functionality):

1. Successor branch off `feature/t10-commercial-model-gate` (or that branch itself if clean): reclassify the 61 permissive-label entries to `INSUFFICIENT-PROVENANCE` (`commercial_use: false`, notices retained verbatim for audit trail); keep 1 `NON-COMMERCIAL` + 7 `UNKNOWN` unchanged; preserve all 69 entries with status + rationale (no deletions).
2. Update `MODEL_LICENSES.md` counts to 0 approved / 69 blocked with this report as evidence basis; keep the fail-closed policy text unchanged.
3. Gate logic (`catalog/commercial.rs`) already treats `INSUFFICIENT-PROVENANCE` as NOT CLEARED — no logic change required; update the two tests that assert cleared models/counts (61/8 → 0/69) and add a regression test pinning zero-clearance to this report.
4. `managers/model.rs` enforcement already keys off the single `is_commercially_cleared` rule — no bypass change; verify no hard-coded totals remain (replace with registry counts).
5. Attribution/notice files preserved; nothing removed from historical evidence; no model functionality changed.

Completion criterion restated: no model described as commercially cleared unless weight-level commercial + redistribution evidence exists (currently: none); every non-cleared model technically unavailable for commercial production use via the existing gate.

---

## 9. Status ledger (mission §8 reporting rules)

| Item | Status | Meaning here |
|---|---|---|
| Reconciliation report (this file) | **IMPLEMENTED** | 69-row evidence-backed reconciliation complete; totals sum to 69; Silero separate |
| Registry correction + tests + validation | **DEFERRED** | Proposed in §8; implementation follows report approval on the feature/successor branch (must not piggyback the dirty R1-GAP-021 worktree) |
| E2E validation | **NOT EXECUTED** | Environment-gated; will be recorded NOT EXECUTED with reason at implementation time if unsupported |
| Supplied-audit clearance claims (56 clear, zero unknown, universal conversion rights) | **BLOCKED** | No source artifact; contradicted by E1–E4; models stay blocked |
| Q2–Q6 primary-source gaps | **BLOCKED** | Missing weight texts / authorizations; fail-closed |
| Independent legal sign-off / human approval | **NOT EXECUTED** | Never claimed; commercial release additionally requires legal review beyond this technical reconciliation |

Source evidence (E1–E6, P1–P2), implementation status (§8–§9), and legal/compliance conclusions (no clearance on current evidence; legal sign-off still required) are kept distinct throughout. No COMPLETE/PASS/VERIFIED label from any prior report was accepted at face value.

## Skill Selection (this report task)

- Task classification: licensing/provenance, Handy upstream analysis, model/catalog/asset handling, repository/Git, GitHub, Rust, security, testing/QA, documentation/ADR applicable; frontend/Supabase/payments/MCP inspected, not applicable.
- Mandatory skills loaded and used: `supply-chain-risk-auditor` (evidence-handling procedure), `gh-cli` (SHA/ref evidence), `github` (run/PR evidence reads), `rust-engineer` + `rust-review` (gate-code inspection), `security-guidance` + `securability-engineering` (trust-boundary treatment).
- MCP/tools used: git CLI, file Read/Grep, webfetch (P1/P2). No Supabase/Cloudflare/payment MCPs (no such scope).
- Skills not selected with reason: `vitest`/`playwright` (no UI/E2E change), `semgrep`/`codeql` (CLIs absent), tauri/cloud/supabase families (out of scope).
- Authority boundary: repo facts from repo; upstream facts from fetched pages only; tags never treated as grants.
- Conflicts: none. Result: CLEAR.
