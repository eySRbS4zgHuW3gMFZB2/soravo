# R1-GAP-008 — Silero VAD Asset Readiness Record — 2026-10-08

**Verdict: `R1-GAP-008 READY`** (asset placed + packaging wired; merge/ratification to owner via PR).

**Branch:** `r1-gap-008/silero-vad-asset` @ `0d38eb4b` (= `origin/main` at start; clean except unrelated `?? .freebuff/`).
**Scope discipline:** R1-GAP-026 NOT started. No STT code, session, auth, or UI modified. No Handy-derived source modified.

## Skill Selection Gate (loaded and actually used)

- `supply-chain-risk-auditor` — model/asset provenance + licence posture method (unavailable-data-is-not-evidence; absent-measurement-is-not-clean).
- `security-guidance` — local-only VAD boundary; no secret handling in this change.
- `gh-cli` — every GitHub/upstream fact via authenticated `gh api` / `gh release` (no unauthenticated curl for GitHub metadata; binary downloads via the API-resolved `download_url`s).
- `tauri` — `bundle.resources` packaging semantics.
- Considered and declined with reason: `semgrep`/`codeql`/`agent-security-audit` (no source-code logic changed), `cloudflare`/`supabase` (no service work), `playwright` (no E2E surface). No unused skill claimed.

## Deterministic asset identity (all 14 research items)

| # | Fact | Value (verified, not inferred) |
|---|---|---|
| 1 | Exact upstream repository | `https://github.com/snakers4/silero-vad` |
| 2 | Exact tag/revision | Tag `v4.0` ("New V4 VAD Released", published 2022-10-28). Immutable release tag. |
| 3 | Exact asset path/name | `files/silero_vad.onnx` at tag `v4.0`. Local name `silero_vad_v4.onnx` is the Handy/vad-rs naming convention for the identical bytes. |
| 4 | License | **MIT** |
| 5 | License text | Verbatim in `apps/desktop/src-tauri/resources/models/SILERO_VAD_LICENSE_MIT.txt` (from `https://raw.githubusercontent.com/snakers4/silero-vad/v4.0/LICENSE`). |
| 6 | Compatibility with Soravo distribution | Compatible. Soravo root `LICENSE` is MIT. MIT permits redistribution incl. commercial use with notice preserved. |
| 7 | Provenance URL | `https://raw.githubusercontent.com/snakers4/silero-vad/v4.0/files/silero_vad.onnx` |
| 8 | Exact byte size | **1,807,522** |
| 9 | SHA-256 | **`a35ebf52fd3ce5f1469b2a36158dba761bc47b973ea3382b3186ca15b1f5af28`** (computed from bytes downloaded from the provenance URL) |
| 10 | Redistribution/packaging permitted | **Yes**, under MIT (permission grant in the license text). No per-model restriction found at the pinned tag: root listing at `v4.0` contains only `LICENSE`; `files/` contains no license file. |
| 11 | Attribution/notice required | **Yes** — MIT requires the copyright + permission notice in copies. Satisfied by `SILERO_VAD_LICENSE_MIT.txt` shipped alongside the asset and bundled via `bundle.resources`. |
| 12 | Conversion/preprocessing expected | **NONE.** `SileroVad::new(path, t)` → `vad_rs::Vad::new(path, 16000)` directly; 16 kHz 480-sample (30 ms) frames. Upstream wiki: v4 ONNX supports batching + 8/16 kHz. No resampling/export step in `crates/audio/src/vad/silero.rs` or `managers/audio.rs:287-297`. |
| 13 | Exact Tauri packaging change | Add `"resources": ["resources/**/*"]` to `bundle` in `apps/desktop/src-tauri/tauri.conf.json` (Handy-identical: Handy at pin `ba10ce19` uses the same entry). Resolves via `BaseDirectory::Resource` (`audio.rs:287-297`). |
| 14 | Commit vs download-during-build | **COMMITTED** to git (Handy precedent: tracked blob, no LFS; 1.8 MB within GitHub limits). No Soravo release-policy prohibition found; `17_RELEASE_RUNBOOK.md` requires "model licenses verified" + recorded checksums — satisfied by `SILERO_VAD_PROVENANCE.json`. |

