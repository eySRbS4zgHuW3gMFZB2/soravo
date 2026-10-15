# License + Source-Chain Release Gates — Gap Analysis (2026-10-15)

Branch `docs/license-source-gap` @ `7074c4dd` base. Docs-only: no registry
edit, no gate-logic change, no legal approval, no UNKNOWN→MET promotion.
Everything below is either first-hand verified this session (with source +
hash) or explicitly UNKNOWN. All commercial/redistribution gates stay BLOCKED.

Relationship to PR #115 (open, unmerged — not duplicated here): #115 corrects
the 69-row commercial registry to 0/69 cleared, fail-closed. This document adds
only what #115 does not cover: the LAUNCH model specifically, the upstream
weight terms fetched live, and the Handy pin LICENSE text/hash. No
`MODEL_LICENSES.*`, catalog, or gate file is touched by this branch.

## 1. Launch-model provenance (verified first-hand)

- Catalog (`apps/desktop/src-tauri/src/catalog/catalog.json` @ `7074c4dd`):
  entry `handy-computer/parakeet-unified-en-0.6b-gguf`, revision
  `7e948f21b7bdbac698d3318db9d350f1096f3b6c`, `base_model`
  `nvidia/parakeet-unified-en-0.6b`, catalog-declared `license: cc-by-4.0`,
  `default_quant: Q8_0`, `recommended: true`, rank 1.
- Q8_0 file pin in the same entry: 731,357,568 bytes, SHA-256
  `4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795` —
  byte-identical to the local artifact (verified by `sha256sum` + size this
  session and by the model acceptance test). Catalog↔artifact identity: MET.

## 2. Weight-license finding (new, live upstream evidence — gate-relevant)

Fetched read-only 2026-10-15 (no terms accepted, nothing downloaded except
API/Card metadata):

- `https://huggingface.co/api/models/nvidia/parakeet-unified-en-0.6b` → tag
  `license:other` (NOT cc-by-4.0).
- Its `README.md` frontmatter (`/raw/main/README.md`) → `license: other`,
  `license_name: nvidia-open-model-license`, `license_link:
  https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-license/`.
- `https://huggingface.co/api/models/handy-computer/parakeet-unified-en-0.6b-gguf`
  → tag `license:cc-by-4.0`.
- Consequence (fact, not a legal conclusion): the catalog's `cc-by-4.0`
  label (Handy metadata) does NOT match the upstream base-weight terms
  (NVIDIA Open Model License). Weight-license compatibility, GGUF
  conversion/quantization authorization, and Handy hosting/mirror rights
  (`handy-computer/*`, `blob.handy.computer`) are all UNVERIFIED — consistent
  with PR #115's `INSUFFICIENT-PROVENANCE` treatment, now specifically
  grounded for the launch model.

## 3. NVIDIA Open Model License Notice (missing evidence enumerated)

Observed from the license page
(`https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-license/`,
fetched 2026-10-15, page SHA-256
`38724a0c0bd6d7e25aad7daffa0049f9753a92175be0e7e0f147559c16c9f3b7` —
page bytes, NOT the canonical text): redistribution requires an attribution
notice in a "Notice" text file ("Licensed by NVIDIA Corporation under the
NVIDIA Open Model License"), plus compliance with accompanying component
terms. Repository state (searched `NOTICE*` filenames + the attribution
string across md/txt/json/rs/tsx, excluding deps/build): **no Notice file
exists; the attribution string appears nowhere.** Missing before any
model-shipping release: (a) the canonical NOML text as agreed by the owner,
(b) the shipped Notice file with exact attribution wording, (c) confirmation
that installer/download flows present it. Gate: BLOCKED.

## 4. Handy MIT text/hash (new evidence; one delta found)

Fetched read-only via authenticated GitHub API at the exact pin
(`repos/cjpais/Handy/contents/LICENSE?ref=ba10ce19…`, 2026-10-15):

- Pin LICENSE: 1,064 bytes, git blob `ff8dfab0159b41263ccc3c50da54007ca6752a22`
  (API blob sha == locally re-hashed content — authenticity chained),
  SHA-256 `3564e8ec14055ed54f896e8660a62627ea4fc3a1b64f72b798593df00e1f4edc`,
  standard MIT © 2025 CJ Pais.
- Repo root `LICENSE` (1,192 bytes) = the same MIT text PLUS an appended
  rider ("Portions of this project are proprietary to Soravo Engineering…").
  This per-file modification is now EVIDENCED (was manifest field 8 UNKNOWN).
  Whether the rider preserves MIT attribution compliance is an owner/legal
  determination — NOT made here. Upstream reachability differed by session
  (prior session: unreachable; this session: reachable — recorded, not
  disputed).

## 5. Still UNKNOWN (no change, no inference)

- Per-file post-import rationale for Handy-derived sources (manifest fields
  8 remainder, 9) beyond §4 above.
- Explicit V1 behavior-preservation checks (chain doc row stays UNKNOWN).
- CC-BY-4.0 attribution obligations IF any cleared model relies on them (0
  cleared — moot until clearance exists).
- Anything requiring owner/legal sign-off: model-license acceptance,
  redistribution approval, installer Notice wording, release authorization.

## Verdict

Model↔catalog↔artifact identity for the launch model: evidenced. Every
commercial-use, redistribution, Notice, and provenance-compliance gate:
BLOCKED on the enumerated missing evidence. This document grants no
clearance and changes no gate.
