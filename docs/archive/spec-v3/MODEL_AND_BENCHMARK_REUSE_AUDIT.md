# Model and Benchmark Reuse Audit

**Audit Date:** 2026-09-25
**Scope:** Handy model catalog, model selector, model manager, benchmark infrastructure, and model provenance
**Authority:** SORAVO_PLAN.md, docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md, docs/spec-v3/12_BENCHMARK_PROTOCOL.md

---

## 1. Executive Summary

Handy provides a working model catalog, model selector, and model manager infrastructure that can be reused as a **technical foundation** for Soravo. However:

- **ALL model licenses are BLOCKED/unknown** — no model can be redistributed or commercially used until upstream license terms are verified
- **No benchmark measurements exist** for any Handy model — benchmark protocol is documented but not executed
- **Model provenance must be independently documented** for each model before Soravo can redistribute or commercially use any model
- The model manager infrastructure (download, checksum verification, atomic install/rollback) can be directly adopted
- The model catalog structure and format can be directly adopted

### Recommendation

Reuse the Handy model manager infrastructure and catalog structure **as a technical foundation**, but **independently verify every model's license** before Soravo redistributes or commercially uses any model. Generate benchmark data before engine selection.

---

## 2. Handy Model Catalog

### 2.1 Catalog Location and Structure

- **Bundled catalog:** `apps/desktop/src-tauri/src/catalog/catalog.json`
- **Compiled into binary** — zero network access at runtime
- **Source:** `handy-computer` organization on Hugging Face, hosted at `https://blob.handy.computer/`
- **Generation:** `scripts/gen_catalog.py` (though the scripts directory is empty in this workspace; catalog is pre-built)

### 2.2 Catalog Contents

The catalog contains models from the `handy-computer` organization, each with:
- `id`: Model identifier (e.g., `handy-computer/whisper-small-gguf`)
- `revision`: Commit SHA for provenance
- `name`: Display name
- `languages`: Supported language codes
- `capabilities`: Streaming, translation, language detection
- `files`: Quantization files with filenames, sizes, and SHA-256 checksums
- `default_quant`: Default quantization variant
- `speed_score` / `accuracy_score`: 0–100 ratings

### 2.3 Models Currently Offered by Handy

| Model ID | Name | Version | Source |
|---|---|---|---|
| `whisper-small` | Whisper Small | N/A (binary) | `https://blob.handy.computer/ggml-small.bin` |
| `whisper-medium` | Whisper Medium | N/A (binary) | `https://blob.handy.computer/whisper-medium-q4_1.bin` |
| `whisper-turbo` | Whisper Turbo | N/A (binary) | `https://blob.handy.computer/ggml-large-v3-turbo.bin` |
| `whisper-large` | Whisper Large | N/A (binary) | `https://blob.handy.computer/ggml-large-v3-q5_0.bin` |
| `breeze-asr` | Breeze ASR | N/A (binary) | `https://blob.handy.computer/breeze-asr-q5_k.bin` |
| `parakeet-tdt-0.6b-v2` | Parakeet V2 | N/A (directory) | `https://blob.handy.computer/parakeet-v2-int8.tar.gz` |
| `parakeet-tdt-0.6b-v3` | Parakeet V3 | N/A (directory) | `https://blob.handy.computer/parakeet-v3-int8.tar.gz` |
| `moonshine-base` | Moonshine Base | N/A (directory) | `https://blob.handy.computer/moonshine-base.tar.gz` |
| `moonshine-tiny-streaming-en` | Moonshine V2 Tiny | N/A (directory) | `https://blob.handy.computer/moonshine-tiny-streaming-en.tar.gz` |
| `moonshine-small-streaming-en` | Moonshine V2 Small | N/A (directory) | `https://blob.handy.computer/moonshine-small-streaming-en.tar.gz` |
| `sense-voice-int8` | SenseVoice | N/A (directory) | `https://blob.handy.computer/sense-voice-int8.tar.gz` |
| `gigaam-v3-e2e-ctc` | GigaAM v3 | N/A (directory) | `https://blob.handy.computer/giga-am-v3-int8.tar.gz` |
| `canary-180m-flash` | Canary 180M Flash | N/A (directory) | `https://blob.handy.computer/canary-180m-flash.tar.gz` |
| `canary-1b-v2` | Canary 1B v2 | N/A (directory) | `https://blob.handy.computer/canary-1b-v2.tar.gz` |
| `cohere-int8` | Cohere | N/A (directory) | `https://blob.handy.computer/cohere-int8.tar.gz` |

