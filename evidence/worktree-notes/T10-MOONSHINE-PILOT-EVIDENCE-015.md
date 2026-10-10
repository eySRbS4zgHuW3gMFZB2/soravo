# T10-MOONSHINE-PILOT-EVIDENCE-015 — handy-computer/moonshine-tiny-ar-gguf

Retrieval date (all primary sources): 2026-10-09. Evidence-only; no classification changed.

## 0. Skill-selection gate (mandatory)

Available-skill catalog inspected (session skill list). Narrowest relevant skills loaded via `skill` tool:

- `github` — used for GitHub source inspection (`gh repo view`, `gh api repos/moonshine-ai/moonshine`, license/content endpoints, commit lookups).
- `gh-cli` — used for authenticated-over-raw-HTTP GitHub access guidance (preferred `gh api` over curl/WebFetch for repo metadata).
- `supply-chain-risk-auditor` — used ONLY for supply-chain evidence discipline (quote measured metadata verbatim; unavailable data is not evidence of risk; absent measurement is not a clean verdict). It was NOT used as license-compliance authority: per its own skill text, "When not to use: License compliance auditing." No legal authority or weight-licensing conclusion is claimed from it.
- `rust-engineer` — used ONLY for Rust commercial-gate context (locating/enforcing gate code idioms). No Rust code was changed; the `crates/licensing/src/lib.rs` stub finding below is reported as context, not as a licensing verdict.

No skill is claimed to provide legal authority or model-weight licensing evidence. License conclusions below rest solely on quoted primary-source license texts.

## 1. Scope and limitations

- Exactly one model: `handy-computer/moonshine-tiny-ar-gguf`.
- Read-only inspection of tracked catalog, Git history, and upstream public sources (GitHub repo, Hugging Face model pages + Hub API, raw license blobs).
- This note distinguishes commercial-use permission (upstream weights) from rights to convert, host, and redistribute the actual GGUF artifact.
- A model card, license badge/tag, catalog label, public download URL, or repository existence alone is NOT treated as proof of conversion/redistribution/hosting rights.
- No legal advice. Quotations are concise excerpts with section references; full texts live at the cited URLs.
- No registry classification changed (see §8).

## 2. Catalog identity (metadata, NOT proof)

### 2.1 Exact catalog ID and entry

- Catalog ID: `handy-computer/moonshine-tiny-ar-gguf`
- `MODEL_LICENSES.json` (worktree `MODEL_LICENSES.json`, lines ~331–341):
  - `model_name`: "Moonshine Tiny (Arabic)"
  - `base_model`: "UsefulSensors/moonshine-tiny-ar"
  - `license`: "mit" (catalog-declared label — metadata only)
  - `classification`: "INSUFFICIENT-PROVENANCE"
  - `commercial_use`: false
  - `attribution_required`: false; `attribution_text`: null
  - `upstream_url`: "https://huggingface.co/UsefulSensors/moonshine-tiny-ar"
  - `notes`: BLOCKED per T10-COMMERCIAL-LICENSE-RECONCILIATION-005 — catalog label is Handy metadata, not an evidenced weight license; commercial-use, redistribution (handy-computer HF org + blob.handy.computer mirror), and GGUF conversion/quantization authorization all unverified.
- `apps/desktop/src-tauri/src/catalog/catalog.json` entry (lines ~894–922):
  - `revision`: `2360cb6893cb523da51875eaffc8050d2ca7b56d` (exact Handy artifact revision as pinned by the catalog)
  - `slug`: "moonshine-tiny-ar"; `architecture`/`family`: "moonshine"; `parameters`: "27M"
  - `base_model`: "UsefulSensors/moonshine-tiny-ar"; `license`: "mit" (metadata only)
  - Files (3): `moonshine-tiny-ar-Q8_0.gguf` (35466944 B, sha256 `e0bfa7c3…0000b`), `moonshine-tiny-ar-F16.gguf` (59244224 B, sha256 `209dd912…4001aad`), `moonshine-tiny-ar-F32.gguf` (109969088 B, sha256 `39cacdf5…4bc9cc64`); `default_quant`: "Q8_0".

### 2.2 Artifact repository URL and immutable artifact URLs