Byte-identity anchors (4-way MATCH, all `1807522 B` / `sha256 a35ebf52…`):
1. Authoritative upstream: `snakers4/silero-vad@v4.0:files/silero_vad.onnx` (downloaded 2026-10-08).
2. Soravo pin of record: `cjpais/Handy@ba10ce19:src-tauri/resources/models/silero_vad_v4.onnx` (git blob `e6db48d6e2a0797a2ec173c008384f7710189344`, ls-tree size `1807522`).
3. `thewh1teagle/vad-rs` release `v0.1.0` asset `silero_vad.onnx` (downloaded 2026-10-08).
4. `cjpais/vad-rs@2a412ed` (exact Soravo `Cargo.lock` pin) `tests/fixtures/silero_vad_v4.onnx` (local cargo checkout).

Wiki confirmation: Version-history wiki — v4.0 (2022-10-26) "Added v4 JIT and ONNX models. ONNX model now supports batching and both (16k and 8k) sampling rates". v4.0 README: "Published under permissive license (MIT) Silero VAD has zero strings attached".

## Recorded upstream metadata anomaly (not hidden, not blocking-bytes)

Upstream README badge alt-text reads "License: CC BY-NC 4.0" while the badge image reads "License: MIT" and links to the MIT `LICENSE` file — observed at BOTH the `v4.0` tag and `master` on 2026-10-08. The `LICENSE` file text is unambiguously MIT and no separate model-license file exists at `v4.0`. Recorded in `SILERO_VAD_PROVENANCE.json` for owner/legal awareness. Note: this investigation could NOT substantiate the blocker packet's parenthetical that "upstream ships a separate licence for the model" **for the v4 artifact** — no such file exists at the pinned tag. If owner/legal deems the badge anomaly material, the recourse is a written determination, not re-verification of these bytes.

## Implementation (smallest path-establishing change)

- `apps/desktop/src-tauri/resources/models/silero_vad_v4.onnx` (new, 1,807,522 B, sha256-verified post-copy).
- `apps/desktop/src-tauri/resources/models/SILERO_VAD_LICENSE_MIT.txt` (new, verbatim upstream MIT text, sha256 `2e63e9a3…e925520b`).
- `apps/desktop/src-tauri/resources/models/SILERO_VAD_PROVENANCE.json` (new, deterministic manifest incl. checksums + anomaly note).
- `apps/desktop/src-tauri/tauri.conf.json` (+1 line: `"resources": ["resources/**/*"]`).
- Authority docs (`21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md`, all of `00`–`21`) NOT edited — no Handy source touched (§04 step 11 not triggered).

## Tests / checks (relevant only)

- `python3 -m json.tool` on both JSON files: OK.
- `cargo test -p soravo-audio vad`: **13 passed, 0 failed** (incl. `vad::silero::tests::*`).
- `sha256sum` post-copy re-verification: MATCH.
- NOT EXECUTED (deferred, correctly out of scope): live `preload_vad` model-load + recorded-dictation E2E — earliest follow-up after merge (feeds R1-GAP-026); requires the packaged asset this PR delivers.

## Risk classification (HR-1…HR-8, §5.5 six-step)

- HR-1 No (no auth/session/entitlement/payment/secrets/CSP/capabilities/typed-IPC/model-download-verification/telemetry touched — `bundle.resources` is packaging, not a security boundary).
- HR-2 No (no `.github/**`, no release/publish/deployment config, no CI-invoked script).
- HR-3 No. HR-5 No (no Handy-derived source or preserved test touched). HR-6 No. HR-7 No (purely additive; no control removed/relaxed). HR-8 No (no label/designation).
- **HR-4 YES — "a model/asset pipeline or catalogue change"** → **HIGH-RISK**. `requires-independent-review` label required on the PR. Independent review is unobtainable (single collaborator) → ADR-031-A3 §5.10 High-Risk AI Self-Review path with C1–C18 + evidence comment. Merge stays owner-decided; this record requests review, never approval.

## Remaining work / next task

- Owner/human: review PR (spot-check `SILERO_VAD_PROVENANCE.json` + badge-anomaly note), confirm merge.
- Earliest executable follow-up after merge: `preload_vad` path test + recorded-dictation E2E (feeds R1-GAP-026). Do NOT proceed into R1-GAP-026 in this track.
