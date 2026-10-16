# T10-COMMERCIAL-GATE-EVIDENCE-019 — Permissive-Bucket Provenance Pilot (Moonshine Tiny)

**Date:** 2026-10-09 (UTC)
**Task:** T10-COMMERCIAL-GATE-EVIDENCE-019
**Type:** Evidence-only pilot. Single model. No licensing classification changed. No production registry change. No model cleared.
**Catalog under review:** `apps/desktop/src-tauri/src/catalog/catalog.json` (catalog_version 2, generated 2026-08-17T11:27:14+00:00, mirror `https://blob.handy.computer`)
**Prior context:** `T10-PROVENANCE-BATCH-013-REPORT.md` (2026-10-09, multi-family evidence review — this pilot deepens exactly one MIT-bucket entry from that batch)

---

## 0. Gate records

### 0.1 Mandatory skill-selection gate

Task domains per `07_AI_SKILLS.md` matrix: GitHub/Git (upstream + artifact inspection), Security incl. supply-chain (model-artifact review, payments/licensing row), Rust (commercial-gate catalog/model-manager context). No dedicated Handy/STT-licensing skill is installed (matrix: Audio — none; STT/ML — none; Payments/licensing — no dedicated skill, covered by security + supply-chain guidance). Loaded the narrowest installed skills covering the task:

| Skill | Matrix domain | Used for in this pilot |
|---|---|---|
| `github` | GitHub/Git | HF + GitHub primary-source retrieval workflow |
| `supply-chain-risk-auditor` | Security (supply chain) | Supply-chain evidence discipline: artifact↔upstream linkage, no-inference-from-availability rule |
| `security-guidance` | Security (ASVS-aligned) | Security review posture for model artifacts (untrusted model metadata, checksum≠authorization) |
| `rust-review` | Rust (review/hardening) | Rust commercial-gate context (catalog/`mod.rs`/model-manager read-only awareness; no code touched) |

Not loaded (with reason): `semgrep`/`codeql` (CLIs absent on host; no source scan in scope), `secure-workflow-guide` (smart-contract workflow, inapplicable), `securability-engineering` (generation skill; evidence-only task generates no code), `rust-engineer` (implementation skill; no implementation), all frontend/Tauri/Supabase/Cloudflare/testing skills (outside task scope). No skill is claimed as a legal licensing authority — all licensing conclusions below rest on located license texts, not on skill guidance.

### 0.2 Canonical authority and policy gate

Authorities read before work:

1. `docs/archive/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md` (v3.0.0, Authoritative) — SOFTWARE ≠ WEIGHT-REDISTRIBUTION ≠ HOSTING distinction; VERIFIED requires explicit commercial + redistribution grants, exact provenance, checksum; unknown = BLOCKED; mirror/hosting policy (§9); audit trail (§10).
2. `decisions/ADR-026-handy-foundation.md` — Handy code provenance (cjpais/Handy @ `ba10ce19…`, MIT code). Code provenance only; grants no model-weight rights.
3. `T08-HANDY-PROVENANCE-REPORT.md` — Handy *code* chain-of-custody (VERIFIED). Distinct from model-weight provenance (this pilot).
4. `09_SECURITY_BASELINE.md` §15 (model supply chain: verify license, source, checksum, file set; never execute model-provided scripts) and §19 (read-only default, audit trail).
5. `10_ADR_INDEX.md` — ADR required only when *changing* architecture/backend/payment-auth/data-model/deployment/platform/privacy. This evidence-only task changes nothing → **no licensing ADR is required for this activity**; none was created.
6. `07_AI_SKILLS.md` Skill Selection Gate + matrix (see §0.1).
7. `11_INTERRUPTION_HANDOFF.md` — handoff requirements (this report + session record serve as the handoff; no STATUS/NEXT files modified per non-authorization below).

Owner-authorization verification: the prompt authorizes read-only repo/primary-source inspection, catalog + Git history inspection, upstream metadata/license retrieval, and **one evidence report only** after verifying destination and confirming no independent policy prohibits writing there. Proposed activity (read-only fetches + one root-level report) is within that grant. Explicit non-authorizations observed: no edits to `MODEL_LICENSES.*`, `catalog.json`, `catalog/mod.rs`, model manager, classifications, plans, scopes, workflow state, or ADRs; no commit/stage/push/PR/merge; no worktree evasion; no contact with `feature/r1-gap-021-desktop-auth` work content (see §7 — branch context is pre-existing, not created by this task).