- Artifact repo page: https://huggingface.co/handy-computer/moonshine-tiny-ar-gguf
- Hub API: https://huggingface.co/api/models/handy-computer/moonshine-tiny-ar-gguf reports live HEAD `sha: f9958e69e37cfdac76d99c47b005a29311a5a032`, `lastModified: 2026-09-15T07:05:38Z` — which DIFFERS from the catalog-pinned revision `2360cb6893cb523da51875eaffc8050d2ca7b56d`. Catalog pins an older revision; immutable per-file URLs must use an explicit revision, e.g.:
  - `https://huggingface.co/handy-computer/moonshine-tiny-ar-gguf/resolve/2360cb6893cb523da51875eaffc8050d2ca7b56d/moonshine-tiny-ar-Q8_0.gguf` (catalog-pinned)
  - `https://huggingface.co/handy-computer/moonshine-tiny-ar-gguf/resolve/f9958e69e37cfdac76d99c47b005a29311a5a032/moonshine-tiny-ar-Q8_0.gguf` (live HEAD on 2026-10-09)
- Upstream references: `base_model` "UsefulSensors/moonshine-tiny-ar"; Handy card `base_model_relation: quantized`; live model tree also lists base `moonshine-ai/moonshine-tiny-ar`.
- Existing license labels (`mit` in catalog + Handy card `license:mit` tag): metadata, not proof. Directly contradicted for this variant by the per-model license file (§4).

### 2.3 Rust commercial-gate context (rust-engineer skill, read-only)

- `crates/licensing/src/lib.rs` in this worktree is a 1-line stub (`#![forbid(unsafe_code)]`); gate enforcement for this model currently lives in data (catalog `classification: INSUFFICIENT-PROVENANCE`, `commercial_use: false`), not in that crate. No source inspected as a rights grant.

## 3. Upstream rights-holder terms (primary sources)

- Canonical repository: https://github.com/moonshine-ai/moonshine (`gh repo view`: `moonshine-ai/moonshine`; `gh api repos/UsefulSensors/moonshine` resolves to the same `full_name: moonshine-ai/moonshine`, `default_branch: main`). Rename/ownership relationship: Handy and Hub cards state "Moonshine AI (f.k.a Useful Sensors)" / "trained and released by Moonshine AI (f.k.a Useful Sensors)"; GitHub `UsefulSensors/moonshine` redirects to `moonshine-ai/moonshine`. Copyright holder in LICENSE Section 1: "Useful Sensors, Inc. (dba Moonshine AI)".
- License-text revision identifiers (retrieved 2026-10-09):
  - Repo HEAD (`main`): commit `234f60faa0eb388b01cdf7e60aca232af37aefda` (committed 2026-08-24T21:24:51Z).
  - LICENSE blob SHA: `53cade1c30a4daf00dc0eebc92319027fd3f81d4`; URL https://raw.githubusercontent.com/moonshine-ai/moonshine/main/LICENSE, page https://github.com/moonshine-ai/moonshine/blob/main/LICENSE.
  - Last LICENSE-content commit: `547d00660e70aa976d506842cb1c851688043024` (2026-08-24T19:31:19Z, "License: make MIT the default for all models, with an enumerated non-commercial exception list").
  - GitHub license API reports `spdx_id: NOASSERTION` / `name: Other` — consistent with a custom dual-license file, not a single SPDX grant.
- Governing provision for this variant (LICENSE preamble, VERIFIED quotation):
  > "The only speech-to-text models that are NOT MIT are the legacy non-streaming models for languages other than English, which remain under the Moonshine Community License, a non-commercial license. That list is exhaustive: Arabic Base, Tiny; Japanese Base, Tiny; Korean Base, Tiny; Mandarin Base, Tiny; Spanish Base; Ukrainian Base, Tiny; Vietnamese Base, Tiny."
  > "Any speech-to-text model not named in that list is MIT, including every streaming model and the English Tiny and Base models."
