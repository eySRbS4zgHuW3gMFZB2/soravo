# MODEL_LICENSES — T10 Commercial Model Safety Gate (authoritative)

**Status:** Canonical authority for the T10 commercial model safety policy.
**Machine authority:** `MODEL_LICENSES.json` (same directory). It is compiled
into the desktop binary (`catalog::commercial` embeds it with `include_str!`)
so the gate decision is deterministic and cannot be altered at runtime.
**This document** is the human-readable record of the policy, the evidence
basis, and the update procedure. On any conflict between prose and
`MODEL_LICENSES.json`, the JSON governs the runtime gate and this document
must be corrected.

## 1. Policy

SORAVO MUST NOT expose a model for commercial download or use unless that
model is present in `MODEL_LICENSES.json` with a commercially approved
classification. Enforcement is in application code
(`apps/desktop/src-tauri/src/catalog/commercial.rs`,
`apps/desktop/src-tauri/src/managers/model.rs`), never by UI hiding,
comments, naming, ordering, or manual review.

Security invariant:

> MISSING OR INVALID COMMERCIAL LICENSE DATA = NOT COMMERCIALLY CLEARED

## 2. Classifications

Commercially approved (the model is exposed for selection/download):

| Classification | Meaning |
|---|---|
| `COMMERCIAL-CLEAR` | Catalog-declared permissive license (`apache-2.0`, `mit`) permits commercial use with no in-flow attribution precondition. |
| `COMMERCIAL-CLEAR-WITH-ATTRIBUTION` | License (`cc-by-4.0`) permits commercial use conditioned on attribution. The exact required notice in `attribution_text` MUST be surfaced with the model (Settings → Models). |

Not approved (the model is never seeded, never surfaced from disk/HF-cache
discovery, never listed, never downloaded, never selected):

| Classification | Meaning |
|---|---|
| `NON-COMMERCIAL` | License explicitly forbids commercial use (e.g. `cc-by-nc-4.0`). Kept blocked; never reinterpreted. |
| `PROHIBITED` | Audit-identified prohibition. Kept blocked; never reinterpreted. (No catalog model currently carries this value; the gate logic handles it.) |
| `UNKNOWN` | License is `other`/unverifiable in the catalog. Blocked until verified. |
| `INSUFFICIENT-PROVENANCE` | Artifact provenance cannot be traced. Blocked until traced. (Handled by the gate; currently unused in the registry.) |

Any other value — including a missing entry, a missing file, unparseable
JSON, a version mismatch, or an unrecognised classification string — resolves
to NOT CLEARED (fail closed).

## 3. Current registry counts (2026-10-09, 69 catalog models)

- `COMMERCIAL-CLEAR`: 46 (25 × `apache-2.0`, 21 × `mit`)
- `COMMERCIAL-CLEAR-WITH-ATTRIBUTION`: 15 (15 × `cc-by-4.0`)
- Approved total: 61
- `NON-COMMERCIAL`: 1 (`handy-computer/canary-1b-gguf`, `cc-by-nc-4.0`)
- `UNKNOWN`: 7 (catalog license `other`: Nemotron 3.5 streaming, Fun-ASR MLT
  Nano, Fun-ASR Nano, MedASR, Nemotron EN streaming, Multitalker Parakeet,
  SenseVoiceSmall)
- Blocked total: 8

## 4. Evidence basis and limits (no legal assumptions)

- `license` values are the catalog-declared upstream license labels from
  `apps/desktop/src-tauri/src/catalog/catalog.json`; a test asserts every
  non-`UNKNOWN` registry entry matches the catalog label, so no model is
  silently reclassified.
- `base_model`/`upstream_url` are provenance pointers, corrected to the
  catalog evidence during implementation (moss → `OpenMOSS-Team/...`,
  primeline → `primeline/...`).
- Attribution notices are mechanical renderings of the form
  `"<model> by <org> is licensed under <license>."` using exact catalog
  identifiers. No new license terms were invented; no publisher was
  reinterpreted.
- **Limit:** these are catalog-declared labels, not an independent legal
  review. Redistribution/hosting rights for mirror serving
  (`blob.handy.computer`) remain unverified and MUST have legal sign-off
  before commercial release. Blocked entries stay blocked when evidence is
  missing — an `UNKNOWN` entry is never upgraded on assumption.

## 5. Enforcement points (all in `managers/model.rs` via `catalog::commercial`)

1. `seed_catalog_models` — only cleared catalog descriptors are seeded.
2. `discover_custom_transcribe_models` — a file matching a blocked catalog
   quant never surfaces (neither as catalog entry nor as custom model);
   files are left on disk (never silently deleted).
3. `discover_hf_cache_models_in` — same rule for HF-cache files, including a
   filename-wide check so a blocked file cannot bypass under a foreign repo id.
4. `rescan_local_models` — covered (it reuses 2 and 3).
5. `get_available_models` / `get_model_info` — final exposure filter; an
   already-downloaded blocked model is not listed, not selectable, not
   loadable.
6. `download_model` — refuses blocked catalog models with an explicit error.

## 6. Explicitly out of scope (residual risks, see final report)

- Legacy `Url`-sourced table entries (pre-catalog `blob.handy.computer`
  downloads): unchanged and still governed by the existing UI deprecation
  rule (hidden unless downloaded). They carry unverified licenses and MUST
  be verified or retired before commercial release.
- Truly foreign HF-cache repos (no catalog filename match) and user-provided
  `Local` custom models: unchanged per invariant 10 (local custom-model
  compatibility). They are not catalog models and never gain catalog
  metadata.

## 7. Update procedure

1. When `catalog.json` is regenerated, add one entry per new catalog repo id.
   Default to `UNKNOWN` (blocked) unless license evidence justifies otherwise.
2. Never change a model's classification to unblock it without recorded
   license evidence; record the evidence source in `notes`.
3. The `registry_covers_every_catalog_model` test fails if any catalog model
   lacks a registry entry — this is the enforcement of step 1.
4. Attribution text for `COMMERCIAL-CLEAR-WITH-ATTRIBUTION` entries is
   normative: the Settings → Models surface renders it verbatim.
