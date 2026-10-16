# T10-PROVENANCE-BATCH-013 — Evidence-Only Model Family Review

**Date:** 2026-10-09 (UTC)
**Task:** T10-PROVENANCE-BATCH-013
**Type:** Evidence-only. No licensing classification changed. No production registry change. No model cleared.
**Catalog under review:** `apps/desktop/src-tauri/src/catalog/catalog.json` (catalog_version 2, generated 2026-08-17T11:27:14+00:00, mirror `https://blob.handy.computer`)
**Prior matrix:** `docs/archive/spec-v3/MODEL_PROVENANCE_MATRIX.md` (2026-09-26 — now stale: asserts Whisper MIT / Moonshine Apache-2.0 / empty catalog; all three assertions are contradicted by current evidence below; retained as historical reference only)

---

## 0. Scope — exact models investigated

All Handy artifact IDs/revisions below are from the local `catalog.json`. Revisions are 40-hex Handy repo revisions (not upstream SHAs). Checksums are file identity/integrity only, not legal authorization.

| # | Handy artifact ID | Handy revision | base_model (catalog claim) | Catalog `license` label |
|---|---|---|---|---|
| M1 | handy-computer/moonshine-streaming-tiny-gguf | 85ddff612fa3a2cf40b2f745abcfa90ef82f293b | UsefulSensors/moonshine-streaming-tiny | mit |
| M2 | handy-computer/moonshine-tiny-gguf | f5c11906eba3f44cf305eed30feb9cbfb0b4b9d0 | UsefulSensors/moonshine-tiny | mit |
| M3 | handy-computer/moonshine-tiny-ar-gguf | 2360cb6893cb523da51875eaffc8050d2ca7b56d | UsefulSensors/moonshine-tiny-ar | mit |
| M4 | handy-computer/moonshine-tiny-ja-gguf | 627aae63193d6c47cbdf316346119dcdc65d9b0d | UsefulSensors/moonshine-tiny-ja | mit |
| M5 | handy-computer/moonshine-tiny-ko-gguf | b858a303948b69c8b2442f700e936a07ba5f64da | UsefulSensors/moonshine-tiny-ko | mit |
| M6 | handy-computer/moonshine-tiny-uk-gguf | b4c991eb4223caa4de770843185476b0c86056b4 | UsefulSensors/moonshine-tiny-uk | mit |
| M7 | handy-computer/moonshine-tiny-vi-gguf | d97be0111a74a9058689beacc05b38969d2b68aa | UsefulSensors/moonshine-tiny-vi | mit |
| M8 | handy-computer/moonshine-tiny-zh-gguf | 2aca379ba0dc978d878b84b76231d5ba5550e738 | UsefulSensors/moonshine-tiny-zh | mit |
| M9 | handy-computer/moonshine-base-gguf | 3ef112378a8cf46ac8b278d9bfa2d15c846704b8 | UsefulSensors/moonshine-base | mit |
| M10 | handy-computer/moonshine-base-ar-gguf | 1ae85af52b16eac8bcebda0287e6195ed1956e86 | UsefulSensors/moonshine-base-ar | mit |
| M11 | handy-computer/moonshine-base-ja-gguf | aac5cfff17ae28b6f17ae790a3e309ae0ca5911c | UsefulSensors/moonshine-base-ja | mit |
| M12 | handy-computer/moonshine-base-ko-gguf | 03813c71abe85b40cd0671d3cfa420e831d7e333 | UsefulSensors/moonshine-base-ko | mit |
| M13 | handy-computer/moonshine-base-uk-gguf | d6ec586909c5209c0c17243dc4f5e55164f85dfb | UsefulSensors/moonshine-base-uk | mit |
| M14 | handy-computer/moonshine-base-vi-gguf | 76ccec93f5854ae16d2dab72d5b762fe10c0df81 | UsefulSensors/moonshine-base-vi | mit |
| M15 | handy-computer/moonshine-base-zh-gguf | 64385c681d79767be73ce8591b4609854ac750c9 | UsefulSensors/moonshine-base-zh | mit |
| M16 | handy-computer/moonshine-streaming-small-gguf | 41444173ed8210852a883e046fadcfba3e7bfbae | UsefulSensors/moonshine-streaming-small | mit |
| M17 | handy-computer/moonshine-streaming-medium-gguf | c722a9455a40a1844c3d25267dc84eff61d8dd84 | UsefulSensors/moonshine-streaming-medium | mit |
| W1–W13 | 13× handy-computer/whisper-*-gguf (tiny, tiny.en, base, base.en, small.en, small, medium.en, medium, large-v3-turbo, large, large-v2, large-v3 + Breeze-ASR-25-gguf) | e.g. whisper-medium `ec78f06fded51aa82cde751678b78f76f78c8b7f`; whisper-large-v3 `e3e29bee6389c7da4a141406f07bb80ddac5337c`; Breeze `1e5e8d7295110e1e14e305e9cf7411d82711beaa` (full list in catalog.json lines 140–237) | openai/whisper-* resp. MediaTek-Research/Breeze-ASR-25 | apache-2.0 (all 13) |
| G1 | handy-computer/gigaam-v3-ctc-gguf | c3c611444004820c21c3b68312a41c83c1e4813b | ai-sage/GigaAM-v3 | mit |
| G2 | handy-computer/gigaam-v3-e2e-ctc-gguf | 075dff81f843cf23d22b4ce943ffdc4dd8650cd7 | ai-sage/GigaAM-v3 | mit |
| G3 | handy-computer/gigaam-v3-rnnt-gguf | 8f30356b4607ae2d79353ab7dc9e5eea6dc46b48 | ai-sage/GigaAM-v3 | mit |
| G4 | handy-computer/gigaam-v3-e2e-rnnt-gguf | f719d70812344f4d0fb8c11c0887b190501a7465 | ai-sage/GigaAM-v3 | mit |
| S1 | handy-computer/SenseVoiceSmall-gguf | 4a08b8e900b38a977e32eb08d5d0697d6e72ba04 | FunAudioLLM/SenseVoiceSmall | other |
| F1 | handy-computer/Fun-ASR-Nano-2512-gguf | 30360f003f99929c1e25c3f6222d02eccb04663c | FunAudioLLM/Fun-ASR-Nano-2512 | other |
| F2 | handy-computer/Fun-ASR-MLT-Nano-2512-gguf | 0b8f9c7bc545a219658aeb1dd4eeaa55d1cf89f3 | FunAudioLLM/Fun-ASR-MLT-Nano-2512 | other |
| D1 | handy-computer/medasr-gguf | 6f481df085bb50ae922cea918fb578e664237126 | google/medasr | other |
| N-family (reviewed for license text only, per-model binding deferred) | e.g. handy-computer/parakeet-*-gguf, canary-*-gguf (`cc-by-4.0` in catalog), nemotron-*/multitalker-* (`other`) | various (see catalog) | nvidia/*, primeline/parakeet-primeline | cc-by-4.0 / other |

Example artifact file records (identity only): `moonshine-tiny-Q8_0.gguf` sha256 `2fd348d7…95a3a1` (35466912 B); `gigaam-v3-ctc-Q8_0.gguf` sha256 `71e5c828…a62b` (271803328 B); `SenseVoiceSmall-Q8_0.gguf` sha256 `6c759ee4…59adf29` (252684608 B); `medasr-Q8_0.gguf` sha256 `5a391a21…9c978` (127712448 B); `whisper-medium-Q8_0.gguf` sha256 `09e6a65e…a82adf`. Full per-file tables are in `catalog.json` and are not repeated here.

---

## 1. Moonshine family — legacy restricted vs. permissive-but-unverified-redistribution

### 1.1 Upstream evidence (authoritative)

- Repo: `https://github.com/moonshine-ai/moonshine` (successor of `UsefulSensors/moonshine` cited in catalog `base_model` fields and the stale matrix).
- README License section (fetched 2026-10-09): **"Licensed under the MIT License. The models are MIT by default too, in every language and at every size — the only exceptions are the legacy non-streaming models for languages other than English, which stay under the non-commercial Moonshine Community License and are enumerated in LICENSE."**
- LICENSE file (`https://raw.githubusercontent.com/moonshine-ai/moonshine/main/LICENSE`, fetched 2026-10-09), preamble:
  - Code in repo (apart from `core/third-party`) is MIT.
  - **"Moonshine models are released under the MIT License by default, in every language and at every size. This includes all streaming speech-to-text models and all English-language models. See SECTION 1 for terms."**
  - **"The only speech-to-text models that are NOT MIT are the legacy non-streaming models for languages other than English, which remain under the Moonshine Community License, a non-commercial license. That list is exhaustive:"** — Arabic Base, Tiny; Japanese Base, Tiny; Korean Base, Tiny; Mandarin Base, Tiny; **Spanish Base**; Ukrainian Base, Tiny; Vietnamese Base, Tiny.
  - **"Any speech-to-text model not named in that list is MIT, including every streaming model and the English Tiny and Base models."**
  - TTS/G2P models are separately licensed (out of scope for this batch).
- SECTION 1 = MIT License, © 2025 Useful Sensors, Inc. (dba Moonshine AI) — grants use/copy/modify/merge/publish/distribute/sublicense/sell with notice retention.
- SECTION 2 = Moonshine AI Community License Agreement (2025-06-15): research/non-commercial + limited commercial grant; **revenue cap USD $1,000,000** (aggregate with affiliates — license terminates above cap, enterprise license required); **registration required** for commercial purpose (`https://moonshine.ai/community-license`); distribution requires Agreement copy + **"Powered by Moonshine AI"** notice + Notice-file attribution; AUP compliance; no foundational-model training on materials/outputs; trademark, IP, termination, governing-law terms.

### 1.2 Mapping to catalog entries

- **MIT-bucket (per upstream LICENSE):** M1, M2, M9, M16, M17 (all streaming models + English Tiny/Base). Commercial-use terms permissive **at the upstream weight-license layer** (subject to §1.1 MIT notice condition).
- **Community-License bucket (legacy non-streaming, non-English):** M3–M8, M10–M15 (ar/ja/ko/uk/vi/zh Tiny + Base). Catalog labels all of these `mit` — **contradicted by upstream LICENSE for this bucket**. Commercial use is NOT permitted beyond the $1M-capped, registration-gated Community terms; the stale matrix claim "Moonshine Apache-2.0, commercial allowed" is wrong on both license ID and commercial conclusion for this bucket.
- **Spanish Base:** listed as legacy restricted upstream but **no corresponding catalog entry** (catalog has no `moonshine-*-es-gguf`). Gap noted, not a finding against any shipped artifact.
- **Mandarin vs Chinese:** upstream says "Mandarin Base, Tiny"; catalog uses `-zh`. Treated as the same bucket pending per-model card confirmation (unresolved alias, recorded here rather than assumed).

### 1.3 Redistribution chain — UNRESOLVED for both buckets

- MIT permission to distribute upstream weights ≠ permission to host/redistribute the **Handy GGUF artifacts** (`handy-computer/moonshine-*-gguf` revisions above, files on `blob.handy.computer`).
- Evidence still missing per model: (a) upstream weight revision/commit the GGUF was converted from; (b) converter identity and conversion-log/provenance record; (c) explicit conversion + redistribution authorization covering the quantized artifact; (d) blob.handy.computer hosting authorization chain.
- Do not clear any Moonshine model on the basis of "MIT default" alone. The MIT bucket remains **permissive-commercial-but-redistribution-unverified**; the legacy bucket remains **restricted + redistribution-unverified**.

---

## 2. Whisper — catalog `apache-2.0` vs. upstream code MIT vs. weight licensing

### 2.1 Evidence

- Upstream code repo `https://github.com/openai/whisper`: LICENSE file = **MIT, © 2022 OpenAI** (fetched 2026-10-09). Repo metadata: "License: MIT license". README states **"Whisper's code and model weights are released under the MIT License"** (per search excerpt of repo page).
- Hugging Face `openai/*` model cards (fetched/searched 2026-10-09): `openai/whisper-large-v3` card header and front-matter `license: apache-2.0`; `openai/whisper-medium` likewise `apache-2.0`. But `openai/whisper-large-v3-turbo` card header = **`mit`**. A community discussion (`openai/whisper-large-v3-turbo/discussions/73`) flags exactly this MIT-vs-Apache-2.0 inconsistency.
- Catalog: **all 13 whisper-family entries labeled `apache-2.0`** (lines 140–2237), including `whisper-large-v3-turbo` (whose HF card says `mit`) and `Breeze-ASR-25` (whose upstream is `MediaTek-Research/Breeze-ASR-25`, not OpenAI at all).

### 2.2 Contradictions (kept explicitly unresolved)

1. **Catalog vs. code repo:** catalog `apache-2.0` contradicts code-repo MIT for every `openai/whisper-*` entry.
2. **Catalog vs. HF card:** catalog `apache-2.0` agrees with the `large-v3`/`medium` HF cards but contradicts the `large-v3-turbo` HF card (`mit`).
3. **HF card vs. code repo:** HF `apache-2.0` labels contradict the repo README claim that weights are MIT. HF card front-matter is uploader-supplied metadata, not a license grant; the README sentence is a claim about weights but is not a per-weight SPDX grant with revision binding.
4. **Breeze-ASR-25 miscategorized:** grouped under `family: whisper` with `license: apache-2.0`, but `base_model` is MediaTek. Its weight license must be evidenced from the MediaTek card/repo, not from OpenAI Whisper evidence. No representative-model inference permitted.

### 2.3 Fail-closed posture

- Do **not** infer weight licensing from the code repo's MIT license (per task rule), even though the README sentence gestures that way — the HF distribution channel asserts a different license for the same weights, and neither channel binds a specific immutable weight revision to a license grant in evidence reviewed so far.
- Do **not** infer redistribution/quantization authorization from public HF availability or from `blob.handy.computer` reachability.
- Missing per model (W1–W13): exact upstream weight revision (commit SHA), weight-license grant at that revision, conversion/quantization permission covering GGUF, Handy artifact ↔ upstream weight linkage (conversion record), hosting/redistribution authorization.

---

## 3. GigaAM — MIT evidence + `gigaam-v3-ctc` artifact documentation discrepancy

### 3.1 Upstream MIT evidence

- `https://huggingface.co/ai-sage/GigaAM-v3` (fetched 2026-10-09): header **"License: mit"**; card body lists variants `ssl` / `ctc` / `rnnt` / `e2e_ctc` / `e2e_rnnt` (usage `revision = "e2e_rnnt"  # can be any v3 model: ssl, ctc, rnnt, e2e_ctc, e2e_rnnt`); footer **"License: MIT"**; paper arXiv:2506.01192. Description: Conformer 220–240M, HuBERT-CTC pretrain on 700k hours Russian speech.
- Note: revisions here are **branch names**, not immutable commit SHAs — branch-contents drift is possible. Immutable upstream commit pin still required.

### 3.2 Handy artifact evidence and the discrepancy

- `https://huggingface.co/handy-computer/gigaam-v3-ctc-gguf` (fetched 2026-10-09):
  - Header: `License: mit`; Base model: `ai-sage/GigaAM-v3`; tags GGUF/Russian/transcribe.cpp.
  - Card claims: "GGUF conversions of ai-sage/GigaAM-v3 for use with transcribe.cpp. **Ported from upstream commit c7f128b, pinned 2026-05-12. Validated against the gigaam author package reference at transcribe.cpp commit 42b96d9 on 2026-05-12.**"
  - License section: **"Inherited from the base model: MIT"** with pointer to upstream card.
  - Embedded original-card reproduction pins upstream card at commit `c7f128b`.
  - **Discrepancy:** the page whose ID/slug is `gigaam-v3-ctc-gguf` carries a **Downloads table and Usage section naming `gigaam-v3-rnnt-*.gguf` files** (`gigaam-v3-rnnt-F32/F16/Q8_0/Q6_K/Q5_K_M/Q4_K_M.gguf`), describes **"Offline Russian speech-to-text with greedy RNN-T decoding. Same 16-layer Conformer encoder as the e2e variant … 33-entry character vocabulary"**, and reports RNN-T FLEURS-ru WER (F32 baseline 8.08%). The prose is an **RNN-T card on a CTC-named page**. File manifest sidebar (F32 883MB … Q4_K_M 182MB) matches the catalog G1 sizes (F32 882913216 B … Q4_K_M 182150080 B), but the card **body text points at `gigaam-v3-rnnt-gguf` resolve URLs**, not `gigaam-v3-ctc-gguf` URLs.
  - Consequence: for catalog G1 (`gigaam-v3-ctc-gguf`, rev `c3c61144…`, 6 files with per-file sha256 in catalog lines 557–564) we cannot determine from this card alone whether the checksummed bytes are CTC-decoder weights or mislabeled RNN-T weights. The same verification must be repeated for G2–G4 (each has its own Handy revision and 6 checksums; only G1's card was fetched this batch).

### 3.3 Unresolved rights

- MIT (if it attaches to the exact upstream weight revision) is permissive for commercial use and conversion, subject to notice retention — but **no conversion log, no per-file source mapping (which upstream `ctc`/`rnnt`/`e2e_*` file produced which GGUF), and no hosting/redistribution grant for `blob.handy.computer`** were found this batch.
- "Inherited MIT" on the Handy card is a claim, not a grant; the mismatch in §3.2 means even the claim's subject (which weights?) is ambiguous for G1.
- Keep all four GigaAM entries unresolved.

---

## 4. NVIDIA Open Model License + OpenMDW-1.1 (license-text review; per-model binding deferred)

### 4.1 NVIDIA Open Model License (NOML, last modified 2025-10-24)

Source: `https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-license` + PDF `nvidia-open-model-license-agreements-24-10-2025.pdf` (search excerpts 2026-10-09).

- Intent: **"Models are commercially usable. You are free to create and distribute Derivative Models. NVIDIA does not claim ownership to any outputs."**
- Grant (§2.2): perpetual, worldwide, non-exclusive, no-charge, royalty-free, **revocable** (as stated in §2.1) license to publicly perform/display, reproduce, use, create derivatives of, make/have-made, sell, offer for sale, **distribute through multiple tiers**, import the Model.
- Conditions: comply with **Trustworthy AI terms** (`https://www.nvidia.com/en-us/agreements/trustworthy-ai/terms/`); NVIDIA retains ownership of Model and NVIDIA-made derivatives; distributor owns its Derivative Models subject to that; no implied licenses.
- Redistribution (§3): permitted in any medium with/without modifications provided distributor gives recipients **a copy of the Agreement + `Notice` attribution "Licensed by NVIDIA Corporation under the NVIDIA Open Model License"**; export/end-use restrictions apply; **§4 Separate Components** — bundled components under other (e.g. OSS) terms stay under those terms.
- Version sensitivity: April-2025 and October-2025 PDFs both fetched in excerpts; the operative version **per model** must be the one attached to that model's release, not assumed current.

### 4.2 NVIDIA Nemotron Open Model License (2025-12-15)

Source: `https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-nemotron-open-model-license` (excerpt 2026-10-09). **"Works are commercially usable. You are free to create and distribute Derivative Works. NVIDIA does not claim ownership to any outputs."** Grant: perpetual, worldwide, non-exclusive, no-charge, royalty-free, **irrevocable** (unlike NOML's revocable grant) license to reproduce, prepare derivatives of, display/perform publicly, **sublicense**, distribute in source or object form; patent/copyright retaliation termination; redistribution requires License copy + retained notices + `Notice` statement "Licensed by NVIDIA Corporation under the NVIDIA Nemotron Model License". Relevant to `nemotron-*` catalog entries (`license: other`) — binding per model still required.

### 4.3 OpenMDW-1.1

Source: `https://github.com/OpenMDW/OpenMDW/blob/main/1.1/LICENSE.OpenMDW-1.1` (raw text fetched 2026-10-09, 49 lines).

- Permissive grant: **"permission is hereby granted, free of charge, to deal in the Model Materials without restriction, including under all copyright, patent, database, and trade secret rights included or embodied therein"** (subject to compliance).
- "Model Materials" = models (architecture + parameters) + all related artifacts (data, docs, software) provided under the agreement.
- Distribution condition: retain **copy of agreement + all copyright/origin notices** applicable to the distribution.
- Patent/copyright litigation retaliation termination; **no restrictions on outputs**; **sole-responsibility clause**: reuser must clear third-party rights, obtain consents, do diligence (§"YOU ARE SOLELY RESPONSIBLE …").
- No per-model determination made this batch about which (if any) catalog models are actually released under OpenMDW-1.1. The stale matrix's "NVIDIA NeMo License (unverified)" label is not mapped to NOML vs. Nemotron vs. OpenMDW vs. CC-BY-4.0 on any evidence reviewed here.

### 4.4 Catalog-label conflict (recorded, not resolved)

- Catalog labels most `nvidia/*`-based entries `cc-by-4.0` and `nemotron`/`multitalker` entries `other`. Neither label is evidenced against the NOML/Nemotron/OpenMDW texts in this batch, and CC-BY-4.0 (a Creative Commons license with its own attribution/notice terms) must not be conflated with NOML. **Per-model binding required:** for each Parakeet/Canary/Nemotron/Multitalker entry, record upstream card license field + LICENSE file at pinned revision + which of (CC-BY-4.0 / NOML-version / Nemotron / OpenMDW-1.1 / other) actually grants the weights, plus gated-access and conversion/redistribution evidence. Deferred to next batch per task §6.

---

## 5. FunASR/SenseVoiceSmall + Google MedASR

### 5.1 SenseVoiceSmall (S1) + Fun-ASR Nano (F1, F2)

- Upstream: `https://huggingface.co/FunAudioLLM/SenseVoiceSmall` — header **"License: model-license"**; front-matter `license: other`, `license_name: model-license` (blame-view excerpts), `license_link: https://github.com/modelscope/FunASR/blob/main/MODEL_LICENSE`. No `LICENSE` file at repo root (404 on `/resolve/main/LICENSE` 2026-10-09 — absence of file is itself evidence that the grant lives outside the weight repo).
- Weight grant (linked): **FunASR Model Open Source License Agreement v1.1**, © 2023–2028 Alibaba Group (`https://github.com/modelscope/FunASR/blob/main/MODEL_LICENSE`, fetched 2026-10-09): §2.1 free to **use, copy, modify, share** "[FunASR Software]" (= weights + derivatives incl. finetunes) under the agreement; §2.2 **attribution + retain model names**; §3 reference/learning-only disclaimer, no liability; §4 community conduct (prohibited denigration/smearing → automatic forfeiture); §5 termination on violation; §6 agreement may be **unilaterally revised** with auto-effect on continued use; §7 governing law **placeholder "[Country/Region]"**.
- Code-vs-weights split: `FunAudioLLM/SenseVoice` repo LICENSE = pointer to FunASR license (excerpt); `funasr` Python package noted Apache-2.0 in third-party summary — **code license ≠ weight license** (do not conflate). `FunAudioLLM.github.io` MIT covers the website repo only.
- Commercial-use dispute (unresolved): a third-party GGUF card claims "commercial use OK with attribution" under FunASR v1.1; an open issue (`FunAudioLLM/SenseVoice#286`, Mar 2026) asks for commercial-distribution clarification with a maintainer reply reportedly stating team-developed models are free for commercial use with attribution (excerpt truncated — full reply not verified). The v1.1 text itself contains **no explicit commercial/non-commercial distinction**, but also **no explicit commercial grant language**, plus unilateral-revision and conduct-forfeiture clauses unusual in OSS licenses. **No clearance inferred.**
- Handy artifact: `handy-computer/SenseVoiceSmall-gguf` rev `4a08b8e9…`, 6 files + sha256 (catalog lines 1746–1776). No conversion log, no per-file upstream-revision mapping, no redistribution authorization found. Catalog `license: other` is the correct fail-closed label; keep.
- F1/F2 (`Fun-ASR-Nano-2512`, `Fun-ASR-MLT-Nano-2512`, both `other`): same FunASR-license family by publisher naming, but **per-model cards not fetched this batch** — must not inherit S1's evidence. Multilingual scope differs (Nano 3-lang zh/en/ja; MLT-Nano 31-lang) — separate terms possible.

### 5.2 Google MedASR (D1)

- Upstream: `https://huggingface.co/google/medasr` — header **"License: health-ai-developer-foundations"**; front-matter `license: other`, `license_name: health-ai-developer-foundations`, `license_link: https://developers.google.com/health-ai-developer-foundations/terms`. **Gated access:** "You need to agree to share your contact information to access this model … you have to accept the conditions" (excerpts 2026-10-09). Model: Conformer CTC, English, medical/radiology dictation, 105M params per catalog.
- Terms: **Health AI Developer Foundations Terms of Use** (`https://developers.google.com/health-ai-developer-foundations/terms`, reached 2026-10-09; full text paged, not fully extracted this batch). Model card + docs: **"The use of MedASR is governed by the Health AI Developer Foundations terms of use"**; "You're free to pursue any use case, **as long as it adherives to the … terms of use**". Code samples under Apache-2.0 / CC-BY-4.0 docs license do **not** license the weights (code/weight split — do not conflate). Supporting code repo `google-health/medasr` notebooks are Apache-2.0 licensed **notebooks**, not weight grants; they additionally require the user to accept the HF gating conditions before download.
- Downstream restrictions (to be extracted verbatim next batch from the Terms page): HAI-DEF is a use-case-restricted, attribution/compliance-gated regime (medical-safety, prohibited-use, and redistribution conditions expected — **not yet verified line-by-line**; recorded as unknown, not assumed).
- Handy artifact: `handy-computer/medasr-gguf` rev `6f481df0…`, 6 files + sha256 (catalog lines 800–832). No evidence that the converter accepted gating conditions on behalf of downstream redistributors, no conversion permission, no hosting/redistribution grant. Gated-source → public-mirror redistribution is the highest-risk chain in this batch; keep unresolved.

---

## 6. Artifact identity & integrity (no legal inference)

- Per-file sha256 + size_bytes in `catalog.json` establish **which bytes** each Handy revision claims (e.g. tables in §§0–5). They do not establish **whether those bytes may be hosted, converted, or redistributed**.
- Missing linkage for every model in scope: Handy revision → upstream weight revision (immutable SHA) → conversion record → checksum of converted output at conversion time. The single positive lead is GigaAM's claimed upstream pin `c7f128b` (2026-05-12) + transcribe.cpp `42b96d9` — undermined by the CTC/RNN-T mismatch in §3.2 and not yet corroborated against the catalog checksums.

---

## 7. Verdicts — none cleared (fail-closed)

| Family | Commercial-use terms | Redistribution / hosting | Conversion / quant permission | Status |
|---|---|---|---|---|
| Moonshine MIT bucket (streaming + EN) | Permissive per MIT text, notice-conditioned | **Unverified** | **Unverified** | NOT CLEARED |
| Moonshine legacy bucket (non-streaming non-EN) | **Restricted** (Community License: $1M cap, registration, AUP, attribution) + catalog mislabeled `mit` | **Unverified** (+ restricted) | **Unverified** | NOT CLEARED |
| Whisper (all 13) | **Contradictory** (MIT repo claim vs apache-2.0 cards; turbo mit) | **Unverified** | **Unverified** | NOT CLEARED |
| GigaAM (all 4) | MIT-claimed, revision-unbound | **Unverified** (+ G1 subject ambiguity) | **Unverified** | NOT CLEARED |
| NVIDIA/Nemotron (text reviewed) | NOML/Nemotron permissive **in the abstract**; per-model binding absent; CC-BY-4.0 labels unevidenced | **Unverified** | **Unverified** | NOT CLEARED |
| SenseVoice / Fun-ASR Nano | FunASR v1.1 text retrieved; commercial scope **disputed** | **Unverified** | **Unverified** | NOT CLEARED |
| MedASR | HAI-DEF gated/restricted; verbatim terms pending | **Unverified** (gated→mirror = highest risk) | **Unverified** | NOT CLEARED |

No push, PR, merge, or release approval is authorized by this task. Production registry untouched.

---

## 8. Recommended next evidence requests (small, independently reviewable)

1. **Moonshine per-model cards:** fetch each `UsefulSensors/moonshine-{tiny,base}[-{ar,ja,ko,zh,uk,vi}]` + streaming model cards + `moonshine-ai/moonshine` commit pinning the LICENSE change; confirm Mandarin≡zh alias; confirm absence/presence of Spanish-Base weights; retrieve converter/conversion-log + blob-hosting authorization for one MIT-bucket model as pilot.
2. **Whisper weight-grant arbitration:** for one pilot (`whisper-large-v3` + `large-v3-turbo`): record HF commit SHA of weights, LICENSE/grant file at that SHA, OpenAI's authoritative weight-license statement, and Handy conversion record; then rule on MIT vs apache-2.0 before touching the other 11 + Breeze (MediaTek card separately).
3. **GigaAM G1 disambiguation:** diff `handy-computer/gigaam-v3-ctc-gguf` file manifest vs `gigaam-v3-rnnt-gguf` repo; confirm which decoder the catalog G1 checksums decode with (CTC vs RNN-T graph + 33-char vocab test); re-issue or correct the card body; then repeat linkage for G2–G4.
4. **NVIDIA per-model binding:** for each catalog Parakeet/Canary/Nemotron/Multitalker entry: upstream card license field + LICENSE file at pinned SHA + NOML version vs Nemotron vs OpenMDW-1.1 vs CC-BY-4.0 determination + Trustworthy-AI/AUP acceptance chain + conversion/redistribution record.
5. **FunASR commercial-scope + MedASR terms extraction:** full text of FunAudioLLM/SenseVoice#286 maintainer reply with commit-pinned MODEL_LICENSE version; verbatim HAI-DEF Terms extraction (redistribution, medical-use, and downstream conditions); gating-acceptance → mirror-redistribution authorization analysis for `medasr-gguf`.
6. **Remaining families** (Cohere, Qwen3-ASR, Voxtral, Granite, MOSS, Canary-variants): subsequent batch; same seven-field evidence standard (upstream ID, immutable revision, weight license, commercial terms, redistribution terms, conversion permission, Handy revision + checksum + linkage).

---

## Sources (fetched 2026-10-09 unless noted)

- `apps/desktop/src-tauri/src/catalog/catalog.json` (local, catalog_version 2)
- `docs/archive/spec-v3/MODEL_PROVENANCE_MATRIX.md` (2026-09-26, historical)
- `https://github.com/moonshine-ai/moonshine` (README License section) + `https://raw.githubusercontent.com/moonshine-ai/moonshine/main/LICENSE`
- `https://github.com/openai/whisper` + `https://raw.githubusercontent.com/openai/whisper/main/LICENSE`
- `https://huggingface.co/ai-sage/GigaAM-v3` + `https://huggingface.co/handy-computer/gigaam-v3-ctc-gguf`
- `https://huggingface.co/FunAudioLLM/SenseVoiceSmall` (+ blame/history views) + `https://github.com/modelscope/FunASR/blob/main/MODEL_LICENSE`
- `https://huggingface.co/google/medasr` (+ `/blob/main/README.md`, `/tree/main`) + `https://developers.google.com/health-ai-developer-foundations/terms` + `/medasr`, `/medasr/model-card`, `/medasr/get-started`
- `https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-license` (+ 2025-04-28 / 2025-10-24 PDFs) + `…/nvidia-nemotron-open-model-license` (+ 2025-12-12/15 PDF) + `https://github.com/OpenMDW/OpenMDW/blob/main/1.1/LICENSE.OpenMDW-1.1`
- Web-search corroboration: Whisper MIT-vs-Apache inconsistency; SenseVoice FunASR-v1.1 commercial dispute; MedASR gating; NOML commercial/derivative terms (search session IDs retained in working notes)