### 2.4 Model Providers/Upstreams

- **Primary upstream:** `https://blob.handy.computer/` — Handy's static file hosting service
- **Hugging Face:** `handy-computer` organization — mirrors for some models
- **Origin:** Repository `https://github.com/cjpais/Handy` (MIT licensed code)

### 2.5 Model Download Sources

All models download from `https://blob.handy.computer/` with the pattern:
```
https://blob.handy.computer/<filename>
```

For Hugging Face cached models, the source is `hf-hub` with repo IDs like `handy-computer/whisper-small-gguf`.

**Checksums:** SHA-256 checksums are present for every model file in the catalog and are enforced by the `ModelDownloader` in `crates/models/src/lib.rs` and `apps/desktop/src-tauri/src/managers/model.rs`.

### 2.6 Model File Formats

- **Whisper/legacy:** `*.bin` (GGML format), loaded through `transcribe-cpp`
- **GGUF models:** `*.gguf` — native format for transcribe-cpp/Parakeet/Moonshine/etc.
- **Directory-based models:** `tar.gz` archives containing model files (Parakeet V2/V3, Moonshine, SenseVoice, GigaAM, Canary, Cohere)
- **Quantization variants:** q4_1, q5_0, int8, etc. (Whisper); int8, q5_k_m, etc. (GGUF family)

### 2.7 Model Managers

Two model manager implementations exist:

1. **`crates/models/src/lib.rs`** — Library crate with:
   - `ModelManifest` structure (FR-206 requirements)
   - `ModelFile` with `sha256`, `size_bytes`, `url`
   - `ModelDownloader` with HTTPS-only validation, SSRF protection, checksum verification, atomic install with rollback
   - `ModelManager` with verify/install/rollback methods

2. **`apps/desktop/src-tauri/src/managers/model.rs`** — Tauri application implementation with:
   - `ModelManager` with `new()`, `get_available_models()`, `seed_catalog_models()`
   - `discover_custom_transcribe_models()` — auto-discover `.bin`/`.gguf` in user models dir
   - `discover_hf_cache_models()` — discover GGUF in shared HF cache
   - `download_model()` — download from HF or direct URL with mirror fallbacks
   - `download_hf_model()` — Hugging Face API download with progress reporting
   - `download_from_mirror()` — mirror fallback download with SHA-256 verification
   - `rescan_local_models()` — refresh discovered models
   - Runtime capability reconciliation via `set_runtime_capabilities()`

### 2.8 Checksums

SHA-256 checksums are present and enforced for every model file:

- Whisper small: `1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b`
- Whisper medium: `79283fc1f9fe12ca3248543fbd54b73292164d8df5a16e095e2bceeaaabddf57`
- Whisper turbo: `1fc70f774d38eb169993ac391eea357ef47c88757ef72ee5943879b7e8e2bc69`
- Whisper large: `d75795ecff3f83b5faa89d1900604ad8c780abd5739fae406de19f23ecd98ad1`
- Parakeet V2: `ac9b9429984dd565b25097337a887bb7f0f8ac393573661c651f0e7d31563991`
- Parakeet V3: `43d37191602727524a7d8c6da0eef11c4ba24320f5b4730f1a2497befc2efa77`
- Moonshine base: `04bf6ab012cfceebd4ac7cf88c1b31d027bbdd3cd704649b692e2e935236b7e8`
- etc.

All checksums are verified by `ModelDownloader.download_file()` and `ModelManager.verify()` before installation.

### 2.9 Benchmark Infrastructure

- **Protocol:** `docs/spec-v3/12_BENCHMARK_PROTOCOL.md` defines the benchmark procedure
- **Status:** ❌ NOT EXECUTED — no benchmark measurements exist for any model
- **Protocol requirements:** fixed hardware, fixed audio, fixed test corpus, release builds, warm/cold runs, repeated measurements, latency, RTF, quality, stability, resource use, packaging, licensing
- **Metrics defined:** latency (capture start, first partial, first stable partial, finalization), throughput (real-time factor), quality (WER, CER, punctuation, capitalization, named entity preservation), stability (duplicate rate, revision rate, committed-prefix stability), resources (peak RAM, steady RAM, CPU, GPU, model load time, cold start, warm start), packaging (binary size, model size, platform availability, licensing, dependency complexity)