Destination verification: `.gitignore` contains no prohibition on root `*-REPORT.md` (only `playwright-report/` matches "report"); `T10-PROVENANCE-BATCH-013-REPORT.md` (untracked, root) establishes the destination precedent for T10 provenance evidence. **Destination `T10-COMMERCIAL-GATE-EVIDENCE-019-REPORT.md` at repository root is allowed; no path policy or authority check denied the write.**

### 0.3 Scope selection

Exactly one catalog entry, selected from the actual repository (no invented ID):

- **Selected:** `handy-computer/moonshine-tiny-gguf` — English Tiny, non-streaming, 27M params, catalog `license: "mit"`, `base_model: "UsefulSensors/moonshine-tiny"`.
- **Rationale:** satisfies the "prefer English Tiny/Base or streaming" instruction and sits in the upstream MIT-default bucket (English-language models are expressly MIT per the rights-holder LICENSE preamble, fetched 2026-10-09), making it the narrowest suitable permissive-bucket candidate. No other model family investigated.

---

## 1. Artifact identity (catalog-sourced, read-only)

- **Exact catalog ID:** `handy-computer/moonshine-tiny-gguf`
- **Full Handy revision SHA:** `f5c11906eba3f44cf305eed30feb9cbfb0b4b9d0` (40-hex; Handy repo revision, not an upstream SHA)
- **Slug / name:** `moonshine-tiny` / "Moonshine Tiny"; architecture `moonshine`, family `moonshine`, `default_quant: Q8_0`
- **Catalog `base_model` claim:** `UsefulSensors/moonshine-tiny`; catalog `license` label: `mit`
- **Files (names, sizes, catalog checksums — identity/integrity only, not authorization):**

| Filename | Quant | Size (bytes) | SHA-256 (catalog) |
|---|---|---|---|
| `moonshine-tiny-Q8_0.gguf` | Q8_0 | 35466912 | `2fd348d7b38f97d309cc3ec6848f3f57f537b80244950f07d2637e463f95a3a1` |
| `moonshine-tiny-F16.gguf` | F16 | 59244192 | `d115694627d146c347ac5209db69db48b3125b07971026a6119b1888db7563d3` |
| `moonshine-tiny-F32.gguf` | F32 | 109969056 | `67e50023e13f295d6efb8500b69a538019ff7c2dd4b577e425260048e8035418` |

- **Immutable artifact URLs (HF `resolve/main` form):** `https://huggingface.co/handy-computer/moonshine-tiny-gguf/resolve/main/moonshine-tiny-{F32,F16,Q8_0}.gguf`
- **Artifact page:** `https://huggingface.co/handy-computer/moonshine-tiny-gguf` (header License: mit; tags GGUF/English/transcribe.cpp; paper 2410.15608). Revision-pinned (`resolve/<sha>`) artifact URLs were not recorded on the card; only `resolve/main` links are published there.

---

## 2. Upstream weight identity