- `moonshine-tiny-ar` is a legacy non-streaming non-English Tiny model (Handy card: "Single-language (ar); no translation, no language detection, no timestamps"; Hub API: `pipeline_tag: automatic-speech-recognition`, no streaming marker; Handy `transcribe_cpp.streaming: false`). It falls inside the enumerated non-MIT list. Ordinary commercial use is therefore CONDITIONAL under the Moonshine Community License (Section 2), not MIT:
  - Section III grants a "non-exclusive, worldwide, non-transferable, non-sublicensable, revocable and royalty-free limited license … for any Commercial Purpose" SUBJECT to: (a) mandatory registration at `https://moonshine.ai/community-license`; (b) automatic termination of all Agreement licenses if licensee or affiliates in aggregate exceed USD $1,000,000 annual revenue, requiring a separate enterprise license at `https://moonshine.ai/enterprise` granted at Moonshine AI's sole discretion.
  - Section IV(a) (attribution/distribution): provide copy of Agreement; retain Notice file text "This Moonshine AI Model is licensed under the Moonshine AI Community License, Copyright © Moonshine AI Ltd. All Rights Reserved"; prominently display "Powered by Moonshine AI".
  - Section IV(b): comply with laws/Documentation/AUP (`https://moonshine.ai/use-policy` incorporated by reference); no use of Materials/Derivatives/outputs to create or improve any foundational generative AI model (excluding the Models/Derivatives).
  - Per-model confirmation: https://huggingface.co/moonshine-ai/moonshine-tiny-ar shows `License: other` (not MIT); Hub API `cardData.license: other`; and the per-model `LICENSE.txt` at the exact pinned weights revision (see §4) is the full Community License text.
- Upstream weights revision: ESTABLISHED — full immutable SHA `99e7fee255a87426af8e434b147707495909fbc3` (Hub API `sha` for `moonshine-ai/moonshine-tiny-ar`, `lastModified: 2025-09-06T01:16:10Z`, `createdAt: 2025-09-01`); matches Handy's cited 7-char prefix `99e7fee` (§4). (The short prefix alone is not the identifier; the full SHA above is.)

## 4. GGUF artifact trace (primary sources)