### 2.10 Benchmark Datasets/Fixtures

- ❌ NO datasets or fixtures exist
- Dataset creation is required per the benchmark protocol (local dataset of representative speech audio)

### 2.11 Benchmark Methodology

Defined in `docs/spec-v3/12_BENCHMARK_PROTOCOL.md` — procedure:
1. Fixed hardware
2. Fixed audio input
3. Fixed sample rate
4. Fixed test corpus
5. Release builds
6. Warm and cold runs
7. Repeat enough times to reduce noise
8. Record results
9. Produce comparison report

Decision selects backend based on weighted evidence: latency, quality, stability, resource usage, licensing, platform support, maintainability. Parakeet is the default primary candidate, not an unconditional mandate.

### 2.12 Existing Benchmark Results

- ❌ NONE — no benchmark results exist for any model
- Benchmark harness (STT-002) is implemented in `crates/stt` but has never been executed

### 2.13 WER/CER Measurements

- ❌ NONE — no WER/CER measurements exist for any Handy or Soravo model
- Must be generated per benchmark protocol before engine selection

### 2.14 Speed/Latency Measurements

- ❌ NONE — no speed or latency measurements exist
- Must be generated per benchmark protocol

### 2.15 Streaming/Batch Distinctions

- Catalog records `supports_streaming` boolean for each model
- Whisper models: `supports_streaming: false` (only batch/inference)
- Parakeet V2/V3: `supports_streaming: false` in current catalog (though GGUF headers may infer streaming capability)
- Moonshine streaming variants: `supports_streaming: true` (Moonshine V2 Tiny, Small, Medium)
- GGUF `stt.capability.streaming` key indicates native live-streaming support

### 2.16 Model Licensing/Provenance Information

**⚠️ ALL MODELS ARE BLOCKED — LICENSES UNVERIFIED**

Per `docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md` and `docs/spec-v3/16_HANDY_MIGRATION_STATUS.md`:

| Model Category | Status | Notes |
|---|---|---|
| Parakeet V2 | BLOCKED | Hosted on blob.handy.computer; license unverified |
| Parakeet V3 | BLOCKED | Hosted on blob.handy.computer; license unverified |
| Whisper variants | BLOCKED | Hosted on blob.handy.computer; license unverified |
| Moonshine | BLOCKED | Hosted on blob.handy.computer; license unverified |
| Sense Voice | BLOCKED | Hosted on blob.handy.computer; license unverified |

**Critical distinction:** SOFTWARE LICENSE ≠ MODEL LICENSE ≠ MODEL WEIGHT REDISTRIBUTION RIGHTS. Handy's MIT code license does NOT cover model weights.

**Required verification for each model:**
1. Exact source and version
2. License terms
3. Commercial use rights
4. Redistribution rights
5. Attribution requirements
6. Checksum verification
7. Hosting restrictions

**Actions required (from docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md):**
1. Contact Handy/CJPais — obtain explicit license terms for all models
2. Document license texts — preserve exact license text
3. Verify commercial rights — confirm commercial use is permitted
4. Verify redistribution — confirm redistribution is permitted (if needed)
5. Update manifest — populate model catalog with verified data

**Blocking rules:** DO NOT proceed with model distribution or commercial release if any model has status BLOCKED, license verification is incomplete, or redistribution rights are unclear.

---

## 3. Benchmark Adoption Analysis

### 3.1 Can Handy's Existing Benchmarks Be Adopted Directly?

**No.** Handy has **no existing benchmark measurements** of any kind. The benchmark protocol (`docs/spec-v3/12_BENCHMARK_PROTOCOL.md`) is documented but has never been executed. There are no WER/CER measurements, no latency measurements, no resource usage measurements, and no stability data for any model.

### 3.2 What Must Change

To adopt any model for Soravo, the following must happen **before** engine selection:

1. **Generate benchmark data** per the protocol in `docs/spec-v3/12_BENCHMARK_PROTOCOL.md`
   - Fixed hardware configuration documented
   - Representative test corpus created (diverse speech types, accents, vocabularies)
   - Release builds compiled
   - Warm and cold runs executed
   - Repeated measurements for statistical significance
   - Latency, RTF, WER, CER, resource usage recorded