- **Canonical upstream repository (as claimed by Handy card):** `https://huggingface.co/UsefulSensors/moonshine-tiny` (predecessor org of `moonshine-ai`; the HF model tree on the Handy page now names base model `moonshine-ai/moonshine-tiny` — org-rename alias, see §5.1).
- **Exact immutable weight revision (as claimed by Handy card):** commit `390624e`, pinned 2026-05-05. Card text: "Ported from upstream commit `390624e`, pinned 2026-05-05."
- **Independent corroboration obtained this pilot:** `https://huggingface.co/UsefulSensors/moonshine-tiny/resolve/390624e/README.md` resolves (HTTP 200, fetched 2026-10-09) and its front-matter is `license: mit` with the standard Moonshine English-tiny model card body. The commit therefore exists and carries an MIT license *field* at that revision. Full per-file weight manifest (safetensors shards + config hashes) at `390624e` was not enumerated — gap recorded in §6.
- **Weight manifest / license file at that revision:** **no `LICENSE` file exists in the weight repo** — `…/resolve/390624e/LICENSE` returns 404 (fetched 2026-10-09). The weight-level grant text lives outside the weight repo, in the rights-holder source repository (next bullet). The front-matter `license: mit` is uploader-supplied metadata, not a grant; it is corroborating evidence only.
- **License grant text (rights-holder source):** `https://raw.githubusercontent.com/moonshine-ai/moonshine/main/LICENSE` (fetched 2026-10-09). Preamble: *"Moonshine models are released under the MIT License by default, in every language and at every size. This includes all streaming speech-to-text models and all English-language models… Any speech-to-text model not named in that [legacy Community-License] list is MIT, including every streaming model and the English Tiny and Base models."* SECTION 1 = MIT License, © 2025 Useful Sensors, Inc. (dba Moonshine AI), granting use/copy/modify/merge/publish/distribute/sublicense/sell with copyright + permission notice retention. README License section of the same repo (fetched 2026-10-09) states identically: *"The models are MIT by default too, in every language and at every size — the only exceptions are the legacy non-streaming models for languages other than English."*
- **Evidence that the license applies to these exact weights:** (a) moonshine-tiny is an English-language STT model not named in the legacy exclusion list → inside the MIT-default bucket by the rights-holder's own exhaustive-list construction; (b) the weight repo at the claimed pinned commit carries `license: mit` front-matter. What is **not** established: a signed or revision-bound instrument tying the MIT text to weight commit `390624e` (the GitHub LICENSE is at `main`, undated in evidence retrieved; no commit pin of the LICENSE change was recorded). Per §17 of the model-license policy, weight rights are not inferred from the software/code license — the MIT *model* default above is a model-level statement and is treated as the weight grant only insofar as the rights-holder's text expressly says "Moonshine models are released under the MIT License"; the residual binding-to-revision gap is recorded in §6 rather than assumed away.

---

## 3. Conversion provenance

- **Converter identity / version / immutable source revision (as claimed by Handy card):** conversion for `transcribe.cpp` (`https://github.com/handy-computer/transcribe.cpp`); card states *"Validated against the transformers reference at transcribe.cpp commit `07a8a84` on 2026-05-05."* The transcribe.cpp repo page was reached 2026-10-09 but commit `07a8a84` was **not independently verified** (page fetch truncated; no commit-SHA confirmation, no converter version number beyond the SHA).
- **Conversion/quantization record:** the card publishes a Downloads table (F32 110 MB, F16 59 MB, Q8_0 35 MB) and a WER validation statement: full LibriSpeech test-clean (2,620 utterances), F32 4.58% vs upstream self-reported 4.55%, Q8_0 4.60% (+0.02 pp vs F32, within bootstrap CI noise), decoded with transcribe.cpp defaults (greedy, num_beams=1, max_length=194). This is a *validation* record, not a conversion log: it evidences behavioral fidelity, not the transformation chain.
- **Input/output digest linkage:** **missing.** No per-file source mapping (which upstream `390624e` weight file produced which GGUF), no upstream input checksums, no output checksums recorded at conversion time, no reproducible conversion script/commit linking `390624e` → the three cataloged GGUF SHAs in §1. Catalog checksums therefore identify *claimed bytes* but do not trace them to the claimed upstream weights.
- **Traceability verdict:** the artifact is *plausibly* traceable (pinned upstream commit + matching model identity + tight WER fidelity), but **not cryptographically traceable**: filenames, sizes, checksums, and public availability were not treated as proof of authorization, per task rule.

---

## 4. Redistribution and hosting

- **Applicable redistribution grant (claimed):** Handy card License section: *"Inherited from the base model: **MIT**. See the upstream model card for full terms."* This is a **claim of inheritance, not a grant instrument**. If the MIT model-default attaches to these weights (see §2), its text permits distribute/sublicense/sell subject to notice retention — but no party has produced a conversion-specific or artifact-specific redistribution authorization covering the quantized GGUF form.
- **Attribution / notice / distribution obligations (conditional on the MIT grant attaching):** retain the MIT copyright notice (`Copyright (c) 2025 Useful Sensors, Inc. (dba Moonshine AI)`) and permission notice in all copies or substantial portions. No "Powered by" or registration duties apply to this bucket (those belong to the Community License, which does not cover English Tiny).
- **Authorization for the Handy artifact repository (`handy-computer/moonshine-tiny-gguf`):** **not found.** No THEORY-of-authority document (grant, assignment, or permission from Useful Sensors / Moonshine AI to handy-computer to convert and publish) was located on the artifact page or in the local repository.
- **`blob.handy.computer` mirror authorization:** **not found.** Catalog lists mirror `https://blob.handy.computer`; no hosting grant, mirror agreement, or authorization chain for that host was located this pilot.
- **Conditions/limitations relevant to redistribution:** MIT notice-retention (if grant attaches); otherwise fail-closed — redistribution and hosting remain **UNVERIFIED** (§6).