- Handy card (https://huggingface.co/handy-computer/moonshine-tiny-ar-gguf, retrieved 2026-10-09) states: "GGUF conversions of UsefulSensors/moonshine-tiny-ar for use with transcribe.cpp. Ported from upstream commit 99e7fee, pinned 2026-05-12. Validated against the transformers reference at transcribe.cpp commit 90bf720 on 2026-05-12." Verified: `90bf720157b1285335dc9e44d4d2ce40b516f536` exists in `handy-computer/transcribe.cpp` ("moonshine specific lang yaml", 2026-05-12T10:44:49Z).
- Source weights → artifact relationship: Hub API `base_model: UsefulSensors/moonshine-tiny-ar`, `base_model_relation: quantized`; live model tree: base `moonshine-ai/moonshine-tiny-ar` → quantized (4) → this model. Upstream full SHA `99e7fee255a87426af8e434b147707495909fbc3` confirma source revision (resolves the task's "do not invent" rule — stated as ESTABLISHED only because Hub API returned the full SHA matching the cited prefix).
- Conversion/quantization tool, version, procedure: transcribe.cpp GGUF conversion; procedure partially described (port + WER validation table: F32 27.11%, F16 27.11%, Q8_0 26.79% on FLEURS ar; "Decoded with the transcribe.cpp defaults (greedy, num_beams=1…)"); exact converter script version/flags beyond pinned `transcribe.cpp@90bf720` NOT evidenced on the card. No explicit rights statement authorizing Handy (or anyone) to convert/quantize the Community-licensed weights into GGUF appears on the card or in the fetched API metadata. (Community License §II–III "create Derivative Works … and make modifications" language exists, but whether a third-party GGUF quantization/redistribution is within its non-transferable, non-sublicensable, revocable grant — and under which tier — is a legal determination, NOT ESTABLISHED by this evidence task.)
- Applicable redistribution right for the artifact: Handy card claims "License: Inherited from the base model: MIT. See the upstream model card for full terms." — CONFLICTING with (a) the upstream LICENSE preamble placing Arabic Tiny under the Community License, (b) the per-model `LICENSE.txt` at the pinned revision being the Community License, and (c) the Hub `license:other` tag on the source model. An "inherited MIT" badge does not override the rights-holder's enumerated exception. No separate redistribution grant, assignment, or enterprise license for Handy is evidenced.
- Hosting/mirroring (`blob.handy.computer`): no authorization statement found in any primary source inspected (Handy card, Hub API siblings/metadata, upstream LICENSE). Prior worktree evidence (`MODEL_PROVENANCE_MATRIX.md`, `17_MODEL_LICENSE_AND_PROVENANCE.md`, `HANDY-MIGRATION-002_AUDIT_REPORT.md`) records Moonshine hosting on `blob.handy.computer` as BLOCKED/license-unverified. Authorization: NOT ESTABLISHED.

## 5. Provenance chain

| Step | Artifact / location | Immutable revision | License signal at that revision | Evidence |
|---|---|---|---|---|
| 1. Rights-holder code+license repo | `moonshine-ai/moonshine` (f.k.a UsefulSensors) | HEAD `234f60faa…37aefda`; LICENSE blob `53cade1c…3f81d4`; content commit `547d00660…43024` | Dual: MIT default + enumerated Community exception incl. Arabic Tiny | Raw LICENSE + `gh api` commit/blob SHAs, 2026-10-09 |
| 2. Source weights | `moonshine-ai/moonshine-tiny-ar` (= `UsefulSensors/moonshine-tiny-ar`) | `99e7fee255a87426af8e434b147707495909fbc3` (2025-09-06) | `license:other`; `LICENSE.txt` = Community License (non-commercial, conditional commercial) | Hub API + raw LICENSE.txt at pinned SHA, 2026-10-09 |
| 3. GGUF derivative | `handy-computer/moonshine-tiny-ar-gguf` | Catalog pins `2360cb6893…7b56d`; live HEAD `f9958e69e3…5a032` (2026-09-15) — MISMATCH noted | Card claims `license:mit` ("Inherited … MIT") — conflicts with step 2 | Handy card + Hub API + catalog.json, 2026-10-09 |
| 4. Conversion | transcribe.cpp @ `90bf720157b…f536` (2026-05-12), WER table | Procedure partially described; converter flags/version beyond pinned commit unevidenced | No conversion authorization statement | Handy card + `gh api repos/handy-computer/transcribe.cpp/commits/90bf720`, 2026-10-09 |
| 5. Mirror | `blob.handy.computer` | n/a | No hosting authorization statement | No primary source found; prior BLOCKED records cited |

## 6. Results (four questions kept separate)

1. Commercial use of the upstream weights (`moonshine-tiny-ar` @ `99e7fee255a…`): CONDITIONAL (Community License) — VERIFIED as conditional, i.e. NOT MIT-cleared. Permitted only with registration, <$1M aggregate revenue cap with automatic termination above it, attribution/Notice + "Powered by Moonshine AI" display, AUP/law compliance, and no foundational-model improvement use. Ordinary commercial use is therefore prohibited without meeting those conditions and, above the cap, without a separate enterprise grant.
2. Redistribution of the actual GGUF artifact (`handy-computer/moonshine-tiny-ar-gguf`): NOT ESTABLISHED, with a recorded CONFLICT — the artifact's `mit` badge ("Inherited MIT") conflicts with the source weights' Community terms; no redistribution grant, assignment, or enterprise license evidencing Handy's (or SORAVO's) right to redistribute this Community-licensed derivative was found.
3. Authorization for conversion/quantization (safetensors → GGUF Q8_0/F16/F32): NOT ESTABLISHED — source revision, tool repo, and validation commit are evidenced, but no primary-source authorization for the conversion itself was found; the Community License's Derivative-Works language is quoted, not construed.
4. Authorization for hosting/mirroring (HF `handy-computer` org + `blob.handy.computer`): NOT ESTABLISHED — no authorization statement found in any inspected primary source.

The model is NOT cleared for SORAVO commercial distribution. No finding above grants commercial distribution rights.

## 7. Unresolved questions / evidence needed

- Exact catalog-vs-live revision gap: why catalog pins `2360cb68…` while Hub HEAD is `f9958e69…` (2026-09-15); which revision (if any) SORAVO would ship; per-revision file hashes.
- Full converter provenance: exact script, flags, and environment beyond `transcribe.cpp@90bf720`; reproducibility record.
- Whether Moonshine AI granted Handy (or any party) a written conversion/redistribution/hosting or enterprise license covering `moonshine-tiny-ar` derivatives — needs a primary-source grant document, not a card badge.
- Applicability of Community License §§II–IV to third-party GGUF quantization and to SORAVO's facts (revenue, registration, attribution, AUP) — needs rights-holder confirmation and legal review.
- `UsefulSensors/moonshine-tiny-ar` vs `moonshine-ai/moonshine-tiny-ar` canonicalization receipt (redirect observed; formal rename record unevidenced beyond "f.k.a" card text).

## 8. Registry statement

No registry classification changed. `MODEL_LICENSES.json` entry `handy-computer/moonshine-tiny-ar-gguf` remains `classification: INSUFFICIENT-PROVENANCE`, `commercial_use: false`, `license: mit` (metadata label). No edits were made to `MODEL_LICENSES.json`, `MODEL_LICENSES.md`, Rust/TypeScript source, plans, scopes, workflow state, or specifications. No commits, staging, pushes, PR updates, merges, checkouts, stashes, or resets were performed.