2. **Independently verify model licenses** per `docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md`
   - Contact Handy/CJPais for license terms
   - Document commercial use rights
   - Document redistribution rights
   - Record attribution requirements

3. **Produce comparison report** weighting evidence:
   - Latency
   - Quality (WER/CER)
   - Stability
   - Resource usage
   - Licensing
   - Platform support
   - Maintainability

### 3.3 Recommended Path Forward

1. **Immediately contact Handy/CJPais** to obtain model license terms for all models in the catalog
2. **Create a benchmark test corpus** following `docs/spec-v3/12_BENCHMARK_PROTOCOL.md`
3. **Execute benchmarks** for Parakeet and Whisper variants on fixed hardware
4. **Record WER/CER, latency, RTF, resource usage** for each model
5. **Document license provenance** for each model before any redistribution
6. **Select engine based on benchmark evidence** — Parakeet default primary, but benchmarks may override
7. **Update `docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md`** with verified license data
8. **Populate model catalog** with verified data per the verification requirements

### 3.4 What Can Be Reused from Handy (Technical Foundation)

| Component | Status | Notes |
|---|---|---|
| Model manager infrastructure | ✅ REUSE | Download, checksum verification, atomic install/rollback |
| Model catalog structure | ✅ REUSE | Format, normalization to ModelDescriptor |
| Download mechanisms | ✅ REUSE | HTTPS-only, SSRF protection, mirror fallbacks with SHA-256 |
| GGUF header probing | ✅ REUSE | Capability detection before download |
| Audio capture toolkit | ✅ REUSE | VAD integration, CPAL, ring buffer, warm capture |
| Hotkey/typing infrastructure | ✅ REUSE | Global shortcuts, clipboard handling, native insertion |
| Settings/storage infrastructure | ✅ REUSE | Persistence, migration, change notifications |

### 3.5 What Must Change (Beyond Technical Foundation)

| Area | Required Change |
|---|---|
| Model licenses | ALL models must have verified license terms — currently ALL BLOCKED |
| Benchmark data | Must be generated — currently NONE exists |
| Model provenance | Must be independently documented for each model |
| Engine selection | Must be benchmark-driven, not assumed from Handy's catalog |
| Commercial use | Cannot redistribute or commercially use any model until licenses verified |

---

## 4. Conclusion

Handy provides a **solid technical foundation** for Soravo's desktop implementation:

- ✅ Model manager infrastructure (download, verify, install, rollback) can be directly adopted
- ✅ Model catalog structure and format can be directly adopted  
- ✅ Download mechanisms (HTTPS, SSRF protection, mirror fallbacks) can be directly adopted
- ✅ Audio capture, VAD, hotkeys, typing, and settings can be reused as technical foundations
- ❌ **ALL model licenses are BLOCKED** — must independently verify before any redistribution
- ❌ **No benchmark data exists** — must generate before engine selection
- ❌ **Model provenance must be independently documented** for each model

**Soravo should reuse the Handy model manager and catalog as a technical foundation, but must independently verify all model licenses and generate benchmark data before selecting or redistributing any model.**

---

## 5. Evidence Sources

| Finding | Source |
|---|---|
| Model catalog structure | `apps/desktop/src-tauri/src/catalog/catalog.json`, `catalog/mod.rs` |
| Model downloads from blob.handy.computer | `apps/desktop/src-tauri/src/managers/model.rs` — ModelInfo construction |
| SHA-256 checksums | `crates/models/src/lib.rs` — ModelDownloader, ModelManager.verify() |
| Model manager code | `crates/models/src/lib.rs`, `apps/desktop/src-tauri/src/managers/model.rs` |
| Benchmark protocol | `docs/spec-v3/12_BENCHMARK_PROTOCOL.md` |
| Model license status BLOCKED | `docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md` |
| Model license status BLOCKED | `docs/spec-v3/16_HANDY_MIGRATION_STATUS.md` — "Model catalog is empty. Upstream licenses unverified." |
| Handy repository | `https://github.com/cjpais/Handy` — MIT code, separate dependency licenses |
| Model categories blocked | `docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md` §5 Model Categories |
| SORAVO_PLAN.md authority | `SORAVO_PLAN.md` — Section 7 (Model Policy), Section 8 (Benchmark Policy) |

---

*End of audit report.*