---

## 5. Provenance-chain table

| Link | Claimed | Independently established this pilot | Status |
|---|---|---|---|
| Catalog ID + Handy revision | `handy-computer/moonshine-tiny-gguf` @ `f5c11906…b4b9d0` | Read verbatim from local `catalog.json` | ESTABLISHED |
| Artifact files + checksums | 3 files, sizes + SHA-256 (§1) | Read verbatim from local `catalog.json` | ESTABLISHED (identity only) |
| Immutable artifact URLs | `resolve/main/…` links on HF page | Retrieved from artifact page 2026-10-09 | ESTABLISHED (`main`-pinned; SHA-pinned form not published) |
| Upstream repo | `UsefulSensors/moonshine-tiny` | Card claim + `resolve/390624e` fetch success | ESTABLISHED (subject to org-alias note §5.1) |
| Upstream weight revision | `390624e` (2026-05-05) | Commit resolves; README at that commit carries `license: mit` | CORROBORATED (manifest not enumerated) |
| Weight license file at revision | — | 404: no LICENSE in weight repo | GAP (grant lives in GitHub repo LICENSE) |
| Model-level MIT grant | MIT default incl. English Tiny | GitHub LICENSE + README License section, fetched 2026-10-09 | ESTABLISHED (revision binding of LICENSE text itself not pinned) |
| Converter identity/revision | transcribe.cpp @ `07a8a84` | Card claim only; not independently verified | UNVERIFIED |
| Conversion log / digest linkage | — | Not found | MISSING |
| Redistribution authorization (GGUF) | "Inherited MIT" (card claim) | Claim located; no grant instrument found | UNVERIFIED |
| Hosting authorization (`blob.handy.computer`) | — (catalog mirror field only) | Not found | UNVERIFIED |
| Attribution obligation text | MIT notice retention | From MIT SECTION 1 text | ESTABLISHED (conditional on grant attaching) |

### 5.1 Contradictions and gaps (no inference beyond evidence)

1. **Model-tree vs card-text base-model alias:** HF model tree on the artifact page names base model `moonshine-ai/moonshine-tiny`; card prose cites `UsefulSensors/moonshine-tiny` (and the catalog `base_model` agrees with the latter). Consistent with the known UsefulSensors→Moonshine-AI org rename; treated as an unresolved alias, not a contradiction of substance. Per-model confirmation deferred — no clearance inference drawn.
2. **`license: mit` front-matter vs absent LICENSE file:** the weight repo asserts MIT in metadata at the pinned commit but ships no license text; the operative text is in a different repository (`moonshine-ai/moonshine` LICENSE at `main`). Channel split recorded; not papered over.
3. **MIT "Software" wording vs weight coverage:** the MIT text grants rights in "the Software"; whether quantized weight files are within that term for this artifact is a legal characterization this evidence task does not decide. The rights-holder's preamble expressly extends MIT to the *models*, which is the basis for treating the bucket as permissive-but-unverified rather than blocked — full clearance still requires the missing linkage in §6.
4. **Code-license non-inference honored:** Handy code MIT (ADR-026 / T08) was not used as evidence of weight rights at any point.
5. **No availability/checksum inference:** public HF availability, matching filenames/sizes, and catalog checksums were used for identity only, never as authorization evidence.

---

## 6. Statuses and missing evidence

