# T33-L — HANDY CATALOG RESTORATION — REPORT

**Task:** T33-L — HANDY CATALOG RESTORATION
**Type:** Exact byte restoration of `catalog.json` from the verified upstream
pin, plus machine-readable licensing/attribution inventory. No test,
implementation, model-manager, transcription, weight, VAD, UI, or workflow
modification.
**Date:** 2026-09-30
**Branch:** `t31/soravo-wrapper-completion` @ `0cb38fdc` (start)
**PR:** #63 OPEN (`t31/soravo-wrapper-completion` → `main`)

---

## 1. Owner authorization

Explicit owner decisions issued with this task, recorded verbatim in effect:

- **O-K1 — CATALOG POLICY:** REVERSE the previous ADR-019 `D-CATALOG = B`
  restriction that kept `catalog.json` as the 3-byte `{}` stub. The exact
  upstream Handy catalog is authorized to be restored.
- **O-K2 — MODEL CATALOG SCOPE:** Use the FULL Handy catalog represented by
  the pinned upstream catalog. Do NOT remove Handy models because their
  licenses differ. "Crediting" is NOT a blanket license grant: preserve
  upstream attribution/source/license metadata and all applicable
  license/usage/distribution restrictions per model. Weights must not be
  redistributed in a way prohibited by individual license/terms. Required
  attribution planned for Soravo's website and project documentation; do not
  claim ownership of third-party models.
- **O-K3 — IMPLEMENTATION:** AUTHORIZE exact catalog restoration now,
  BYTE-FOR-BYTE from `cjpais/Handy @ ba10ce19`. No synthesis, simplification,
  reordering, or manual reconstruction.