| Dimension | Status | Basis |
|---|---|---|
| Commercial use (weight license) | PERMISSIVE-CONDITIONAL (notice retention), revision-binding incomplete | MIT model-default expressly covers English Tiny; front-matter `mit` at pinned commit corroborates; LICENSE-text-to-weight-revision pin missing |
| Conversion / quantization permission | UNVERIFIED | No conversion log, no per-file mapping, converter commit unverified |
| Redistribution (GGUF artifact) | UNVERIFIED | "Inherited MIT" is a claim, not a grant; no artifact-specific authorization located |
| Hosting (`blob.handy.computer` + HF) | UNVERIFIED | No hosting/mirror grant located |
| Attribution obligations | IDENTIFIED (conditional) | MIT copyright + permission notice retention, if grant attaches |

**Missing evidence (blocking chain completeness):**

1. Upstream weight file manifest at `390624e` (filenames + hashes) and per-file mapping to the three GGUF outputs.
2. Converter verification: transcribe.cpp commit `07a8a84` existence + converter version + conversion script/log with input/output digests.
3. Revision pin of the rights-holder LICENSE text (which commit established the MIT default; does it predate the `390624e` weights).
4. Artifact-specific redistribution authorization (or legal determination that the MIT model grant suffices for third-party GGUF redistribution).
5. `blob.handy.computer` hosting/mirror authorization chain.
6. Resolution of the `moonshine-ai` vs `UsefulSensors` base-model alias at the weight-repo level.

**Chain verdict: INCOMPLETE — BLOCKED for any commercial-use, redistribution, or hosting reliance.** The permissive MIT bucket is substantiated at the license-text layer but the artifact-level chain (conversion linkage → redistribution grant → hosting authorization) is not established.

---

## 7. Integrity confirmations and handoff

- **No production files changed:** `git status` inspected 2026-10-09 — no modifications to `MODEL_LICENSES.*` (absent from tree; untouched), `catalog.json`, `catalog/mod.rs`, model manager, plans, scopes, workflow state, ADRs, branches, or PRs by this task. Pre-existing working-tree changes on the current branch belong to unrelated R1 work and were not touched, staged, or committed.
- **No registry/catalog/classification change:** none made, none recommended.
- **R1 worktree untouched:** no file under R1 auth scope was read for content beyond status listing; the `.swarm-worktrees/r1-gap-021-desktop-auth` worktree was not entered; no `feature/r1-gap-021-desktop-auth` work content was modified. (Note: the session shell runs on branch `feature/r1-gap-021-desktop-auth` as pre-existing context; this task created no commits and staged nothing there.)
- **Checks executed:** local catalog read (exact ID/revision/files/checksums); catalog Git history (`c693dea9` restore provenance); HF artifact page retrieval (conversion claims, WER record, license claim, download URLs); upstream `resolve/390624e` README retrieval (commit existence + `license: mit` front-matter); upstream `resolve/390624e` LICENSE retrieval (404 — absence recorded as evidence); rights-holder GitHub LICENSE + README retrieval (MIT model-default text + exclusion list); `.gitignore`/destination policy check; `git status`/worktree listing (non-interference confirmations); skill-gate record (§0.1); authority/policy gate record (§0.2).
- **Checks not executed:** byte-level download + checksum re-verification of GGUF artifacts; upstream weight manifest enumeration; transcribe.cpp commit verification; converter-log search beyond the artifact page; blob.handy.computer reachability/authorization probe; license-text revision archaeology (LICENSE commit history); any SAST/lint/test gates (no code changed); any reviewer dispatch (independent review is handed off, not performed here).
- **Report path:** `T10-COMMERCIAL-GATE-EVIDENCE-019-REPORT.md` (repository root; sole file created by this task).
- **Independent review requirements (per `17_MODEL_LICENSE_AND_PROVENANCE.md` §§4/7/10 and `09_SECURITY_BASELINE.md` §15):** a separate reviewer — not the author of this report — must (a) re-verify each §5 chain link against the cited primary sources, (b) rule on whether the MIT model-default text constitutes a weight-level grant for GGUF redistribution (legal determination, not an engineering inference), (c) close or accept the six §6 gaps, and (d) record the outcome in the compliance audit trail (`docs/COMPLIANCE/`, model manifest, release notes per policy §10) before any registry or release decision. No self-approval is claimed.

**NO REGISTRY CHANGE; NO MODEL CLEARED.** No commercial release is recommended. No model classification is changed by this report.