**ADR-019 status note (as required by the reading gate):** ADR-019
(`T32-Y-ADR-019-HANDY-V1-RUNTIME-RESTORATION-ACCEPTED.md`) §2.1 A5 + §5
`D-CATALOG = B` ("`catalog.json` remains authoritative and unpopulated… 3
bytes: `{}`") is **SUPERSEDED for the catalog-population point only** by
explicit owner decisions O-K1/O-K2/O-K3 above. The remainder of ADR-019
(single STT path I1, single insertion path I2, uncoupled session machines I3,
external asset gates I4, Silero VAD I5, F1–F8 deferrals, T1/T2/`app.tsx`
obligations) is **untouched and remains in force**. No new Handy fork was
started, no transcription behavior was modified, no test was modified.

---

## 2. Upstream pin

| Field | Value |
|---|---|
| Upstream repository | `https://github.com/cjpais/Handy` |
| Exact pin (full SHA) | `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` |
| Short SHA | `ba10ce19` |
| Pin commit date (committer, UTC) | `2026-09-15T05:29:06Z` (verified via API this session) |
| Upstream path | `src-tauri/src/catalog/catalog.json` |
| Upstream API size | `127334` bytes |
| Upstream git blob SHA | `64fc3482a8c7ff8b0a053a043e789b22113045ec` |
| Retrieval method | `gh api …/contents/…?ref=<pin>` with `Accept: application/vnd.github.raw`, to `/tmp` (outside the repo), then `cp` into the repo path |

---

## 3. Catalog byte/hash proof

| Artifact | Before (Soravo HEAD) | Upstream @ pin | After (restored) |
|---|---|---|---|
| `catalog.json` size | **3 bytes** | **127,334 bytes** | **127,334 bytes** |
| `catalog.json` git blob | `0967ef424bce6791893e9a57bb952f80fd536e93` | `64fc3482a8c7ff8b0a053a043e789b22113045ec` | `64fc3482a8c7ff8b0a053a043e789b22113045ec` — **IDENTICAL to pin** |
| `catalog.json` SHA-256 | `ca3d163b…` (empty-object, per T33-K) | `063dfdd5ec56867e863fb362110a90611a00ef38ba41fe4d0c08f23f8776a94e` | `063dfdd5ec56867e863fb362110a90611a00ef38ba41fe4d0c08f23f8776a94e` — **IDENTICAL** |
| Line count | 1 | 2,238 | 2,238 |

Verification commands (all this session, post-copy):

```text
wc -c apps/desktop/src-tauri/src/catalog/catalog.json  → 127334
sha256sum apps/desktop/src-tauri/src/catalog/catalog.json → 063dfdd5…8776a94e
git hash-object apps/desktop/src-tauri/src/catalog/catalog.json → 64fc3482…13045ec
```

Zero bytes synthesized, reordered, or reconstructed. The restored file is the
raw upstream payload (`catalog_version: 2`,
`generated_at: 2026-08-17T11:27:14+00:00`, mirrors
`["https://blob.handy.computer"]`, 69 models, 367 files).

---

## 4. Exact diff

```text
PROGRESS.md                                     |   73 +  (T33-K entry, pre-existing uncommitted; preserved, not reset)
apps/desktop/src-tauri/src/catalog/catalog.json | 2240 +++- (3-byte `{}` → 127,334-byte upstream payload)
```

`git diff --name-only` confirms exactly these two paths. Deliberately
**unchanged** (verified via `git status`/`git diff`): all catalog tests
(`catalog/mod.rs`), all transcription tests and implementation
(`managers/transcription.rs`, `audio_toolkit/text.rs`, `lang_id.rs`,
`post_process.rs`), model-manager logic (`managers/model.rs`), all Handy
transcription files, all model weights (none exist), all VAD assets (none
exist), all UI, all workflows, `Cargo.toml`/`Cargo.lock`.

---

## 5. Test results before/after

**Before** (HEAD `0cb38fdc`, local + CI run `36659943960` + CI run
`36660978480`, all identical): `254 passed; 2 failed` —

- `catalog::tests::catalog_parses_and_is_nonempty`
  (`catalog/mod.rs:227`, `bundled catalog should contain models`)
- `managers::model::tests::test_discover_catalog_alternate_quant_in_models_dir`
  (`managers/model.rs:2986`, `catalog has multi-quant models`)

**After** (this session, post-restoration):

- Targeted: both tests pass individually (`1 passed; 0 failed` each,
  `--nocapture`).
- `cargo test -p soravo-desktop --lib --no-fail-fast`:
  **256 passed; 0 failed** — the exact `254/2 → 256/0` transition T33-K
  predicted. The previous 254-pass baseline did not regress (254 + 2 = 256,
  zero other deltas).
- `cargo test --workspace`: **all binaries green, 0 failures repo-wide**
  (soravo-desktop lib 256 · soravo-audio 27 · soravo-config 3 ·
  soravo-models 20 · soravo-scheduler 2 · soravo-stt 31 · benchmark 1 ·
  soravo-transcript 6 · soravo-typing 5 · inject 4 · rest 0).
- `cargo fmt --all -- --check`: **PASS**.
- `cargo clippy --workspace --all-targets -- -D warnings`: **PASS**
  (no warnings).
- `cargo audit --deny warnings` (with the CI job's exact ignore list):
  **exit 0, PASS**.
- `cargo deny check`: **PASS**
  (`advisories ok, bans ok, licenses ok, sources ok`).

**Q1 — do the two previously failing catalog tests now pass? YES, both.**
**Q2 — did the 254-pass baseline regress? NO — 256/0 with no other delta.**

---

## 6. Licensing/attribution inventory

Derived read-only from the restored catalog bytes (no metadata fabricated;
the `license` strings below are the catalog's own declared values).

Declared-license histogram (69 models): `apache-2.0` ×25 · `mit` ×21 ·
`cc-by-4.0` ×15 · `cc-by-nc-4.0` ×1 · `other` ×7. All 69 models carry
`handy-computer/*` HF ids, pinned `revision`s, per-file `size_bytes` +
`sha256`, `default_quant`, scores, capabilities and ranks. Every model has
>1 quant file (min 3, max 12), satisfying the multi-quant discovery path.

**Status key (per O-K2; UNKNOWN is never converted to APPROVED):**
`requires notice` = catalog preserved; distribution requires the license's
attribution/notice terms AND weight-level confirmation at the source repo
(see §7). `restricted` = concrete license restriction recorded.
`unknown` = license string `other`; per-model source review required before
any distribution claim.

| # | Model identifier | Upstream URL | Weight license (catalog-declared) | License URL | Attribution requirement | Redistribution restriction | Soravo intent: bundle weights or reference/download | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | handy-computer/parakeet-unified-en-0.6b-gguf | https://huggingface.co/handy-computer/parakeet-unified-en-0.6b-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/parakeet-unified-en-0.6b | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 2 | handy-computer/nemotron-3.5-asr-streaming-0.6b-gguf | https://huggingface.co/handy-computer/nemotron-3.5-asr-streaming-0.6b-gguf | other | unknown | Preserve upstream attribution; base_model nvidia/nemotron-3.5-asr-streaming-0.6b | unknown — verify source repo license before any distribution action | reference/download only | unknown |
| 3 | handy-computer/canary-180m-flash-gguf | https://huggingface.co/handy-computer/canary-180m-flash-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/canary-180m-flash | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 4 | handy-computer/cohere-transcribe-03-2026-gguf | https://huggingface.co/handy-computer/cohere-transcribe-03-2026-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/CohereLabs attribution; base_model CohereLabs/cohere-transcribe-03-2026 | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 5 | handy-computer/whisper-medium-gguf | https://huggingface.co/handy-computer/whisper-medium-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenAI attribution; base_model openai/whisper-medium | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 6 | handy-computer/Voxtral-Mini-4B-Realtime-2602-gguf | https://huggingface.co/handy-computer/Voxtral-Mini-4B-Realtime-2602-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/mistralai attribution; base_model mistralai/Voxtral-Mini-4B-Realtime-2602 | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 7 | handy-computer/parakeet-tdt-0.6b-v3-gguf | https://huggingface.co/handy-computer/parakeet-tdt-0.6b-v3-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/parakeet-tdt-0.6b-v3 | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 8 | handy-computer/parakeet-tdt-0.6b-v2-gguf | https://huggingface.co/handy-computer/parakeet-tdt-0.6b-v2-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/parakeet-tdt-0.6b-v2 | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 9 | handy-computer/Qwen3-ASR-0.6B-gguf | https://huggingface.co/handy-computer/Qwen3-ASR-0.6B-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/Qwen attribution; base_model Qwen/Qwen3-ASR-0.6B | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 10 | handy-computer/Fun-ASR-MLT-Nano-2512-gguf | https://huggingface.co/handy-computer/Fun-ASR-MLT-Nano-2512-gguf | other | unknown | Preserve upstream attribution; base_model FunAudioLLM/Fun-ASR-MLT-Nano-2512 | unknown — verify source repo license before any distribution action | reference/download only | unknown |
| 11 | handy-computer/canary-1b-flash-gguf | https://huggingface.co/handy-computer/canary-1b-flash-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/canary-1b-flash | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 12 | handy-computer/canary-1b-v2-gguf | https://huggingface.co/handy-computer/canary-1b-v2-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/canary-1b-v2 | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 13 | handy-computer/canary-1b-gguf | https://huggingface.co/handy-computer/canary-1b-gguf | cc-by-nc-4.0 | https://creativecommons.org/licenses/by-nc/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/canary-1b | **NON-COMMERCIAL — commercial distribution prohibited; commercial use requires separate permission** | reference/download only | restricted |
| 14 | handy-computer/canary-qwen-2.5b-gguf | https://huggingface.co/handy-computer/canary-qwen-2.5b-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/canary-qwen-2.5b | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 15 | handy-computer/cohere-transcribe-arabic-07-2026-gguf | https://huggingface.co/handy-computer/cohere-transcribe-arabic-07-2026-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/CohereLabs attribution; base_model CohereLabs/cohere-transcribe-arabic-07-2026 | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 16 | handy-computer/Fun-ASR-Nano-2512-gguf | https://huggingface.co/handy-computer/Fun-ASR-Nano-2512-gguf | other | unknown | Preserve upstream attribution; base_model FunAudioLLM/Fun-ASR-Nano-2512 | unknown — verify source repo license before any distribution action | reference/download only | unknown |
| 17 | handy-computer/gigaam-v3-ctc-gguf | https://huggingface.co/handy-computer/gigaam-v3-ctc-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/ai-sage attribution; base_model ai-sage/GigaAM-v3 | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 18 | handy-computer/gigaam-v3-e2e-ctc-gguf | https://huggingface.co/handy-computer/gigaam-v3-e2e-ctc-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/ai-sage attribution; base_model ai-sage/GigaAM-v3 | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 19 | handy-computer/gigaam-v3-rnnt-gguf | https://huggingface.co/handy-computer/gigaam-v3-rnnt-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/ai-sage attribution; base_model ai-sage/GigaAM-v3 | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 20 | handy-computer/gigaam-v3-e2e-rnnt-gguf | https://huggingface.co/handy-computer/gigaam-v3-e2e-rnnt-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/ai-sage attribution; base_model ai-sage/GigaAM-v3 | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 21 | handy-computer/granite-speech-4.1-2b-nar-gguf | https://huggingface.co/handy-computer/granite-speech-4.1-2b-nar-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/ibm-granite attribution; base_model ibm-granite/granite-speech-4.1-2b-nar | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 22 | handy-computer/granite-4.0-1b-speech-gguf | https://huggingface.co/handy-computer/granite-4.0-1b-speech-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/ibm-granite attribution; base_model ibm-granite/granite-4.0-1b-speech | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 23 | handy-computer/granite-speech-4.1-2b-gguf | https://huggingface.co/handy-computer/granite-speech-4.1-2b-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/ibm-granite attribution; base_model ibm-granite/granite-speech-4.1-2b | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 24 | handy-computer/granite-speech-4.1-2b-plus-gguf | https://huggingface.co/handy-computer/granite-speech-4.1-2b-plus-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/ibm-granite attribution; base_model ibm-granite/granite-speech-4.1-2b-plus | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 25 | handy-computer/medasr-gguf | https://huggingface.co/handy-computer/medasr-gguf | other | unknown | Preserve upstream attribution; base_model google/medasr | unknown — verify source repo license before any distribution action | reference/download only | unknown |
| 26 | handy-computer/moonshine-streaming-tiny-gguf | https://huggingface.co/handy-computer/moonshine-streaming-tiny-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-streaming-tiny | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 27 | handy-computer/moonshine-tiny-gguf | https://huggingface.co/handy-computer/moonshine-tiny-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-tiny | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 28 | handy-computer/moonshine-tiny-ar-gguf | https://huggingface.co/handy-computer/moonshine-tiny-ar-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-tiny-ar | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 29 | handy-computer/moonshine-tiny-ja-gguf | https://huggingface.co/handy-computer/moonshine-tiny-ja-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-tiny-ja | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 30 | handy-computer/moonshine-tiny-ko-gguf | https://huggingface.co/handy-computer/moonshine-tiny-ko-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-tiny-ko | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 31 | handy-computer/moonshine-tiny-uk-gguf | https://huggingface.co/handy-computer/moonshine-tiny-uk-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-tiny-uk | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 32 | handy-computer/moonshine-tiny-vi-gguf | https://huggingface.co/handy-computer/moonshine-tiny-vi-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-tiny-vi | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 33 | handy-computer/moonshine-tiny-zh-gguf | https://huggingface.co/handy-computer/moonshine-tiny-zh-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-tiny-zh | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 34 | handy-computer/moonshine-base-gguf | https://huggingface.co/handy-computer/moonshine-base-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-base | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 35 | handy-computer/moonshine-base-ar-gguf | https://huggingface.co/handy-computer/moonshine-base-ar-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-base-ar | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 36 | handy-computer/moonshine-base-ja-gguf | https://huggingface.co/handy-computer/moonshine-base-ja-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-base-ja | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 37 | handy-computer/moonshine-base-ko-gguf | https://huggingface.co/handy-computer/moonshine-base-ko-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-base-ko | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 38 | handy-computer/moonshine-base-uk-gguf | https://huggingface.co/handy-computer/moonshine-base-uk-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-base-uk | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 39 | handy-computer/moonshine-base-vi-gguf | https://huggingface.co/handy-computer/moonshine-base-vi-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-base-vi | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 40 | handy-computer/moonshine-base-zh-gguf | https://huggingface.co/handy-computer/moonshine-base-zh-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-base-zh | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 41 | handy-computer/moonshine-streaming-small-gguf | https://huggingface.co/handy-computer/moonshine-streaming-small-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-streaming-small | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 42 | handy-computer/moonshine-streaming-medium-gguf | https://huggingface.co/handy-computer/moonshine-streaming-medium-gguf | mit | https://opensource.org/licenses/MIT | Preserve Handy/UsefulSensors attribution; base_model UsefulSensors/moonshine-streaming-medium | MIT notice terms apply; confirm at source repo | reference/download only | requires notice |
| 43 | handy-computer/moss-transcribe-diarize-gguf | https://huggingface.co/handy-computer/moss-transcribe-diarize-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenMOSS-Team attribution; base_model OpenMOSS-Team/MOSS-Transcribe-Diarize | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 44 | handy-computer/nemotron-speech-streaming-en-0.6b-gguf | https://huggingface.co/handy-computer/nemotron-speech-streaming-en-0.6b-gguf | other | unknown | Preserve upstream attribution; base_model nvidia/nemotron-speech-streaming-en-0.6b | unknown — verify source repo license before any distribution action | reference/download only | unknown |
| 45 | handy-computer/parakeet-tdt_ctc-110m-gguf | https://huggingface.co/handy-computer/parakeet-tdt_ctc-110m-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/parakeet-tdt_ctc-110m | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 46 | handy-computer/multitalker-parakeet-streaming-0.6b-v1-gguf | https://huggingface.co/handy-computer/multitalker-parakeet-streaming-0.6b-v1-gguf | other | unknown | Preserve upstream attribution; base_model nvidia/multitalker-parakeet-streaming-0.6b-v1 | unknown — verify source repo license before any distribution action | reference/download only | unknown |
| 47 | handy-computer/parakeet-ctc-0.6b-gguf | https://huggingface.co/handy-computer/parakeet-ctc-0.6b-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/parakeet-ctc-0.6b | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 48 | handy-computer/parakeet-rnnt-0.6b-gguf | https://huggingface.co/handy-computer/parakeet-rnnt-0.6b-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/parakeet-rnnt-0.6b | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 49 | handy-computer/parakeet-ctc-1.1b-gguf | https://huggingface.co/handy-computer/parakeet-ctc-1.1b-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/parakeet-ctc-1.1b | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 50 | handy-computer/parakeet-primeline-gguf | https://huggingface.co/handy-computer/parakeet-primeline-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/primeline attribution; base_model primeline/parakeet-primeline | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 51 | handy-computer/parakeet-tdt-1.1b-gguf | https://huggingface.co/handy-computer/parakeet-tdt-1.1b-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/parakeet-tdt-1.1b | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 52 | handy-computer/parakeet-rnnt-1.1b-gguf | https://huggingface.co/handy-computer/parakeet-rnnt-1.1b-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/parakeet-rnnt-1.1b | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 53 | handy-computer/parakeet-tdt_ctc-1.1b-gguf | https://huggingface.co/handy-computer/parakeet-tdt_ctc-1.1b-gguf | cc-by-4.0 | https://creativecommons.org/licenses/by/4.0/ | Preserve Handy/NVIDIA attribution; base_model nvidia/parakeet-tdt_ctc-1.1b | BY terms apply; confirm at source repo | reference/download only | requires notice |
| 54 | handy-computer/Qwen3-ASR-1.7B-gguf | https://huggingface.co/handy-computer/Qwen3-ASR-1.7B-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/Qwen attribution; base_model Qwen/Qwen3-ASR-1.7B | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 55 | handy-computer/SenseVoiceSmall-gguf | https://huggingface.co/handy-computer/SenseVoiceSmall-gguf | other | unknown | Preserve upstream attribution; base_model FunAudioLLM/SenseVoiceSmall | unknown — verify source repo license before any distribution action | reference/download only | unknown |
| 56 | handy-computer/Voxtral-Mini-3B-2507-gguf | https://huggingface.co/handy-computer/Voxtral-Mini-3B-2507-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/mistralai attribution; base_model mistralai/Voxtral-Mini-3B-2507 | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 57 | handy-computer/Voxtral-Small-24B-2507-gguf | https://huggingface.co/handy-computer/Voxtral-Small-24B-2507-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/mistralai attribution; base_model mistralai/Voxtral-Small-24B-2507 | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 58 | handy-computer/whisper-tiny-gguf | https://huggingface.co/handy-computer/whisper-tiny-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenAI attribution; base_model openai/whisper-tiny | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 59 | handy-computer/whisper-tiny.en-gguf | https://huggingface.co/handy-computer/whisper-tiny.en-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenAI attribution; base_model openai/whisper-tiny.en | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 60 | handy-computer/whisper-base-gguf | https://huggingface.co/handy-computer/whisper-base-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenAI attribution; base_model openai/whisper-base | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 61 | handy-computer/whisper-base.en-gguf | https://huggingface.co/handy-computer/whisper-base.en-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenAI attribution; base_model openai/whisper-base.en | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 62 | handy-computer/whisper-small.en-gguf | https://huggingface.co/handy-computer/whisper-small.en-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenAI attribution; base_model openai/whisper-small.en | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 63 | handy-computer/whisper-small-gguf | https://huggingface.co/handy-computer/whisper-small-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenAI attribution; base_model openai/whisper-small | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 64 | handy-computer/whisper-medium.en-gguf | https://huggingface.co/handy-computer/whisper-medium.en-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenAI attribution; base_model openai/whisper-medium.en | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 65 | handy-computer/whisper-large-v3-turbo-gguf | https://huggingface.co/handy-computer/whisper-large-v3-turbo-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenAI attribution; base_model openai/whisper-large-v3-turbo | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 66 | handy-computer/Breeze-ASR-25-gguf | https://huggingface.co/handy-computer/Breeze-ASR-25-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/MediaTek-Research attribution; base_model MediaTek-Research/Breeze-ASR-25 | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 67 | handy-computer/whisper-large-gguf | https://huggingface.co/handy-computer/whisper-large-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenAI attribution; base_model openai/whisper-large | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 68 | handy-computer/whisper-large-v2-gguf | https://huggingface.co/handy-computer/whisper-large-v2-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenAI attribution; base_model openai/whisper-large-v2 | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |
| 69 | handy-computer/whisper-large-v3-gguf | https://huggingface.co/handy-computer/whisper-large-v3-gguf | apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | Preserve Handy/OpenAI attribution; base_model openai/whisper-large-v3 | Apache-2.0 notice terms apply; confirm at source repo | reference/download only | requires notice |

Status totals: `requires notice` ×61 · `restricted` ×1 · `unknown` ×7 ·
`compatible` (fully cleared for distribution) ×0. **No model is marked
distributable-approved.** The catalog-declared license is Handy metadata, not
a weight-license grant; per-model source-repo verification remains future
release work (§10). No ownership of any third-party model is claimed.

---

## 7. Model-weight distribution distinction

- The restored `catalog.json` is **metadata only**: model descriptors (HF
  repo id, pinned `revision`, per-quant `filename`/`size_bytes`/`sha256`,
  scores, capabilities, mirrors). It contains **zero weight bytes**.
- **No model weight file was downloaded, bundled, vendored, or fabricated**
  in this task. No `resources/` directory exists; no `*.onnx` exists
  repo-wide; `selected_model` remains `""`.
- Soravo intent for every model (§6): **reference/download only** — weights
  resolve at runtime from the upstream source (Hugging Face `handy-computer/*`
  repos and/or the `https://blob.handy.computer` mirror) with the catalog's
  pinned revisions and SHA-256/size verification, subject to each model's
  license. Soravo does **not** bundle or redistribute weight files.
- Restoring catalog bytes is provenance preservation per v6 §21 (*Two
  separations*). It does **not** grant redistribution rights for any weight
  and does not discharge the per-model license gate (v6 ADR-011, T10).

---

## 8. Remaining asset blockers

1. **Model weights on disk:** none vendored; runtime download path
   unverified end-to-end (requires network + HF/mirror trust approval,
   still owner-gated per T33-K O-K2 mirror-host item).
2. **VAD asset:** `silero_vad_v4.onnx` (1,807,522 B upstream) absent
   repo-wide and never in any ref — separate acquisition gate with its own
   license/provenance/checksum evidence (v6 §21).
3. **`selected_model` default:** `""` — no model selected; first-run
   transcription still stops at the model/VAD asset gates (ADR-019 I4 holds).
4. **Mirror host trust:** `https://blob.handy.computer` (third-party) requires
   human trust + redistribution approval before production use.
5. **Transcription suite:** the 5 frozen-V1 transcription expectation
   disagreements (T32-Y §11.1 class 2) are outside this task's scope and were
   not touched; they were already resolved upstream of this task per the
   T33-J `254/2` baseline (5 fixed by T33-J recovery, 2 catalog fixed here).

---

## 9. CI result

Local CI-equivalent (exact CI `rust`-job commands): fmt PASS · clippy
`-D warnings` PASS · `cargo test --workspace` all-green (0 failures) ·
`cargo audit --deny warnings` (CI ignore list) exit 0 · `cargo deny check`
all-ok. Web/e2e/desktop jobs are unaffected by this data-only change (no
source, UI, workflow, or dependency delta); post-push CI observation will
confirm.

Post-push CI run: *to be recorded after push* (see PROGRESS.md T33-L entry).

---

## 10. Model-specific restrictions requiring future release work

1. **`handy-computer/canary-1b-gguf` (`cc-by-nc-4.0`, base
   `nvidia/canary-1b`): PRESERVED per O-K2, status `restricted`.
   Non-commercial terms prohibit commercial distribution of this model's
   weights; any commercial use (including paid Soravo distribution or
   bundling) requires separate permission or exclusion at release time.
   Release action: owner/legal decision — carve-out, separate permission, or
   commercial-use prohibition notice.
2. **7× `other` models** (nemotron-3.5-asr-streaming-0.6b,
   Fun-ASR-MLT-Nano-2512, Fun-ASR-Nano-2512, medasr,
   nemotron-speech-streaming-en-0.6b, multitalker-parakeet-streaming-0.6b-v1,
   SenseVoiceSmall): status `unknown`. Release action: per-model source-repo
   license review (exact artifact, publisher, source URL, license, commercial
   use, redistribution, hosting, checksum, provenance, release decision — the
   T10 ten-item checklist) before any distribution claim.
3. **61× `requires notice` models**: release action — (a) confirm the
   weight-level license at each source repo (catalog string is Handy metadata,
   not the weight grant); (b) satisfy attribution/notice terms (Apache-2.0
   NOTICE, MIT copyright notice, CC-BY-4.0 attribution); (c) plan Soravo
   website + project-documentation attribution pages crediting Handy
   (`cjpais/Handy`, MIT software license) and each model publisher without
   claiming ownership.
4. **Mirror/hosting approval**: `handy-computer` HF org as source and
   `blob.handy.computer` as mirror host require explicit trust/redistribution
   approval before production downloads route through them.
5. **T28 §7 / T10 checklist**: remains 0/9 data items closed for
   distribution purposes — restoration changed CI state, not release state.

---

## 11. Non-goals honoured (explicit)

No test edited/added/removed/relocated/ignored/annotated. No transcription
implementation or behavior change. No model-manager logic change. No Handy
transcription file touched. No weight or VAD asset fabricated, downloaded, or
bundled. No UI change. No workflow change. No Handy re-fork (pin target only,
no `main` code taken). No model metadata fabricated (all strings are upstream
bytes). No license silently approved (0 models marked compatible).

**STOP-check:** no STOP condition fired. The task's explicit prohibitions
were all held. Proceeding to commit/push per the repository's branch/PR
workflow (PR #63, review still outstanding — merge remains a human decision).
